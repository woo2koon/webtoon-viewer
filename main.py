import webview
import os
import base64
import json
import sys
import threading

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
            download_path = os.path.join(os.path.expanduser("~"), "Downloads", filename)
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
            "minimapEnabled": True
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

def start_app():
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
    
    # 창 설정 실시간 동기화
    window.events.resized += lambda: sync_window_settings(window)
    window.events.moved += lambda: sync_window_settings(window)
    window.events.closing += lambda: sync_window_settings(window)
    
    is_frozen = hasattr(sys, 'frozen')
    webview.start(debug=not is_frozen, storage_path=STORAGE_PATH, private_mode=False)

if __name__ == '__main__':
    start_app()