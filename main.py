import webview
import os
import base64
import json
import sys

# PyInstaller 빌드 시 리소스 경로 처리를 위한 함수
def get_resource_path(relative_path):
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, relative_path)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), relative_path)

# 설정 파일 경로 (사용자 문서 폴더 등에 저장하는 것이 안전하지만, 일단 실행 파일 경로 근처로 지정)
SETTINGS_FILE = os.path.join(os.path.expanduser("~"), ".webtoon_pro_viewer_settings.json")

class ViewerAPI:
    def __init__(self):
        self._window = None 

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
            print(f"✅ 저장 완료: {download_path}")
            return True
        except Exception as e:
            print(f"❌ 저장 실패: {e}")
            return False

    def debug_log(self, msg):
        # print(f"[JS DEBUG] {msg}")
        return True

def load_window_settings():
    try:
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"설정 로드 실패: {e}")
    return {"width": 690, "height": 1200, "x": None, "y": None}

def save_window_settings(window):
    try:
        settings = {
            "width": window.width,
            "height": window.height,
            "x": window.x,
            "y": window.y
        }
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=4)
        print("✅ 창 설정 저장 완료")
    except Exception as e:
        print(f"창 설정 저장 실패: {e}")

def start_app():
    api = ViewerAPI()
    html_path = get_resource_path('viewer.html')
    
    settings = load_window_settings()

    window = webview.create_window(
        'Webtoon Pro Viewer', 
        html_path, 
        js_api=api,
        width=settings.get("width", 690), 
        height=settings.get("height", 1200),
        x=settings.get("x"),
        y=settings.get("y")
    )
    
    api._window = window
    
    # 창이 닫힐 때 설정 저장 (Closing 이벤트가 안전함)
    window.events.closing += lambda: save_window_settings(window)
    
    webview.start(gui='qt', debug=False)

if __name__ == '__main__':
    start_app()