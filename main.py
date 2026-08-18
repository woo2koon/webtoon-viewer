import os
import io
import base64
import json
import sys
import threading
import bottle
import urllib.parse
import urllib.request
import tempfile
import subprocess
from PIL import Image

APP_VERSION = "3.0"
IS_MAC = (sys.platform == 'darwin')

# macOS 전용 라이브러리 (PySide6)
if IS_MAC:
    try:
        from PySide6.QtWidgets import (
            QApplication, QMainWindow, QFileDialog, QMenu
        )
        from PySide6.QtGui import QAction, QKeySequence, QCursor, QIcon
        from PySide6.QtWebEngineWidgets import QWebEngineView
        from PySide6.QtWebEngineCore import (
            QWebEngineSettings, QWebEngineScript, QWebEngineProfile
        )
        from PySide6.QtWebChannel import QWebChannel
        from PySide6.QtCore import (
            QObject, Slot, QUrl, QFile, QIODevice, QJsonValue, Qt, QPoint
        )
    except ImportError as e:
        print(f"[ERROR] macOS에서는 PySide6가 필요합니다: {e}")
        print("설치 명령어: pip install PySide6")
else:
    # Windows / 기타 OS: pywebview
    try:
        import webview
    except ImportError:
        pass


# PyInstaller 빌드 시 리소스 경로 처리를 위한 함수
def get_resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_path)

# 설정 및 데이터 저장 경로
def get_settings_dir():
    if sys.platform == 'win32':
        appdata = os.environ.get("LOCALAPPDATA")
        if not appdata:
            appdata = os.path.expanduser("~")
        return os.path.join(appdata, "WebtoonViewerPro")
    else:
        # macOS / Linux
        home = os.path.expanduser("~")
        return os.path.join(home, "Library", "Application Support", "WebtoonViewerPro")

SETTINGS_DIR = get_settings_dir()
SETTINGS_FILE = os.path.join(SETTINGS_DIR, "settings.json")
STORAGE_PATH = os.path.join(SETTINGS_DIR, "web_storage")

if not os.path.exists(SETTINGS_DIR):
    os.makedirs(SETTINGS_DIR, exist_ok=True)

settings_lock = threading.Lock()

def load_all_settings():
    default_settings = {
        "window": {"width": 690, "height": 1200, "x": None, "y": None},
        "app": {
            "darkMode": False,
            "spacingCollapsed": True,
            "viewMode": "fit",
            "widthScale": "100",
            "scrollAccel": False,
            "stepScroll": True,
            "stepAmount": 100,
            "minimapEnabled": True,
            "captureDir": ""
        },
        "resume": {}
    }
    with settings_lock:
        try:
            if not os.path.exists(SETTINGS_FILE) or os.path.getsize(SETTINGS_FILE) == 0:
                try:
                    with open(SETTINGS_FILE, "w", encoding="utf-8") as wf:
                        json.dump(default_settings, wf, indent=4)
                except Exception as write_err:
                    print(f"기본 설정 파일 생성 실패: {write_err}")
                return default_settings

            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                try:
                    saved = json.load(f)
                    for key in default_settings:
                        if key in saved:
                            if isinstance(default_settings[key], dict) and isinstance(saved[key], dict):
                                default_settings[key].update(saved[key])
                            else:
                                default_settings[key] = saved[key]
                except json.JSONDecodeError:
                    print("설정 파일이 손상되어 기본 설정을 사용합니다.")
                    try:
                        with open(SETTINGS_FILE, "w", encoding="utf-8") as wf:
                            json.dump(default_settings, wf, indent=4)
                    except Exception as write_err:
                        print(f"설정 파일 복구 실패: {write_err}")
                    return default_settings
            return default_settings
        except Exception as e:
            print(f"설정 로드 실패: {e}")
        return default_settings

def save_all_settings(settings):
    with settings_lock:
        try:
            with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(settings, f, indent=4)
        except Exception as e:
            print(f"설정 파일 저장 실패: {e}")

def sync_window_settings_data(width, height, x, y):
    try:
        if x is not None and x <= -32000:
            return
        if y is not None and y <= -32000:
            return
        if width < 200 or height < 200:
            return

        settings = load_all_settings()
        settings["window"] = {
            "width": width,
            "height": height,
            "x": x,
            "y": y
        }
        save_all_settings(settings)
    except Exception as e:
        print(f"창 설정 동기화 실패: {e}")


SUPPORTED_IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.webp', '.psd', '.gif', '.bmp', '.zip')

# 공통 비즈니스 로직 API 클래스
class ViewerAPI:
    def __init__(self):
        self._window = None          # pywebview 창 또는 Qt MainWindow
        self._dialog_parent = None   # PySide6 다이얼로그 부모 위젯

    def check_for_updates(self):
        try:
            url = "https://api.github.com/repos/woo2koon/webtoon-viewer/releases/latest"
            req = urllib.request.Request(url, headers={'User-Agent': 'WebtoonViewerUpdater'})
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    latest_version = data.get('tag_name', '').lstrip('v')
                    if latest_version and latest_version != APP_VERSION:
                        try:
                            v_latest = [int(x) for x in latest_version.split('.') if x.isdigit()]
                            v_current = [int(x) for x in APP_VERSION.split('.') if x.isdigit()]
                            if v_latest and v_current and v_latest <= v_current:
                                return {"update_available": False}
                        except Exception:
                            pass
                            
                        download_url = None
                        target_ext = '.dmg' if IS_MAC else '.exe'
                        for asset in data.get('assets', []):
                            if asset['name'].endswith(target_ext):
                                download_url = asset['browser_download_url']
                                break
                        if not download_url and data.get('assets'):
                            download_url = data['assets'][0]['browser_download_url']

                        if download_url:
                            return {"update_available": True, "version": latest_version, "download_url": download_url}
            return {"update_available": False}
        except Exception as e:
            print(f"Update check failed: {e}")
            return {"update_available": False, "error": str(e)}

    def download_and_install_update(self, download_url):
        def _download_task():
            try:
                temp_dir = tempfile.gettempdir()
                filename = download_url.split('/')[-1]
                filepath = os.path.join(temp_dir, filename)
                
                req = urllib.request.Request(download_url, headers={'User-Agent': 'WebtoonViewerUpdater'})
                with urllib.request.urlopen(req) as response, open(filepath, 'wb') as out_file:
                    out_file.write(response.read())
                
                if IS_MAC:
                    subprocess.run(['open', filepath])
                else:
                    os.startfile(filepath)

                if self._window:
                    if hasattr(self._window, 'close'):
                        self._window.close()
                    elif hasattr(self._window, 'destroy'):
                        self._window.destroy()
            except Exception as e:
                print(f"Download or install failed: {e}")

        threading.Thread(target=_download_task, daemon=True).start()
        return True

    def get_settings(self):
        return load_all_settings()

    def open_folder_dialog(self):
        if IS_MAC:
            folder_path = QFileDialog.getExistingDirectory(
                self._dialog_parent, 
                "폴더 선택", 
                os.path.expanduser("~")
            )
            if folder_path:
                folder_path = os.path.normpath(folder_path).replace("\\", "/")
                files = [f for f in os.listdir(folder_path) if f.lower().endswith(SUPPORTED_IMAGE_EXTS)]
                files.sort()
                return {"folderPath": folder_path, "files": files}
            return None
        else:
            result = self._window.create_file_dialog(webview.FileDialog.FOLDER)
            if result:
                folder_path = os.path.normpath(result[0]).replace("\\", "/")
                files = [f for f in os.listdir(folder_path) if f.lower().endswith(SUPPORTED_IMAGE_EXTS)]
                files.sort()
                return {"folderPath": folder_path, "files": files}
            return None

    def open_file_dialog(self):
        if IS_MAC:
            files, _ = QFileDialog.getOpenFileNames(
                self._dialog_parent,
                "이미지 / ZIP 파일 선택",
                os.path.expanduser("~"),
                "Image & Archive Files (*.jpg *.jpeg *.png *.webp *.psd *.gif *.bmp *.zip);;All Files (*)"
            )
            if files:
                folder_path = os.path.normpath(os.path.dirname(files[0])).replace("\\", "/")
                file_names = [os.path.basename(f) for f in files]
                return {"folderPath": folder_path, "files": file_names}
            return None
        else:
            result = self._window.create_file_dialog(
                webview.FileDialog.OPEN, 
                allow_multiple=True, 
                file_types=('Image & Archive Files (*.jpg;*.jpeg;*.png;*.webp;*.psd;*.gif;*.bmp;*.zip)', 'All files (*.*)')
            )
            if result:
                folder_path = os.path.normpath(os.path.dirname(result[0])).replace("\\", "/")
                files = [os.path.basename(f) for f in result]
                return {"folderPath": folder_path, "files": files}
            return None

    def select_capture_dir(self):
        if IS_MAC:
            folder_path = QFileDialog.getExistingDirectory(
                self._dialog_parent, 
                "캡처 저장 폴더 선택", 
                os.path.expanduser("~")
            )
            if folder_path:
                return os.path.normpath(folder_path).replace("\\", "/")
            return None
        else:
            result = self._window.create_file_dialog(webview.FileDialog.FOLDER)
            if result:
                return os.path.normpath(result[0]).replace("\\", "/")
            return None
    
    def open_file_location(self, path):
        if not path:
            return False
        try:
            norm_path = os.path.normpath(path)
            if os.path.exists(norm_path):
                if sys.platform == 'darwin':
                    if os.path.isfile(norm_path):
                        subprocess.run(['open', '-R', norm_path])
                    else:
                        subprocess.run(['open', norm_path])
                elif sys.platform == 'win32':
                    if os.path.isfile(norm_path):
                        subprocess.run(f'explorer /select,"{norm_path}"', shell=True)
                    else:
                        os.startfile(norm_path)
                else:
                    if os.path.isfile(norm_path):
                        parent = os.path.dirname(norm_path)
                        subprocess.run(['xdg-open', parent])
                    else:
                        subprocess.run(['xdg-open', norm_path])
                return True
            else:
                parent = os.path.dirname(norm_path)
                if os.path.exists(parent):
                    if sys.platform == 'darwin':
                        subprocess.run(['open', parent])
                    elif sys.platform == 'win32':
                        os.startfile(parent)
                    else:
                        subprocess.run(['xdg-open', parent])
                    return True
        except Exception as e:
            print(f"Error opening folder: {e}")
        return False
    
    def get_image_data(self, file_path):
        try:
            path = os.path.normpath(file_path)
            if os.path.exists(path):
                ext = path.split('.')[-1].lower()
                if ext == 'psd':
                    try:
                        with Image.open(path) as img:
                            if img.mode in ('CMYK', 'P'):
                                img = img.convert('RGB')
                            elif img.mode not in ('RGB', 'RGBA'):
                                img = img.convert('RGBA')
                            buf = io.BytesIO()
                            img.save(buf, format='PNG')
                            encoded = base64.b64encode(buf.getvalue()).decode('utf-8')
                            return f"data:image/png;base64,{encoded}"
                    except Exception as psd_err:
                        print(f"PSD 이미지 파싱 실패 ({path}): {psd_err}")
                        return None
                else:
                    with open(path, "rb") as f:
                        encoded = base64.b64encode(f.read()).decode('utf-8')
                        mime = f"image/{ext}" if ext != 'jpg' else "image/jpeg"
                        return f"data:{mime};base64,{encoded}"
            return None
        except Exception as e:
            print(f"이미지 데이터 변환 실패: {e}")
            return None

    def save_image(self, data_url, filename):
        try:
            header, encoded = data_url.split(",", 1)
            data = base64.b64decode(encoded)
            
            settings = load_all_settings()
            capture_dir = settings.get("app", {}).get("captureDir", "")
            
            if not capture_dir or not os.path.exists(capture_dir):
                pictures_dir = os.path.join(os.path.expanduser("~"), "Pictures")
                if os.path.exists(pictures_dir):
                    default_dir = os.path.join(pictures_dir, "Webtoon capture")
                else:
                    default_dir = os.path.join(os.path.expanduser("~"), "Downloads", "Webtoon capture")
                
                os.makedirs(default_dir, exist_ok=True)
                download_path = os.path.join(default_dir, filename)
            else:
                download_path = os.path.join(capture_dir, filename)
                
            with open(download_path, "wb") as f:
                f.write(data)
            print(f"저장 완료: {download_path}")
            return True
        except Exception as e:
            print(f"저장 실패: {e}")
            return False

    def save_settings(self, settings):
        try:
            if hasattr(settings, 'toVariant'):
                settings = settings.toVariant()
            elif isinstance(settings, str):
                settings = json.loads(settings)

            current = load_all_settings()
            self._deep_update(current, settings)
            save_all_settings(current)
            # print(f"설정 저장 완료: {settings}")
            return True
        except Exception as e:
            print(f"설정 저장 실패: {e}")
            return False

    def open_new_window(self):
        try:
            if hasattr(sys, 'frozen'):
                subprocess.Popen([sys.executable])
            else:
                script_path = os.path.abspath(__file__)
                subprocess.Popen([sys.executable, script_path])
            return True
        except Exception as e:
            print(f"새 창 열기 오류: {e}")
            return False

    def _deep_update(self, source, overrides):
        for key, value in overrides.items():
            if isinstance(value, dict) and value and key in source and isinstance(source[key], dict):
                self._deep_update(source[key], value)
            else:
                source[key] = value
        return source

    def debug_log(self, msg):
        try:
            print(f"[JS DEBUG] {msg}")
        except UnicodeEncodeError:
            encoding = sys.stdout.encoding or 'utf-8'
            safe_msg = msg.encode(encoding, errors='replace').decode(encoding, errors='replace')
            print(f"[JS DEBUG] {safe_msg}")
        sys.stdout.flush()
        return True

    def show_mac_native_menu(self, *args, **kwargs):
        if not IS_MAC:
            return
        
        data = {}
        if len(args) == 1:
            raw = args[0]
            if hasattr(raw, 'toVariant'):
                data = raw.toVariant()
            elif isinstance(raw, dict):
                data = raw
            elif isinstance(raw, str):
                try:
                    data = json.loads(raw)
                except Exception:
                    pass
        elif len(args) >= 2:
            data = {'clientX': args[0], 'clientY': args[1]}
        data.update(kwargs)

        if not self._window or not hasattr(self._window, 'web_view'):
            return

        def _popup():
            try:
                menu = QMenu(self._window)
                side = data.get('currentSideContext', 'left')
                is_compare = bool(data.get('isCompareMode', False))
                is_sync = bool(data.get('isScrollSync', False))
                active_path = data.get('activePath')

                # 1. 이미지 열기 서브메뉴
                sub_title = '이미지 열기 (우측)' if (is_compare and side == 'right') else ('이미지 열기 (좌측)' if is_compare else '이미지 열기')
                open_sub = menu.addMenu(sub_title)
                
                act_file = open_sub.addAction('파일 열기')
                act_file.triggered.connect(lambda: self._exec_js(f"triggerOpenDialog('file', '{side}')"))
                
                act_folder = open_sub.addAction('폴더 열기')
                act_folder.triggered.connect(lambda: self._exec_js(f"triggerOpenDialog('folder', '{side}')"))

                # 2. 파일 위치 열기
                act_loc = menu.addAction('파일 위치 열기')
                act_loc.setEnabled(bool(active_path))
                act_loc.triggered.connect(lambda: self.open_file_location(active_path))

                menu.addSeparator()

                # 3. 비교보기 모드
                act_comp = menu.addAction('비교보기 모드')
                act_comp.setCheckable(True)
                act_comp.setChecked(is_compare)
                act_comp.triggered.connect(lambda: self._exec_js("setCompareMode(!isCompareMode)"))

                # 4. 스크롤 동기화
                act_sync = menu.addAction('스크롤 동기화')
                act_sync.setCheckable(True)
                act_sync.setChecked(is_sync)
                act_sync.setEnabled(is_compare)
                act_sync.triggered.connect(lambda: self._exec_js("setScrollSync(!isScrollSync)"))

                menu.addSeparator()

                # 5. 화면 캡처
                act_cap = menu.addAction('현재 화면 캡처')
                act_cap.setShortcut(QKeySequence("Alt+C"))
                act_cap.triggered.connect(lambda: self._exec_js("document.getElementById('btn-capture') && document.getElementById('btn-capture').click()"))

                # 6. 영역 캡처
                act_crop = menu.addAction('영역 지정 캡처')
                act_crop.setShortcut(QKeySequence("Alt+X"))
                act_crop.triggered.connect(lambda: self._exec_js("document.getElementById('btn-crop-capture') && document.getElementById('btn-crop-capture').click()"))

                menu.addSeparator()

                # 7. 상세 설정 열기
                act_set = menu.addAction('상세 설정 열기')
                act_set.triggered.connect(lambda: self._exec_js("document.getElementById('settings-panel') && document.getElementById('settings-panel').classList.add('show')"))

                menu.addSeparator()

                # 8. 새 창 열기
                act_new = menu.addAction('새 창 열기')
                act_new.triggered.connect(self.open_new_window)

                menu.exec(QCursor.pos())
            except Exception as e:
                print(f"[MAC_MENU_ERR] 메뉴 표시 실패: {e}")

        # 메인 스레드에서 팝업 실행
        from PySide6.QtCore import QTimer
        QTimer.singleShot(0, _popup)

    def _exec_js(self, js_code):
        if self._window and hasattr(self._window, 'web_view'):
            self._window.web_view.page().runJavaScript(js_code)


# ==============================================================================
# macOS 전용 PySide6 구현체 (QWebEngineView + QWebChannel)
# ==============================================================================
if IS_MAC:
    class QtBridge(QObject):
        """JavaScript ↔ Python 브릿지 (QWebChannel 연동)"""
        def __init__(self, api: ViewerAPI):
            super().__init__()
            self.api = api

        @Slot(result='QVariant')
        def check_for_updates(self):
            return self.api.check_for_updates()

        @Slot(str, result=bool)
        def download_and_install_update(self, url):
            return self.api.download_and_install_update(url)

        @Slot(result='QVariant')
        def get_settings(self):
            return self.api.get_settings()

        @Slot('QVariant', result=bool)
        def save_settings(self, settings):
            return self.api.save_settings(settings)

        @Slot(result='QVariant')
        def open_folder_dialog(self):
            return self.api.open_folder_dialog()

        @Slot(result='QVariant')
        def open_file_dialog(self):
            return self.api.open_file_dialog()

        @Slot(result=str)
        def select_capture_dir(self):
            res = self.api.select_capture_dir()
            return res if res else ""

        @Slot(str, result=bool)
        def open_file_location(self, path):
            return self.api.open_file_location(path)

        @Slot(str, result=str)
        def get_image_data(self, path):
            res = self.api.get_image_data(path)
            return res if res else ""

        @Slot(str, str, result=bool)
        def save_image(self, data_url, filename):
            return self.api.save_image(data_url, filename)

        @Slot(result=bool)
        def open_new_window(self):
            return self.api.open_new_window()

        @Slot(str, result=bool)
        def debug_log(self, msg):
            return self.api.debug_log(msg)

        @Slot('QVariant')
        def show_mac_native_menu(self, data):
            self.api.show_mac_native_menu(data)


    class MacMainWindow(QMainWindow):
        def __init__(self, api: ViewerAPI):
            super().__init__()
            self.api = api
            self.api._window = self
            self.api._dialog_parent = self

            self.setWindowTitle("Webtoon Viewer Pro")
            
            # 저장된 창 크기/위치 복원
            settings = load_all_settings()
            window_cfg = settings.get("window", {})
            width = int(window_cfg.get("width", 690))
            height = int(window_cfg.get("height", 1200))
            self.resize(width, height)
            
            x = window_cfg.get("x")
            y = window_cfg.get("y")
            if x is not None and y is not None and x > -1000 and y > -1000:
                self.move(int(x), int(y))

            # QWebEngineView 생성
            self.web_view = QWebEngineView(self)
            self.setCentralWidget(self.web_view)

            # WebEngine 설정
            view_settings = self.web_view.settings()
            view_settings.setAttribute(QWebEngineSettings.LocalContentCanAccessRemoteUrls, True)
            view_settings.setAttribute(QWebEngineSettings.LocalContentCanAccessFileUrls, True)
            view_settings.setAttribute(QWebEngineSettings.LocalStorageEnabled, True)
            view_settings.setAttribute(QWebEngineSettings.JavascriptCanAccessClipboard, True)
            view_settings.setAttribute(QWebEngineSettings.ScrollAnimatorEnabled, True)

            # QWebChannel 설정
            self.channel = QWebChannel(self.web_view.page())
            self.bridge = QtBridge(self.api)
            self.channel.registerObject("pywebview_api", self.bridge)
            self.web_view.page().setWebChannel(self.channel)

            # qwebchannel.js 및 pywebview 호환성 브릿지 스크립트 주입
            self._inject_bridge_script()

            # 메뉴바 구성
            self._setup_menu_bar()

            # HTML 로드
            html_path = get_resource_path('viewer.html')
            self.web_view.load(QUrl.fromLocalFile(html_path))

        def _inject_bridge_script(self):
            # Qt 내부 리소스에서 qwebchannel.js 읽기
            qfile = QFile(':/qtwebchannel/qwebchannel.js')
            qwebchannel_js = ""
            if qfile.open(QIODevice.ReadOnly):
                qwebchannel_js = qfile.readAll().data().decode('utf-8')
                qfile.close()

            bridge_script = f"""
            {qwebchannel_js}
            (function() {{
                if (typeof QWebChannel === 'undefined') return;
                
                new QWebChannel(qt.webChannelTransport, function(channel) {{
                    const rawApi = channel.objects.pywebview_api;
                    const apiWrapper = {{}};
                    
                    for (const key in rawApi) {{
                        if (typeof rawApi[key] === 'function') {{
                            apiWrapper[key] = function(...args) {{
                                return new Promise((resolve, reject) => {{
                                    rawApi[key](...args, function(res) {{
                                        resolve(res);
                                    }});
                                }});
                            }};
                        }}
                    }}

                    window.pywebview = {{
                        api: apiWrapper
                    }};

                    console.log("[PySide6] ✅ pywebview bridge successfully injected!");
                    window.dispatchEvent(new CustomEvent('pywebviewready'));
                }});
            }})();
            """

            script = QWebEngineScript()
            script.setSourceCode(bridge_script)
            script.setName("pyside_bridge")
            script.setWorldId(QWebEngineScript.MainWorld)
            script.setInjectionPoint(QWebEngineScript.DocumentCreation)
            script.setRunsOnSubFrames(False)
            self.web_view.page().scripts().insert(script)

        def _setup_menu_bar(self):
            mb = self.menuBar()

            # 파일 메뉴
            file_menu = mb.addMenu("파일")
            
            act_open_file = file_menu.addAction("파일 열기...")
            act_open_file.setShortcut(QKeySequence("Ctrl+O"))
            act_open_file.triggered.connect(lambda: self.api._exec_js("triggerOpenDialog('file', 'left')"))

            act_open_folder = file_menu.addAction("폴더 열기...")
            act_open_folder.setShortcut(QKeySequence("Ctrl+Shift+O"))
            act_open_folder.triggered.connect(lambda: self.api._exec_js("triggerOpenDialog('folder', 'left')"))

            file_menu.addSeparator()

            act_new_win = file_menu.addAction("새 창 열기")
            act_new_win.setShortcut(QKeySequence("Ctrl+N"))
            act_new_win.triggered.connect(self.api.open_new_window)

            file_menu.addSeparator()

            act_close = file_menu.addAction("창 닫기")
            act_close.setShortcut(QKeySequence("Ctrl+W"))
            act_close.triggered.connect(self.close)

            # 보기 메뉴
            view_menu = mb.addMenu("보기")

            act_compare = view_menu.addAction("비교보기 모드 토글")
            act_compare.setShortcut(QKeySequence("Ctrl+D"))
            act_compare.triggered.connect(lambda: self.api._exec_js("setCompareMode(!isCompareMode)"))

            act_sync = view_menu.addAction("스크롤 동기화 토글")
            act_sync.setShortcut(QKeySequence("Ctrl+S"))
            act_sync.triggered.connect(lambda: self.api._exec_js("setScrollSync(!isScrollSync)"))

            # 캡처 메뉴
            capture_menu = mb.addMenu("캡처")

            act_cap = capture_menu.addAction("현재 화면 캡처")
            act_cap.setShortcut(QKeySequence("Alt+C"))
            act_cap.triggered.connect(lambda: self.api._exec_js("document.getElementById('btn-capture') && document.getElementById('btn-capture').click()"))

            act_crop = capture_menu.addAction("영역 지정 캡처")
            act_crop.setShortcut(QKeySequence("Alt+X"))
            act_crop.triggered.connect(lambda: self.api._exec_js("document.getElementById('btn-crop-capture') && document.getElementById('btn-crop-capture').click()"))

            # 설정 메뉴
            settings_menu = mb.addMenu("설정")

            act_settings = settings_menu.addAction("상세 설정 열기")
            act_settings.setShortcut(QKeySequence("Ctrl+,"))
            act_settings.triggered.connect(lambda: self.api._exec_js("document.getElementById('settings-panel') && document.getElementById('settings-panel').classList.add('show')"))

        def resizeEvent(self, event):
            super().resizeEvent(event)
            self._save_window_state()

        def moveEvent(self, event):
            super().moveEvent(event)
            self._save_window_state()

        def closeEvent(self, event):
            self._save_window_state()
            super().closeEvent(event)

        def _save_window_state(self):
            pos = self.pos()
            size = self.size()
            sync_window_settings_data(size.width(), size.height(), pos.x(), pos.y())

    def run_mac():
        app = QApplication(sys.argv)
        app.setApplicationName("Webtoon Viewer Pro")
        app.setOrganizationName("Hozakzil")

        api = ViewerAPI()
        window = MacMainWindow(api)
        window.show()

        sys.exit(app.exec())


# ==============================================================================
# Windows / 기타 OS 전용 pywebview 구현체
# ==============================================================================
def run_windows():
    api = ViewerAPI()
    html_path = get_resource_path('viewer.html')
    
    settings = load_all_settings()
    window_cfg = settings.get("window", {})

    window = webview.create_window(
        'Webtoon Viewer Pro', 
        html_path, 
        js_api=api,
        width=int(window_cfg.get("width", 690)), 
        height=int(window_cfg.get("height", 1200)),
        x=window_cfg.get("x"),
        y=window_cfg.get("y")
    )
    
    api._window = window
    
    def sync_win():
        sync_window_settings_data(window.width, window.height, window.x, window.y)

    window.events.resized += sync_win
    window.events.moved += sync_win
    window.events.closed += lambda: os._exit(0)
    
    webview.start(debug=False, storage_path=STORAGE_PATH, private_mode=False)
    os._exit(0)


def start_app():
    if IS_MAC:
        run_mac()
    else:
        run_windows()


if __name__ == '__main__':
    start_app()