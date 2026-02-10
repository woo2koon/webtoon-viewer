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
    }
    #nav-trigger { position: fixed; top: 0; right: 0; bottom: 0; width: 20px; z-index: 300; display: none; }
    #nav-trigger:hover ~ #nav-sidebar, #nav-sidebar:hover { transform: translateX(0); }

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
    .nav-thumb-item.active { border: 2px solid #3fa965 !important; }
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
    .nav-thumb-item.active .thumb-label { background: #3fa965 !important; color: #fff !important; }

    /* 2. [핵심 수정] 메인 뷰어 컨테이너 (배경색 스위칭) */
    #viewer-container {
        font-size: 0 !important;
        line-height: 0 !important;
        display: flex;
        flex-direction: column;
        
        /* [1] 초기 상태: 검은 배경 (웹툰 뷰어 느낌 & 텍스트 가독성 확보) */
        background-color: #000 !important;
        min-height: 100vh !important;
        box-shadow: 0 0 50px rgba(0,0,0,0.5) !important; /* 약간의 그림자로 깊이감 추가 */
    }

    /* [2] 로딩 완료 상태: 배경 투명화 (검은 띠 버그 방지) */
    body.has-images #viewer-container {
        background-color: transparent !important;
        box-shadow: none !important;
    }

    /* 안내 메시지 스타일 */
    #message-box {
        font-size: 16px !important; line-height: 1.5 !important; color: #888 !important;
    }
    #message-box h2 { font-size: 28px !important; margin-bottom: 30px !important; color: #ddd !important; }
    #message-box p { font-size: 16px !important; color: #888 !important; margin-bottom: 30px !important; }

    /* 3. 이미지 조각 스타일 */
    .viewer-image {
        display: block !important;
        width: 100% !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        margin-bottom: -1px !important; /* 조각끼리는 무조건 붙임 */
        transform: none !important;
        image-rendering: auto; 
        background: transparent !important; 
    }

    /* 4. 페이지(파일) 단위 컨테이너 */
    .webtoon-page {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
    }

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
        padding: 20px !important;
        width: 260px !important;
        color: #eee !important;
        position: fixed; top: 80px; left: 20px; z-index: 199; display: none;
    }
    #settings-panel.show { display: block; }
    .panel-header, .group-title {
        color: #aaa !important;
        font-size: 13px !important;
        font-weight: bold !important;
        margin-bottom: 10px !important;
    }
    .btn-row { display: flex; gap: 8px; margin-bottom: 15px; }
    .size-btn {
        flex: 1; padding: 10px 0 !important; border-radius: 6px !important;
        border: none !important; background: #444 !important; color: #ccc !important;
        font-weight: bold !important; cursor: pointer; transition: 0.2s;
    }
    .size-btn.active { background: #3fa965 !important; color: #fff !important; }
    input[type=range] { width: 100%; accent-color: #3fa965 !important; cursor: pointer; }
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
    #settings-panel input[type="checkbox"]:checked { background: #3fa965; }
    #settings-panel input[type="checkbox"]:checked::after { transform: translateX(18px); }
    #settings-panel label {
        display: flex !important; justify-content: space-between !important;
        align-items: center !important; margin-bottom: 12px !important; cursor: pointer;
    }
`;
document.head.appendChild(stylePatch);


// ============================================================
//  1. DOM 요소 & 변수 선언
// ============================================================
const hiddenInput = document.getElementById('hidden-file-input');
const hiddenFolderInput = document.getElementById('hidden-folder-input');
const container = document.getElementById('viewer-container');
const menuBtn = document.getElementById('menu-btn');
const settingsPanel = document.getElementById('settings-panel');
const body = document.body;
const pageIndicator = document.getElementById('page-indicator');
const navSidebar = document.getElementById('nav-sidebar');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const loadingBar = document.getElementById('progress-bar');

const menuFileBtn = document.getElementById('menu-file-btn');
const menuFolderBtn = document.getElementById('menu-folder-btn');
const centerFileBtn = document.getElementById('center-file-btn');
const centerFolderBtn = document.getElementById('center-folder-btn');

const resumeModal = document.getElementById('resume-modal');
const btnResumeYes = document.getElementById('btn-resume-yes');
const btnResumeNo = document.getElementById('btn-resume-no');

let totalFiles = 0;
const MAX_CHUNK_HEIGHT = 4096;
const MAX_THUMB_HEIGHT = 2048; 
const CONCURRENCY_LIMIT = navigator.hardwareConcurrency || 4;

let createdUrls = [];
let currentFileKey = "";
let scrollSaveTimer = null;

// ============================================================
//  2. 설정 로드
// ============================================================
loadSettings();
restoreSliderLabels();

function loadSettings() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) { body.classList.add('dark-mode'); document.getElementById('toggle-dark').checked = true; }
    
    const savedSpacing = localStorage.getItem('spacingCollapsed');
    const isSpacingCollapsed = savedSpacing === null ? true : (savedSpacing === 'true');
    
    body.classList.toggle('spacing-collapsed', isSpacingCollapsed);
    const spacingToggle = document.getElementById('toggle-spacing');
    if(spacingToggle) spacingToggle.checked = isSpacingCollapsed;

    const viewMode = localStorage.getItem('viewMode') || 'fit';
    if (viewMode === 'original') {
        body.classList.add('view-mode-original');
        document.getElementById('btn-original').classList.add('active');
        document.getElementById('btn-fit').classList.remove('active');
    }

    const savedWidthScale = localStorage.getItem('widthScale') || '100';
    document.documentElement.style.setProperty('--container-width', `${690 * (savedWidthScale/100)}px`);
    document.getElementById('width-slider').value = savedWidthScale;
    document.getElementById('width-value').textContent = `${savedWidthScale}%`;
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
centerFileBtn.addEventListener('click', () => hiddenInput.click());
menuFileBtn.addEventListener('click', () => { hiddenInput.click(); settingsPanel.classList.remove('show'); });

centerFolderBtn.addEventListener('click', () => hiddenFolderInput.click());
menuFolderBtn.addEventListener('click', () => { hiddenFolderInput.click(); settingsPanel.classList.remove('show'); });

hiddenInput.addEventListener('change', (e) => startProcess(Array.from(e.target.files)));
hiddenFolderInput.addEventListener('change', (e) => startProcess(Array.from(e.target.files)));

// ============================================================
//  4. 메인 처리 로직
// ============================================================
async function startProcess(files) {
    if (files.length === 0) return;

    container.innerHTML = '';
    navSidebar.innerHTML = '';
    createdUrls.forEach(url => URL.revokeObjectURL(url));
    createdUrls = [];
    
    loadingOverlay.style.display = 'flex';
    loadingText.textContent = "파일 분석 중...";
    loadingBar.style.width = '0%';

    try {
        let imageBlobs = [];
        let fileKey = "";

        if (files.length === 1 && (files[0].name.endsWith('.zip') || files[0].name.endsWith('.cbz'))) {
            if (typeof JSZip === 'undefined') throw new Error("JSZip 라이브러리가 필요합니다.");
            loadingText.textContent = "압축 해제 중...";
            fileKey = files[0].name;
            imageBlobs = await unzipFiles(files[0]);
        } else {
            const imgs = files.filter(f => f.type.startsWith('image/'));
            if (imgs.length === 0) throw new Error("이미지 파일이 없습니다.");
            imgs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
            imageBlobs = imgs;
            fileKey = (imgs[0].webkitRelativePath || imgs[0].name).split('/')[0];
        }

        totalFiles = imageBlobs.length;
        currentFileKey = fileKey;

        document.getElementById('nav-trigger').style.display = 'block';
        pageIndicator.style.display = 'block';
        updatePageIndicator(1);
        
        await processImagesInBatches(imageBlobs);

        loadingOverlay.style.display = 'none';
        body.classList.add('has-images'); // [중요] 이 클래스가 붙으면 배경이 투명해집니다!
        checkResumeHistory(fileKey);
        setupScrollObserver();

    } catch (err) {
        alert("오류: " + err.message);
        loadingOverlay.style.display = 'none';
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
        const percent = Math.round(((i + 1) / validFiles.length) * 100);
        loadingText.textContent = `압축 해제 중... ${percent}%`;
        loadingBar.style.width = `${percent}%`;
        
        blobs.push(await validFiles[i].async('blob'));
        if (i % 20 === 0) await new Promise(r => requestAnimationFrame(r));
    }
    return blobs;
}

async function processImagesInBatches(blobs) {
    let processedCount = 0;
    const queue = blobs.map((blob, index) => ({ blob, index }));
    
    const worker = async () => {
        while (queue.length > 0) {
            const { blob, index } = queue.shift();
            await processFile(blob, index);
            
            processedCount++;
            const percent = Math.round((processedCount / totalFiles) * 100);
            loadingText.textContent = `이미지 처리 중... ${percent}% (${processedCount}/${totalFiles})`;
            loadingBar.style.width = `${percent}%`;
        }
    };

    const workers = Array(CONCURRENCY_LIMIT).fill(null).map(() => worker());
    await Promise.all(workers);
}

// ============================================================
//  5. 개별 파일 처리 (순서 보장)
// ============================================================
async function processFile(blob, index) {
    try {
        const thumbPromise = createImageBitmap(blob, { resizeWidth: 100, resizeQuality: 'high' })
            .then(bmp => { createThumbnailSliced(index, bmp); bmp.close(); });
            
        const mainPromise = createImageBitmap(blob)
            .then(bmp => { renderMainImage(index, bmp); bmp.close(); });

        await Promise.all([thumbPromise, mainPromise]);
    } catch (e) {
        console.warn(`${index}번 이미지 처리 실패:`, e);
    }
}

function createThumbnailSliced(index, bitmap) {
    let containerDiv = document.getElementById(`thumb-container-${index}`);
    if (!containerDiv) {
        containerDiv = document.createElement('div');
        containerDiv.id = `thumb-container-${index}`;
        containerDiv.style.order = index; 
        navSidebar.appendChild(containerDiv);
    }

    const thumbItem = document.createElement('div');
    thumbItem.className = 'nav-thumb-item';
    thumbItem.id = `thumb-${index}`;
    thumbItem.dataset.idx = index;
    
    const label = document.createElement('div');
    label.className = 'thumb-label';
    label.textContent = index + 1;
    thumbItem.appendChild(label);

    let currentY = 0;
    while (currentY < bitmap.height) {
        const sliceHeight = Math.min(MAX_THUMB_HEIGHT, bitmap.height - currentY);
        const img = document.createElement('img');
        thumbItem.appendChild(img);

        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = sliceHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, currentY, bitmap.width, sliceHeight, 0, 0, bitmap.width, sliceHeight);
        
        canvas.toBlob(blob => {
            img.src = URL.createObjectURL(blob);
        }, 'image/jpeg', 0.8);

        currentY += sliceHeight;
    }

    thumbItem.onclick = () => {
        document.querySelectorAll('.nav-thumb-item').forEach(el => el.classList.remove('active'));
        thumbItem.classList.add('active');
        const target = document.getElementById(`file-start-${index}`);
        if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
    };
    
    containerDiv.appendChild(thumbItem);
}

function renderMainImage(index, bitmap) {
    let pageDiv = document.getElementById(`page-container-${index}`);
    if (!pageDiv) {
        pageDiv = document.createElement('div');
        pageDiv.id = `page-container-${index}`;
        pageDiv.className = 'webtoon-page'; 
        pageDiv.style.order = index; 
        container.appendChild(pageDiv);
    }

    const { width, height } = bitmap;
    let currentY = 0;
    let sliceIdx = 0;

    while (currentY < height) {
        const h = Math.min(MAX_CHUNK_HEIGHT, height - currentY);
        const img = document.createElement('img');
        img.className = 'viewer-image'; 
        img.dataset.fileIndex = index;
        
        if (sliceIdx === 0) img.id = `file-start-${index}`;
        pageDiv.appendChild(img); 

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, currentY, width, h, 0, 0, width, h);

        canvas.toBlob(blob => {
            img.src = URL.createObjectURL(blob);
            img.onload = () => { img.style.background = 'transparent'; };
        }, 'image/jpeg', 0.9);

        currentY += h;
        sliceIdx++;
    }
}

// ============================================================
//  6. UI 유틸리티
// ============================================================
function checkResumeHistory(key) {
    const saved = localStorage.getItem(`resume_${key}`);
    if (saved && parseInt(saved) > 100) {
        resumeModal.style.display = 'flex';
        btnResumeYes.onclick = () => {
            window.scrollTo({ top: parseInt(saved), behavior: 'auto' });
            resumeModal.style.display = 'none';
        };
        btnResumeNo.onclick = () => { resumeModal.style.display = 'none'; };
    }
}

window.addEventListener('scroll', () => {
    if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(() => {
        if (currentFileKey && window.scrollY > 100) {
            localStorage.setItem(`resume_${currentFileKey}`, parseInt(window.scrollY));
        }
    }, 500);
});

menuBtn.onclick = () => settingsPanel.classList.toggle('show');
window.onclick = (e) => { if (!settingsPanel.contains(e.target) && e.target !== menuBtn) settingsPanel.classList.remove('show'); };

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
    localStorage.setItem('darkMode', e.target.checked);
};
document.getElementById('toggle-spacing').onchange = (e) => {
    body.classList.toggle('spacing-collapsed', e.target.checked);
    localStorage.setItem('spacingCollapsed', e.target.checked);
};
document.getElementById('btn-fit').onclick = () => {
    body.classList.remove('view-mode-original');
    document.getElementById('btn-fit').classList.add('active');
    document.getElementById('btn-original').classList.remove('active');
    localStorage.setItem('viewMode', 'fit');
};
document.getElementById('btn-original').onclick = () => {
    body.classList.add('view-mode-original');
    document.getElementById('btn-original').classList.add('active');
    document.getElementById('btn-fit').classList.remove('active');
    localStorage.setItem('viewMode', 'original');
};
document.getElementById('width-slider').oninput = (e) => {
    const val = e.target.value;
    document.documentElement.style.setProperty('--container-width', `${690 * (val/100)}px`);
    document.getElementById('width-value').textContent = `${val}%`;
    localStorage.setItem('widthScale', val);
};

window.onkeydown = (e) => {
    const amount = window.innerHeight * 0.8;
    if (e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); window.scrollBy(0, amount); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); window.scrollBy(0, -amount); }
};

window.addEventListener('dragover', (e) => { e.preventDefault(); body.style.opacity = '0.5'; });
window.addEventListener('dragleave', (e) => { e.preventDefault(); body.style.opacity = '1'; });
window.addEventListener('drop', (e) => { 
    e.preventDefault(); body.style.opacity = '1'; 
    if (e.dataTransfer && e.dataTransfer.files.length > 0) startProcess(Array.from(e.dataTransfer.files));
});