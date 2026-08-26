import os
import sys
import json
import re
import urllib.parse
import subprocess
import webview
from webview.dom import _dnd_state

# DnD 리스너 활성화
_dnd_state['num_listeners'] = 1

SUPPORTED_IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.webp', '.psd', '.gif', '.bmp')

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', str(s))]

def normalize_fs_path(p: str) -> str:
    if not p:
        return ""
    if p.startswith("file://"):
        parsed = urllib.parse.urlparse(p)
        p = urllib.parse.unquote(parsed.path)
        if sys.platform == 'win32' and len(p) >= 3 and p[0] == '/' and p[2] == ':':
            p = p[1:]
        elif parsed.netloc:
            p = r'\\' + parsed.netloc + p

    if p.startswith("//") or p.startswith("\\\\"):
        server_path = p.lstrip("/\\")
        return os.path.normpath(r'\\' + server_path)

    if sys.platform == 'win32' and len(p) >= 3 and p[0] == '/' and p[2] == ':':
        p = p[1:]

    return os.path.normpath(p)

class DebugAPI:
    def log(self, msg):
        print(f"[JS_DEBUG] {msg}")

    def process_dropped_paths(self):
        try:
            raw_paths = list(_dnd_state.get('paths', []))
            _dnd_state['paths'] = []
            print(f"[PY_DND] raw_paths received from webview: {raw_paths}")
            if not raw_paths:
                return {"error": "raw_paths is empty"}

            file_paths = []
            for p in raw_paths:
                if isinstance(p, (tuple, list)) and len(p) > 1 and p[1]:
                    file_paths.append(normalize_fs_path(str(p[1])))
                elif isinstance(p, str) and p:
                    file_paths.append(normalize_fs_path(p))

            if not file_paths:
                return {"error": "no valid file_paths parsed"}

            # 폴더인 경우 내부 수집
            collected_files = []
            for p in file_paths:
                if os.path.isdir(p):
                    for f in os.listdir(p):
                        if f.lower().endswith(SUPPORTED_IMAGE_EXTS):
                            collected_files.append(normalize_fs_path(os.path.join(p, f)))
                elif os.path.isfile(p) and p.lower().endswith(SUPPORTED_IMAGE_EXTS):
                    collected_files.append(p)

            if not collected_files:
                return {"error": "no image files found in dropped paths", "file_paths": file_paths}

            collected_files.sort(key=lambda p: natural_sort_key(os.path.basename(p)))

            first_dir = os.path.dirname(collected_files[0])
            files = [os.path.basename(p) for p in collected_files]
            
            return {
                "folderPath": first_dir,
                "files": files,
                "fullPaths": collected_files
            }
        except Exception as e:
            print(f"[PY_ERROR] process_dropped_paths exception: {e}")
            return {"error": str(e)}

    def open_file_location(self, path):
        print(f"[PY_OPEN_LOCATION] Opening: {path}")
        if not path:
            return False
        try:
            if "::" in path:
                path = path.split("::", 1)[0]
            norm_path = normalize_fs_path(path)
            print(f"[PY_OPEN_LOCATION] Normalized path: {norm_path}, Exists: {os.path.exists(norm_path)}")
            if os.path.exists(norm_path):
                if sys.platform == 'win32':
                    if os.path.isfile(norm_path):
                        subprocess.Popen(f'explorer.exe /select,"{norm_path}"')
                    else:
                        os.startfile(norm_path)
                elif sys.platform == 'darwin':
                    subprocess.run(['open', '-R', norm_path])
                return True
            else:
                parent = os.path.dirname(norm_path)
                if os.path.exists(parent):
                    os.startfile(parent)
                    return True
        except Exception as e:
            print(f"[PY_ERROR] open_file_location exception: {e}")
        return False

HTML_CONTENT = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>DnD 및 파일 위치 열기 진단기</title>
    <style>
        body { font-family: sans-serif; background: #18181b; color: #f4f4f5; margin: 0; padding: 20px; display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; }
        h2 { margin-top: 0; color: #38bdf8; }
        .drop-zone { border: 2px dashed #60a5fa; border-radius: 12px; padding: 30px; text-align: center; background: rgba(59, 130, 246, 0.08); cursor: pointer; transition: 0.2s; margin-bottom: 15px; }
        .drop-zone.hover { background: rgba(59, 130, 246, 0.25); border-color: #93c5fd; }
        .log-box { flex: 1; background: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; overflow-y: auto; white-space: pre-wrap; color: #a1a1aa; line-height: 1.5; }
        .log-box .highlight { color: #4ade80; font-weight: bold; }
        .log-box .err { color: #f87171; font-weight: bold; }
        .preview-box { margin-top: 15px; padding: 12px; background: #27272a; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; }
        button { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; }
        button:hover { background: #1d4ed8; }
    </style>
</head>
<body>
    <h2>🔍 드래그 앤 드롭 진단 및 파일 위치 테스트</h2>
    <div id="drop-zone" class="drop-zone">
        📁 여기에 이미지 파일이나 폴더를 드래그 앤 드롭하세요
    </div>

    <div class="preview-box">
        <div>
            <strong>현재 선택된 파일 경로:</strong>
            <div id="cur-path" style="color: #fbbf24; margin-top: 4px;">(없음)</div>
        </div>
        <button id="open-btn" onclick="triggerOpen()">📂 파일 위치 열기 테스트</button>
    </div>

    <h4 style="margin: 15px 0 6px;">진단 로그:</h4>
    <div id="log-box" class="log-box">진단 준비 완료. 파일을 드롭해보세요...\n</div>

    <script>
        let currentActivePath = null;
        const logBox = document.getElementById('log-box');
        const curPathEl = document.getElementById('cur-path');
        const dropZone = document.getElementById('drop-zone');

        function appendLog(text, type = '') {
            const time = new Date().toLocaleTimeString();
            const div = document.createElement('div');
            if (type) div.className = type;
            div.textContent = `[${time}] ${text}`;
            logBox.appendChild(div);
            logBox.scrollTop = logBox.scrollHeight;
            if (window.pywebview && window.pywebview.api) window.pywebview.api.log(text);
        }

        window.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('hover');
        });

        window.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('hover');
        });

        window.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('hover');
            appendLog("--- [1] DROP 이벤트 발생 ---", "highlight");

            const filesArray = [];
            if (e.dataTransfer) {
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    appendLog(`e.dataTransfer.files 감지됨: ${e.dataTransfer.files.length}개`);
                    for (let i = 0; i < e.dataTransfer.files.length; i++) {
                        const f = e.dataTransfer.files[i];
                        appendLog(`  - File[${i}]: name="${f.name}", path="${f.path}", size=${f.size}`);
                        filesArray.push(f);
                    }
                } else if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
                    appendLog(`e.dataTransfer.items 감지됨: ${e.dataTransfer.items.length}개`);
                    for (let i = 0; i < e.dataTransfer.items.length; i++) {
                        const f = e.dataTransfer.items[i].getAsFile();
                        appendLog(`  - Item[${i}] getAsFile(): name="${f ? f.name : 'null'}"`);
                        if (f) filesArray.push(f);
                    }
                }
            }

            if (window.chrome && window.chrome.webview && window.chrome.webview.postMessageWithAdditionalObjects && filesArray.length > 0) {
                appendLog("--- [2] WebView2 Native postMessageWithAdditionalObjects 전송 시도 ---");
                try {
                    window.chrome.webview.postMessageWithAdditionalObjects('FilesDropped', filesArray);
                    appendLog("  -> postMessageWithAdditionalObjects 호출 성공!", "highlight");
                } catch(err) {
                    appendLog("  -> postMessageWithAdditionalObjects 오류: " + err, "err");
                }

                appendLog("--- [3] 파이썬 백엔드 결과 대기 중 (120ms)... ---");
                await new Promise(r => setTimeout(r, 120));

                if (window.pywebview && window.pywebview.api && window.pywebview.api.process_dropped_paths) {
                    const res = await window.pywebview.api.process_dropped_paths();
                    appendLog("--- [4] 파이썬 응답 수신 ---: " + JSON.stringify(res), "highlight");
                    
                    if (res && res.fullPaths && res.fullPaths.length > 0) {
                        currentActivePath = res.fullPaths[0];
                    } else if (res && res.folderPath && res.files && res.files.length > 0) {
                        currentActivePath = `${res.folderPath}/${res.files[0]}`;
                    } else {
                        currentActivePath = null;
                    }

                    if (currentActivePath) {
                        curPathEl.textContent = currentActivePath;
                        appendLog("🎉 파일 경로 등록 성공: " + currentActivePath, "highlight");
                    } else {
                        curPathEl.textContent = "(실패: 경로 없음)";
                        appendLog("❌ 경로 파싱 실패", "err");
                    }
                } else {
                    appendLog("❌ window.pywebview.api.process_dropped_paths 가 없습니다!", "err");
                }
            } else {
                appendLog("❌ window.chrome.webview.postMessageWithAdditionalObjects 지원 안 됨 또는 파일 없음", "err");
            }
        });

        async function triggerOpen() {
            if (!currentActivePath) {
                alert("먼저 파일을 드래그 앤 드롭해주세요.");
                return;
            }
            appendLog(`--- [5] 파일 위치 열기 요청: "${currentActivePath}" ---`);
            if (window.pywebview && window.pywebview.api && window.pywebview.api.open_file_location) {
                const ok = await window.pywebview.api.open_file_location(currentActivePath);
                appendLog(`  -> 결과: ${ok ? '탐색기 실행 성공!' : '실패'}`, ok ? "highlight" : "err");
            }
        }
    </script>
</body>
</html>
"""

if __name__ == '__main__':
    api = DebugAPI()
    window = webview.create_window(
        'DnD & File Location Test', 
        html=HTML_CONTENT, 
        js_api=api,
        width=720, 
        height=620
    )
    webview.start(debug=True)
