import webview
import sys
import os

if sys.platform == 'darwin':
    import objc
    from AppKit import (
        NSObject, NSMenu, NSMenuItem, NSAlternateKeyMask,
        NSOnState, NSOffState, NSMakePoint, NSApplication,
        NSEvent, NSApplicationActivationPolicyRegular
    )
    from PyObjCTools import AppHelper

    class ActionTarget(NSObject):
        def initWithCallback_(self, cb):
            self = objc.super(ActionTarget, self).init()
            if self is None:
                return None
            self.cb = cb
            return self

        @objc.IBAction
        def action_(self, sender):
            if self.cb:
                self.cb()

class TestAPI:
    def __init__(self):
        self._window = None
        self._current_menu = None
        self._current_targets = []

    def show_menu(self, data):
        print(f"[API] 🍎 우클릭 컨텍스트 메뉴 요청 수신: {data}", flush=True)

        def _show():
            try:
                app = NSApplication.sharedApplication()
                app.activateIgnoringOtherApps_(True)

                bv = getattr(webview.platforms.cocoa.BrowserView, 'instances', {}).get(self._window.uid)
                ns_window = bv.window if bv else self._window.native
                webview_host = bv.webview if bv else ns_window.contentView()

                if ns_window:
                    ns_window.makeKeyAndOrderFront_(None)

                menu = NSMenu.alloc().initWithTitle_('ContextMenu')
                menu.setAutoenablesItems_(False)

                targets = []
                self._current_targets = targets
                self._current_menu = menu

                def add_item(title, cb, key='', mask=0, state=NSOffState, enabled=True):
                    if cb:
                        t = ActionTarget.alloc().initWithCallback_(cb)
                        targets.append(t)
                        it = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(title, 'action:', key)
                        it.setTarget_(t)
                    else:
                        it = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_(title, '', key)
                    if mask:
                        it.setKeyEquivalentModifierMask_(mask)
                    it.setState_(state)
                    it.setEnabled_(enabled)
                    menu.addItem_(it)
                    return it

                def on_click(msg):
                    print(f"[MENU_ACTION] ✅ 메뉴 항목 클릭됨: {msg}", flush=True)
                    if self._window:
                        self._window.evaluate_js(f"addLog('메뉴 클릭됨: {msg}')")

                # 메뉴 아이템 구성
                add_item("📁 파일 열기", lambda: on_click("파일 열기"))
                add_item("📂 폴더 열기", lambda: on_click("폴더 열기"))
                add_item("📍 파일 위치 열기", lambda: on_click("파일 위치 열기"))
                menu.addItem_(NSMenuItem.separatorItem())
                add_item("🔄 비교보기 모드", lambda: on_click("비교보기 모드"))
                add_item("⚙️ 옵션/설정 열기", lambda: on_click("옵션/설정 열기"))

                screen_mouse = NSEvent.mouseLocation()
                print(f"[COCOA] 🚀 NSMenu 표시 시작 (화면 좌표: {screen_mouse.x}, {screen_mouse.y})", flush=True)

                # 메뉴 표시
                menu.popUpMenuPositioningItem_atLocation_inView_(None, screen_mouse, None)
                print("[COCOA] ✅ NSMenu 종료됨 -> WebKitHost 커서 및 이벤트 핸들러 완전 복원", flush=True)

                # WebKitHost(WKWebView)에 정확히 포커스 및 커서 렉트 재동기화
                if ns_window and webview_host:
                    ns_window.makeKeyAndOrderFront_(None)
                    ns_window.makeFirstResponder_(webview_host)
                    ns_window.setAcceptsMouseMovedEvents_(True)
                    ns_window.invalidateCursorRectsForView_(webview_host)
                    ns_window.resetCursorRects()
                    webview_host.setNeedsDisplay_(True)
                    print("[COCOA] 🎯 WebKitHost FirstResponder 및 Cursor Rects 복원 완료!", flush=True)

            except Exception as e:
                print(f"[COCOA_ERR] {e}", flush=True)
                import traceback
                traceback.print_exc()

        AppHelper.callAfter(_show)
        return True

    def test_button_clicked(self, name):
        print(f"[JS -> PY] 🔘 버튼 클릭 확인됨: {name}", flush=True)
        return f"응답: {name} 처리 완료"

def main():
    api = TestAPI()
    html_content = """
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <title>우클릭 메뉴 후 버튼 먹통 및 커서 검증 테스트</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background: #18191c;
                color: #ffffff;
                height: 100vh;
                display: flex;
                flex-direction: column;
                padding: 24px;
                user-select: none;
            }
            .header {
                text-align: center;
                margin-bottom: 20px;
            }
            h1 { font-size: 20px; color: #00c6ff; margin-bottom: 6px; }
            p { font-size: 13px; color: #8f96a3; }
            
            .grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
                flex: 1;
            }
            
            .card {
                background: #23262d;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .card-title {
                font-size: 15px;
                font-weight: 600;
                color: #fff;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                padding-bottom: 8px;
            }

            .context-zone {
                flex: 1;
                background: rgba(0, 198, 255, 0.08);
                border: 2px dashed #00c6ff;
                border-radius: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                cursor: context-menu;
                text-align: center;
                padding: 20px;
                transition: background 0.2s;
            }
            .context-zone:hover {
                background: rgba(0, 198, 255, 0.15);
            }

            .btn-group {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            button {
                padding: 14px 18px;
                font-size: 14px;
                font-weight: 600;
                border: 1px solid transparent;
                border-radius: 8px;
                cursor: pointer !important;
                transition: all 0.15s ease;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            button:hover {
                filter: brightness(1.15);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            button:active {
                transform: scale(0.98);
            }
            .btn-primary { background: #007aff; color: white; }
            .btn-success { background: #34c759; color: white; }
            .btn-warning { background: #ff9500; color: white; }
            .btn-secondary { background: #3a3d45; color: white; border-color: rgba(255,255,255,0.1); }

            .counter-badge {
                background: rgba(0,0,0,0.3);
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 12px;
            }

            #log-box {
                height: 120px;
                background: #111215;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 8px;
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
                overflow-y: auto;
                color: #4cd964;
                margin-top: 14px;
            }
            .log-entry { margin-bottom: 4px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🖱️ 우클릭 메뉴 후 버튼 먹통 및 손가락 커서(Pointer) 검증</h1>
            <p>1. 우측 영역에서 <strong>우클릭</strong>하여 네이티브 메뉴를 띄우거나 닫아보세요.<br>2. 그 즉시 좌측 버튼들에 마우스를 올려 <strong>손가락 커서(👆)로 바뀌고 딜레이 없이 클릭되는지</strong> 확인하세요.</p>
        </div>

        <div class="grid">
            <!-- 좌측: 다양한 버튼들 -->
            <div class="card">
                <div class="card-title">🔘 일반 버튼 테스트 영역 (마우스 호버 & 클릭)</div>
                <div class="btn-group">
                    <button class="btn-primary" onclick="handleClick('⚙️ 옵션/설정 버튼')">
                        <span>⚙️ 옵션 / 설정 열기</span>
                        <span class="counter-badge" id="cnt-1">0회</span>
                    </button>
                    <button class="btn-success" onclick="handleClick('📂 파일/폴더 열기 버튼')">
                        <span>📂 파일 / 폴더 열기</span>
                        <span class="counter-badge" id="cnt-2">0회</span>
                    </button>
                    <button class="btn-warning" onclick="handleClick('🔄 비교보기 모드 토글')">
                        <span>🔄 비교보기 모드 토글</span>
                        <span class="counter-badge" id="cnt-3">0회</span>
                    </button>
                    <button class="btn-secondary" onclick="handleClick('📸 화면 캡처 버튼')">
                        <span>📸 화면 캡처 실행</span>
                        <span class="counter-badge" id="cnt-4">0회</span>
                    </button>
                </div>
            </div>

            <!-- 우측: 우클릭 영역 -->
            <div class="card">
                <div class="card-title">🖱️ 네이티브 우클릭 컨텍스트 영역</div>
                <div class="context-zone" id="ctx-zone">
                    <div style="font-size: 28px; margin-bottom: 8px;">🖱️</div>
                    <strong style="font-size: 15px; color: #00c6ff;">여기서 마우스 우클릭</strong>
                    <div style="font-size: 12px; color: #a0a5b5; margin-top: 6px;">
                        우클릭 메뉴를 띄운 뒤 아무데나 닫고,<br>
                        곧바로 좌측 버튼들에 마우스를 올려보세요!
                    </div>
                </div>
            </div>
        </div>

        <div id="log-box">
            <div class="log-entry">🟢 테스트 준비 완료. 우클릭 후 버튼에 마우스를 올리고 클릭해보세요.</div>
        </div>

        <script>
            const counts = {};
            function addLog(msg) {
                const box = document.getElementById('log-box');
                const entry = document.createElement('div');
                entry.className = 'log-entry';
                entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
                box.appendChild(entry);
                box.scrollTop = box.scrollHeight;
            }

            function handleClick(btnName) {
                counts[btnName] = (counts[btnName] || 0) + 1;
                addLog(`⚡ 버튼 클릭 성공 (즉시 반응): [${btnName}] (${counts[btnName]}회)`);
                
                if (btnName.includes('옵션')) document.getElementById('cnt-1').textContent = `${counts[btnName]}회`;
                if (btnName.includes('파일')) document.getElementById('cnt-2').textContent = `${counts[btnName]}회`;
                if (btnName.includes('비교')) document.getElementById('cnt-3').textContent = `${counts[btnName]}회`;
                if (btnName.includes('캡처')) document.getElementById('cnt-4').textContent = `${counts[btnName]}회`;

                if (window.pywebview && window.pywebview.api) {
                    window.pywebview.api.test_button_clicked(btnName);
                }
            }

            window.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                addLog(`🖱️ 우클릭 감지됨 (${e.clientX}, ${e.clientY}) -> 네이티브 메뉴 팝업 호출`);
                if (window.pywebview && window.pywebview.api) {
                    window.pywebview.api.show_menu({
                        clientX: e.clientX,
                        clientY: e.clientY
                    });
                }
            });
        </script>
    </body>
    </html>
    """
    
    window = webview.create_window(
        "버튼 먹통 및 손가락 커서 검증 테스트",
        html=html_content,
        js_api=api,
        width=720,
        height=580
    )
    api._window = window
    window.events.closed += lambda: os._exit(0)
    webview.start(debug=False)
    os._exit(0)

if __name__ == '__main__':
    main()
