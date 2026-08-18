if (navigator.userAgent.indexOf('Mac') === -1) {
    document.title = 'Webtoon Viewer Pro';
}

// ============================================================
//  0. [디자인 & 렌더링 패치] 스타일 강제 주입
// ============================================================
const stylePatch = document.createElement('style');
stylePatch.innerHTML = `
    /* 1. 사이드바 스타일 */
    #nav-sidebar {
        display: flex !important;
        flex-direction: column !important;
        gap: 5px !important;
        overflow-y: auto !important;
        flex-wrap: nowrap !important;
        height: 100vh !important;
        padding-bottom: 50px !important;
        background: var(--sidebar-bg) !important;
        border-left: 1px solid var(--sidebar-border) !important;
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

    /* 1.5. [추가] 이미지 로딩 스켈레톤 및 페이드인 스타일 */
    .image-wrapper {
        position: relative !important;
        width: 100% !important;
        min-height: 800px !important;
        background-color: #151515 !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
    }
    
    .image-wrapper.skeleton::after {
        content: "" !important;
        position: absolute !important;
        top: 0 !important; left: 0 !important;
        width: 100% !important; height: 100% !important;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent) !important;
        transform: translateX(-100%) !important;
        animation: shimmer 1.5s infinite !important;
    }
    
    @keyframes shimmer {
        100% { transform: translateX(100%) !important; }
    }
    
    .image-wrapper img {
        opacity: 0 !important;
        transition: opacity 0.3s ease-in-out !important;
        display: block !important;
        width: 100% !important;
        height: auto !important;
    }
    
    .image-wrapper.loaded img {
        opacity: 1 !important;
    }
    
    .image-wrapper.loaded {
        min-height: auto !important;
        background-color: transparent !important;
    }

    /* 2. [핵심 수정] 메인 뷰어 컨테이너 및 비교모드 스플릿 */
    #split-wrapper {
        display: block;
        width: 100%;
    }
    body.compare-mode {
        overflow: hidden !important;
    }
    body.compare-mode #split-wrapper {
        display: flex !important;
        flex-direction: row !important;
        width: 100vw !important;
        height: 100vh !important;
        overflow: hidden !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        z-index: 10 !important;
    }
    body.compare-mode.minimap-pinned #split-wrapper {
        width: calc(100vw - 100px) !important;
    }
    body.compare-mode #split-wrapper #viewer-container,
    body.compare-mode #split-wrapper #viewer-container-right,
    body.compare-mode.has-images #split-wrapper #viewer-container,
    body.compare-mode.has-images #split-wrapper #viewer-container-right {
        flex: 1 !important;
        height: 100% !important;
        overflow-y: scroll !important;
        overflow-x: auto !important;
        position: relative !important;
        background-color: var(--bg-color) !important; /* 다크모드 시 까만색(#000000)으로 덮이는 현상 방지 및 다크 차콜(#1a1a1a) 통일 */
        box-sizing: border-box !important;
        min-height: 100vh !important;
        max-width: none !important; /* 비교모드 시 50% 분할 공간을 꽉 채우도록 제한 해제 */
    }
    body.compare-mode #viewer-container {
        border-right: 2px solid var(--divider-color) !important;
    }
    
    body.compare-mode.view-mode-fit #viewer-container,
    body.compare-mode.view-mode-fit #viewer-container-right {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
    }
    body.compare-mode .webtoon-page {
        background-color: var(--viewer-bg) !important; /* 이미지 안쪽 영역 캔버스 배경 */
        box-shadow: none !important; /* 그림자 완전 제거 */
    }
    body.compare-mode.view-mode-fit #viewer-container .webtoon-page,
    body.compare-mode.view-mode-fit #viewer-container-right .webtoon-page {
        width: 100% !important;
        max-width: var(--container-width) !important;
        margin: 0 auto !important;
    }
    body.compare-mode.view-mode-fit .viewer-image {
        width: 100% !important;
        height: auto !important;
    }
    
    body.compare-mode.view-mode-original #viewer-container .webtoon-page,
    body.compare-mode.view-mode-original #viewer-container-right .webtoon-page {
        width: fit-content !important;
        max-width: none !important;
    }
    body.compare-mode.view-mode-original .viewer-image {
        width: auto !important;
        max-width: none !important;
        height: auto !important;
    }

    /* 비교모드 수직 칼럼 래퍼 및 안내 메시지 레이아웃 (단일 모드와 100% 동일하게 위아래로 길게 이어진 캔버스 칼럼) */
    body.compare-mode #message-box,
    body.compare-mode #message-box-right,
    body.compare-mode .message-box-compare {
        position: absolute !important;
        top: 0 !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 100% !important;
        max-width: var(--container-width) !important;
        min-height: 100vh !important;
        background-color: var(--viewer-bg) !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 40px 20px !important;
        border-radius: 0 !important;
        border: none !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        color: var(--text-color) !important;
    }

    #viewer-container {
        font-size: 0 !important;
        line-height: 0 !important;
        display: flex;
        flex-direction: column;
        
        /* 테마별 배경 적용 (그림자 및 테두리 없이 깔끔하게 밀착) */
        background-color: var(--viewer-bg) !important;
        box-shadow: none !important;
        border: none !important;
        min-height: 100vh !important;
        margin: 0 auto !important; /* 가로 맞춤 시 중앙 배치 */
        position: relative !important; /* [추가] 정밀한 위치 계산을 위한 기준점 */
        transition: background-color 0.3s ease !important;
    }

    /* 로딩 완료 후 배경 처리 */
    body.has-images #viewer-container {
        background-color: var(--viewer-bg) !important;
    }

    /* 안내 메시지 스타일 (유지) */
    #message-box {
        font-size: 16px !important; line-height: 1.5 !important; color: #888 !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: calc(100% - 40px) !important;
        max-width: 340px !important;
        box-sizing: border-box !important;
        text-align: center !important;
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
        width: 100% !important;
        max-width: 100% !important;
    }

    /* [가로 맞춤] 창 너비나 슬라이더에 맞춤 */
    body:not(.compare-mode).view-mode-fit #viewer-container {
        width: 100% !important;
        max-width: var(--container-width) !important;
    }
    body:not(.compare-mode).view-mode-fit .viewer-image {
        width: 100% !important;
        height: auto !important;
    }

    /* [원본 크기] 이미지 실제 픽셀 크기 고정 및 외곽/내부 배경 구분 */
    body:not(.compare-mode).view-mode-original #viewer-container {
        width: 100% !important;
        max-width: none !important;
        min-width: 100% !important;
        align-items: center !important;
        background-color: var(--bg-color) !important; /* 외곽 바탕은 슬레이트 그레이로 지정하여 명확한 구분 형성 */
        border: none !important;
    }
    body:not(.compare-mode).view-mode-original .webtoon-page {
        background-color: var(--viewer-bg) !important; /* 이미지가 있는 캔버스 칼럼 영역만 순백색 적용 */
        width: fit-content !important;
        max-width: none !important;
        border: none !important;
    }
    body:not(.compare-mode).view-mode-original .viewer-image {
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
        flex-shrink: 0 !important; /* 비교모드 Flex 컨테이너 내 찌부러짐 방지 */
    }
    
    /* 원본 크기 모드에서 페이지 박스 크기 제한 해제 */
    body.view-mode-original .webtoon-page {
        width: fit-content !important;
        max-width: none !important;
    }

    /* (A) 간격 제거 켜짐: 파일 간 0px 완벽 밀착 (파란색 선 제거) */
    body.spacing-collapsed .webtoon-page {
        margin-bottom: 0 !important;
        border-bottom: none !important;
    }

    /* (B) 간격 제거 꺼짐: 파일 사이에 20px 띄우고 슬레이트 구분 바탕 및 포커스 디바이더 라인 표시 */
    body:not(.spacing-collapsed) .webtoon-page {
        margin-bottom: 20px !important;
        position: relative !important;
    }
    body:not(.spacing-collapsed) .webtoon-page:not(:last-child)::after {
        content: '' !important;
        position: absolute !important;
        bottom: -12px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 80px !important;
        height: 3px !important;
        background-color: #94a3b8 !important;
        border-radius: 2px !important;
        opacity: 0.7 !important;
        pointer-events: none !important;
    }

    /* 5. 설정창 디자인 */
    #settings-panel {
        background-color: var(--panel-bg) !important;
        backdrop-filter: blur(16px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
        border: 1px solid var(--panel-border) !important;
        box-shadow: 0 10px 30px var(--panel-shadow) !important;
        border-radius: 12px !important;
        padding: 16px 20px !important;
        width: 240px !important;
        color: var(--panel-text) !important;
        position: fixed; top: 80px; left: 20px; z-index: 199; display: none;
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
    }
    #settings-panel.show { display: block; }
    .panel-header, .group-title {
        color: var(--panel-group-label) !important;
        font-size: 13px !important;
        font-weight: bold !important;
        margin-bottom: 6px !important;
    }
    .btn-row { display: flex; gap: 8px; margin-bottom: 10px; }
    .size-btn, .size-select-btn {
        flex: 1; padding: 8px 0 !important; border-radius: 6px !important;
        border: 1px solid var(--panel-border) !important; background: var(--btn-secondary-bg) !important; color: var(--btn-secondary-text) !important;
        font-weight: bold !important; cursor: pointer; transition: 0.2s;
    }
    .size-btn:hover:not(.active), .size-select-btn:hover:not(.active) {
        background: var(--btn-secondary-hover) !important;
    }
    .size-btn.active, .size-select-btn.active { background: #007aff !important; color: #fff !important; border-color: #007aff !important; }
    input[type=range] {
        width: 100% !important;
        margin: 8px 0 0 0 !important;
        padding: 0 !important;
        display: block !important;
        box-sizing: border-box !important;
        accent-color: #007aff !important;
        cursor: pointer;
    }
    .slider-labels {
        display: flex !important;
        width: 100% !important;
        margin-top: 6px !important;
        font-size: 11px !important;
        color: var(--panel-group-label) !important;
        font-weight: bold !important;
        padding: 0 !important;
        box-sizing: border-box !important;
    }
    .slider-labels span {
        flex: 1 !important;
    }
    .slider-labels span:first-child {
        text-align: left !important;
    }
    .slider-labels span:nth-child(2) {
        text-align: center !important;
    }
    .slider-labels span:last-child {
        text-align: right !important;
    }

    #settings-panel input[type="checkbox"] {
        appearance: none; width: 40px; height: 22px; background: #555;
        border-radius: 20px; position: relative; cursor: pointer; outline: none;
        transition: background 0.3s; margin: 0 !important;
        flex-shrink: 0;
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
        align-items: center !important; margin: 0 !important; cursor: pointer;
    }
    #settings-panel label.toggle-row, #settings-panel .accordion-header.toggle-row {
        display: flex !important; justify-content: space-between !important;
        align-items: center !important;
        height: 42px !important;
        padding: 0 !important;
        margin: 0 !important;
        border-bottom: 1px solid var(--divider-color) !important;
        box-sizing: border-box !important;
    }
    #settings-panel label.toggle-row:last-of-type,
    #settings-panel label.toggle-row[style*="border-bottom: none"],
    #settings-panel label.toggle-row[style*="border-bottom:none"] {
        border-bottom: none !important;
    }
    #settings-panel .toggle-text {
        font-size: 14px !important;
        font-weight: 500 !important;
        line-height: 1 !important;
        margin: 0 !important;
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
    .icon, .icon * {
        width: 18px;
        height: 18px;
        stroke: currentColor !important;
        stroke-width: 2 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
        fill: none !important;
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
    body.selecting, body.selecting *:not(.viewer-image):not(.image-wrapper) {
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
    /* 영역 지정 캡처 시 레이아웃 축소 처리 */
    /* 1) 일반 단일 모드: 컨테이너와 배경이 이미지와 함께 60px 축소 */
    body:not(.compare-mode).selecting #viewer-container {
        max-width: calc(var(--container-width) - 60px) !important;
        width: calc(100% - 60px) !important;
    }

    /* 2) 비교 모드: 50/50 분할 레이아웃 유지를 위해 좌/우 각 컨테이너 내부 이미지 표시 영역(.webtoon-page)과 캔버스 배경이 함께 60px 축소 */
    body.compare-mode.selecting #viewer-container .webtoon-page,
    body.compare-mode.selecting #viewer-container-right .webtoon-page {
        max-width: calc(var(--container-width) - 60px) !important;
        width: calc(100% - 60px) !important;
        margin: 0 auto !important;
    }

    body.selecting #viewer-container,
    body.selecting-transition #viewer-container,
    body.selecting #viewer-container-right,
    body.selecting-transition #viewer-container-right,
    body.selecting .webtoon-page,
    body.selecting-transition .webtoon-page,
    body.selecting .viewer-image,
    body.selecting-transition .viewer-image,
    body.selecting .image-wrapper,
    body.selecting-transition .image-wrapper {
        transition: width 0.15s ease-in-out, max-width 0.15s ease-in-out, min-height 0.15s ease-in-out, height 0.15s ease-in-out !important;
    }

    /* 커스텀 컨텍스트 메뉴 스타일 */
    .custom-context-menu {
        position: fixed !important;
        background: var(--context-bg) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        border: 1px solid var(--context-border) !important;
        border-radius: 8px !important;
        padding: 6px 0 !important;
        width: 190px !important;
        box-shadow: 0 10px 25px var(--panel-shadow) !important;
        z-index: 99999 !important;
        color: var(--context-text) !important;
        font-family: 'Pretendard', sans-serif !important;
        font-size: 13px !important;
        user-select: none !important;
        transition: background 0.3s, color 0.3s, border-color 0.3s;
    }
    .context-item {
        display: flex !important;
        align-items: center !important;
        padding: 8px 12px !important;
        cursor: pointer !important;
        transition: background 0.15s, color 0.15s !important;
    }
    .context-item:hover {
        background: var(--context-hover-bg) !important;
        color: var(--context-hover-text) !important;
    }
    .context-item.disabled {
        opacity: 0.3 !important;
        cursor: not-allowed !important;
        pointer-events: none !important;
    }
    .context-item .icon {
        width: 16px !important;
        height: 16px !important;
        margin-right: 8px !important;
        fill: currentColor !important;
    }
    .context-item .ctx-shortcut {
        margin-left: auto !important;
        font-size: 11px !important;
        color: var(--panel-group-label);
    }
    .context-item:hover .ctx-shortcut {
        color: rgba(255, 255, 255, 0.8) !important;
    }
    .context-divider {
        height: 1px !important;
        background: var(--divider-color) !important;
        margin: 4px 0 !important;
    }

    /* 서브메뉴 스타일 */
    .context-item.has-submenu {
        position: relative !important;
    }
    .context-submenu {
        position: absolute !important;
        top: -6px !important;
        left: 98% !important;
        background: var(--context-bg) !important;
        backdrop-filter: blur(16px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
        border: 1px solid var(--context-border) !important;
        border-radius: 8px !important;
        padding: 6px 0 !important;
        width: 140px !important;
        box-shadow: 0 10px 25px var(--panel-shadow) !important;
        display: none !important;
        z-index: 100000 !important;
        color: var(--context-text) !important;
        transition: background 0.3s, color 0.3s, border-color 0.3s !important;
    }
    .context-item.has-submenu:hover .context-submenu {
        display: block !important;
    }
    .context-item .ctx-arrow {
        margin-left: auto !important;
        font-size: 9px !important;
        color: var(--panel-group-label) !important;
    }
    .context-item:hover .ctx-arrow {
        color: var(--context-hover-text) !important;
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
let isMinimapPageScrollEnabled = true; // 미니맵 페이지 넘김(Page Turn) 연동 여부
let isHoveringSidebar = false; // 사이드바 마우스 호버 여부

// [추가] 순차적 백그라운드 사전 로드(Queue Preloader)를 위한 전역 제어 변수 및 헬퍼 함수
const preloadQueue = []; // { index, file, wrapper, img, thumbImg } 로딩 대기 큐
let activeLoads = 0;
const MAX_CONCURRENT_LOADS = 2; // 동시 백그라운드 이미지 로드 수 제한 (파이썬 멈춤 방지)

function triggerBackgroundLoad() {
    if (activeLoads >= MAX_CONCURRENT_LOADS || preloadQueue.length === 0) return;
    
    const item = preloadQueue.shift();
    if (!item) return;
    
    // 이미 로드가 시작되었거나 완료된 경우는 스킵하고 다음 항목 탐색
    if (item.wrapper.dataset.loadState !== 'pending') {
        triggerBackgroundLoad();
        return;
    }
    
    loadSingleImage(item, () => {
        triggerBackgroundLoad(); // 완료 후 순차적으로 다음 항목 트리거
    });
    
    triggerBackgroundLoad(); // 남은 병렬 슬롯이 있다면 추가 실행
}

function loadSingleImage(item, callback) {
    const { wrapper, img, thumbImg, file } = item;
    
    wrapper.dataset.loadState = 'loading';
    activeLoads++;
    
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.get_image_data(file.rawPath).then(dataUrl => {
            if (dataUrl) {
                img.onload = () => {
                    if (img.naturalWidth > 0) {
                        img.dataset.ratio = img.naturalHeight / img.naturalWidth;
                    }
                    wrapper.classList.remove('skeleton');
                    wrapper.classList.add('loaded');
                    wrapper.dataset.loadState = 'loaded';
                };
                img.src = dataUrl;
                if (thumbImg) thumbImg.src = dataUrl;
            } else {
                wrapper.classList.remove('skeleton');
                wrapper.dataset.loadState = 'failed';
            }
            activeLoads--;
            if (callback) callback();
        }).catch(err => {
            console.error("이미지 로드 오류:", err);
            wrapper.classList.remove('skeleton');
            wrapper.dataset.loadState = 'failed';
            activeLoads--;
            if (callback) callback();
        });
    } else {
        activeLoads--;
        if (callback) callback();
    }
}
let createdUrls = [];
let rightCreatedUrls = []; // 우측 화면 해제용 URL들
let currentFileKey = "";
let rightCurrentFileKey = "";
let scrollSaveTimer = null;
let currentCaptureFormat = "png";
let isResumeEnabled = true; // 이어서 보기 활성화 상태 변수 (기본값 true)

let scrollVelocityY = 0; // 수직 속도
let scrollVelocityX = 0; // 수평 속도
let isAccelEnabled = false; 
let isStepScrollEnabled = true;
let stepAmount = 100;

// 비교보기 모드 변수
let isCompareMode = false;
let isScrollSync = true;

const hiddenInput = document.getElementById('hidden-file-input');
const hiddenFolderInput = document.getElementById('hidden-folder-input');
const container = document.getElementById('viewer-container');
const containerRight = document.getElementById('viewer-container-right');
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

const rightFileBtn = document.getElementById('right-file-btn');
const rightFolderBtn = document.getElementById('right-folder-btn');
const toggleCompare = document.getElementById('toggle-compare');
const toggleScrollSync = document.getElementById('toggle-scroll-sync');
const scrollSyncRow = document.getElementById('scroll-sync-row');

const resumeModal = document.getElementById('resume-modal');
const btnResumeYes = document.getElementById('btn-resume-yes');
const btnResumeNo = document.getElementById('btn-resume-no');

let totalFiles = 0;
let rightTotalFiles = 0;

const friction = 0.80;    
const accelFactor = 0.7;

// ============================================================
//  2. 설정 로드
// ============================================================


// 미니맵 가시성을 업데이트하는 함수 (최종 수정 버전)
function updateMinimapUI(enabled) {
    const trigger = document.getElementById('nav-trigger');
    const sidebar = document.getElementById('nav-sidebar');
    const scrollRow = document.getElementById('minimap-scroll-row');
    const useRow = document.getElementById('minimap-use-row');
    
    // 설정창 내 미니맵 스크롤 활성화 토글 행의 가시성을 '미니맵 사용' 토글 상태에 즉각 연동
    if (scrollRow) {
        scrollRow.style.setProperty('display', enabled ? 'flex' : 'none', 'important');
    }
    if (useRow) {
        useRow.style.setProperty('border-bottom', 'none', 'important');
    }

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
        if (trigger) trigger.style.setProperty('display', 'none', 'important');
        if (sidebar) sidebar.style.setProperty('transform', 'translateX(100%)', 'important');
        
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

    const pages = Array.from(document.getElementById('viewer-container').querySelectorAll('.webtoon-page'));
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

    // 0. 이어서 보기 활성화
    isResumeEnabled = app.resumeEnabled !== false;
    const resumeToggle = document.getElementById('toggle-resume');
    if (resumeToggle) resumeToggle.checked = isResumeEnabled;

    // 1. 다크 모드
    const isDark = app.darkMode === true;
    body.classList.toggle('dark-mode', isDark);
    try { localStorage.setItem('webtoon_darkMode', isDark ? 'true' : 'false'); } catch (e) {}
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
    isMinimapPageScrollEnabled = app.minimapPageScroll !== false;
    body.classList.toggle('minimap-pinned', isMinimapPinned);

    const minimapToggle = document.getElementById('toggle-minimap');
    if(minimapToggle) {
        minimapToggle.checked = isMinimapEnabled;
        updateMinimapUI(isMinimapEnabled);
    }

    const minimapPageScrollToggle = document.getElementById('toggle-minimap-page-scroll');
    if (minimapPageScrollToggle) {
        minimapPageScrollToggle.checked = isMinimapPageScrollEnabled;
    }

    // 9. 캡처 저장 포맷
    currentCaptureFormat = app.captureFormat || "png";
    updateCustomDropdownUI(currentCaptureFormat);

    // 10. 캡처 저장 경로
    const captureDir = app.captureDir || "";
    const captureDirValue = document.getElementById('capture-dir-value');
    if (captureDirValue) {
        captureDirValue.textContent = captureDir || "기본 (사진/Webtoon capture)";
        captureDirValue.title = captureDir || "기본 사진 저장 폴더";
    }

    // 초기 설정 로드 완료 후 트랜지션 다시 활성화 (시작 시 스르륵 전환 깜빡임 방지)
    setTimeout(() => {
        body.classList.remove('no-transition');
    }, 150);
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

// 1. 직접 다이얼로그 호출 및 렌더링 통합 함수
async function triggerOpenDialog(type, side = 'left') {
    if (window.pywebview && window.pywebview.api) {
        const result = (type === 'folder') 
            ? await window.pywebview.api.open_folder_dialog() 
            : await window.pywebview.api.open_file_dialog();
        if (result) {
            tLog(`📂 경로 선택 완료: ${result.folderPath} (영역: ${side})`);
            finalizePathAndRender(result, side);
        }
    } else {
        tLog("⚠️ pywebview API를 찾을 수 없습니다.");
    }
}

// 2. 버튼 바인딩 헬퍼 함수
function bindButton(id, type, side) {
    const btn = document.getElementById(id);
    if (btn) {
        btn.onclick = async (e) => {
            tLog(`🔘 버튼 클릭됨: ${id} (영역: ${side})`);
            e.preventDefault();
            e.stopImmediatePropagation();
            await triggerOpenDialog(type, side);
        };
    }
}

// 2. 모든 열기 버튼 연결 (메뉴 & 중앙 버튼, 그리고 우측 분할창 버튼)
const btnConfigs = [
    { id: 'menu-folder-btn', type: 'folder', side: 'left' },
    { id: 'center-folder-btn', type: 'folder', side: 'left' },
    { id: 'menu-file-btn', type: 'file', side: 'left' },
    { id: 'center-file-btn', type: 'file', side: 'left' },
    { id: 'right-folder-btn', type: 'folder', side: 'right' },
    { id: 'right-file-btn', type: 'file', side: 'right' }
];

btnConfigs.forEach(config => {
    bindButton(config.id, config.type, config.side);
});

// 우측 비교보기 영역 초기 상태로 리셋하는 함수
function resetRightPane() {
    rightCurrentFileKey = "";
    rightTotalFiles = 0;
    if (containerRight) {
        containerRight.classList.remove('has-images-right');
        containerRight.innerHTML = `
            <div id="message-box-right" class="message-box-compare">
                <div style="display:flex; flex-direction:column; gap:12px; align-items:center;">
                    <h3 style="color:var(--text-color); margin-bottom:10px;">비교 대상 웹툰 로드</h3>
                    <button id="right-file-btn" class="action-btn btn-primary" style="width:200px; padding: 10px 16px;">
                        <svg class="icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span>파일 열기 (오른쪽)</span>
                    </button>
                    <button id="right-folder-btn" class="action-btn btn-secondary" style="width:200px; padding: 10px 16px;">
                        <svg class="icon" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        <span>폴더 열기 (오른쪽)</span>
                    </button>
                </div>
            </div>
        `;
        bindButton('right-folder-btn', 'folder', 'right');
        bindButton('right-file-btn', 'file', 'right');
    }
    rightCreatedUrls.forEach(url => URL.revokeObjectURL(url));
    rightCreatedUrls = [];
}

// 3. 파이썬에 전달할 순수 경로만 정리하는 함수
function finalizePathAndRender(result, side = 'left') {
    const { folderPath, files } = result;

    const fileObjects = files.map(fileName => {
        const fullPath = `${folderPath}/${fileName}`;
        return { name: fileName, rawPath: fullPath };
    });

    processPythonFiles(fileObjects, folderPath, side);
    if (settingsPanel) settingsPanel.classList.remove('show');
}

// 3. 브라우저 네트워크를 거치지 않고 메인 이미지와 썸네일을 동시 생성하는 최종 함수
async function processPythonFiles(fileObjects, folderPath, side = 'left') {
    const isRight = side === 'right';
    const vContainer = isRight ? containerRight : container;
    const navSidebar = document.getElementById('nav-sidebar'); // 썸네일 컨테이너

    if (!vContainer) return;

    // 새로운 파일 로드 시 기존 찌꺼기 스크롤 강제 초기화
    if (isRight) {
        if (containerRight) containerRight.scrollTop = 0;
    } else {
        if (isCompareMode) {
            if (container) container.scrollTop = 0;
        } else {
            window.scrollTo(0, 0);
        }
    }

    // 메인 화면과 미니맵 초기화
    vContainer.innerHTML = ''; 
    if (!isRight) {
        if (navSidebar) navSidebar.innerHTML = ''; 
        currentFileKey = folderPath; 
        totalFiles = fileObjects.length;
        // 비교모드 시 좌측 웹툰을 새로 열더라도 우측 비교 대상은 유지되도록 resetRightPane() 자동 초기화를 제거합니다.
    } else {
        rightCurrentFileKey = folderPath;
        rightTotalFiles = fileObjects.length;
    }

    let processedCount = 0;
    const countTarget = isRight ? rightTotalFiles : totalFiles;

    // 상단 프로그레스 바 상태 초기화
    const loaderBar = document.getElementById('top-loading-bar');
    if (loaderBar) {
        loaderBar.style.opacity = '1';
        loaderBar.style.width = '0%';
    }
    let loadedCount = 0;

    for (const [index, file] of fileObjects.entries()) {
        // [A] 메인 뷰어 이미지 및 스켈레톤 틀 생성
        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper skeleton webtoon-page';
        wrapper.id = `${side}-file-start-${index}`; // 썸네일 클릭 시 이동할 타겟 위치
        wrapper.dataset.fileIndex = index;
        wrapper.dataset.rawPath = file.rawPath;
        if (!isRight) wrapper.dataset.thumbId = `thumb-img-${index}`;

        const img = document.createElement('img');
        img.className = 'viewer-image'; 
        img.draggable = false;
        
        wrapper.appendChild(img);
        vContainer.appendChild(wrapper);

        let thumbImg = null;
        // [B] 사이드바 썸네일 틀 생성 (좌측 화면만 썸네일 생성)
        if (!isRight && navSidebar) {
            const thumbItem = document.createElement('div');
            thumbItem.className = 'nav-thumb-item';
            thumbItem.id = `thumb-${index}`;
            thumbItem.dataset.idx = index;
            
            const label = document.createElement('div');
            label.className = 'thumb-label';
            label.textContent = index + 1;
            thumbItem.appendChild(label);
            
            thumbImg = document.createElement('img');
            thumbImg.id = `thumb-img-${index}`;
            thumbItem.appendChild(thumbImg);
            navSidebar.appendChild(thumbItem);

            // 썸네일 클릭 시 해당 이미지로 스크롤 이동
            thumbItem.onclick = (e) => {
                document.querySelectorAll('.nav-thumb-item').forEach(el => el.classList.remove('active'));
                thumbItem.classList.add('active');

                // 클릭된 Y 좌표 비율 계산
                const rect = thumbItem.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const clickRatio = Math.max(0, Math.min(1, clickY / rect.height));

                // 메인 뷰어 상의 해당 이미지 절대 위치 및 높이 계산
                const imgRect = wrapper.getBoundingClientRect();
                const imgTop = imgRect.top + (isCompareMode ? container.scrollTop : (window.pageYOffset || document.documentElement.scrollTop || 0));
                const imgHeight = imgRect.height;

                const targetScrollY = imgTop + clickRatio * imgHeight - (isCompareMode ? container.clientHeight / 2 : window.innerHeight / 2);
                if (isCompareMode) {
                    container.scrollTo({ top: targetScrollY, behavior: 'auto' });
                } else {
                    window.scrollTo({ top: targetScrollY, behavior: 'auto' });
                }
            };
        }

        // [C] 파이썬 API를 비동기 병렬 호출하여 일괄 로드 및 진행률 반영
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.get_image_data(file.rawPath).then(dataUrl => {
                if (dataUrl) {
                    img.onload = () => {
                        if (img.naturalWidth > 0) {
                            img.dataset.ratio = img.naturalHeight / img.naturalWidth;
                        }
                        wrapper.classList.remove('skeleton');
                        wrapper.classList.add('loaded');
                        
                        loadedCount++;
                        if (loaderBar) {
                            const percent = (loadedCount / countTarget) * 100;
                            loaderBar.style.width = percent + '%';
                            if (loadedCount === countTarget) {
                                setTimeout(() => {
                                    loaderBar.style.opacity = '0';
                                    updateMinimapViewportIndicator();
                                    
                                    // 우측 비교 대상 웹툰 로드 완료 시, 좌측 뷰어의 현재 감상 스크롤 백분율(%)을 기준으로 우측 스크롤을 즉시 정렬합니다. (슬라이스 수/크기가 다른 경우 대비)
                                    if (isRight && isCompareMode && container && containerRight) {
                                        const leftScrollHeight = container.scrollHeight - container.clientHeight;
                                        const leftPercent = leftScrollHeight > 0 ? (container.scrollTop / leftScrollHeight) : 0;
                                        const rightScrollHeight = containerRight.scrollHeight - containerRight.clientHeight;
                                        containerRight.scrollTop = rightScrollHeight * leftPercent;
                                    }
                                }, 500);
                            }
                        }
                    };
                    img.src = dataUrl;
                    if (thumbImg) thumbImg.src = dataUrl;
                } else {
                    wrapper.classList.remove('skeleton');
                    loadedCount++;
                    if (loaderBar) {
                        const percent = (loadedCount / countTarget) * 100;
                        loaderBar.style.width = percent + '%';
                    }
                }
            }).catch(err => {
                console.error("이미지 로드 오류:", err);
                wrapper.classList.remove('skeleton');
                loadedCount++;
                if (loaderBar) {
                    const percent = (loadedCount / countTarget) * 100;
                    loaderBar.style.width = percent + '%';
                }
            });
        }

        processedCount++;
    }

    if (!isRight) {
        document.body.classList.add('has-images');
        pageIndicator.style.display = 'block';
        updatePageIndicator(1);
        
        if (window.pywebview && window.pywebview.api) {
            const settings = await window.pywebview.api.get_settings();
            if (settings && settings.app) {
                isMinimapEnabled = settings.app.minimapEnabled !== false;
                isMinimapPinned = settings.app.minimapPinned === true;
            }
        }
        
        if (typeof updateMinimapUI === 'function') updateMinimapUI(isMinimapEnabled);
        setupScrollObserver();
        checkResumeHistory(currentFileKey);
    } else {
        containerRight.classList.add('has-images-right');
    }
}


// ============================================================
//  4. 메인 처리 로직 (로컬 드래그 앤 드롭 파일용)
// ============================================================
async function startProcess(files, side = 'left') {
    if (files.length === 0) return;
    const isRight = side === 'right';
    const vContainer = isRight ? containerRight : container;
    const navSidebar = document.getElementById('nav-sidebar');

    vContainer.innerHTML = '';
    if (!isRight) {
        if (navSidebar) navSidebar.innerHTML = '';
        createdUrls.forEach(url => URL.revokeObjectURL(url));
        createdUrls = [];
        // 비교모드 드래그 앤 드롭 시 우측 비교 화면 내용 보존
    } else {
        rightCreatedUrls.forEach(url => URL.revokeObjectURL(url));
        rightCreatedUrls = [];
    }

    try {
        let imageBlobs = [];
        let fileKey = "";

        if (files.length === 1 && (files[0].name.endsWith('.zip') || files[0].name.endsWith('.cbz'))) {
            if (typeof JSZip === 'undefined') throw new Error("JSZip 라이브러리가 필요합니다.");
            fileKey = `zip_${files[0].name}_${files[0].size}_${files[0].lastModified}`;
            imageBlobs = await unzipFiles(files[0]);
        } else {
            const imgs = files.filter(f => {
                const isImgType = f.type && f.type.startsWith('image/');
                const isImgExt = /\.(jpg|jpeg|png|gif|webp|bmp|psd)$/i.test(f.name);
                return isImgType || isImgExt;
            });
            
            if (imgs.length === 0) throw new Error("인식 가능한 이미지 파일이 없습니다.");
            
            const sideSuffix = isCompareMode ? ` (${side === 'left' ? '왼쪽' : '오른쪽'})` : '';
            showToast(`${imgs.length}개의 이미지를 불러옵니다.${sideSuffix}`, "camera");
            
            imgs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
            imageBlobs = imgs;
            fileKey = `folder_${imgs[0].name}_${imgs.length}_${imgs[0].size}`;
        }

        if (!isRight) {
            totalFiles = imageBlobs.length;
            currentFileKey = fileKey;
            
            const settings = await window.pywebview.api.get_settings();
            isMinimapEnabled = settings.app ? settings.app.minimapEnabled !== false : true;
            isMinimapPinned = settings.app ? settings.app.minimapPinned === true : false;
            updateMinimapUI(isMinimapEnabled);
            pageIndicator.style.display = 'block';
            updatePageIndicator(1);
        } else {
            rightTotalFiles = imageBlobs.length;
            rightCurrentFileKey = fileKey;
        }
        
        await processImagesInBatches(imageBlobs, side);

        if (!isRight) {
            body.classList.add('has-images'); 
            updateMinimapUI(isMinimapEnabled);
            checkResumeHistory(fileKey);
            setupScrollObserver();
            setTimeout(updateMinimapViewportIndicator, 100);
        } else {
            containerRight.classList.add('has-images-right');
        }

    } catch (err) {
        console.error("처리 오류:", err);
        showToast("오류: " + err.message, "alert");
    }
}

async function processImagesInBatches(imageBlobs, side = 'left') {
    const isRight = side === 'right';
    const vContainer = isRight ? containerRight : container;
    const navSidebar = document.getElementById('nav-sidebar');
    
    // 새로운 파일 로드 시 기존 찌꺼기 스크롤 강제 초기화
    if (isRight) {
        if (containerRight) containerRight.scrollTop = 0;
    } else {
        if (isCompareMode) {
            if (container) container.scrollTop = 0;
        } else {
            window.scrollTo(0, 0);
        }
    }

    let processedCount = 0;
    const total = imageBlobs.length;

    // 상단 프로그레스 바 상태 초기화
    const loaderBar = document.getElementById('top-loading-bar');
    if (loaderBar) {
        loaderBar.style.opacity = '1';
        loaderBar.style.width = '0%';
    }
    let loadedCount = 0;

    for (let i = 0; i < total; i++) {
        const blob = imageBlobs[i];
        const url = URL.createObjectURL(blob);
        if (!isRight) {
            createdUrls.push(url);
        } else {
            rightCreatedUrls.push(url);
        }

        // 메인 이미지 및 스켈레톤 틀
        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper skeleton webtoon-page';
        wrapper.id = `${side}-file-start-${i}`;
        wrapper.dataset.fileIndex = i;

        const img = document.createElement('img');
        img.className = 'viewer-image';
        img.draggable = false;
        
        wrapper.appendChild(img);
        vContainer.appendChild(wrapper);

        img.onload = () => {
            wrapper.classList.remove('skeleton');
            wrapper.classList.add('loaded');
            
            loadedCount++;
            if (loaderBar) {
                const percent = (loadedCount / total) * 100;
                loaderBar.style.width = percent + '%';
                if (loadedCount === total) {
                    setTimeout(() => {
                        loaderBar.style.opacity = '0';
                        updateMinimapViewportIndicator();
                        
                        // 우측 비교 대상 웹툰 로드 완료 시, 좌측 뷰어의 현재 감상 스크롤 백분율(%)을 기준으로 우측 스크롤을 즉시 정렬합니다. (슬라이스 수/크기가 다른 경우 대비)
                        if (isRight && isCompareMode && container && containerRight) {
                            const leftScrollHeight = container.scrollHeight - container.clientHeight;
                            const leftPercent = leftScrollHeight > 0 ? (container.scrollTop / leftScrollHeight) : 0;
                            const rightScrollHeight = containerRight.scrollHeight - containerRight.clientHeight;
                            containerRight.scrollTop = rightScrollHeight * leftPercent;
                        }
                    }, 500);
                }
            }
        };
        img.src = url;

        let thumbImg = null;
        // 썸네일 (좌측에만 생성)
        if (!isRight && navSidebar) {
            const thumbItem = document.createElement('div');
            thumbItem.className = 'nav-thumb-item';
            thumbItem.id = `thumb-${i}`;
            thumbItem.dataset.idx = i;

            const label = document.createElement('div');
            label.className = 'thumb-label';
            label.textContent = i + 1;
            thumbItem.appendChild(label);

            thumbImg = document.createElement('img');
            thumbImg.src = url;
            thumbItem.appendChild(thumbImg);
            navSidebar.appendChild(thumbItem);

            thumbItem.onclick = (e) => {
                document.querySelectorAll('.nav-thumb-item').forEach(el => el.classList.remove('active'));
                thumbItem.classList.add('active');

                // 클릭된 Y 좌표 비율 계산
                const rect = thumbItem.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const clickRatio = Math.max(0, Math.min(1, clickY / rect.height));

                // 메인 뷰어 상의 해당 이미지 절대 위치 및 높이 계산
                const imgRect = wrapper.getBoundingClientRect();
                const imgTop = imgRect.top + (isCompareMode ? container.scrollTop : (window.pageYOffset || document.documentElement.scrollTop || 0));
                const imgHeight = imgRect.height;

                const targetScrollY = imgTop + clickRatio * imgHeight - (isCompareMode ? container.clientHeight / 2 : window.innerHeight / 2);
                if (isCompareMode) {
                    container.scrollTo({ top: targetScrollY, behavior: 'auto' });
                } else {
                    window.scrollTo({ top: targetScrollY, behavior: 'auto' });
                }
            };
        }

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
    if (!isResumeEnabled) {
        // 이어서 보기가 비활성화된 경우, 복구 모달을 건너뛰고 스크롤을 무조건 0(최상단)으로 즉시 초기화합니다.
        if (isCompareMode) {
            if (container) container.scrollTop = 0;
            if (containerRight) containerRight.scrollTop = 0;
        } else {
            window.scrollTo(0, 0);
        }
        return;
    }

    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    const settings = await window.pywebview.api.get_settings();
    const saved = settings.resume ? settings.resume[key] : null;
    if (saved && parseInt(saved) > 100) {
        resumeModal.style.display = 'flex';
        btnResumeYes.onclick = () => {
            const targetScrollY = parseInt(saved);
            let attempts = 0;
            const maxAttempts = 40; // 최대 4초간 100ms 간격으로 스크롤 시도
            const interval = setInterval(() => {
                if (isCompareMode) {
                    if (container) container.scrollTop = targetScrollY;
                    if (containerRight) containerRight.scrollTop = targetScrollY;
                } else {
                    window.scrollTo(0, targetScrollY);
                }
                attempts++;
                
                const currentScroll = isCompareMode ? (container ? container.scrollTop : 0) : window.scrollY;
                if (Math.abs(currentScroll - targetScrollY) < 5 || attempts >= maxAttempts) {
                    clearInterval(interval);
                }
            }, 100);
            resumeModal.style.display = 'none';
        };
        btnResumeNo.onclick = () => { 
            if (isCompareMode) {
                if (container) container.scrollTop = 0;
                if (containerRight) containerRight.scrollTop = 0;
            } else {
                window.scrollTo(0, 0);
            }
            resumeModal.style.display = 'none'; 
        };
    }
}

function saveScrollHistory() {
    if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(async () => {
        if (currentFileKey && window.pywebview && window.pywebview.api) {
            const settings = await window.pywebview.api.get_settings();
            if (!settings.resume) settings.resume = {};
            
            const currentScrollY = isCompareMode ? (container ? parseInt(container.scrollTop) : 0) : parseInt(window.scrollY);
            if (currentScrollY > 100) {
                settings.resume[currentFileKey] = currentScrollY;
            } else {
                delete settings.resume[currentFileKey];
            }
            window.pywebview.api.save_settings(settings);
        }
    }, 500);
}

function snapMinimapToActiveThumb(thumb) {
    if (!thumb || !isMinimapPageScrollEnabled) return;
    const sidebar = document.getElementById('nav-sidebar');
    if (!sidebar) return;
    
    const thumbTop = thumb.offsetTop;
    const thumbBottom = thumbTop + thumb.offsetHeight;
    const viewTop = sidebar.scrollTop;
    const viewBottom = viewTop + sidebar.clientHeight;
    
    // 현재 썸네일이 미니맵 화면 범위 밖에 있다면 (미니맵을 휠로 탐색하다 돌아온 경우 포함), 해당 썸네일 페이지로 즉시 복귀 점프
    if (thumbBottom > viewBottom) {
        sidebar.scrollTo({
            top: Math.max(0, thumbTop - 10),
            behavior: 'auto'
        });
    } else if (thumbTop < viewTop) {
        sidebar.scrollTo({
            top: Math.max(0, thumbBottom - sidebar.clientHeight + 10),
            behavior: 'auto'
        });
    }
}

let currentActiveThumb = null;

window.addEventListener('scroll', () => {
    saveScrollHistory();
    // 뷰어 스크롤 시 미니맵 수동 탐색 상태를 해제하고 현재 활성 컷 위치로 자동 동기화
    if (!isHoveringSidebar && currentActiveThumb) {
        snapMinimapToActiveThumb(currentActiveThumb);
    }
}, { passive: true });

if (container) {
    container.addEventListener('scroll', () => {
        if (isCompareMode) {
            saveScrollHistory();
        }
        if (!isHoveringSidebar && currentActiveThumb) {
            snapMinimapToActiveThumb(currentActiveThumb);
        }
    }, { passive: true });
}

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
                currentActiveThumb = thumb;
                
                // [프리미어 프로 타임라인 Page Scroll 방식]
                if (isMinimapPageScrollEnabled && !isHoveringSidebar) {
                    snapMinimapToActiveThumb(thumb);
                }
            }
            updatePageIndicator(idx + 1);
        }
    });
}, { rootMargin: '-40% 0px -60% 0px' }); 

function setupScrollObserver() {
    observer.disconnect();
    container.querySelectorAll('.webtoon-page').forEach(page => observer.observe(page));
}

function updatePageIndicator(curr) { pageIndicator.textContent = `${curr} / ${totalFiles}`; }

document.getElementById('toggle-resume').onchange = (e) => {
    isResumeEnabled = e.target.checked;
    window.pywebview.api.save_settings({ app: { resumeEnabled: isResumeEnabled } });
};
document.getElementById('toggle-dark').onchange = (e) => {
    const isDark = e.target.checked;
    body.classList.toggle('dark-mode', isDark);
    try { localStorage.setItem('webtoon_darkMode', isDark ? 'true' : 'false'); } catch (err) {}
    window.pywebview.api.save_settings({ app: { darkMode: isDark } });
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

// [추가] 비교 모드용 스크롤 앵커 계산 및 동기화 함수들
function calculateCompareAnchor(side = 'left') {
    const containerEl = (side === 'right') ? containerRight : container;
    if (!containerEl) return null;
    
    const pages = Array.from(containerEl.querySelectorAll('.webtoon-page'));
    if (pages.length === 0) return null;
    
    const containerRect = containerEl.getBoundingClientRect();
    const viewportMid = (containerRect.top + containerRect.bottom) / 2;
    
    for (let i = 0; i < pages.length; i++) {
        const rect = pages[i].getBoundingClientRect();
        if (rect.top <= viewportMid && rect.bottom >= viewportMid) {
            return { index: i, ratio: (viewportMid - rect.top) / rect.height };
        }
    }
    
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

function applyCompareAnchor(leftAnchor, rightAnchor) {
    if (leftAnchor && container) {
        const pages = Array.from(container.querySelectorAll('.webtoon-page'));
        const page = pages[leftAnchor.index];
        if (page) {
            const pageRect = page.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const viewportMid = (containerRect.top + containerRect.bottom) / 2;
            const deltaY = pageRect.top + (pageRect.height * leftAnchor.ratio) - viewportMid;
            if (Math.abs(deltaY) > 0.1) {
                container.scrollBy(0, deltaY);
            }
        }
    }
    if (rightAnchor && containerRight) {
        const pages = Array.from(containerRight.querySelectorAll('.webtoon-page'));
        const page = pages[rightAnchor.index];
        if (page) {
            const pageRect = page.getBoundingClientRect();
            const containerRect = containerRight.getBoundingClientRect();
            const viewportMid = (containerRect.top + containerRect.bottom) / 2;
            const deltaY = pageRect.top + (pageRect.height * rightAnchor.ratio) - viewportMid;
            if (Math.abs(deltaY) > 0.1) {
                containerRight.scrollBy(0, deltaY);
            }
        }
    }
}

function animateCompareAnchor(leftAnchor, rightAnchor, duration = 300) {
    const startTime = performance.now();
    function step(now) {
        const elapsed = now - startTime;
        applyCompareAnchor(leftAnchor, rightAnchor);
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

const minimapPageScrollToggle = document.getElementById('toggle-minimap-page-scroll');
if (minimapPageScrollToggle) {
    minimapPageScrollToggle.onchange = (e) => {
        isMinimapPageScrollEnabled = e.target.checked;
        window.pywebview.api.save_settings({ app: { minimapPageScroll: isMinimapPageScrollEnabled } });
    };
}

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

// 캡처 저장 경로 변경 이벤트
const btnChangeCaptureDir = document.getElementById('btn-change-capture-dir');
if (btnChangeCaptureDir) {
    btnChangeCaptureDir.onclick = async (e) => {
        e.stopPropagation();
        if (window.pywebview && window.pywebview.api) {
            const result = await window.pywebview.api.select_capture_dir();
            if (result) {
                window.pywebview.api.save_settings({ app: { captureDir: result } });
                const captureDirValue = document.getElementById('capture-dir-value');
                if (captureDirValue) {
                    captureDirValue.textContent = result;
                    captureDirValue.title = result;
                }
            }
        }
    };
}

const btnResetCaptureDir = document.getElementById('btn-reset-capture-dir');
if (btnResetCaptureDir) {
    btnResetCaptureDir.onclick = (e) => {
        e.stopPropagation();
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.save_settings({ app: { captureDir: "" } });
            const captureDirValue = document.getElementById('capture-dir-value');
            if (captureDirValue) {
                captureDirValue.textContent = "기본 (사진/Webtoon capture)";
                captureDirValue.title = "기본 사진 저장 폴더";
            }
            showToast("기본 저장 폴더로 초기화되었습니다.", "camera");
        }
    };
}

// 캡처 설정 아코디언 접기/펼치기 토글 이벤트
const accordionCaptureHeader = document.getElementById('accordion-capture-header');
const accordionCaptureContent = document.getElementById('accordion-capture-content');
if (accordionCaptureHeader && accordionCaptureContent) {
    accordionCaptureHeader.onclick = (e) => {
        e.stopPropagation();
        const isOpen = accordionCaptureContent.style.display !== 'none';
        accordionCaptureContent.style.display = isOpen ? 'none' : 'block';
        const icon = accordionCaptureHeader.querySelector('.accordion-icon');
        if (icon) {
            icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        }
    };
}

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



    // [추가] M 키를 누르면 미니맵 토글 (한글 입력 상태 'ㅡ' 및 물리 키 'KeyM' 대응)
    if (key === 'm' || key === 'ㅡ' || e.code === 'KeyM') {
        const toggle = document.getElementById('toggle-minimap');
        if (toggle) {
            toggle.checked = !toggle.checked;
            toggle.dispatchEvent(new Event('change'));
            e.preventDefault();
            e.stopPropagation();
        }
    }

    // [추가] Alt+C 키를 누르면 현재 화면 캡처 (한글 입력 상태 'ㅊ' 및 물리 키 'KeyC' 대응)
    if (e.altKey && (key === 'c' || key === 'ㅊ' || e.code === 'KeyC') && !(typeof isSelecting !== 'undefined' && isSelecting)) {
        const btn = document.getElementById('btn-capture');
        if (btn) {
            btn.click();
            e.preventDefault();
            e.stopPropagation();
        }
    }

    // [추가] Alt+X 키를 누르면 영역 지정 캡처 (한글 입력 상태 'ㅌ' 및 물리 키 'KeyX' 대응)
    if (e.altKey && (key === 'x' || key === 'ㅌ' || e.code === 'KeyX') && !(typeof isSelecting !== 'undefined' && isSelecting)) {
        const btn = document.getElementById('btn-crop-capture');
        if (btn) {
            btn.click();
            e.preventDefault();
            e.stopPropagation();
        }
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
    
    let side = 'left';
    if (isCompareMode) {
        const clientX = e.clientX;
        const width = window.innerWidth;
        if (clientX > width / 2) {
            side = 'right';
        }
    }

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
            if (files.length > 0) startProcess(files, side);
        }
    } else if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        startProcess(Array.from(e.dataTransfer.files), side);
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
function getToastCenterX() {
    const container = document.getElementById('viewer-container');
    const isCompare = document.body.classList.contains('compare-mode');
    
    let rect = null;
    if (isCompare) {
        const wrapper = document.getElementById('split-wrapper');
        if (wrapper) rect = wrapper.getBoundingClientRect();
    } else if (container) {
        rect = container.getBoundingClientRect();
    }
    
    if (rect) {
        // Calculate the visible horizontal center of the rect within the viewport
        const visibleLeft = Math.max(rect.left, 0);
        const visibleRight = Math.min(rect.right, window.innerWidth);
        return (visibleLeft + visibleRight) / 2;
    }
    
    // Fallback: center of the viewport excluding the pinned minimap
    const hasMinimapPinned = document.body.classList.contains('minimap-pinned');
    const rightOffset = hasMinimapPinned ? 100 : 0;
    return (window.innerWidth - rightOffset) / 2;
}

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
    
    // Position toast relative to the webtoon image's horizontal center!
    const centerX = getToastCenterX();
    toast.style.left = `${centerX}px`;
    
    toast.classList.add('show');
    
    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ============================================================
//  7. 스크롤 가속 엔진 (Smooth Scroll Engine)
// ============================================================

let lastActiveComparePane = null;

function updateScroll() {
    if (isAccelEnabled) {
        // 1. 수직 스크롤 처리
        if (Math.abs(scrollVelocityY) > 0.1) {
            if (isCompareMode) {
                const targetPane = lastActiveComparePane || container;
                if (targetPane) targetPane.scrollTop += scrollVelocityY;
            } else {
                window.scrollBy(0, scrollVelocityY);
            }
            scrollVelocityY *= friction;
        } else {
            scrollVelocityY = 0;
        }

        // 2. 수평 스크롤 처리 (Shift + 휠 대응)
        if (Math.abs(scrollVelocityX) > 0.1) {
            if (isCompareMode) {
                const targetPane = lastActiveComparePane || container;
                if (targetPane) targetPane.scrollLeft += scrollVelocityX;
            } else {
                window.scrollBy(scrollVelocityX, 0);
            }
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
            isHoveringSidebar = isOverSidebar;
            if (isOverSidebar) {
                e.preventDefault();
                sidebar.scrollTop += e.deltaY;
                return;
            }
        } else {
            isHoveringSidebar = false;
        }
    }

    // 비교보기 모드 시 마우스 위치에 따른 스플릿 창 스크롤 처리
    if (isCompareMode) {
        e.preventDefault();
        const activePane = (e.clientX > window.innerWidth / 2) ? containerRight : container;
        lastActiveComparePane = activePane;

        if (isStepScrollEnabled) {
            const direction = e.deltaY > 0 ? 1 : -1;
            activePane.scrollTop += direction * stepAmount;
            return;
        }

        if (isAccelEnabled) {
            if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                scrollVelocityX += (e.deltaX || e.deltaY) * accelFactor;
            } else {
                scrollVelocityY += e.deltaY * accelFactor;
            }
            return;
        }

        // 일반 휠 스크롤 (가속/스텝 둘 다 꺼짐)
        activePane.scrollTop += e.deltaY;
        return;
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

function hasLoadedImages() {
    const hasLeft = document.body.classList.contains('has-images') && container && container.querySelectorAll('.webtoon-page').length > 0;
    const hasRight = containerRight && containerRight.classList.contains('has-images-right') && containerRight.querySelectorAll('.webtoon-page').length > 0;
    return hasLeft || hasRight;
}

document.getElementById('btn-capture').onclick = async () => {
    if (!hasLoadedImages()) {
        showToast("캡처를 수행할 수 없습니다.", "alert");
        return;
    }
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
let startScrollLeft = 0;
let startScrollTop = 0;
let currentDragX = 0;
let currentDragY = 0;
let activeDragContainer = null;
let autoScrollTimer = null;

const selectionBox = document.createElement('div');
selectionBox.id = 'selection-box';
document.body.appendChild(selectionBox);

function updateSelectionBox() {
    if (!isSelecting) return;
    
    let currentScrollLeft = 0;
    let currentScrollTop = 0;
    
    if (isCompareMode) {
        if (activeDragContainer) {
            currentScrollLeft = activeDragContainer.scrollLeft;
            currentScrollTop = activeDragContainer.scrollTop;
        }
    } else {
        currentScrollLeft = window.scrollX || window.pageXOffset;
        currentScrollTop = window.scrollY || window.pageYOffset;
    }
    
    const deltaScrollX = currentScrollLeft - startScrollLeft;
    const deltaScrollY = currentScrollTop - startScrollTop;
    
    const adjustedStartX = startX - deltaScrollX;
    const adjustedStartY = startY - deltaScrollY;
    
    // 웹툰 이미지 영역 기준 경계값 계산 및 제한 적용
    const activeContainer = activeDragContainer || container;
    let limitLeft = -Infinity;
    let limitRight = Infinity;
    let limitTop = -Infinity;
    let limitBottom = Infinity;
    
    if (activeContainer) {
        const pages = Array.from(activeContainer.querySelectorAll('.webtoon-page'));
        if (pages.length > 0) {
            const pagesRects = pages.map(p => {
                const img = p.querySelector('.viewer-image');
                return img ? img.getBoundingClientRect() : p.getBoundingClientRect();
            });
            limitLeft = Math.min(...pagesRects.map(r => r.left));
            limitRight = Math.max(...pagesRects.map(r => r.right));
            limitTop = Math.min(...pagesRects.map(r => r.top));
            limitBottom = Math.max(...pagesRects.map(r => r.bottom));
        }
    }
    
    const clampedAdjustedStartX = Math.max(limitLeft, Math.min(limitRight, adjustedStartX));
    const clampedAdjustedStartY = Math.max(limitTop, Math.min(limitBottom, adjustedStartY));
    
    const clampedCurrentDragX = Math.max(limitLeft, Math.min(limitRight, currentDragX));
    const clampedCurrentDragY = Math.max(limitTop, Math.min(limitBottom, currentDragY));
    
    const left = Math.min(clampedAdjustedStartX, clampedCurrentDragX);
    const top = Math.min(clampedAdjustedStartY, clampedCurrentDragY);
    const width = Math.abs(clampedAdjustedStartX - clampedCurrentDragX);
    const height = Math.abs(clampedAdjustedStartY - clampedCurrentDragY);
    
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
}

function startAutoScrollLoop() {
    if (autoScrollTimer) return;
    
    const threshold = 50;
    const speed = 15;
    
    function tick() {
        if (!isSelecting) {
            stopAutoScrollLoop();
            return;
        }
        
        let scrolled = false;
        
        if (isCompareMode) {
            if (activeDragContainer) {
                if (currentDragY > window.innerHeight - threshold) {
                    activeDragContainer.scrollBy(0, speed);
                    scrolled = true;
                } else if (currentDragY < threshold) {
                    activeDragContainer.scrollBy(0, -speed);
                    scrolled = true;
                }
            }
        } else {
            if (currentDragY > window.innerHeight - threshold) {
                window.scrollBy(0, speed);
                scrolled = true;
            } else if (currentDragY < threshold) {
                window.scrollBy(0, -speed);
                scrolled = true;
            }
        }
        
        if (scrolled) {
            updateSelectionBox();
        }
        
        autoScrollTimer = requestAnimationFrame(tick);
    }
    
    autoScrollTimer = requestAnimationFrame(tick);
}

function stopAutoScrollLoop() {
    if (autoScrollTimer) {
        cancelAnimationFrame(autoScrollTimer);
        autoScrollTimer = null;
    }
}

document.getElementById('btn-crop-capture').onclick = async () => {
    if (!hasLoadedImages()) {
        showToast("캡처를 수행할 수 없습니다.", "alert");
        return;
    }

    if (isCompareMode) {
        // 비교보기 모드: 이미지 축소 직전 좌/우 화면의 중앙 앵커를 계산합니다.
        const leftAnchor = calculateCompareAnchor('left');
        const rightAnchor = calculateCompareAnchor('right');

        document.body.classList.add('selecting-transition');
        isSelecting = true;
        document.body.classList.add('selecting');
        settingsPanel.classList.remove('show');
        showToast("마우스로 드래그하여 영역을 선택하세요. (ESC: 취소)", "camera");

        // 150ms 트랜지션 동안 매 프레임 앵커 기반 스크롤 동기화 수행
        animateCompareAnchor(leftAnchor, rightAnchor, 150);

        setTimeout(() => {
            document.body.classList.remove('selecting-transition');
        }, 150);
        return;
    }

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

    startX = e.clientX;
    startY = e.clientY;
    currentDragX = e.clientX;
    currentDragY = e.clientY;
    
    if (isCompareMode) {
        activeDragContainer = (containerRight && e.clientX >= containerRight.getBoundingClientRect().left)
            ? containerRight : container;
        startScrollLeft = activeDragContainer ? activeDragContainer.scrollLeft : 0;
        startScrollTop = activeDragContainer ? activeDragContainer.scrollTop : 0;
    } else {
        activeDragContainer = null;
        startScrollLeft = window.scrollX || window.pageXOffset;
        startScrollTop = window.scrollY || window.pageYOffset;
    }
    
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
    
    startAutoScrollLoop();
});

window.addEventListener('mousemove', (e) => {
    if (!isSelecting || e.buttons !== 1) return;
    
    currentDragX = e.clientX;
    currentDragY = e.clientY;
    
    updateSelectionBox();
});

window.addEventListener('mouseup', async (e) => {
    if (!isSelecting) return;
    stopAutoScrollLoop();
    const rect = selectionBox.getBoundingClientRect();
    await endCropCapture(rect);
});

// 스크롤 시 선택 영역 실시간 업데이트 (마우스 휠 스크롤 대응)
window.addEventListener('scroll', () => {
    if (isSelecting) {
        updateSelectionBox();
    }
}, true);

// 영역 지정 캡처 종료/취소 처리 공통 함수
async function endCropCapture(rect) {
    if (!isSelecting) return;
    stopAutoScrollLoop();
    
    if (isCompareMode) {
        // 비교보기 모드: 이미지 복원 직전 좌/우 화면의 중앙 앵커를 계산합니다.
        const leftAnchor = calculateCompareAnchor('left');
        const rightAnchor = calculateCompareAnchor('right');

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

        // 150ms 트랜지션 동안 매 프레임 앵커 기반 스크롤 동기화 수행
        animateCompareAnchor(leftAnchor, rightAnchor, 150);

        setTimeout(() => {
            document.body.classList.remove('selecting-transition');
        }, 150);

        if (rect && rect.width >= 5 && rect.height >= 5) {
            await captureHighRes(rect, "Crop");
        } else {
            showToast("캡처가 취소되었습니다.", "x");
        }
        return;
    }

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

        // 비교 모드에서는 rect(선택 영역)가 속한 컨테이너만을 대상으로 제한합니다.
        // document.querySelectorAll로 전체를 잡으면 양쪽 컨테이너의 페이지가 뒤섞여 좌표가 틀어집니다.
        let captureContainer;
        if (isCompareMode && containerRight) {
            const rightBounds = containerRight.getBoundingClientRect();
            const rectCenter = (rect.left + rect.right) / 2;
            captureContainer = (rectCenter >= rightBounds.left) ? containerRight : container;
        } else {
            captureContainer = container || document.body;
        }

        const pages = Array.from(captureContainer.querySelectorAll('.webtoon-page'));
        if (pages.length === 0) throw new Error("이미지가 없습니다.");

        // [A] 축소된 여백을 갖는 부모 div 대신 실제 [img.viewer-image] 들의 bounding rect를 연산합니다.
        const pagesRects = pages.map(p => {
            const img = p.querySelector('.viewer-image');
            return img ? img.getBoundingClientRect() : p.getBoundingClientRect();
        });
        const minLeft = Math.min(...pagesRects.map(r => r.left));
        const maxRight = Math.max(...pagesRects.map(r => r.right));

        const minTop = Math.min(...pagesRects.map(r => r.top));
        const maxBottom = Math.max(...pagesRects.map(r => r.bottom));

        // 1. 영역 보정 (배경 제외 및 화면 범위 제한)
        const finalLeft = Math.max(rect.left, minLeft);
        const finalRight = Math.min(rect.right, maxRight);
        const finalTop = Math.max(rect.top, minTop);
        const finalBottom = Math.min(rect.bottom, maxBottom);
        const finalWidth = finalRight - finalLeft;
        const finalHeight = finalBottom - finalTop;

        if (finalWidth <= 0 || finalHeight <= 0) {
            showToast("캡처할 영역이 이미지 바깥입니다.", "alert");
            return;
        }

        // 2. 배율 계산
        const firstVisiblePage = pages.find(p => {
            const img = p.querySelector('.viewer-image');
            if (!img) return false;
            const r = img.getBoundingClientRect();
            return r.bottom > finalTop && r.top < finalBottom;
        }) || pages[0];
        
        const firstVisibleImg = firstVisiblePage.querySelector('.viewer-image');
        // 부모 offsetWidth 대신 실제 img의 offsetWidth 를 분모로 사용하여 축소 배율을 정확히 복원합니다!
        const scaleRatio = firstVisibleImg ? (firstVisibleImg.naturalWidth / firstVisibleImg.offsetWidth) : 1;
        
        // 3. 캔버스 준비
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(finalWidth * scaleRatio);
        canvas.height = Math.round(finalHeight * scaleRatio);
        const ctx = canvas.getContext('2d');

        // 4. 원본 데이터 그리기
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const pRect = pagesRects[i]; // 실제 이미지 바운딩
            const intersectTop = Math.max(finalTop, pRect.top);
            const intersectBottom = Math.min(finalBottom, pRect.bottom);
            
            if (intersectTop < intersectBottom) {
                const imgEl = page.querySelector('.viewer-image');
                if (!imgEl) continue;

                // 이미지 내 소스 시작 X: 선택 영역 left와 이미지 left 차이 (0 이상)
                const relX = Math.max(0, finalLeft - pRect.left);
                const relY = intersectTop - pRect.top;
                // 이 이미지 상에서의 실제 교차 폭 계산
                const clampedLeft = Math.max(finalLeft, pRect.left);
                const clampedRight = Math.min(finalRight, pRect.right);
                const relW = clampedRight - clampedLeft;
                const relH = intersectBottom - intersectTop;

                if (relW <= 0) continue;

                // 비율 환산 시에도 부모가 아닌 실제 img의 크기를 기준으로 나눕니다.
                const scaleX = imgEl.naturalWidth / imgEl.offsetWidth;
                const scaleY = imgEl.naturalHeight / imgEl.offsetHeight;
                const srcX = relX * scaleX;
                const srcY = relY * scaleY;
                const srcW = relW * scaleX;
                const srcH = relH * scaleY;

                // 캔버스 X 시작: 이 이미지가 선택 영역 내에서 시작하는 X 위치
                const destX = Math.round(Math.max(0, pRect.left - finalLeft) * scaleRatio);
                const destY = Math.round((intersectTop - finalTop) * scaleRatio);
                const destW = Math.round(relW * scaleRatio);
                // 정수 픽셀 단위로 경계를 일치시켜 빈틈과 이미지 어긋남을 동시에 해결합니다.
                const destH = Math.round((intersectBottom - finalTop) * scaleRatio) - destY;

                ctx.drawImage(imgEl, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
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
        stopAutoScrollLoop();
        isSelecting = false;
        document.body.classList.remove('selecting');
        if (selectionBox) selectionBox.style.display = 'none';
        showToast("캡처가 취소되었습니다.", "x");
    }
});

// ============================================================
//  10. 비교보기 (Compare Mode) 및 스크롤 동기화 연동
// ============================================================

let isSyncingScroll = false;

function syncScroll(source, target) {
    if (!isScrollSync) return;
    if (isSyncingScroll) return;
    isSyncingScroll = true;
    
    const sourceMax = source.scrollHeight - source.clientHeight;
    const targetMax = target.scrollHeight - target.clientHeight;
    
    if (sourceMax > 0 && targetMax > 0) {
        const ratio = source.scrollTop / sourceMax;
        target.scrollTop = ratio * targetMax;
    }
    
    requestAnimationFrame(() => {
        isSyncingScroll = false;
    });
}

if (container) {
    container.addEventListener('scroll', () => {
        if (isCompareMode) {
            syncScroll(container, containerRight);
            queueMinimapUpdate();
        }
    });
}

if (containerRight) {
    containerRight.addEventListener('scroll', () => {
        if (isCompareMode) {
            syncScroll(containerRight, container);
            queueMinimapUpdate();
        }
    });
}

// [추가] 컨텍스트 메뉴 상태값 및 온오프 가시성 동적 스타일 제어 함수
function updateCtxMenuUI() {
    const compareStatus = document.getElementById('ctx-compare-status');
    if (compareStatus) {
        compareStatus.textContent = isCompareMode ? 'On' : 'Off';
        compareStatus.style.setProperty('color', isCompareMode ? '#34c759' : '#a3a3a3', 'important');
        compareStatus.style.setProperty('font-weight', isCompareMode ? 'bold' : 'normal', 'important');
    }
    
    const syncStatus = document.getElementById('ctx-sync-status');
    if (syncStatus) {
        syncStatus.textContent = isScrollSync ? 'On' : 'Off';
        syncStatus.style.setProperty('color', isScrollSync ? '#38bdf8' : '#a3a3a3', 'important');
        syncStatus.style.setProperty('font-weight', isScrollSync ? 'bold' : 'normal', 'important');
    }
    
    const syncItem = document.getElementById('ctx-toggle-sync');
    if (syncItem) {
        if (isCompareMode) {
            syncItem.classList.remove('disabled');
        } else {
            syncItem.classList.add('disabled');
        }
    }
}

// [리팩토링] 비교 모드 및 스크롤 동기화 공통 제어 함수
function setCompareMode(enabled) {
    if (isCompareMode === enabled) return; // 상태가 바뀌지 않으면 무시
    
    // 1. 전환 직전 보고 있던 화면 중앙의 웹툰 컷 앵커 추출
    let anchor = null;
    if (isCompareMode) {
        // 비교 모드 -> 단일 모드: 현재 비교 모드의 좌측 뷰어 기준 앵커 획득
        anchor = calculateCompareAnchor('left');
    } else {
        // 단일 모드 -> 비교 모드: 현재 일반 window 뷰어 기준 앵커 획득
        anchor = calculateRealTimeAnchor();
    }

    // 2. 모드 상태 및 CSS 클래스 토글 적용
    isCompareMode = enabled;
    body.classList.toggle('compare-mode', isCompareMode);
    
    if (containerRight) {
        containerRight.style.display = isCompareMode ? 'block' : 'none';
    }
    
    if (isCompareMode) {
        body.style.overflow = 'hidden';
    } else {
        body.style.removeProperty('overflow');
        // 비교모드를 껐다 켜더라도 프로그램 종료 전까지는 우측 웹툰 내용이 세션 동안 그대로 보존됩니다.
    }
    
    // 3. 레이아웃 변화가 완료된 후 새 스크롤 컨텍스트로 앵커 위치 복원
    if (anchor) {
        setTimeout(() => {
            if (isCompareMode) {
                // 비교 모드가 켜진 경우: 채취한 앵커를 좌측 컨테이너 스크롤에 투영
                if (container) {
                    const pages = Array.from(container.querySelectorAll('.webtoon-page'));
                    const page = pages[anchor.index];
                    if (page) {
                        const targetScrollY = page.offsetTop + (page.clientHeight * anchor.ratio) - (container.clientHeight / 2);
                        container.scrollTop = targetScrollY;
                    }
                }
                // 동기화 옵션 켜져있으면 좌측 스크롤에 맞춰 우측 동기화
                if (isScrollSync && container && containerRight) {
                    syncScroll(container, containerRight);
                }
            } else {
                // 단일 모드로 복귀한 경우: 채취한 앵커를 window 스크롤에 투영
                const pages = document.querySelectorAll('.webtoon-page');
                const page = pages[anchor.index];
                if (page) {
                    const targetScrollY = page.offsetTop + (page.clientHeight * anchor.ratio) - (window.innerHeight / 2);
                    window.scrollTo(0, targetScrollY);
                }
            }
            updateCtxMenuUI();
            updateMinimapViewportIndicator();
        }, 0);
    } else {
        updateCtxMenuUI();
        setTimeout(updateMinimapViewportIndicator, 100);
    }
}

function setScrollSync(enabled) {
    isScrollSync = enabled;
    if (isScrollSync && container && containerRight) {
        syncScroll(container, containerRight);
    }
    updateCtxMenuUI();
}

window.setCompareMode = setCompareMode;
window.setScrollSync = setScrollSync;
window.triggerOpenDialog = triggerOpenDialog;


async function tLog(msg) {
    console.log(msg);
    if (window.pywebview && window.pywebview.api && window.pywebview.api.debug_log) {
        window.pywebview.api.debug_log(msg);
    }
}


function applyPlatformShortcuts() {
    const isMac = (navigator.userAgent.toUpperCase().includes('MAC') || navigator.platform.toUpperCase().includes('MAC'));
    if (isMac) {
        const scCap = document.getElementById('ctx-shortcut-capture-screen');
        if (scCap) scCap.textContent = '⌥C';
        const scCrop = document.getElementById('ctx-shortcut-capture-crop');
        if (scCrop) scCrop.textContent = '⌥X';
    }

    // 플랫폼별 웹뷰 렌더링 엔진 표기 (macOS: WebKit, Windows: WebView2)
    const techEl = document.getElementById('info-app-tech') || document.querySelector('.info-app-tech');
    if (techEl) {
        const engine = isMac ? 'pywebview (WebKit)' : 'pywebview (WebView2)';
        techEl.textContent = `Python 3.12 + ${engine} + Bottle + Canvas`;
    }
}

// DOM 로드 즉시 및 초기화 시점에 단축키 라벨 적용
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPlatformShortcuts);
} else {
    applyPlatformShortcuts();
}

async function initialize() {
    try {
        await tLog("🚀 Starting initialization...");
        applyPlatformShortcuts();
        await loadSettings();
        restoreSliderLabels();
        updateScroll();
        
        // 비교보기 관련 컴포넌트 초기 상태 강제 반영
        setCompareMode(false);
        setScrollSync(true);
        
        await tLog("✅ Initialization completed successfully.");

        // [업데이트 체크]
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.check_for_updates().then(res => {
                if (res && res.update_available) {
                    const updateUi = document.getElementById('update-notification');
                    const updateDesc = document.getElementById('update-desc');
                    const btnLater = document.getElementById('btn-update-later');
                    const btnNow = document.getElementById('btn-update-now');
                    
                    if (updateUi && updateDesc) {
                        updateDesc.textContent = `버전 v${res.version} 업데이트가 있습니다. 지금 다운로드하고 설치하시겠습니까? (자동으로 재시작됩니다)`;
                        updateUi.style.display = 'flex';
                        
                        btnLater.onclick = () => {
                            updateUi.style.display = 'none';
                        };
                        
                        btnNow.onclick = () => {
                            btnNow.textContent = "다운로드 중...";
                            btnNow.disabled = true;
                            btnLater.disabled = true;
                            window.pywebview.api.download_and_install_update(res.download_url);
                        };
                    }
                }
            }).catch(e => console.error("Update check failed", e));
        }

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

let lastRightClickedFilePath = null; // 우클릭된 컷의 실제 파일 경로를 캐싱하는 변수

// [추가] 현재 화면 뷰포트에 가장 많이 노출되어 감상 중인 웹툰 컷의 실제 파일 경로를 획득하는 함수
function getActiveVisibleFilePath(side = 'left') {
    // 1. 우클릭이 직접 이미지 위에서 발생한 경우 캐싱된 경로를 최우선 반환
    if (lastRightClickedFilePath) {
        return lastRightClickedFilePath;
    }

    const containerEl = (side === 'right') ? containerRight : container;
    if (!containerEl) return null;
    
    const pages = Array.from(containerEl.querySelectorAll('.webtoon-page'));
    if (pages.length === 0) return null;
    
    // 2. 차선책: 화면 기준 정중앙 Y좌표와 가장 가까운 컷 매칭
    const viewportCenter = window.innerHeight / 2;
    
    let closestPage = pages[0];
    let minDistance = Infinity;
    
    for (let page of pages) {
        const rect = page.getBoundingClientRect();
        const pageCenter = (rect.top + rect.bottom) / 2;
        const distance = Math.abs(pageCenter - viewportCenter);
        if (distance < minDistance) {
            minDistance = distance;
            closestPage = page;
        }
    }
    
    return closestPage ? closestPage.dataset.rawPath : null;
}

// ============================================================
//  11. 커스텀 우클릭 컨텍스트 메뉴 바인딩
// ============================================================
const contextMenu = document.getElementById('context-menu');
let currentSideContext = 'left'; // 우클릭이 발생한 뷰어 위치 컨텍스트 ('left' 또는 'right')

window.addEventListener('contextmenu', (e) => {
    // 캡처 드래그 중이거나 모달 활성화 중일 때는 우클릭 차단만
    if (isSelecting) {
        e.preventDefault();
        return;
    }
    
    e.preventDefault();

    // 우클릭 타겟 이미지로부터 즉각적인 rawPath 추출 및 캐싱
    const clickedPage = e.target.closest('.webtoon-page');
    if (clickedPage && clickedPage.dataset.rawPath) {
        lastRightClickedFilePath = clickedPage.dataset.rawPath;
    } else {
        lastRightClickedFilePath = null;
    }
    
    // 우클릭 마우스 위치에 따른 좌/우 뷰어 컨텍스트 감지
    const containerRight = document.getElementById('viewer-container-right');
    const isRightClick = containerRight && (containerRight === e.target || containerRight.contains(e.target));
    currentSideContext = isRightClick ? 'right' : 'left';
    
    const submenuLabel = document.getElementById('ctx-open-submenu-label');
    if (submenuLabel) {
        if (isCompareMode) {
            submenuLabel.textContent = isRightClick ? '이미지 열기 (우측)' : '이미지 열기 (좌측)';
        } else {
            submenuLabel.textContent = '이미지 열기';
        }
    }
    
    // 파일 위치 열기 메뉴 활성화 여부 동기화 (현재 노출 중인 개별 컷 파일 경로 기준)
    const activePath = getActiveVisibleFilePath(currentSideContext);
    const locationItem = document.getElementById('ctx-open-location');
    if (locationItem) {
        if (activePath) {
            locationItem.classList.remove('disabled');
        } else {
            locationItem.classList.add('disabled');
        }
    }
    
    // 플랫폼과 무관하게 항상 HTML 커스텀 컨텍스트 메뉴 렌더링 (1px 오프셋)
    const posX = e.clientX + 1;
    const posY = e.clientY + 1;
    updateCtxMenuUI();
    contextMenu.style.left = `${posX}px`;
    contextMenu.style.top = `${posY}px`;
    contextMenu.style.display = 'block';
});

// 외부 좌클릭 시 HTML 메뉴 닫기 (Windows용)
window.addEventListener('mousedown', (e) => {
    if (e.button === 0 && contextMenu && contextMenu.style.display === 'block') {
        if (!contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
        }
    }
});

// 메뉴 밖 영역 클릭 시 자동 닫기
window.addEventListener('click', (e) => {
    if (contextMenu && !contextMenu.contains(e.target)) {
        contextMenu.style.display = 'none';
    }
});

// ESC 키 입력 시 자동 닫기
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && contextMenu) {
        contextMenu.style.display = 'none';
    }
});

// 메뉴 아이템별 클릭 바인딩
document.getElementById('ctx-toggle-compare').onclick = (e) => {
    e.stopPropagation();
    setCompareMode(!isCompareMode);
    contextMenu.style.display = 'none';
};

document.getElementById('ctx-toggle-sync').onclick = (e) => {
    e.stopPropagation();
    if (!isCompareMode) return;
    setScrollSync(!isScrollSync);
    contextMenu.style.display = 'none';
};

// [A] 이미지 열기 서브메뉴 파일/폴더 클릭 처리
document.getElementById('ctx-open-file').onclick = (e) => {
    e.stopPropagation();
    contextMenu.style.display = 'none';
    triggerOpenDialog('file', currentSideContext);
};

document.getElementById('ctx-open-folder').onclick = (e) => {
    e.stopPropagation();
    contextMenu.style.display = 'none';
    triggerOpenDialog('folder', currentSideContext);
};

document.getElementById('ctx-open-location').onclick = (e) => {
    e.stopPropagation();
    contextMenu.style.display = 'none';
    const activePath = getActiveVisibleFilePath(currentSideContext);
    if (activePath && window.pywebview && window.pywebview.api) {
        window.pywebview.api.open_file_location(activePath);
    } else {
        showToast("로드된 파일 위치를 찾을 수 없습니다.", "alert");
    }
};

document.getElementById('ctx-capture-screen').onclick = (e) => {
    e.stopPropagation();
    contextMenu.style.display = 'none';
    // 숨겨진 캡처 버튼 이벤트를 시뮬레이션 트리거
    const target = document.getElementById('btn-capture');
    if (target) target.click();
};

document.getElementById('ctx-capture-crop').onclick = (e) => {
    e.stopPropagation();
    contextMenu.style.display = 'none';
    // 숨겨진 영역 캡처 버튼 이벤트를 시뮬레이션 트리거
    const target = document.getElementById('btn-crop-capture');
    if (target) target.click();
};

document.getElementById('ctx-open-menu').onclick = (e) => {
    e.stopPropagation();
    contextMenu.style.display = 'none';
    settingsPanel.classList.add('show');
};

const ctxNewWindow = document.getElementById('ctx-new-window');
if (ctxNewWindow) {
    ctxNewWindow.onclick = (e) => {
        e.stopPropagation();
        contextMenu.style.display = 'none';
        if (window.pywebview && window.pywebview.api) {
            window.pywebview.api.open_new_window();
        }
    };
}

// 제품 정보 모달 제어
const infoBtn = document.getElementById('info-btn');
const infoModalBackdrop = document.getElementById('info-modal-backdrop');
const infoModalCloseBtn = document.getElementById('info-modal-close-btn');
const infoModalCloseX = document.getElementById('info-modal-close-x');

function openInfoModal() {
    if (infoModalBackdrop) infoModalBackdrop.classList.add('show');
}
function closeInfoModal() {
    if (infoModalBackdrop) infoModalBackdrop.classList.remove('show');
}

const panelInfoBtn = document.getElementById('panel-info-btn');
if (infoBtn) infoBtn.onclick = openInfoModal;
if (panelInfoBtn) panelInfoBtn.onclick = openInfoModal;
if (infoModalCloseBtn) infoModalCloseBtn.onclick = closeInfoModal;
if (infoModalCloseX) infoModalCloseX.onclick = closeInfoModal;
if (infoModalBackdrop) {
    infoModalBackdrop.onclick = (e) => {
        if (e.target === infoModalBackdrop) closeInfoModal();
    };
}
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && infoModalBackdrop && infoModalBackdrop.classList.contains('show')) {
        closeInfoModal();
    }
});
