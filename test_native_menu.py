import webview
import sys
import os

if sys.platform == 'darwin':
    import objc
    from AppKit import (
        NSObject, NSMenu, NSMenuItem, NSAlternateKeyMask,
        NSOnState, NSOffState, NSMakePoint, NSApplication,
        NSEvent
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
        print(f"[API] 🍎 우클릭 요청 수신: {data}", flush=True)

        def _show():
            try:
                app = NSApplication.sharedApplication()
                app.activateIgnoringOtherApps_(True)

                if self._window and self._window.native:
                    self._window.native.makeKeyAndOrderFront_(None)

                menu = NSMenu.alloc().initWithTitle_('NativeContextMenu')
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
                    print(f"[MENU_CLICK] ✅ 메뉴 선택됨: {msg}", flush=True)
                    if self._window:
                        self._window.evaluate_js(f"showLog('선택된 항목: {msg}')")

                # 1. 서브메뉴: 이미지 열기
                sub_item = add_item("📁 이미지 열기 (서브메뉴)", None)
                sub_menu = NSMenu.alloc().initWithTitle_("이미지 열기")
                sub_menu.setAutoenablesItems_(False)
                
                t1 = ActionTarget.alloc().initWithCallback_(lambda: on_click("파일 열기"))
                targets.append(t1)
                sub_file = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("파일 열기", "action:", "")
                sub_file.setTarget_(t1)
                sub_menu.addItem_(sub_file)

                t2 = ActionTarget.alloc().initWithCallback_(lambda: on_click("폴더 열기"))
                targets.append(t2)
                sub_folder = NSMenuItem.alloc().initWithTitle_action_keyEquivalent_("폴더 열기", "action:", "")
                sub_folder.setTarget_(t2)
                sub_menu.addItem_(sub_folder)

                sub_item.setSubmenu_(sub_menu)

                # 2. 파일 위치 열기
                add_item("📍 파일 위치 열기", lambda: on_click("파일 위치 열기"))
                menu.addItem_(NSMenuItem.separatorItem())

                # 3. 토글 항목
                add_item("🔄 비교보기 모드 (체크)", lambda: on_click("비교보기 모드 토글"), state=NSOnState)
                add_item("🔗 스크롤 동기화 (체크)", lambda: on_click("스크롤 동기화 토글"), state=NSOnState)
                menu.addItem_(NSMenuItem.separatorItem())

                add_item("📸 현재 화면 캡처 (⌥C)", lambda: on_click("화면 캡처"), key='c', mask=NSAlternateKeyMask)
                add_item("✂️ 영역 지정 캡처 (⌥X)", lambda: on_click("영역 캡처"), key='x', mask=NSAlternateKeyMask)
                add_item("📐 자유형 영역 캡처 (⌥Z)", lambda: on_click("자유형 캡처"), key='z', mask=NSAlternateKeyMask)
                menu.addItem_(NSMenuItem.separatorItem())

                # 5. 설정 및 새 창
                add_item("⚙️ 상세 설정 열기", lambda: on_click("상세 설정 열기"))
                menu.addItem_(NSMenuItem.separatorItem())
                add_item("🪟 새 창 열기", lambda: on_click("새 창 열기"))

                # 마우스의 현재 글로벌 화면 좌표를 사용하여 팝업
                screen_mouse = NSEvent.mouseLocation()
                print(f"[COCOA] 🚀 screen_mouse={screen_mouse.x}, {screen_mouse.y} 위치에 팝업 띄움 (view=None)", flush=True)

                # view=None 일 때 location은 화면(Screen) 절대 좌표로 동작하여 WKWebView의 이벤트 가로챔을 방지합니다.
                menu.popUpMenuPositioningItem_atLocation_inView_(None, screen_mouse, None)
                print("[COCOA] ✅ 메뉴 닫힘(종료됨)", flush=True)

            except Exception as e:
                print(f"[COCOA_ERR] {e}", flush=True)
                import traceback
                traceback.print_exc()

        AppHelper.callAfter(_show)
        return True

def main():
    api = TestAPI()
    html_content = """
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <title>macOS 네이티브 우클릭 메뉴 테스트</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background: linear-gradient(135deg, #18191c 0%, #252830 100%);
                color: #ffffff;
                height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                user-select: none;
            }
            .card {
                background: rgba(255, 255, 255, 0.05);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                padding: 40px;
                text-align: center;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            }
            h1 { font-size: 24px; font-weight: 700; margin-bottom: 12px; color: #00c6ff; }
            p { font-size: 14px; color: #a0a5b5; margin-bottom: 24px; line-height: 1.6; }
            .test-area {
                background: rgba(0, 198, 255, 0.1);
                border: 2px dashed #00c6ff;
                border-radius: 12px;
                padding: 40px 20px;
                cursor: context-menu;
                transition: all 0.2s ease;
            }
            .test-area:hover {
                background: rgba(0, 198, 255, 0.18);
                border-color: #007aff;
                transform: scale(1.02);
            }
            .badge {
                display: inline-block;
                background: #007aff;
                color: white;
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
                margin-top: 15px;
            }
            #log-box {
                margin-top: 25px;
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 8px;
                padding: 12px;
                font-family: monospace;
                font-size: 13px;
                color: #4cd964;
                min-height: 40px;
                word-break: break-all;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>🍎 macOS Native Menu Test</h1>
            <p>아래 하늘색 영역 또는 화면 아무 곳이나 <strong>마우스 우클릭</strong>하여 macOS 네이티브 컨텍스트 메뉴가 정상적으로 뜨는지 확인해보세요.</p>
            
            <div class="test-area" id="trigger-area">
                🖱️ <strong>여기를 마우스 우클릭하세요!</strong>
                <br>
                <span class="badge">Right Click Here</span>
            </div>

            <div id="log-box">대기 중... (우클릭을 해보세요)</div>
        </div>

        <script>
            function showLog(msg) {
                const log = document.getElementById('log-box');
                log.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
            }

            window.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showLog(`우클릭 감지됨 (${e.clientX}, ${e.clientY}) -> 네이티브 메뉴 호출`);
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
        "macOS 네이티브 메뉴 테스트",
        html=html_content,
        js_api=api,
        width=650,
        height=550
    )
    api._window = window
    webview.start(debug=False)

if __name__ == '__main__':
    main()
