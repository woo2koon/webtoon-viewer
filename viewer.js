// ============================================================
//  0. [디자인 & 렌더링 패치] 스타일 강제 주입
// ============================================================
const stylePatch = document.createElement('style');
stylePatch.innerHTML = `
    /* 1. 사이드바 스타일 */
    #nav-sidebar {
        display: flex !important;
        flex-direction: column !important;
        overflow-y: auto !important;
        flex-wrap: nowrap !important;
        height: 100vh !important;
        padding-bottom: 50px !important;
        background: #1a1a1a !important;
        border-left: 1px solid #333 !important;
        position: fixed; top: 0; right: 0; width: 100px; z-index: 301;
        transform: translateX(100%); transition: transform 0.3s;
        
        /* 스크롤바 숨기기 (영역 스크롤 기능은 유지) */
        scrollbar-width: none !important; /* Firefox */
        -ms-overflow-style: none !important; /* IE/Edge */
    }
    #nav-sidebar::-webkit-scrollbar {
        display: none !important; /* Chrome, Safari, WebView2 */
    }
    #nav-trigger { position: fixed; top: 0; right: 0; bottom: 0; width: 20px; z-index: 300; display: none; }
    #nav-trigger:hover ~ #nav-sidebar, #nav-sidebar:hover { transform: translateX(0); }

    /* 미니맵 고정 상태 레이아웃 */
    body {
        transition: padding-right 0.3s ease !important;
    }
    body.minimap-pinned {
        padding-right: 100px !important;
    }
    body.minimap-pinned #nav-sidebar {
        transform: translateX(0) !important;
    }

    /* 임시 레이아웃 변경 시 트랜지션 해제 클래스 */
    body.no-transition, body.no-transition * {
        transition: none !important;
    }


    /* 미니맵 고정(핀) 버튼 스타일 */
    #btn-pin-minimap {
        position: sticky !important;
        top: 0px !important;
        align-self: flex-end !important;
        background: rgba(34, 34, 34, 0.85) !important;
        border: 1px solid #444 !important;
        border-radius: 50% !important;
        width: 30px !important;
        height: 30px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        color: #888 !important;
        z-index: 100 !important;
        margin-bottom: 8px !important;
        flex-shrink: 0 !important;
        transition: background-color 0.2s, color 0.2s, transform 0.2s !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4) !important;
    }
    #btn-pin-minimap:hover {
        background-color: #333 !important;
        color: #fff !important;
        transform: scale(1.1) !important;
    }
    #btn-pin-minimap.pinned {
        color: #007aff !important;
        background-color: rgba(0, 122, 255, 0.15) !important;
        border-color: #007aff !important;
    }

    /* 개별 썸네일 내부의 뷰포트 시각화 오버레이 */
    .thumb-viewport-overlay {
        position: absolute !important;
        left: 0 !important;
        top: 0;
        width: 100% !important;
        height: 0;
        border: 2px dashed #007aff !important;
        background-color: rgba(0, 122, 255, 0.15) !important;
        pointer-events: none !important;
        z-index: 5 !important;
        box-sizing: border-box !important;
        display: none;
    }

    .nav-thumb-item {
        position: relative !important;
        flex-shrink: 0 !important;
        height: auto !important;
        margin-bottom: 10px !important;
        border: 1px solid #333;
        background: #000;
        display: block !important;
        border-radius: 4px;
        overflow: hidden;
        cursor: pointer;
        transition: border-color 0.2s;
    }
    .nav-thumb-item.active { border: 2px solid #007aff !important; }
    .nav-thumb-item img {
        width: 100% !important;
        height: auto !important;
        display: block !important;
    }
    .thumb-label {
        position: absolute !important;
        top: 4px !important; left: 4px !important; z-index: 10 !important;
        background: rgba(0, 0, 0, 0.8) !important; color: #fff !important;
        padding: 3px 8px !important; border-radius: 4px !important;
        font-size: 12px !important; font-weight: bold !important;
        box-shadow: 0 1px 2px rgba(0,0,0,0.5) !important;
    }
    .nav-thumb-item.active .thumb-label { background: #007aff !important; color: #fff !important; }

    /* 2. [핵심 수정] 메인 뷰어 컨테이너 */
    #viewer-container {
        font-size: 0 !important;
        line-height: 0 !important;
        display: flex;
        flex-direction: column;
        
        /* 초기 상태: 검은 배경 */
        background-color: #000 !important;
        min-height: 100vh !important;
        margin: 0 auto !important; /* 가로 맞춤 시 중앙 배치 */
        position: relative !important; /* [추가] 정밀한 위치 계산을 위한 기준점 */
    }

    /* 로딩 완료 후 배경 처리 */
    body.has-images #viewer-container {
        background-color: transparent !important;
    }

    /* 안내 메시지 스타일 (유지) */
    #message-box {
        font-size: 16px !important; line-height: 1.5 !important; color: #888 !important;
    }

    /* 3. 이미지 조각 스타일 (모드별 대응) */
    .viewer-image {
        display: block !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        margin-bottom: -1px !important;
        transform: none !important;
        image-rendering: auto; 
        background: transparent !important; 
    }

    /* [가로 맞춤] 창 너비나 슬라이더에 맞춤 */
    body.view-mode-fit #viewer-container {
        width: 100% !important;
        max-width: var(--container-width) !important;
    }
    body.view-mode-fit .viewer-image {
        width: 100% !important;
        height: auto !important;
    }

    /* [원본 크기] 이미지 실제 픽셀 크기 고정 */
    body.view-mode-original #viewer-container {
        width: fit-content !important;
        max-width: none !important;
        min-width: 100% !important;
        align-items: center !important;
    }
    body.view-mode-original .viewer-image {
        width: auto !important;
        max-width: none !important;
        height: auto !important;
    }

    /* 4. 페이지(파일) 단위 컨테이너 */
    .webtoon-page {
        display: flex !important;
        flex-direction: column !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
    }
    
    /* 원본 크기 모드에서 페이지 박스 크기 제한 해제 */
    body.view-mode-original .webtoon-page {
        width: fit-content !important;
        max-width: none !important;
    }

    body.spacing-collapsed .webtoon-page { margin-bottom: 0 !important; }
    body:not(.spacing-collapsed) .webtoon-page { margin-bottom: 20px !important; }

    /* (A) 간격 옵션 켜짐 (기본): 파일 간에도 딱 붙임 */
    body.spacing-collapsed .webtoon-page {
        margin-bottom: 0 !important;
    }

    /* (B) 간격 옵션 꺼짐: 파일 사이에만 20px 띄움 */
    body:not(.spacing-collapsed) .webtoon-page {
        margin-bottom: 20px !important;
    }

    /* 5. 설정창 디자인 */
    #settings-panel {
        background-color: #222 !important;
        border: 1px solid #444 !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
        border-radius: 12px !important;
        padding: 16px 20px !important;
        width: 240px !important;
        color: #eee !important;
        position: fixed; top: 80px; left: 20px; z-index: 199; display: none;
    }
    #settings-panel.show { display: block; }
    .panel-header, .group-title {
        color: #aaa !important;
        font-size: 13px !important;
        font-weight: bold !important;
        margin-bottom: 6px !important;
    }
    .btn-row { display: flex; gap: 8px; margin-bottom: 10px; }
    .size-btn {
        flex: 1; padding: 8px 0 !important; border-radius: 6px !important;
        border: none !important; background: #444 !important; color: #ccc !important;
        font-weight: bold !important; cursor: pointer; transition: 0.2s;
    }
    .size-btn.active { background: #007aff !important; color: #fff !important; }
    input[type=range] { width: 100%; accent-color: #007aff !important; cursor: pointer; }
    .slider-labels { display: flex; justify-content: space-between; font-size: 11px; color: #888; margin-top: 5px; font-weight: bold; }

    #settings-panel input[type="checkbox"] {
        appearance: none; width: 40px; height: 22px; background: #555;
        border-radius: 20px; position: relative; cursor: pointer; outline: none;
        transition: background 0.3s; vertical-align: middle;
    }
    #settings-panel input[type="checkbox"]::after {
        content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
        background: white; border-radius: 50%; transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    #settings-panel input[type="checkbox"]:checked { background: #007aff; }
    #settings-panel input[type="checkbox"]:checked::after { transform: translateX(18px); }
    #settings-panel label {
        display: flex !important; justify-content: space-between !important;
        align-items: center !important; margin-bottom: 8px !important; cursor: pointer;
    }

    /* 6. 토스트 알림 메시지 스타일 */
    #toast-message {
        position: fixed;
        top: 45px;
        left: 50%;
        transform: translateX(-50%) translateY(-50px);
        background: rgba(30, 30, 30, 0.95);
        color: #fff;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 15px;
        font-weight: bold;
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
        border: 1px solid #007aff; /* 포인트 컬러 적용 */
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    #toast-message.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }

    /* 7. 아이콘 공통 스타일 */
    .icon {
        width: 18px;
        height: 18px;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
        vertical-align: middle;
        flex-shrink: 0;
        display: inline-block;
        pointer-events: none;
    }
    .icon.spin {
        animation: icon-spin 1s linear infinite;
    }
    @keyframes icon-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    /* 8. 영역 지정 캡처 시 레이아웃 제어 (우선순위를 보장하기 위해 가장 하단에 정의) */
    body.selecting:not(.minimap-pinned) {
        padding-right: 0 !important;
    }
    body.selecting, body.selecting * {
        transition: none !important;
    }
    body.selecting #nav-trigger {
        display: none !important;
    }
    body.selecting:not(.minimap-pinned) #nav-sidebar {
        transform: translateX(100%) !important;
        pointer-events: none !important;
    }
    body.selecting.minimap-pinned #nav-sidebar {
        pointer-events: none !important; /* 캡처 드래그 중 오동작 방지 */
    }
    body.selecting #viewer-container {
        max-width: calc(var(--container-width) - 60px) !important;
        width: calc(100% - 60px) !important;
    }
    /* 캡처 진입/탈출 시 컨테이너 너비만 부드럽게 애니메이션 */
    body.selecting #viewer-container,
    body.selecting-transition #viewer-container {
        transition: width 0.15s ease-in-out, max-width 0.15s ease-in-out !important;
    }


`;
document.head.appendChild(stylePatch);

// ============================================================
//  아이콘 데이터 정의 (SVG)
// ============================================================
const ICON_MAP = {
    check: `<svg class="icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    alert: `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    x: `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    camera: `<svg class="icon" viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
    loader: `<svg class="icon spin" viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`,
    pin: `<svg class="icon" viewBox="0 0 24 24" style="transform: rotate(0deg);"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.55A2 2 0 0 1 15 9.24V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.24a2 2 0 0 1-.78 1.21l-2.78 3.55A2 2 0 0 0 5 15.24V17z"/></svg>`,
    pinOff: `<svg class="icon" viewBox="0 0 24 24" style="transform: rotate(-45deg);"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.55A2 2 0 0 1 15 9.24V5a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.24a2 2 0 0 1-.78 1.21l-2.78 3.55A2 2 0 0 0 5 15.24V17z"/></svg>`
};

// ============================================================
//  1. DOM 요소 & 변수 선언
// ============================================================

let isMinimapEnabled = true; // 여기에 한 번만 선언합니다.
let isMinimapPinned = false; // 미니맵 고정(Lock) 여부
let createdUrls = [];
let currentFileKey = "";
let scrollSaveTimer = null;
let currentCaptureFormat = "png";

let scrollVelocityY = 0; // 수직 속도
let scrollVelocityX = 0; // 수평 속도
let isAccelEnabled = false; 
let isStepScrollEnabled = true;
let stepAmount = 100;

const hiddenInput = document.getElementById('hidden-file-input');
const hiddenFolderInput = document.getElementById('hidden-folder-input');
const container = document.getElementById('viewer-container');
const menuBtn = document.getElementById('menu-btn');
const settingsPanel = document.getElementById('settings-panel');
const body = document.body;
const pageIndicator = document.getElementById('page-indicator');
const navSidebar = document.getElementById('nav-sidebar');
// 전역 변수로 한 번만 선언합니다.
const dropOverlay = document.getElementById('drop-overlay');

const menuFileBtn = document.getElementById('menu-file-btn');
const menuFolderBtn = document.getElementById('menu-folder-btn');
const centerFileBtn = document.getElementById('center-file-btn');
const centerFolderBtn = document.getElementById('center-folder-btn');

const resumeModal = document.getElementById('resume-modal');
const btnResumeYes = document.getElementById('btn-resume-yes');
const btnResumeNo = document.getElementById('btn-resume-no');

let totalFiles = 0;

const friction = 0.80;    
const accelFactor = 0.7;

// ============================================================
//  2. 설정 로드
// ============================================================


// 미니맵 가시성을 업데이트하는 함수 (최종 수정 버전)
function updateMinimapUI(enabled) {
    const trigger = document.getElementById('nav-trigger');
    const sidebar = document.getElementById('nav-sidebar');
    // 이미지가 하나라도 로드되었는지 확인
    const hasImages = document.body.classList.contains('has-images');

    if (enabled && hasImages) {
        // [수정] 트리거를 보여주고, 사이드바를 가로막던 !important 속성을 제거합니다.
        trigger.style.setProperty('display', 'block', 'important');
        sidebar.style.removeProperty('transform'); 
        
        // 핀 상태 동기화
        body.classList.toggle('minimap-pinned', isMinimapPinned);
        
        // 핀 버튼 동적 추가
        let pinBtn = document.getElementById('btn-pin-minimap');
        if (!pinBtn) {
            pinBtn = document.createElement('button');
            pinBtn.id = 'btn-pin-minimap';
            pinBtn.title = isMinimapPinned ? "미니맵 고정 해제" : "미니맵 고정";
            
            if (isMinimapPinned) {
                pinBtn.classList.add('pinned');
                pinBtn.innerHTML = ICON_MAP.pin;
            } else {
                pinBtn.innerHTML = ICON_MAP.pinOff;
            }
            
            // 첫 번째 자식으로 핀 버튼 삽입
            if (sidebar.firstChild) {
                sidebar.insertBefore(pinBtn, sidebar.firstChild);
            } else {
                sidebar.appendChild(pinBtn);
            }
            
            pinBtn.onclick = (e) => {
                e.stopPropagation();
                
                // 핀 토글 직전 현재 스크롤 앵커(보고 있는 위치)를 수학적으로 계산
                const anchor = calculateAnchorFromPast();
                
                // 레이아웃 변화가 즉시 일어나도록 트랜지션 임시 해제 클래스 추가
                body.classList.add('no-transition');
                
                isMinimapPinned = !isMinimapPinned;
                body.classList.toggle('minimap-pinned', isMinimapPinned);
                pinBtn.classList.toggle('pinned', isMinimapPinned);
                
                window.pywebview.api.save_settings({ app: { minimapPinned: isMinimapPinned } });
                
                if (isMinimapPinned) {
                    pinBtn.innerHTML = ICON_MAP.pin;
                    pinBtn.title = "미니맵 고정 해제";
                } else {
                    pinBtn.innerHTML = ICON_MAP.pinOff;
                    pinBtn.title = "미니맵 고정";
                }
                
                // 브라우저 리플로우 강제 유도하여 컨테이너 너비 즉시 적용
                body.offsetHeight;
                
                // 바뀐 가로 너비 기준에 맞춰 스크롤 위치 보정 및 복원
                _lastScrollY = window.scrollY;
                _lastInnerHeight = window.innerHeight;
                const container = document.getElementById('viewer-container');
                if (container) _lastContainerWidth = container.clientWidth;
                
                applyMathAnchor(anchor);
                
                // 트랜지션 클래스 제거
                setTimeout(() => {
                    body.classList.remove('no-transition');
                }, 50);
                
                setTimeout(updateMinimapViewportIndicator, 100);
            };
        }
        
        // 미니맵 활성화 시 인디케이터 즉시 업데이트
        setTimeout(updateMinimapViewportIndicator, 50);
    } else {
        // 미니맵 미사용 시: 트리거를 숨기고, 사이드바를 강제로 화면 밖(100%)으로 밀어냅니다.
        trigger.style.setProperty('display', 'none', 'important');
        sidebar.style.setProperty('transform', 'translateX(100%)', 'important');
        
        // 고정 클래스 제거
        body.classList.remove('minimap-pinned');
        
        // 핀 버튼 제거
        const pinBtn = document.getElementById('btn-pin-minimap');
        if (pinBtn) pinBtn.remove();
        
        updateMinimapViewportIndicator(); // 각 썸네일별 오버레이 숨기기 유도
    }
}

// 미니맵 현재 뷰포트 시각화 인디케이터 업데이트 함수
function updateMinimapViewportIndicator() {
    const sidebar = document.getElementById('nav-sidebar');
    if (!sidebar) return;

    const pages = Array.from(document.querySelectorAll('.webtoon-page'));
    const thumbs = Array.from(sidebar.querySelectorAll('.nav-thumb-item'));

    // 미니맵 비활성화 혹은 이미지가 없는 경우 모든 개별 오버레이 제거/숨김
    const hasImages = document.body.classList.contains('has-images');
    if (!hasImages || !isMinimapEnabled || pages.length === 0 || thumbs.length === 0 || pages.length !== thumbs.length) {
        thumbs.forEach(thumb => {
            const overlay = thumb.querySelector('.thumb-viewport-overlay');
            if (overlay) overlay.style.display = 'none';
        });
        return;
    }

    const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const viewportHeight = window.innerHeight;
    const scrollBottom = scrollY + viewportHeight;

    // 1. 각 페이지의 top, bottom 절대 위치 (document 기준) 구하기
    const pageOffsets = pages.map(page => {
        const rect = page.getBoundingClientRect();
        const top = rect.top + scrollY;
        return {
            top: top,
            height: rect.height,
            bottom: top + rect.height
        };
    });

    // 2. 각 썸네일마다 뷰포트와 겹치는 영역 계산 및 오버레이 적용
    for (let i = 0; i < pageOffsets.length; i++) {
        const page = pageOffsets[i];
        const thumb = thumbs[i];
        
        // 개별 오버레이 엘리먼트 획득 또는 동적 생성
        let overlay = thumb.querySelector('.thumb-viewport-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'thumb-viewport-overlay';
            thumb.appendChild(overlay);
        }

        // 현재 뷰포트 범위와 이 페이지가 겹치는지 체크
        const overlapTop = Math.max(page.top, scrollY);
        const overlapBottom = Math.min(page.bottom, scrollBottom);

        if (overlapTop < overlapBottom && page.height > 0) {
            // 겹치는 구간을 썸네일 내부 퍼센트 좌표로 환산
            const visibleTopPercent = (overlapTop - page.top) / page.height;
            const visibleBottomPercent = (overlapBottom - page.top) / page.height;

            const topPercent = visibleTopPercent * 100;
            const heightPercent = (visibleBottomPercent - visibleTopPercent) * 100;

            overlay.style.top = `${topPercent}%`;
            overlay.style.height = `${heightPercent}%`;
            overlay.style.display = 'block';
        } else {
            // 전혀 겹치지 않는 페이지는 숨김
            overlay.style.display = 'none';
        }
    }
}

let _minimapUpdatePending = false;
function queueMinimapUpdate() {
    if (_minimapUpdatePending) return;
    _minimapUpdatePending = true;
    requestAnimationFrame(() => {
        updateMinimapViewportIndicator();
        _minimapUpdatePending = false;
    });
}

// 스크롤 및 창 크기 조절 시 미니맵 뷰포트 표시 영역 실시간 업데이트
window.addEventListener('scroll', queueMinimapUpdate, { passive: true });
window.addEventListener('resize', queueMinimapUpdate, { passive: true });

async function loadSettings() {
    if (!window.pywebview || !window.pywebview.api) {
        tLog("⚠️ pywebview API not found in loadSettings");
        return;
    }
    
    const settings = await window.pywebview.api.get_settings();
    const app = settings.app || {};
    tLog(`⚙️ 로드된 설정: ${JSON.stringify(app)}`);

    // 1. 다크 모드
    const isDark = app.darkMode === true;
    body.classList.toggle('dark-mode', isDark);
    const darkToggle = document.getElementById('toggle-dark');
    if (darkToggle) darkToggle.checked = isDark;
    
    // 2. 간격 제거
    const isSpacingCollapsed = app.spacingCollapsed !== false;
    body.classList.toggle('spacing-collapsed', isSpacingCollapsed);
    const spacingToggle = document.getElementById('toggle-spacing');
    if(spacingToggle) spacingToggle.checked = isSpacingCollapsed;

    // 3. 보기 모드
    const viewMode = app.viewMode || 'fit';
    if (viewMode === 'original') {
        body.classList.add('view-mode-original');
        document.getElementById('btn-original').classList.add('active');
        document.getElementById('btn-fit').classList.remove('active');
    } else {
        body.classList.remove('view-mode-original');
        document.getElementById('btn-fit').classList.add('active');
        document.getElementById('btn-original').classList.remove('active');
    }

    // 4. 가로 크기
    const savedWidthScale = app.widthScale || '100';
    document.documentElement.style.setProperty('--container-width', `${690 * (savedWidthScale/100)}px`);
    const widthSlider = document.getElementById('width-slider');
    if (widthSlider) widthSlider.value = savedWidthScale;
    const widthValue = document.getElementById('width-value');
    if (widthValue) widthValue.textContent = `${savedWidthScale}%`;

    // 5. 스크롤 가속
    isAccelEnabled = app.scrollAccel === true;
    const accelToggle = document.getElementById('toggle-accel');
    if(accelToggle) accelToggle.checked = isAccelEnabled;

    // 6. 스텝 스크롤
    isStepScrollEnabled = app.stepScroll !== false;
    const stepToggle = document.getElementById('toggle-step-scroll');
    if(stepToggle) {
        stepToggle.checked = isStepScrollEnabled;
        const stepSliderContainer = document.getElementById('step-slider-container');
        if (stepSliderContainer) stepSliderContainer.style.display = isStepScrollEnabled ? 'block' : 'none';
    }

    // 7. 스텝 거리
    stepAmount = parseInt(app.stepAmount || '100');
    const stepSlider = document.getElementById('step-slider');
    if(stepSlider) {
        stepSlider.value = stepAmount;
        const stepVal = document.getElementById('step-value');
        if (stepVal) stepVal.textContent = `${stepAmount}px`;
    }

    // 8. 미니맵
    isMinimapEnabled = app.minimapEnabled !== false;
    isMinimapPinned = app.minimapPinned === true;
    body.classList.toggle('minimap-pinned', isMinimapPinned);

    const minimapToggle = document.getElementById('toggle-minimap');
    if(minimapToggle) {
        minimapToggle.checked = isMinimapEnabled;
        updateMinimapUI(isMinimapEnabled);
    }

    // 9. 캡처 저장 포맷
    currentCaptureFormat = app.captureFormat || "png";
    updateCustomDropdownUI(currentCaptureFormat);
}


function restoreSliderLabels() {
    const sliderContainer = document.getElementById('width-slider-container');
    if (sliderContainer && !sliderContainer.querySelector('.slider-labels')) {
        const labels = document.createElement('div');
        labels.className = 'slider-labels';
        labels.innerHTML = '<span>좁게</span><span>기본</span><span>넓게</span>';
        sliderContainer.appendChild(labels);
    }
}



// ============================================================
//  3. 이벤트 리스너
// ============================================================
// centerFileBtn.addEventListener('click', () => hiddenInput.click());
// menuFileBtn.addEventListener('click', () => { hiddenInput.click(); settingsPanel.classList.remove('show'); });

// centerFolderBtn.addEventListener('click', () => hiddenFolderInput.click());
// menuFolderBtn.addEventListener('click', () => { hiddenFolderInput.click(); settingsPanel.classList.remove('show'); });

// hiddenInput.addEventListener('change', (e) => startProcess(Array.from(e.target.files)));
// hiddenFolderInput.addEventListener('change', (e) => startProcess(Array.from(e.target.files)));

// ============================================================
//  [통합] 파일/폴더 열기 및 윈도우 보안 우회 경로 처리
// ============================================================

// 1. 모든 열기 버튼 연결 (메뉴 & 중앙 버튼)
const btnConfigs = [
    { id: 'menu-folder-btn', type: 'folder' },
    { id: 'center-folder-btn', type: 'folder' },
    { id: 'menu-file-btn', type: 'file' },
    { id: 'center-file-btn', type: 'file' }
];

btnConfigs.forEach(config => {
    const btn = document.getElementById(config.id);
    if (btn) {
        btn.onclick = async (e) => {
            tLog(`🔘 버튼 클릭됨: ${config.id}`);
            e.preventDefault();
            e.stopImmediatePropagation();
            if (window.pywebview && window.pywebview.api) {
                const result = (config.type === 'folder') 
                    ? await window.pywebview.api.open_folder_dialog() 
                    : await window.pywebview.api.open_file_dialog();
                if (result) {
                    tLog(`📂 경로 선택 완료: ${result.folderPath}`);
                    finalizePathAndRender(result);
                }
            } else {
                tLog("⚠️ pywebview API를 찾을 수 없습니다.");
            }
        };
    }
});

// 2. 파이썬에 전달할 순수 경로만 정리하는 함수
function finalizePathAndRender(result) {
    const { folderPath, files } = result;

    const fileObjects = files.map(fileName => {
        // 복잡한 인코딩이나 URL 주소 없이, 하드디스크의 순수 경로만 묶어줍니다.
        const fullPath = `${folderPath}/${fileName}`;
        return { name: fileName, rawPath: fullPath };
    });

    processPythonFiles(fileObjects, folderPath);
    if (settingsPanel) settingsPanel.classList.remove('show');
}

// 3. 브라우저 네트워크를 거치지 않고 메인 이미지와 썸네일을 동시 생성하는 최종 함수
async function processPythonFiles(fileObjects, folderPath) {
    const vContainer = document.getElementById('viewer-container');
    const navSidebar = document.getElementById('nav-sidebar'); // 썸네일 컨테이너
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const loadingBar = document.getElementById('progress-bar');

    if (!vContainer) return;

    // 메인 화면과 미니맵 초기화
    vContainer.innerHTML = ''; 
    if (navSidebar) navSidebar.innerHTML = ''; 
    currentFileKey = folderPath; 
    totalFiles = fileObjects.length;

    // 로딩 처리 제거됨


    let processedCount = 0;

    for (const [index, file] of fileObjects.entries()) {
        // [A] 메인 뷰어 이미지 틀 생성
        const img = document.createElement('img');
        img.className = 'viewer-image webtoon-page'; 
        img.id = `file-start-${index}`; // 썸네일 클릭 시 이동할 타겟 위치
        img.dataset.fileIndex = index;
        img.draggable = false;
        vContainer.appendChild(img);

        // [B] 사이드바 썸네일 틀 생성
        const thumbItem = document.createElement('div');
        thumbItem.className = 'nav-thumb-item';
        thumbItem.id = `thumb-${index}`;
        thumbItem.dataset.idx = index;
        
        const label = document.createElement('div');
        label.className = 'thumb-label';
        label.textContent = index + 1;
        thumbItem.appendChild(label);
        
        const thumbImg = document.createElement('img');
        thumbItem.appendChild(thumbImg);
        if (navSidebar) navSidebar.appendChild(thumbItem);

        // 썸네일 클릭 시 해당 이미지로 스크롤 이동
        thumbItem.onclick = (e) => {
            document.querySelectorAll('.nav-thumb-item').forEach(el => el.classList.remove('active'));
            thumbItem.classList.add('active');

            // 클릭된 Y 좌표 비율 계산
            const rect = thumbItem.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const clickRatio = Math.max(0, Math.min(1, clickY / rect.height));

            // 메인 뷰어 상의 해당 이미지 절대 위치 및 높이 계산
            const imgRect = img.getBoundingClientRect();
            const imgTop = imgRect.top + (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0);
            const imgHeight = imgRect.height;

            const targetScrollY = imgTop + clickRatio * imgHeight - window.innerHeight / 2;
            window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
        };

        // [C] 파이썬에서 실제 이미지 데이터(Base64)를 한 번만 받아와서 양쪽에 동시에 뿌려줍니다.
        if (window.pywebview && window.pywebview.api) {
            try {
                const dataUrl = await window.pywebview.api.get_image_data(file.rawPath);
                if (dataUrl) {
                    img.onload = () => {
                        if (img.naturalWidth > 0) {
                            img.dataset.ratio = img.naturalHeight / img.naturalWidth;
                        }
                    };
                    img.src = dataUrl;
                    thumbImg.src = dataUrl; 
                }
            } catch (e) {
                console.error("이미지 로드 오류:", e);
            }
        }

        processedCount++;
        const percent = Math.round((processedCount / totalFiles) * 100);
    } // [수정] 누락되었던 for 루프 닫는 괄호 복구

    document.body.classList.add('has-images');
    pageIndicator.style.display = 'block';
    updatePageIndicator(1);
    
    if (typeof updateMinimapUI === 'function') updateMinimapUI(isMinimapEnabled);
    setupScrollObserver();

    checkResumeHistory(currentFileKey);
}


// ============================================================
//  4. 메인 처리 로직
// ============================================================
async function startProcess(files) {
    if (files.length === 0) return;

    container.innerHTML = '';
    navSidebar.innerHTML = '';
    createdUrls.forEach(url => URL.revokeObjectURL(url));
    createdUrls = [];
    
    // 로딩 처리 제거됨


    try {
        let imageBlobs = [];
        let fileKey = "";

        if (files.length === 1 && (files[0].name.endsWith('.zip') || files[0].name.endsWith('.cbz'))) {
            if (typeof JSZip === 'undefined') throw new Error("JSZip 라이브러리가 필요합니다.");
            // [개선] 파일명 + 크기 + 수정일자를 조합하여 고유 키를 생성합니다.
            fileKey = `zip_${files[0].name}_${files[0].size}_${files[0].lastModified}`;
            imageBlobs = await unzipFiles(files[0]);
        } else {
            // [수정] 파일 타입뿐만 아니라 확장자까지 확인하여 더 확실하게 이미지를 필터링합니다.
            const imgs = files.filter(f => {
                const isImgType = f.type && f.type.startsWith('image/');
                const isImgExt = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(f.name);
                return isImgType || isImgExt;
            });
            
            if (imgs.length === 0) throw new Error("인식 가능한 이미지 파일이 없습니다.");
            
            // [추가] 인식된 파일 개수를 사용자에게 알립니다.
            showToast(`${imgs.length}개의 이미지를 불러옵니다.`, "camera");
            
            // 파일 이름 순서대로 정렬 (숫자 정렬 포함)
            imgs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
            imageBlobs = imgs;
            // [개선] 첫 번째 파일명 + 총 파일 개수 + 첫 번째 파일 크기를 조합하여 고유 키를 생성합니다.
            fileKey = `folder_${imgs[0].name}_${imgs.length}_${imgs[0].size}`;
        }

        totalFiles = imageBlobs.length;
        currentFileKey = fileKey;

        const settings = await window.pywebview.api.get_settings();
        isMinimapEnabled = settings.app ? settings.app.minimapEnabled !== false : true;
        updateMinimapUI(isMinimapEnabled);
        pageIndicator.style.display = 'block';
        updatePageIndicator(1);
        
        await processImagesInBatches(imageBlobs);
        body.classList.add('has-images'); 
        updateMinimapUI(isMinimapEnabled);
        
        checkResumeHistory(fileKey);
        setupScrollObserver();
        setTimeout(updateMinimapViewportIndicator, 100);

    } catch (err) {
        console.error("처리 오류:", err);
        showToast("오류: " + err.message, "alert");
    }
}

async function processImagesInBatches(imageBlobs) {
    const vContainer = document.getElementById('viewer-container');
    const navSidebar = document.getElementById('nav-sidebar');
    
    let processedCount = 0;
    const total = imageBlobs.length;

    for (let i = 0; i < total; i++) {
        const blob = imageBlobs[i];
        const url = URL.createObjectURL(blob);
        createdUrls.push(url);

        // 메인 이미지
        const img = document.createElement('img');
        img.className = 'viewer-image webtoon-page';
        img.id = `file-start-${i}`;
        img.dataset.fileIndex = i;
        img.src = url;
        img.draggable = false;
        vContainer.appendChild(img);

        // 썸네일
        const thumbItem = document.createElement('div');
        thumbItem.className = 'nav-thumb-item';
        thumbItem.id = `thumb-${i}`;
        thumbItem.dataset.idx = i;

        const label = document.createElement('div');
        label.className = 'thumb-label';
        label.textContent = i + 1;
        thumbItem.appendChild(label);

        const thumbImg = document.createElement('img');
        thumbImg.src = url;
        thumbItem.appendChild(thumbImg);
        if (navSidebar) navSidebar.appendChild(thumbItem);

        thumbItem.onclick = (e) => {
            document.querySelectorAll('.nav-thumb-item').forEach(el => el.classList.remove('active'));
            thumbItem.classList.add('active');

            // 클릭된 Y 좌표 비율 계산
            const rect = thumbItem.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const clickRatio = Math.max(0, Math.min(1, clickY / rect.height));

            // 메인 뷰어 상의 해당 이미지 절대 위치 및 높이 계산
            const imgRect = img.getBoundingClientRect();
            const imgTop = imgRect.top + (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0);
            const imgHeight = imgRect.height;

            const targetScrollY = imgTop + clickRatio * imgHeight - window.innerHeight / 2;
            window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
        };

        processedCount++;
        if (i % 10 === 0) await new Promise(r => requestAnimationFrame(r));
    }
}

async function unzipFiles(file) {
    const zip = await new JSZip().loadAsync(file);
    const validFiles = [];
    zip.forEach((path, entry) => {
        if (!entry.dir && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(entry.name)) validFiles.push(entry);
    });
    validFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    
    const blobs = [];
    for (let i = 0; i < validFiles.length; i++) {
        blobs.push(await validFiles[i].async('blob'));
        if (i % 20 === 0) await new Promise(r => requestAnimationFrame(r));
    }
    return blobs;
}


// ============================================================
//  6. UI 유틸리티
// ============================================================
async function checkResumeHistory(key) {
    const settings = await window.pywebview.api.get_settings();
    const saved = settings.resume ? settings.resume[key] : null;
    if (saved && parseInt(saved) > 100) {
        resumeModal.style.display = 'flex';
        btnResumeYes.onclick = () => {
            const targetScrollY = parseInt(saved);
            let attempts = 0;
            const maxAttempts = 40; // 최대 4초간 100ms 간격으로 스크롤 시도
            const interval = setInterval(() => {
                window.scrollTo(0, targetScrollY);
                attempts++;
                if (Math.abs(window.scrollY - targetScrollY) < 5 || attempts >= maxAttempts) {
                    clearInterval(interval);
                }
            }, 100);
            resumeModal.style.display = 'none';
        };
        btnResumeNo.onclick = () => { resumeModal.style.display = 'none'; };
    }
}

window.addEventListener('scroll', () => {
    if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(async () => {
        if (currentFileKey && window.pywebview && window.pywebview.api) {
            const settings = await window.pywebview.api.get_settings();
            if (!settings.resume) settings.resume = {};
            
            const currentScrollY = parseInt(window.scrollY);
            if (currentScrollY > 100) {
                settings.resume[currentFileKey] = currentScrollY;
            } else {
                delete settings.resume[currentFileKey];
            }
            window.pywebview.api.save_settings(settings);
        }
    }, 500);
});

menuBtn.onclick = () => {
    tLog("⚙️ 메뉴 버튼 클릭됨");
    settingsPanel.classList.toggle('show');
};
window.onclick = (e) => { if (!settingsPanel.contains(e.target) && !menuBtn.contains(e.target)) settingsPanel.classList.remove('show'); };

const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            const idx = parseInt(e.target.dataset.fileIndex);
            document.querySelectorAll('.nav-thumb-item').forEach(el => el.classList.remove('active'));
            const thumb = document.getElementById(`thumb-${idx}`);
            if (thumb) {
                thumb.classList.add('active');
                thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            updatePageIndicator(idx + 1);
        }
    });
}, { rootMargin: '-40% 0px -60% 0px' }); 

function setupScrollObserver() {
    observer.disconnect();
    container.querySelectorAll('img').forEach(img => observer.observe(img));
}

function updatePageIndicator(curr) { pageIndicator.textContent = `${curr} / ${totalFiles}`; }

document.getElementById('toggle-dark').onchange = (e) => {
    body.classList.toggle('dark-mode', e.target.checked);
    window.pywebview.api.save_settings({ app: { darkMode: e.target.checked } });
};
document.getElementById('toggle-spacing').onchange = (e) => {
    body.classList.toggle('spacing-collapsed', e.target.checked);
    window.pywebview.api.save_settings({ app: { spacingCollapsed: e.target.checked } });
    setTimeout(updateMinimapViewportIndicator, 50);
};
document.getElementById('btn-fit').onclick = () => {
    body.classList.remove('view-mode-original');
    document.getElementById('btn-fit').classList.add('active');
    document.getElementById('btn-original').classList.remove('active');
    window.pywebview.api.save_settings({ app: { viewMode: 'fit' } });
    setTimeout(updateMinimapViewportIndicator, 50);
};
document.getElementById('btn-original').onclick = () => {
    body.classList.add('view-mode-original');
    document.getElementById('btn-original').classList.add('active');
    document.getElementById('btn-fit').classList.remove('active');
    window.pywebview.api.save_settings({ app: { viewMode: 'original' } });
    setTimeout(updateMinimapViewportIndicator, 50);
};
// ============================================================
//  크기 조절 시 스크롤 위치 완벽 보존 (Time-Travel Math Anchor)
// ============================================================

let _lastScrollY = 0;
let _lastInnerHeight = 0;
let _lastContainerWidth = 0;
let _isResizing = false;

// 1. 스크롤할 때마다 레이아웃 리플로우(Reflow)를 유발하지 않는 가벼운 값만 상시 저장
window.addEventListener('scroll', () => {
    if (!_isResizing) {
        _lastScrollY = window.scrollY;
        _lastInnerHeight = window.innerHeight;
        const container = document.getElementById('viewer-container');
        if (container) _lastContainerWidth = container.clientWidth;
    }
}, { passive: true });

// 초기화 시 한번 저장
setTimeout(() => {
    window.dispatchEvent(new Event('scroll'));
}, 500);

// 2. 과거의 숫자들을 이용해 "어떤 이미지의 몇 % 지점을 보고 있었는지" 수학적으로 역추적
function calculateAnchorFromPast() {
    const pages = document.querySelectorAll('.webtoon-page');
    if (pages.length === 0 || _lastContainerWidth === 0) return null;

    const absViewportMid = _lastScrollY + (_lastInnerHeight / 2);
    let currentAbsTop = 0;
    
    for (let i = 0; i < pages.length; i++) {
        const r = parseFloat(pages[i].dataset.ratio) || (pages[i].naturalHeight / pages[i].naturalWidth) || 0;
        // -1은 이미지 간의 margin-bottom: -1px 여백 겹침을 정확히 반영하기 위함
        const h = (_lastContainerWidth * r) - 1;
        if (h <= 0) continue;

        const nextAbsTop = currentAbsTop + h;
        
        if (currentAbsTop <= absViewportMid && nextAbsTop >= absViewportMid) {
            return { index: i, ratio: (absViewportMid - currentAbsTop) / h };
        }
        currentAbsTop = nextAbsTop;
    }
    return null;
}

// 3. 계산된 앵커(과거 위치)를 현재의 바뀐 크기에 맞춰 완벽하게 복원
function applyMathAnchor(anchor) {
    if (!anchor) return;
    
    const container = document.getElementById('viewer-container');
    if (!container) return;
    const currentContainerWidth = container.clientWidth;
    const pages = document.querySelectorAll('.webtoon-page');
    
    let currentAbsTop = 0;
    let targetAbsPos = 0;
    
    for (let i = 0; i < pages.length; i++) {
        const r = parseFloat(pages[i].dataset.ratio) || (pages[i].naturalHeight / pages[i].naturalWidth) || 0;
        const h = (currentContainerWidth * r) - 1;
        if (h <= 0) continue;
        
        if (i === anchor.index) {
            targetAbsPos = currentAbsTop + (h * anchor.ratio);
            break;
        }
        currentAbsTop += h;
    }
    
    const currentViewportMid = window.innerHeight / 2;
    window.scrollTo({ top: targetAbsPos - currentViewportMid, behavior: 'instant' });
}

// 4. 애니메이션 도중 실시간 60fps 스크롤 위치 고정 엔진
function calculateRealTimeAnchor() {
    const pages = document.querySelectorAll('.webtoon-page');
    if (pages.length === 0) return null;
    
    const viewportMid = window.innerHeight / 2;
    for (let i = 0; i < pages.length; i++) {
        const rect = pages[i].getBoundingClientRect();
        if (rect.top <= viewportMid && rect.bottom >= viewportMid) {
            return { index: i, ratio: (viewportMid - rect.top) / rect.height };
        }
    }
    // Fallback: find the one closest to the middle
    let closestIndex = 0;
    let minDistance = Infinity;
    for (let i = 0; i < pages.length; i++) {
        const rect = pages[i].getBoundingClientRect();
        const pageMid = rect.top + rect.height / 2;
        const dist = Math.abs(pageMid - viewportMid);
        if (dist < minDistance) {
            minDistance = dist;
            closestIndex = i;
        }
    }
    const rect = pages[closestIndex].getBoundingClientRect();
    const ratio = rect.height > 0 ? (viewportMid - rect.top) / rect.height : 0.5;
    return { index: closestIndex, ratio: Math.max(0, Math.min(1, ratio)) };
}

function applyRealTimeAnchor(anchor) {
    if (!anchor) return;
    const pages = document.querySelectorAll('.webtoon-page');
    const page = pages[anchor.index];
    if (!page) return;
    
    const pageRect = page.getBoundingClientRect();
    const deltaY = pageRect.top + (pageRect.height * anchor.ratio) - (window.innerHeight / 2);
    if (Math.abs(deltaY) > 0.1) {
        window.scrollBy(0, deltaY);
    }
}

function animateScrollAnchor(anchor, duration = 300) {
    const startTime = performance.now();
    function step(now) {
        const elapsed = now - startTime;
        
        applyRealTimeAnchor(anchor);
        
        if (elapsed < duration) {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
}


// [1. 슬라이더 조절 시]
document.getElementById('width-slider').oninput = (e) => {
    // 슬라이더는 드래그 중에도 최신 상태가 보존되므로 즉시 갱신
    _lastScrollY = window.scrollY;
    _lastInnerHeight = window.innerHeight;
    const container = document.getElementById('viewer-container');
    if (container) _lastContainerWidth = container.clientWidth;
    
    const anchor = calculateAnchorFromPast();
    
    const val = e.target.value;
    document.documentElement.style.setProperty('--container-width', `${690 * (val/100)}px`);
    document.getElementById('width-value').textContent = `${val}%`;
    window.pywebview.api.save_settings({ app: { widthScale: val } });
    
    // 변경 직후 즉시(동기적으로) 수학적 위치 복원
    applyMathAnchor(anchor);
    updateMinimapViewportIndicator();
};

// [2. 윈도우 창 크기 조절 시]
let _resizeTimer = null;
window.addEventListener('resize', () => {
    _isResizing = true;
    
    const anchor = calculateAnchorFromPast();
    applyMathAnchor(anchor);
    
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
        _isResizing = false;
        // 리사이즈 완료 후 새로운 안전 상태 저장
        _lastScrollY = window.scrollY;
        _lastInnerHeight = window.innerHeight;
        const container = document.getElementById('viewer-container');
        if (container) _lastContainerWidth = container.clientWidth;
    }, 200);
});

// 미니맵 토글 이벤트
document.getElementById('toggle-minimap').onchange = (e) => {
    const enabled = e.target.checked;
    
    // 토글 직전 현재 스크롤 앵커 계산
    const anchor = calculateAnchorFromPast();
    
    // 레이아웃 변화가 즉시 일어나도록 트랜지션 임시 해제 클래스 추가
    body.classList.add('no-transition');
    
    isMinimapEnabled = enabled;
    window.pywebview.api.save_settings({ app: { minimapEnabled: enabled } });
    updateMinimapUI(enabled);
    
    // 브라우저 리플로우 강제 유도
    body.offsetHeight;
    
    // 가로 너비 갱신 및 스크롤 위치 복원
    _lastScrollY = window.scrollY;
    _lastInnerHeight = window.innerHeight;
    const container = document.getElementById('viewer-container');
    if (container) _lastContainerWidth = container.clientWidth;
    
    applyMathAnchor(anchor);
    
    // 트랜지션 클래스 제거
    setTimeout(() => {
        body.classList.remove('no-transition');
    }, 50);
};

// 캡처 포맷 변경 이벤트
function updateCustomDropdownUI(format) {
    const label = document.getElementById('selected-format-label');
    if (label) {
        const textMap = { png: "PNG", jpeg: "JPG", webp: "WebP" };
        label.textContent = textMap[format] || format.toUpperCase();
    }
    document.querySelectorAll('.dropdown-option').forEach(opt => {
        if (opt.dataset.value === format) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });
}

// 커스텀 드롭다운 토글 및 옵션 선택 이벤트
const customDropdown = document.getElementById('dropdown-capture-format');
const dropdownTrigger = customDropdown ? customDropdown.querySelector('.dropdown-trigger') : null;

if (dropdownTrigger) {
    dropdownTrigger.onclick = (e) => {
        e.stopPropagation();
        customDropdown.classList.toggle('open');
    };
}

document.querySelectorAll('.dropdown-option').forEach(opt => {
    opt.onclick = (e) => {
        e.stopPropagation();
        const val = opt.dataset.value;
        currentCaptureFormat = val;
        updateCustomDropdownUI(val);
        window.pywebview.api.save_settings({ app: { captureFormat: val } });
        if (customDropdown) customDropdown.classList.remove('open');
    };
});

window.addEventListener('click', () => {
    if (customDropdown) customDropdown.classList.remove('open');
});

// 단축키 로직 수정 (기존 window.onkeydown을 찾아서 내용을 추가하세요)
const originalOnKeyDown = window.onkeydown;
window.onkeydown = (e) => {
    // [추가] 영역 지정 캡처 중 ESC 누르면 취소
    if (e.key === 'Escape' && typeof isSelecting !== 'undefined' && isSelecting) {
        endCropCapture(null);
        return;
    }


    // 포커스가 input이나 textarea에 있을 때는 단축키를 무시합니다.
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        if (originalOnKeyDown) originalOnKeyDown(e);
        return;
    }

    // 기존 스크롤 로직 실행
    if (originalOnKeyDown) originalOnKeyDown(e);

    const key = e.key.toLowerCase();



    // [추가] M 키를 누르면 미니맵 토글
    if (key === 'm') {
        const toggle = document.getElementById('toggle-minimap');
        if (toggle) {
            toggle.checked = !toggle.checked;
            toggle.dispatchEvent(new Event('change'));
        }
    }

    // [추가] C 키를 누르면 현재 화면 캡처
    if (key === 'c' && !(typeof isSelecting !== 'undefined' && isSelecting)) {
        const btn = document.getElementById('btn-capture');
        if (btn) btn.click();
    }

    // [추가] X 키를 누르면 영역 지정 캡처
    if (key === 'x' && !(typeof isSelecting !== 'undefined' && isSelecting)) {
        const btn = document.getElementById('btn-crop-capture');
        if (btn) btn.click();
    }
};

// dropOverlay 전역 변수를 재사용합니다. (중복 선언 제거됨)

window.addEventListener('dragover', (e) => { 
    e.preventDefault(); 
    if (dropOverlay) dropOverlay.style.display = 'flex';
});

window.addEventListener('dragleave', (e) => { 
    e.preventDefault(); 
    // 드래그가 화면 밖으로 완전히 나갔을 때만 숨깁니다.
    if (e.relatedTarget === null || e.fromElement === null) {
        if (dropOverlay) dropOverlay.style.display = 'none';
    }
});

window.addEventListener('drop', async (e) => { 
    e.preventDefault(); 
    if (dropOverlay) dropOverlay.style.display = 'none';
    
    // [중요] e.dataTransfer 데이터는 비동기 함수(await)를 거치면 사라질 수 있습니다.
    // 따라서 동기적으로 미리 Entry들을 뽑아내야 합니다.
    if (e.dataTransfer && e.dataTransfer.items) {
        const entries = [];
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
            const item = e.dataTransfer.items[i];
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry();
                if (entry) entries.push(entry);
            }
        }
        if (entries.length > 0) {
            const files = await getFilesFromEntries(entries);
            if (files.length > 0) startProcess(files);
        }
    } else if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        startProcess(Array.from(e.dataTransfer.files));
    }
});

async function getFilesFromEntries(entries) {
    const files = [];
    async function traverse(entry) {
        if (entry.isFile) {
            const file = await new Promise((resolve) => entry.file(resolve));
            files.push(file);
        } else if (entry.isDirectory) {
            const reader = entry.createReader();
            let allEntries = [];
            let readMore = true;
            while (readMore) {
                const results = await new Promise((resolve) => reader.readEntries(resolve));
                if (results.length > 0) {
                    allEntries = allEntries.concat(results);
                } else {
                    readMore = false;
                }
            }
            for (const subEntry of allEntries) {
                await traverse(subEntry);
            }
        }
    }
    
    for (const entry of entries) {
        await traverse(entry);
    }
    return files;
}

// ============================================================
//  토스트 알림(Toast Notification) 함수
// ============================================================
function showToast(message, iconKey = "check") {
    tLog(`토스트 알림: ${message}`);
    let toast = document.getElementById('toast-message');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-message';
        document.body.appendChild(toast);
    }
    
    const iconHtml = ICON_MAP[iconKey] || ICON_MAP.check;
    toast.innerHTML = `${iconHtml}<span>${message}</span>`;
    toast.classList.add('show');
    
    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ============================================================
//  7. 스크롤 가속 엔진 (Smooth Scroll Engine)
// ============================================================

function updateScroll() {
    if (isAccelEnabled) {
        // 1. 수직 스크롤 처리
        if (Math.abs(scrollVelocityY) > 0.1) {
            window.scrollBy(0, scrollVelocityY);
            scrollVelocityY *= friction;
        } else {
            scrollVelocityY = 0;
        }

        // 2. 수평 스크롤 처리 (Shift + 휠 대응)
        if (Math.abs(scrollVelocityX) > 0.1) {
            window.scrollBy(scrollVelocityX, 0);
            scrollVelocityX *= friction;
        } else {
            scrollVelocityX = 0;
        }
    }
    requestAnimationFrame(updateScroll);
}

window.addEventListener('wheel', (e) => {
    // 마우스가 미니맵(사이드바) 영역 내에 물리적으로 위치할 때 수동 스크롤 처리
    const sidebar = document.getElementById('nav-sidebar');
    if (sidebar) {
        const rect = sidebar.getBoundingClientRect();
        // 미니맵이 화면 안으로 들어와있는 상태이고, 마우스 포인터가 미니맵 영역 내부에 위치하는지 검사
        if (rect.left < window.innerWidth) {
            const isOverSidebar = (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            );
            if (isOverSidebar) {
                e.preventDefault();
                sidebar.scrollTop += e.deltaY;
                return;
            }
        }
    }

    // 1. 빠른 스텝 스크롤 처리
    if (isStepScrollEnabled) {
        e.preventDefault();
        const direction = e.deltaY > 0 ? 1 : -1;
        window.scrollBy(0, direction * stepAmount);
        return;
    }

    // 2. 스크롤 가속 처리
    if (!isAccelEnabled) return;

    // 브라우저 기본 스크롤 동작 차단
    e.preventDefault();

    // Shift 키를 누르고 있거나, 트랙패드의 가로 스크롤 감지 시
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // deltaY 값을 가로(X) 속도로 전환하여 적용합니다.
        scrollVelocityX += (e.deltaX || e.deltaY) * accelFactor;
    } else {
        // 일반적인 수직 스크롤
        scrollVelocityY += e.deltaY * accelFactor;
    }
}, { passive: false });

// (토글 이벤트 부분)
const accelToggle = document.getElementById('toggle-accel');
const stepToggle = document.getElementById('toggle-step-scroll');
const stepSlider = document.getElementById('step-slider');

if (accelToggle) {
    accelToggle.onchange = (e) => {
        isAccelEnabled = e.target.checked;
        window.pywebview.api.save_settings({ app: { scrollAccel: isAccelEnabled } });
        
        if (isAccelEnabled) {
            // 스텝 스크롤 해제
            isStepScrollEnabled = false;
            window.pywebview.api.save_settings({ app: { stepScroll: false } });
            if(stepToggle) {
                stepToggle.checked = false;
                document.getElementById('step-slider-container').style.display = 'none';
            }
        } else {
            scrollVelocityY = 0; scrollVelocityX = 0;
        }
    };
}

if (stepToggle) {
    stepToggle.onchange = (e) => {
        isStepScrollEnabled = e.target.checked;
        window.pywebview.api.save_settings({ app: { stepScroll: isStepScrollEnabled } });
        
        if (isStepScrollEnabled) {
            // 가속 스크롤 해제
            isAccelEnabled = false;
            window.pywebview.api.save_settings({ app: { scrollAccel: false } });
            if(accelToggle) accelToggle.checked = false;
            scrollVelocityY = 0; scrollVelocityX = 0;
            document.getElementById('step-slider-container').style.display = 'block';
        } else {
            document.getElementById('step-slider-container').style.display = 'none';
        }
    };
}

if (stepSlider) {
    stepSlider.oninput = (e) => {
        stepAmount = parseInt(e.target.value);
        document.getElementById('step-value').textContent = `${stepAmount}px`;
        window.pywebview.api.save_settings({ app: { stepAmount: stepAmount } });
    };
}


// ============================================================
//  8. 비저블 영역 캡처 기능 (Visible Area Capture) - 여백 제거 버전
// ============================================================

document.getElementById('btn-capture').onclick = async () => {
    try {
        // 현재 화면(Viewport) 영역을 캡처 대상으로 지정
        const viewportRect = {
            left: 0,
            top: 0,
            right: window.innerWidth,
            bottom: window.innerHeight,
            width: window.innerWidth,
            height: window.innerHeight
        };
        
        await captureHighRes(viewportRect, "Pure");

    } catch (e) {
        console.error("현재 화면 캡처 실패:", e);
        showToast("캡처 중 오류가 발생했습니다.", "alert");
    }
};
// ============================================================
//  9. 영역 지정 캡처 (Crop Capture)
// ============================================================

let isSelecting = false;
let startX, startY;
const selectionBox = document.createElement('div');
selectionBox.id = 'selection-box';
document.body.appendChild(selectionBox);

document.getElementById('btn-crop-capture').onclick = async () => {
    // 진입 전 앵커를 구하여 이미지 축소 후 스크롤을 유지하도록 설정
    const anchor = calculateRealTimeAnchor();

    // 트랜지션 효과 적용 클래스 추가
    document.body.classList.add('selecting-transition');
    isSelecting = true;
    // 마우스 커서가 십자 모양(+)으로 바뀌도록 클래스 추가
    document.body.classList.add('selecting');
    // 설정 패널 닫기 (캡처 방해 방지)
    settingsPanel.classList.remove('show');
    
    // 가이드 안내 토스트 팝업 띄우기
    showToast("마우스로 드래그하여 영역을 선택하세요. (ESC: 취소)", "camera");

    // 애니메이션 프레임마다 스크롤을 앵커에 정교하게 동기화
    animateScrollAnchor(anchor, 150);

    setTimeout(() => {
        document.body.classList.remove('selecting-transition');
    }, 150);
};

window.addEventListener('mousedown', (e) => {
    if (!isSelecting) return;
    
    // [중요] 브라우저의 기본 드래그/선택 동작을 완전히 막습니다.
    e.preventDefault(); 

    startX = e.pageX;
    startY = e.pageY;
    
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
});

window.addEventListener('mousemove', (e) => {
    if (!isSelecting || e.buttons !== 1) return;
    
    const currentX = e.pageX;
    const currentY = e.pageY;
    
    // [오토 스크롤 로직]
    // 마우스가 화면 끝에 닿으면 자동으로 스크롤합니다.
    const threshold = 50;
    const speed = 15;
    if (e.clientY > window.innerHeight - threshold) {
        window.scrollBy(0, speed);
    } else if (e.clientY < threshold) {
        window.scrollBy(0, -speed);
    }

    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(currentX, startX);
    const top = Math.min(currentY, startY);

    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
});

window.addEventListener('mouseup', async (e) => {
    if (!isSelecting) return;
    const rect = selectionBox.getBoundingClientRect();
    await endCropCapture(rect);
});

// 영역 지정 캡처 종료/취소 처리 공통 함수
async function endCropCapture(rect) {
    if (!isSelecting) return;
    
    // 원래 레이아웃으로 돌아가기 전 앵커를 최신화
    const anchor = calculateRealTimeAnchor();

    // 트랜지션 효과 적용 클래스 추가
    document.body.classList.add('selecting-transition');
    isSelecting = false;
    document.body.classList.remove('selecting');
    selectionBox.style.display = 'none';

    // 미니맵 마우스 튐 방지
    const sidebar = document.getElementById('nav-sidebar');
    const trigger = document.getElementById('nav-trigger');
    if (sidebar && trigger) {
        sidebar.style.setProperty('pointer-events', 'none', 'important');
        trigger.style.setProperty('pointer-events', 'none', 'important');
        
        const restorePointerEvents = () => {
            if (sidebar) sidebar.style.removeProperty('pointer-events');
            if (trigger) trigger.style.removeProperty('pointer-events');
            window.removeEventListener('mousemove', onMouseMove);
        };
        
        const onMouseMove = (e) => {
            if (e.clientX < window.innerWidth - 120) {
                restorePointerEvents();
            }
        };
        
        window.addEventListener('mousemove', onMouseMove);
        setTimeout(restorePointerEvents, 1500);
    }

    // 애니메이션 프레임마다 스크롤을 앵커에 정교하게 동기화
    animateScrollAnchor(anchor, 150);

    setTimeout(() => {
        document.body.classList.remove('selecting-transition');
    }, 150);

    if (rect && rect.width >= 5 && rect.height >= 5) {
        await captureHighRes(rect, "Crop");
    } else {
        showToast("캡처가 취소되었습니다.", "x");
    }
}

/**
 * [핵심] 고화질 원본 해상도 캡처 공통 함수
 * @param {Object} rect - 캡처할 영역 (화면 좌표 기준: left, top, right, bottom, width, height)
 * @param {String} type - 파일명에 포함할 타입 (Pure, Crop 등)
 */
async function captureHighRes(rect, type) {
    const btn = (type === "Crop") ? document.getElementById('btn-crop-capture') : document.getElementById('btn-capture');
    const originalBtnHTML = btn.innerHTML;
    
    try {
        btn.innerHTML = `${ICON_MAP.loader}<span>고화질 추출 중...</span>`;
        [menuBtn, pageIndicator].forEach(el => el.style.visibility = 'hidden');

        const pages = Array.from(document.querySelectorAll('.webtoon-page'));
        if (pages.length === 0) throw new Error("이미지가 없습니다.");

        const pagesRects = pages.map(p => p.getBoundingClientRect());
        const minLeft = Math.min(...pagesRects.map(r => r.left));
        const maxRight = Math.max(...pagesRects.map(r => r.right));

        // 1. 영역 보정 (배경 제외 및 화면 범위 제한)
        const finalLeft = Math.max(rect.left, minLeft);
        const finalRight = Math.min(rect.right, maxRight);
        const finalTop = rect.top;
        const finalBottom = rect.bottom;
        const finalWidth = finalRight - finalLeft;
        const finalHeight = finalBottom - finalTop;

        if (finalWidth <= 0 || finalHeight <= 0) {
            showToast("캡처할 영역이 이미지 바깥입니다.", "alert");
            return;
        }

        // 2. 배율 계산
        const firstVisiblePage = pages.find(p => {
            const r = p.getBoundingClientRect();
            return r.bottom > finalTop && r.top < finalBottom;
        }) || pages[0];
        const scaleRatio = firstVisiblePage.naturalWidth / firstVisiblePage.offsetWidth;
        
        // 3. 캔버스 준비
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(finalWidth * scaleRatio);
        canvas.height = Math.round(finalHeight * scaleRatio);
        const ctx = canvas.getContext('2d');

        // 4. 원본 데이터 그리기
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const pRect = pagesRects[i];
            const intersectTop = Math.max(finalTop, pRect.top);
            const intersectBottom = Math.min(finalBottom, pRect.bottom);
            
            if (intersectTop < intersectBottom) {
                const relX = finalLeft - pRect.left;
                const relY = intersectTop - pRect.top;
                const relW = finalWidth;
                const relH = intersectBottom - intersectTop;

                const srcX = relX * (page.naturalWidth / page.offsetWidth);
                const srcY = relY * (page.naturalHeight / page.offsetHeight);
                const srcW = relW * (page.naturalWidth / page.offsetWidth);
                const srcH = relH * (page.naturalHeight / page.offsetHeight);

                const destX = 0;
                const destY = Math.round((intersectTop - finalTop) * scaleRatio);
                const destW = canvas.width;
                // 정수 픽셀 단위로 경계를 일치시켜 빈틈과 이미지 어긋남을 동시에 해결합니다.
                const destH = Math.round((intersectBottom - finalTop) * scaleRatio) - destY;

                ctx.drawImage(page, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
            }
        }

        const format = currentCaptureFormat || "png";
        const mimeType = format === "jpeg" ? "image/jpeg" : `image/${format}`;
        const dataUrl = canvas.toDataURL(mimeType);
        
        const now = new Date();
        const timestamp = now.toISOString().slice(0,10).replace(/-/g,'') + "_" + 
                          now.getHours().toString().padStart(2,'0') + 
                          now.getMinutes().toString().padStart(2,'0') + 
                          now.getSeconds().toString().padStart(2,'0');
        
        const fileExt = format === "jpeg" ? "jpg" : format;
        const filename = `Webtoon_${type}_${timestamp}.${fileExt}`;

        if (window.pywebview && window.pywebview.api) {
            const success = await window.pywebview.api.save_image(dataUrl, filename);
            if (success) {
                showToast("캡쳐 완료!", "camera");
            } else {
                showToast("저장에 실패했습니다.", "x");
            }
        }
    } catch (err) {
        console.error("고화질 캡처 실패:", err);
        showToast("캡처 중 오류가 발생했습니다.", "alert");
    } finally {
        btn.innerHTML = originalBtnHTML;
        [menuBtn, pageIndicator].forEach(el => el.style.visibility = 'visible');
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSelecting) {
        isSelecting = false;
        document.body.classList.remove('selecting');
        if (selectionBox) selectionBox.style.display = 'none';
        showToast("캡처가 취소되었습니다.", "x");
    }
});

async function tLog(msg) {
    console.log(msg);
    if (window.pywebview && window.pywebview.api && window.pywebview.api.debug_log) {
        window.pywebview.api.debug_log(msg);
    }
}


async function initialize() {
    try {
        await tLog("🚀 Starting initialization...");
        await loadSettings();
        restoreSliderLabels();
        updateScroll();
        await tLog("✅ Initialization completed successfully.");
    } catch (e) {
        await tLog(`❌ Initialization failed: ${e.message}`);
        console.error(e);
    }
}

if (window.pywebview && window.pywebview.api) {
    initialize();
} else {
    window.addEventListener('pywebviewready', initialize);
}
