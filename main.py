import webview
import os
import base64
import json
import sys
import threading
import bottle
import urllib.parse
import urllib.request
import tempfile
import subprocess



APP_VERSION = "2.1"

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
            files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
            files.sort()
            return {"folderPath": folder_path, "files": files}
        return None

    def open_file_dialog(self):
        result = self._window.create_file_dialog(
            webview.FileDialog.OPEN, 
            allow_multiple=True, 
            file_types=('Image Files (*.jpg;*.jpeg;*.png;*.webp)', 'All files (*.*)')
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
                with open(path, "rb") as f:
                    encoded = base64.b64encode(f.read()).decode('utf-8')
                    ext = path.split('.')[-1].lower()
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
    
    # 창 설정 실시간 동기화
    window.events.resized += lambda: sync_window_settings(window)
    window.events.moved += lambda: sync_window_settings(window)
    
    is_frozen = hasattr(sys, 'frozen')
    webview.start(debug=False, storage_path=STORAGE_PATH, private_mode=False)

if __name__ == '__main__':
    start_app()