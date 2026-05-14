import webview
import os
import base64

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

def start_app():
    api = ViewerAPI()
    current_dir = os.path.dirname(os.path.abspath(__file__))
    html_path = os.path.join(current_dir, 'viewer.html')

    window = webview.create_window(
        'Webtoon Pro Viewer', 
        html_path, 
        js_api=api,
        width=690, 
        height=1200
    )
    
    api._window = window
    webview.start(debug=False) # 디버그 모드 비활성화 (개발자 창 안 뜨게)

if __name__ == '__main__':
    start_app()