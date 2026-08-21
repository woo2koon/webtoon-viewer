import os
import io
import base64
import json
import sys
import threading
import urllib.parse
import urllib.request
import tempfile
import subprocess
import zipfile

APP_VERSION = "3.2"
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
    except ImportError as e:
        print(f"[ERROR] pywebview 모듈을 불러올 수 없습니다: {e}")
        raise e


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
            "captureDir": "",
            "captureLoupeEnabled": True
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

# PSD 디코딩 전용 헬퍼 함수 (psd-tools 우선 시도 후 Pillow fallback)
def decode_psd_to_png_base64(path_or_bytes):
    # 1. psd-tools 시도 (포토샵/클튜의 복잡한 레이어, 호환성 미체크 PSD, 16bit, 마스크 완벽 지원)
    try:
        import psd_tools
        if isinstance(path_or_bytes, bytes):
            psd = psd_tools.PSDImage.open(io.BytesIO(path_or_bytes))
        else:
            psd = psd_tools.PSDImage.open(path_or_bytes)
        
        pil_img = psd.composite()
        if pil_img:
            if pil_img.mode in ('CMYK', 'P'):
                pil_img = pil_img.convert('RGB')
            elif pil_img.mode not in ('RGB', 'RGBA'):
                pil_img = pil_img.convert('RGBA')
            
            buf = io.BytesIO()
            pil_img.save(buf, format='PNG')
            encoded = base64.b64encode(buf.getvalue()).decode('utf-8')
            return f"data:image/png;base64,{encoded}"
    except Exception as e_psd:
        print(f"[PSD_TOOLS_INFO] psd-tools 파싱 실패, Pillow fallback 시도: {e_psd}")

    # 2. Pillow PsdImagePlugin fallback 시도
    try:
        from PIL import Image, PsdImagePlugin
        if isinstance(path_or_bytes, bytes):
            img = Image.open(io.BytesIO(path_or_bytes))
        else:
            img = Image.open(path_or_bytes)
        
        try:
            img.seek(0)
        except Exception:
            pass
        img.load()

        if img.mode == 'CMYK':
            img = img.convert('RGB')
        elif img.mode in ('I;16', 'I;16B', 'I;16L', 'I'):
            img = img.point(lambda i: i * (1 / 256)).convert('L')
        elif img.mode in ('P', '1', 'L', 'LA'):
            img = img.convert('RGBA')
        elif img.mode not in ('RGB', 'RGBA'):
            img = img.convert('RGBA')

        buf = io.BytesIO()
        img.save(buf, format='PNG')
        encoded = base64.b64encode(buf.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{encoded}"
    except Exception as e_pil:
        print(f"[PIL_ERR] PSD 파싱 최종 실패: {e_pil}")
        return None


def setup_cocoa_standard_menu():
    """macOS 시스템 레벨에서 Cmd+A, Cmd+C, Cmd+V, Cmd+Z 등이 파일 다이얼로그 및 입력창에 전달되도록 Cocoa 메뉴 등록"""
    if not IS_MAC:
        return
    try:
        import AppKit
        import objc

        app = AppKit.NSApplication.sharedApplication()
        main_menu = app.mainMenu()
        if not main_menu:
            main_menu = AppKit.NSMenu.alloc().init()
            app.setMainMenu_(main_menu)

        # 기존 Edit/편집 메뉴 확인
        edit_item = None
        for item in main_menu.itemArray():
            if item.title() in ('Edit', '편집') or (item.hasSubmenu() and item.submenu().title() in ('Edit', '편집')):
                edit_item = item
                break

        if not edit_item:
            edit_item = AppKit.NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('편집', None, '')
            main_menu.addItem_(edit_item)

        edit_menu = AppKit.NSMenu.alloc().initWithTitle_('편집')

        # 표준 Cocoa 셀렉터 매핑 (macOS 네이티브 파일 다이얼로그에서 Cmd+A, Cmd+C 등 필수)
        items = [
            ('실행 취소', objc.selector(None, selector=b'undo:', signature=b'v@:@'), 'z'),
            ('다시 실행', objc.selector(None, selector=b'redo:', signature=b'v@:@'), 'Z'),
            (None, None, None),
            ('오려두기', objc.selector(None, selector=b'cut:', signature=b'v@:@'), 'x'),
            ('복사', objc.selector(None, selector=b'copy:', signature=b'v@:@'), 'c'),
            ('붙여넣기', objc.selector(None, selector=b'paste:', signature=b'v@:@'), 'v'),
            ('모두 선택', objc.selector(None, selector=b'selectAll:', signature=b'v@:@'), 'a'),
        ]

        for title, sel, key in items:
            if title is None:
                edit_menu.addItem_(AppKit.NSMenuItem.separatorItem())
            else:
                item = AppKit.NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(title, sel, key)
                edit_menu.addItem_(item)

        edit_item.setSubmenu_(edit_menu)
    except Exception as e:
        print(f"[COCOA_MENU_WARN] Cocoa Edit 메뉴 설정 실패: {e}")


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
            setup_cocoa_standard_menu()
            try:
                import AppKit
                panel = AppKit.NSOpenPanel.openPanel()
                panel.setTitle_("웹툰 폴더 선택")
                panel.setMessage_("열람할 웹툰 이미지가 들어있는 폴더를 선택하세요.")
                panel.setPrompt_("선택")
                panel.setAllowsMultipleSelection_(False)
                panel.setCanChooseFiles_(False)
                panel.setCanChooseDirectories_(True)
                panel.setResolvesAliases_(True)
                
                AppKit.NSApp.activateIgnoringOtherApps_(True)
                if panel.runModal() == AppKit.NSModalResponseOK:
                    url = panel.URL()
                    if url:
                        folder_path = os.path.normpath(str(url.path())).replace("\\", "/")
                        files = [f for f in os.listdir(folder_path) if f.lower().endswith(SUPPORTED_IMAGE_EXTS)]
                        files.sort()
                        return {"folderPath": folder_path, "files": files}
                return None
            except Exception as e:
                print(f"[MAC_OPEN_FOLDER_ERR] AppKit 폴더 다이얼로그 오류: {e}")
                folder_path = QFileDialog.getExistingDirectory(None, "폴더 선택", os.path.expanduser("~"))
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
        def _process_selected_files(file_list):
            if not file_list:
                return None
            # 단일 압축 파일(.zip, .cbz)인 경우 내부 이미지 목록 파싱
            if len(file_list) == 1:
                single_path = os.path.normpath(file_list[0]).replace("\\", "/")
                ext = single_path.split('.')[-1].lower()
                if ext in ('zip', 'cbz'):
                    try:
                        import zipfile
                        with zipfile.ZipFile(single_path, 'r') as zf:
                            image_names = [
                                n for n in zf.namelist()
                                if not n.endswith('/') and not n.startswith('__MACOSX/') and
                                n.lower().endswith(SUPPORTED_IMAGE_EXTS) and not n.lower().endswith(('.zip', '.cbz'))
                            ]
                            image_names.sort()
                            if image_names:
                                return {
                                    "isZip": True,
                                    "zipPath": single_path,
                                    "folderPath": single_path,
                                    "files": image_names
                                }
                    except Exception as zip_err:
                        print(f"ZIP 파싱 실패: {zip_err}")

            folder_path = os.path.normpath(os.path.dirname(file_list[0])).replace("\\", "/")
            file_names = [os.path.basename(f) for f in file_list]
            return {"folderPath": folder_path, "files": file_names}

        if IS_MAC:
            setup_cocoa_standard_menu()
            try:
                import AppKit
                panel = AppKit.NSOpenPanel.openPanel()
                panel.setTitle_("이미지 / PSD / ZIP 파일 선택")
                panel.setMessage_("열람할 이미지, PSD 또는 ZIP 압축 파일을 선택하세요. (Cmd+A로 전체 선택 가능)")
                panel.setPrompt_("열기")
                panel.setAllowsMultipleSelection_(True)
                panel.setCanChooseFiles_(True)
                panel.setCanChooseDirectories_(False)
                panel.setResolvesAliases_(True)
                
                # 지원 포맷 지정
                allowed_types = ['jpg', 'jpeg', 'png', 'webp', 'psd', 'gif', 'bmp', 'zip', 'cbz']
                panel.setAllowedFileTypes_(allowed_types)
                
                AppKit.NSApp.activateIgnoringOtherApps_(True)
                if panel.runModal() == AppKit.NSModalResponseOK:
                    urls = panel.URLs()
                    files = [str(url.path()) for url in urls]
                    return _process_selected_files(files)
                return None
            except Exception as e:
                print(f"[MAC_OPEN_FILE_ERR] AppKit 파일 다이얼로그 오류: {e}")
                files, _ = QFileDialog.getOpenFileNames(
                    None,
                    "이미지 / ZIP 파일 선택",
                    os.path.expanduser("~"),
                    "Image & Archive Files (*.jpg *.jpeg *.png *.webp *.psd *.gif *.bmp *.zip *.cbz);;All Files (*)"
                )
                return _process_selected_files(files)
        else:
            result = self._window.create_file_dialog(
                webview.FileDialog.OPEN, 
                allow_multiple=True, 
                file_types=('Image and Archive Files (*.jpg;*.jpeg;*.png;*.webp;*.psd;*.gif;*.bmp;*.zip;*.cbz)', 'All files (*.*)')
            )
            return _process_selected_files(result)

    def select_capture_dir(self):
        if IS_MAC:
            try:
                import AppKit
                panel = AppKit.NSOpenPanel.openPanel()
                panel.setTitle_("캡처 저장 폴더 선택")
                panel.setPrompt_("폴더 선택")
                panel.setAllowsMultipleSelection_(False)
                panel.setCanChooseFiles_(False)
                panel.setCanChooseDirectories_(True)
                panel.setResolvesAliases_(True)
                
                AppKit.NSApp.activateIgnoringOtherApps_(True)
                if panel.runModal() == AppKit.NSModalResponseOK:
                    url = panel.URL()
                    if url:
                        return os.path.normpath(str(url.path())).replace("\\", "/")
                return None
            except Exception as e:
                print(f"[MAC_DIR_ERR] AppKit 폴더 선택 오류: {e}")
                folder_path = QFileDialog.getExistingDirectory(None, "캡처 저장 폴더 선택", os.path.expanduser("~"))
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
            # 1. ZIP 파일 내부 경로 지원 (형식: "path/to/archive.zip::internal/image.png")
            if "::" in file_path:
                zip_path, internal_path = file_path.split("::", 1)
                if zip_path.startswith("file://"):
                    zip_path = urllib.parse.unquote(urllib.parse.urlparse(zip_path).path)
                    if sys.platform == 'win32' and zip_path.startswith('/'):
                        zip_path = zip_path[1:]
                zip_path = os.path.normpath(zip_path)
                if os.path.exists(zip_path):
                    with zipfile.ZipFile(zip_path, 'r') as zf:
                        raw_bytes = zf.read(internal_path)
                        ext = internal_path.split('.')[-1].lower()
                        if ext == 'psd':
                            return decode_psd_to_png_base64(raw_bytes)
                        else:
                            encoded = base64.b64encode(raw_bytes).decode('utf-8')
                            mime = f"image/{ext}" if ext != 'jpg' else "image/jpeg"
                            return f"data:{mime};base64,{encoded}"
                return None

            # 2. 일반 로컬 파일 경로 지원
            path = file_path
            if path.startswith("file://"):
                path = urllib.parse.unquote(urllib.parse.urlparse(path).path)
                if sys.platform == 'win32' and path.startswith('/'):
                    path = path[1:]
            path = os.path.normpath(path)
            if os.path.exists(path):
                ext = path.split('.')[-1].lower()
                if ext == 'psd':
                    return decode_psd_to_png_base64(path)
                else:
                    with open(path, "rb") as f:
                        encoded = base64.b64encode(f.read()).decode('utf-8')
                        mime = f"image/{ext}" if ext != 'jpg' else "image/jpeg"
                        return f"data:{mime};base64,{encoded}"
            return None
        except Exception as e:
            print(f"이미지 데이터 변환 실패 ({file_path}): {e}")
            return None

    def convert_psd_data(self, data_str):
        try:
            if not data_str:
                return None
            if "," in data_str:
                _, encoded = data_str.split(",", 1)
            else:
                encoded = data_str
            psd_bytes = base64.b64decode(encoded)
            return decode_psd_to_png_base64(psd_bytes)
        except Exception as e:
            print(f"PSD 데이터 변환 실패: {e}")
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

                # 6-1. 자유형 영역 캡처
                act_poly = menu.addAction('자유형 영역 캡처')
                act_poly.setShortcut(QKeySequence("Alt+Z"))
                act_poly.triggered.connect(lambda: self._exec_js("document.getElementById('btn-poly-capture') && document.getElementById('btn-poly-capture').click()"))

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

        @Slot(str, result=str)
        def convert_psd_data(self, data_str):
            res = self.api.convert_psd_data(data_str)
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

            # 편집 메뉴 (macOS 네이티브 파일 다이얼로그 및 입력창에서 Cmd+A, Cmd+C, Cmd+V 단축키 동작 필수)
            edit_menu = mb.addMenu("편집")
            
            act_undo = edit_menu.addAction("실행 취소")
            act_undo.setShortcut(QKeySequence.Undo)
            act_undo.triggered.connect(lambda: self.web_view.page().triggerAction(self.web_view.page().WebAction.Undo))

            act_redo = edit_menu.addAction("다시 실행")
            act_redo.setShortcut(QKeySequence.Redo)
            act_redo.triggered.connect(lambda: self.web_view.page().triggerAction(self.web_view.page().WebAction.Redo))

            edit_menu.addSeparator()

            act_cut = edit_menu.addAction("오려두기")
            act_cut.setShortcut(QKeySequence.Cut)
            act_cut.triggered.connect(lambda: self.web_view.page().triggerAction(self.web_view.page().WebAction.Cut))

            act_copy = edit_menu.addAction("복사")
            act_copy.setShortcut(QKeySequence.Copy)
            act_copy.triggered.connect(lambda: self.web_view.page().triggerAction(self.web_view.page().WebAction.Copy))

            act_paste = edit_menu.addAction("붙여넣기")
            act_paste.setShortcut(QKeySequence.Paste)
            act_paste.triggered.connect(lambda: self.web_view.page().triggerAction(self.web_view.page().WebAction.Paste))

            act_select_all = edit_menu.addAction("모두 선택")
            act_select_all.setShortcut(QKeySequence.SelectAll)
            act_select_all.triggered.connect(lambda: self.web_view.page().triggerAction(self.web_view.page().WebAction.SelectAll))

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

            act_poly = capture_menu.addAction("자유형 영역 캡처")
            act_poly.setShortcut(QKeySequence("Alt+Z"))
            act_poly.triggered.connect(lambda: self.api._exec_js("document.getElementById('btn-poly-capture') && document.getElementById('btn-poly-capture').click()"))

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
            self.hide()
            self._save_window_state()
            super().closeEvent(event)

        def _save_window_state(self):
            pos = self.pos()
            size = self.size()
            sync_window_settings_data(size.width(), size.height(), pos.x(), pos.y())

    def setup_cocoa_standard_menu():
        """macOS 시스템 레벨에서 Cmd+A, Cmd+C, Cmd+V, Cmd+Z 등이 파일 다이얼로그 및 입력창에 전달되도록 Cocoa 메뉴 등록"""
        try:
            import AppKit
            import objc

            app = AppKit.NSApplication.sharedApplication()
            main_menu = app.mainMenu()
            if not main_menu:
                main_menu = AppKit.NSMenu.alloc().init()
                app.setMainMenu_(main_menu)

            # 기존 Edit/편집 메뉴 확인
            edit_item = None
            for item in main_menu.itemArray():
                if item.title() in ('Edit', '편집') or (item.hasSubmenu() and item.submenu().title() in ('Edit', '편집')):
                    edit_item = item
                    break

            if not edit_item:
                edit_item = AppKit.NSMenuItem.alloc().initWithTitle_action_keyEquivalent_('편집', None, '')
                main_menu.addItem_(edit_item)

            edit_menu = AppKit.NSMenu.alloc().initWithTitle_('편집')

            # 표준 Cocoa 셀렉터 매핑 (macOS 네이티브 파일 다이얼로그에서 필수)
            items = [
                ('실행 취소', objc.selector(None, selector=b'undo:', signature=b'v@:@'), 'z'),
                ('다시 실행', objc.selector(None, selector=b'redo:', signature=b'v@:@'), 'Z'),
                (None, None, None),
                ('오려두기', objc.selector(None, selector=b'cut:', signature=b'v@:@'), 'x'),
                ('복사', objc.selector(None, selector=b'copy:', signature=b'v@:@'), 'c'),
                ('붙여넣기', objc.selector(None, selector=b'paste:', signature=b'v@:@'), 'v'),
                ('모두 선택', objc.selector(None, selector=b'selectAll:', signature=b'v@:@'), 'a'),
            ]

            for title, sel, key in items:
                if title is None:
                    edit_menu.addItem_(AppKit.NSMenuItem.separatorItem())
                else:
                    item = AppKit.NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(title, sel, key)
                    edit_menu.addItem_(item)

            edit_item.setSubmenu_(edit_menu)
        except Exception as e:
            print(f"[COCOA_MENU_WARN] Cocoa Edit 메뉴 설정 실패: {e}")

    def run_mac():
        app = QApplication(sys.argv)
        app.setApplicationName("Webtoon Viewer Pro")
        app.setOrganizationName("Hozakzil")

        api = ViewerAPI()
        window = MacMainWindow(api)
        window.show()

        # Qt 윈도우 생성 후 Cocoa 시스템 메뉴바에 표준 셀렉터 주입
        setup_cocoa_standard_menu()

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

    def on_closing():
        try:
            window.hide()
        except Exception:
            pass
        sync_win()

    window.events.resized += sync_win
    window.events.moved += sync_win
    window.events.closing += on_closing
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