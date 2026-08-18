import webview
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

if sys.platform == 'darwin':
    try:
        import objc
        from AppKit import (
            NSObject, NSMenu, NSMenuItem, NSAlternateKeyMask,
            NSOnState, NSOffState, NSMakePoint, NSApplication,
            NSEvent, NSEventTypeRightMouseDown
        )
        from PyObjCTools import AppHelper

        class MenuActionTarget(NSObject):
            def initWithCallback_(self, callback):
                self = objc.super(MenuActionTarget, self).init()
                if self is None:
                    return None
                self.callback = callback
                return self

            @objc.IBAction
            def menuAction_(self, sender):
                if self.callback:
                    self.callback()
    except Exception as e:
        print(f"[MAC_NATIVE] PyObjC 로드 실패: {e}")

# PyInstaller 빌드 시 리소스 경로 처리를 위한 함수
def get_resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_path)

# 설정 및 데이터 저장 경로 (윈도우의 LOCALAPPDATA 권한 허용 경로 사용)
def get_settings_dir():
    appdata = os.environ.get("LOCALAPPDATA")
    if not appdata:
        appdata = os.path.expanduser("~")
    return os.path.join(appdata, "WebtoonViewerPro")

SETTINGS_DIR = get_settings_dir()
SETTINGS_FILE = os.path.join(SETTINGS_DIR, "settings.json")
STORAGE_PATH = os.path.join(SETTINGS_DIR, "web_storage")

if not os.path.exists(SETTINGS_DIR):
    os.makedirs(SETTINGS_DIR)

class ViewerAPI:
    def __init__(self):
        self._window = None 

    def check_for_updates(self):
        try:
            url = "https://api.github.com/repos/woo2koon/webtoon-viewer/releases/latest"
            req = urllib.request.Request(url, headers={'User-Agent': 'WebtoonViewerUpdater'})
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    latest_version = data.get('tag_name', '').lstrip('v')
                    if latest_version and latest_version != APP_VERSION:
                        # Version comparison (only update if latest > current)
                        try:
                            v_latest = [int(x) for x in latest_version.split('.') if x.isdigit()]
                            v_current = [int(x) for x in APP_VERSION.split('.') if x.isdigit()]
                            if v_latest and v_current and v_latest <= v_current:
                                return {"update_available": False}
                        except Exception:
                            pass
                            
                        # Find the exe asset
                        download_url = None
                        for asset in data.get('assets', []):
                            if asset['name'].endswith('.exe'):
                                download_url = asset['browser_download_url']
                                break
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
                
                # Start installer and exit
                os.startfile(filepath)
                if self._window:
                    self._window.destroy()
            except Exception as e:
                print(f"Download or install failed: {e}")

        # Run in a separate thread so we don't block the UI during download
        threading.Thread(target=_download_task, daemon=True).start()
        return True

    def get_settings(self):
        return load_all_settings()

    def open_folder_dialog(self):
        result = self._window.create_file_dialog(webview.FileDialog.FOLDER)
        if result:
            folder_path = os.path.normpath(result[0]).replace("\\", "/")
            files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.psd', '.gif', '.bmp'))]
            files.sort()
            return {"folderPath": folder_path, "files": files}
        return None

    def open_file_dialog(self):
        result = self._window.create_file_dialog(
            webview.FileDialog.OPEN, 
            allow_multiple=True, 
            file_types=('Image Files (*.jpg;*.jpeg;*.png;*.webp;*.psd;*.gif;*.bmp)', 'All files (*.*)')
        )
        if result:
            # 첫 번째 파일의 폴더 경로 추출
            folder_path = os.path.normpath(os.path.dirname(result[0])).replace("\\", "/")
            files = [os.path.basename(f) for f in result]
            return {"folderPath": folder_path, "files": files}
        return None

    def select_capture_dir(self):
        result = self._window.create_file_dialog(webview.FileDialog.FOLDER)
        if result:
            folder_path = os.path.normpath(result[0]).replace("\\", "/")
            return folder_path
        return None
    
    def open_file_location(self, path):
        if not path:
            return False
        import subprocess
        try:
            norm_path = os.path.normpath(path)
            if os.path.exists(norm_path):
                if sys.platform == 'darwin':
                    if os.path.isfile(norm_path):
                        # macOS에서 파일을 선택한 상태로 파인더 실행
                        subprocess.run(['open', '-R', norm_path])
                    else:
                        # macOS에서 폴더 직접 열기
                        subprocess.run(['open', norm_path])
                elif sys.platform == 'win32':
                    if os.path.isfile(norm_path):
                        # 윈도우에서 파일을 선택한 상태로 탐색기 실행
                        subprocess.run(f'explorer /select,"{norm_path}"', shell=True)
                    else:
                        # 윈도우에서 폴더 직접 열기
                        os.startfile(norm_path)
                else:
                    # 리눅스 등 기타 OS
                    if os.path.isfile(norm_path):
                        parent = os.path.dirname(norm_path)
                        subprocess.run(['xdg-open', parent])
                    else:
                        subprocess.run(['xdg-open', norm_path])
                return True
            else:
                # Zip 압축 해제 임시 폴더 경로 등 실존하지 않는 경우 상위 부모 폴더 탐색
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
            # 브라우저 보안을 우회하기 위해 파이썬이 이미지를 직접 읽어 데이터로 변환합니다.
            path = os.path.normpath(file_path)
            if os.path.exists(path):
                ext = path.split('.')[-1].lower()
                if ext == 'psd':
                    try:
                        with Image.open(path) as img:
                            # RGBA 모드나 투명도 유지, CMYK인 경우 RGB 변환
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
            
            # 사용자 사진(Pictures) 폴더 경로를 1순위 기본값으로 사용
            if not capture_dir or not os.path.exists(capture_dir):
                pictures_dir = os.path.join(os.path.expanduser("~"), "Pictures")
                if os.path.exists(pictures_dir):
                    default_dir = os.path.join(pictures_dir, "Webtoon capture")
                else:
                    # 사진 폴더가 없는 예외적 경우 다운로드 폴더 사용
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
            current = load_all_settings()
            self._deep_update(current, settings)
            save_all_settings(current)
            print(f"설정 저장 완료: {settings}")
            return True
        except Exception as e:
            print(f"설정 저장 실패: {e}")
            return False

    def open_new_window(self):
        try:
            import subprocess
            if hasattr(sys, 'frozen'):
                # PyInstaller 실행 파일 환경
                subprocess.Popen([sys.executable])
            else:
                # Python 스크립트 실행 환경
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
        import sys
        try:
            print(f"[JS DEBUG] {msg}")
        except UnicodeEncodeError:
            encoding = sys.stdout.encoding or 'utf-8'
            safe_msg = msg.encode(encoding, errors='replace').decode(encoding, errors='replace')
            print(f"[JS DEBUG] {safe_msg}")
        sys.stdout.flush()
        return True

    def show_mac_native_menu(self, *args, **kwargs):
        if sys.platform != 'darwin':
            return
        
        data = {}
        if len(args) == 1 and isinstance(args[0], dict):
            data = args[0]
        elif len(args) >= 2:
            data = {'clientX': args[0], 'clientY': args[1]}
        data.update(kwargs)
        
        clientX = data.get('clientX', 0)
        clientY = data.get('clientY', 0)
        
        print(f"[API] 🍎 show_mac_native_menu 호출됨: {data}")
        sys.stdout.flush()

        if not self._window:
            return

        def _show():
            try:
                menu = NSMenu.alloc().initWithTitle_('ContextMenu')
                menu.setAutoenablesItems_(False)
                
                targets = []
                self._current_menu_targets = targets

                def make_item(title, callback, key='', mask=0, state=NSOffState, enabled=True):
                    if callback:
                        target = MenuActionTarget.alloc().initWithCallback_(callback)
                        targets.append(target)
                        item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(title, 'menuAction:', key)
                        item.setTarget_(target)
                    else:
                        item = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(title, '', key)
                    if mask:
                        item.setKeyEquivalentModifierMask_(mask)
                    item.setState_(state)
                    item.setEnabled_(enabled)
                    return item

                side = data.get('currentSideContext', 'left')
                is_compare = bool(data.get('isCompareMode', False))
                sub_title = '이미지 열기 (우측)' if (is_compare and side == 'right') else ('이미지 열기 (좌측)' if is_compare else '이미지 열기')

                # 1. 이미지 열기 서브메뉴
                open_sub_item = make_item(sub_title, None)
                open_sub = NSMenu.alloc().initWithTitle_(sub_title)
                open_sub.setAutoenablesItems_(False)
                open_sub.addItem_(make_item('파일 열기', lambda: self._handle_mac_menu_action('open_file', side)))
                open_sub.addItem_(make_item('폴더 열기', lambda: self._handle_mac_menu_action('open_folder', side)))
                open_sub_item.setSubmenu_(open_sub)
                menu.addItem_(open_sub_item)

                # 2. 파일 위치 열기
                active_path = data.get('activePath')
                menu.addItem_(make_item('파일 위치 열기', lambda: self._handle_mac_menu_action('open_location', active_path), enabled=bool(active_path)))

                menu.addItem_(NSMenuItem.separatorItem())

                # 3. 비교보기 모드
                menu.addItem_(make_item('비교보기 모드', lambda: self._handle_mac_menu_action('toggle_compare'), state=NSOnState if is_compare else NSOffState))

                # 4. 스크롤 동기화
                is_sync = bool(data.get('isScrollSync', False))
                menu.addItem_(make_item('스크롤 동기화', lambda: self._handle_mac_menu_action('toggle_sync'), state=NSOnState if is_sync else NSOffState, enabled=is_compare))

                menu.addItem_(NSMenuItem.separatorItem())

                # 5. 현재 화면 캡처
                menu.addItem_(make_item('현재 화면 캡처', lambda: self._handle_mac_menu_action('capture_screen'), key='c', mask=NSAlternateKeyMask))

                # 6. 영역 지정 캡처
                menu.addItem_(make_item('영역 지정 캡처', lambda: self._handle_mac_menu_action('capture_crop'), key='x', mask=NSAlternateKeyMask))

                menu.addItem_(NSMenuItem.separatorItem())

                # 7. 상세 설정 열기
                menu.addItem_(make_item('상세 설정 열기', lambda: self._handle_mac_menu_action('open_settings')))

                menu.addItem_(NSMenuItem.separatorItem())

                # 8. 새 창 열기
                menu.addItem_(make_item('새 창 열기', lambda: self._handle_mac_menu_action('new_window')))

                app = NSApplication.sharedApplication()
                app.activateIgnoringOtherApps_(True)

                bv = getattr(webview.platforms.cocoa.BrowserView, 'instances', {}).get(self._window.uid)
                ns_window = bv.window if bv else self._window.native
                webview_host = bv.webview if bv else (ns_window.contentView() if ns_window else None)

                if ns_window:
                    ns_window.makeKeyAndOrderFront_(None)

                # 마우스의 현재 글로벌 화면 좌표 기준 (view=None 설정 시 WKWebView의 이벤트 가로챔 및 즉시 취소 방지)
                try:
                    screen_mouse = NSEvent.mouseLocation()
                except Exception:
                    screen_mouse = NSMakePoint(float(clientX), float(clientY))

                print(f"[COCOA_MENU] popUpMenuPositioningItem 호출 (화면 좌표: {screen_mouse.x}, {screen_mouse.y})")
                sys.stdout.flush()
                menu.popUpMenuPositioningItem_atLocation_inView_(None, screen_mouse, None)

                # 메뉴 닫힘 직후 WebKitHost(WKWebView)로 FirstResponder, 포커스 및 커서 렉트 완전 복원
                try:
                    if ns_window and webview_host:
                        ns_window.makeKeyAndOrderFront_(None)
                        ns_window.makeFirstResponder_(webview_host)
                        ns_window.invalidateCursorRectsForView_(webview_host)
                        ns_window.resetCursorRects()
                        webview_host.setNeedsDisplay_(True)
                except Exception as focus_err:
                    print(f"[COCOA_MENU] 포커스/커서 복원 실패: {focus_err}")
                    sys.stdout.flush()



            except Exception as e:
                print(f"[COCOA_MENU_ERR] 메뉴 팝업 에러: {e}")
                sys.stdout.flush()
                import traceback
                traceback.print_exc()

        try:
            AppHelper.callAfter(_show)
        except Exception as e:
            print(f"[COCOA_MENU_ERR] callAfter 실패: {e}")
            sys.stdout.flush()

    def _handle_mac_menu_action(self, action, *args):
        try:
            if action == 'open_file':
                side = args[0] if args else 'left'
                self._window.evaluate_js(f"triggerOpenDialog('file', '{side}')")
            elif action == 'open_folder':
                side = args[0] if args else 'left'
                self._window.evaluate_js(f"triggerOpenDialog('folder', '{side}')")
            elif action == 'open_location':
                path = args[0] if args else None
                if path:
                    self.open_file_location(path)
            elif action == 'toggle_compare':
                self._window.evaluate_js("setCompareMode(!isCompareMode)")
            elif action == 'toggle_sync':
                self._window.evaluate_js("setScrollSync(!isScrollSync)")
            elif action == 'capture_screen':
                self._window.evaluate_js("document.getElementById('btn-capture') && document.getElementById('btn-capture').click()")
            elif action == 'capture_crop':
                self._window.evaluate_js("document.getElementById('btn-crop-capture') && document.getElementById('btn-crop-capture').click()")
            elif action == 'open_settings':
                self._window.evaluate_js("document.getElementById('settings-panel') && document.getElementById('settings-panel').classList.add('show')")
            elif action == 'new_window':
                self.open_new_window()
        except Exception as err:
            print(f"[NATIVE_MENU_ERR] 메뉴 액션 처리 실패 ({action}): {err}")
            sys.stdout.flush()




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
                # 설정 파일이 없거나 크기가 0이면 즉시 기본값으로 파일 생성
                try:
                    with open(SETTINGS_FILE, "w", encoding="utf-8") as wf:
                        json.dump(default_settings, wf, indent=4)
                except Exception as write_err:
                    print(f"기본 설정 파일 생성 실패: {write_err}")
                return default_settings

            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                try:
                    saved = json.load(f)
                    # 단순 업데이트가 아닌 딕셔너리 병합
                    for key in default_settings:
                        if key in saved:
                            if isinstance(default_settings[key], dict) and isinstance(saved[key], dict):
                                default_settings[key].update(saved[key])
                            else:
                                default_settings[key] = saved[key]
                except json.JSONDecodeError:
                    print("설정 파일이 손상되어 기본 설정을 사용합니다.")
                    # 손상된 파일 자동 복구 (기본 설정으로 다시 저장)
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

def sync_window_settings(window):
    try:
        # Windows 최소화 시 좌표가 -32000 부근으로 잡히는 현상 방지
        if window.x is not None and window.x <= -32000:
            return
        if window.y is not None and window.y <= -32000:
            return
        # 창 크기가 비정상적으로 작아진 경우 저장하지 않음
        if window.width < 200 or window.height < 200:
            return

        settings = load_all_settings()
        settings["window"] = {
            "width": window.width,
            "height": window.height,
            "x": window.x,
            "y": window.y
        }
        save_all_settings(settings)
        # print("✅ 창 설정 저장 완료")
    except Exception as e:
        print(f"창 설정 동기화 실패: {e}")

@bottle.route('/local-image')
def serve_local_image():
    file_path = bottle.request.query.get('path')
    if not file_path:
        return bottle.HTTPError(400, "Missing path parameter")
        
    try:
        # WSGI 표준에 의해 latin-1으로 잘못 해독된 한글 바이트를 원본 UTF-8로 정교하게 재복원합니다.
        file_path = file_path.encode('latin1').decode('utf-8')
    except Exception as e:
        print(f"[STREAM_ERR] 한글 복원 실패: {e}")
        
    file_path = os.path.normpath(file_path)
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        ext = file_path.split('.')[-1].lower()
        if ext == 'psd':
            bottle.response.content_type = "image/png"
            try:
                with Image.open(file_path) as img:
                    if img.mode in ('CMYK', 'P'):
                        img = img.convert('RGB')
                    elif img.mode not in ('RGB', 'RGBA'):
                        img = img.convert('RGBA')
                    buf = io.BytesIO()
                    img.save(buf, format='PNG')
                    return buf.getvalue()
            except Exception as e:
                return bottle.HTTPError(500, f"Error converting PSD file: {e}")
        else:
            mime = f"image/{ext}" if ext != 'jpg' else "image/jpeg"
            bottle.response.content_type = mime
            try:
                with open(file_path, 'rb') as f:
                    return f.read()
            except Exception as e:
                return bottle.HTTPError(500, f"Error reading file: {e}")
    else:
        return bottle.HTTPError(404, f"File not found: {file_path}")

def start_app():
    api = ViewerAPI()
    html_path = get_resource_path('viewer.html')
    
    settings = load_all_settings()
    window_cfg = settings.get("window", {})

    title = 'Webtoon Viewer Pro'
    if sys.platform == 'darwin':
        title = ''

    window = webview.create_window(
        title, 
        html_path, 
        js_api=api,
        width=int(window_cfg.get("width", 690)), 
        height=int(window_cfg.get("height", 1200)),
        x=window_cfg.get("x"),
        y=window_cfg.get("y")
    )
    
    api._window = window
    
    # 창 설정 실시간 동기화 및 즉시 종료 핸들러
    window.events.resized += lambda: sync_window_settings(window)
    window.events.moved += lambda: sync_window_settings(window)
    window.events.closed += lambda: os._exit(0)
    
    is_frozen = hasattr(sys, 'frozen')
    webview.start(debug=False, storage_path=STORAGE_PATH, private_mode=False)
    os._exit(0)


if __name__ == '__main__':
    start_app()