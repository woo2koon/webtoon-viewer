#!/bin/bash
set -e

# 버전 정보 추출 (main.py 기준)
APP_VERSION=$(python3 -c "import main; print(main.APP_VERSION)")
echo "=== Webtoon Viewer Pro v${APP_VERSION} (macOS) 빌드 및 DMG 패키징 시작 ==="

# 1. PyInstaller 빌드
echo "[1/4] PyInstaller 앱 번들 빌드 중..."
pyinstaller --noconfirm WebtoonViewerPro_Mac.spec

# 2. 메타데이터 정리 및 코드 서명
echo "[2/4] 번들 메타데이터 정리 및 코드 서명..."
dot_clean "dist/WebtoonViewerPro.app"
find "dist/WebtoonViewerPro.app" -name "._*" -delete
codesign -s - --force --deep "dist/WebtoonViewerPro.app"

# 3. 스테이징 디렉토리 준비
echo "[3/4] DMG 스테이징 준비..."
rm -rf "dist/dmg_source"
mkdir -p "dist/dmg_source"
cp -R "dist/WebtoonViewerPro.app" "dist/dmg_source/"
find "dist/dmg_source" -name "._*" -delete

# 4. DMG 패키징 (create-dmg)
DMG_NAME="WebtoonViewerPro_v${APP_VERSION}_macOS.dmg"
echo "[4/4] DMG 파일 생성 중 (${DMG_NAME})..."
rm -f "dist/${DMG_NAME}"
create-dmg \
  --volname "Webtoon Viewer Pro" \
  --volicon "icon.icns" \
  --window-pos 200 120 \
  --window-size 600 400 \
  --icon-size 120 \
  --icon "WebtoonViewerPro.app" 160 190 \
  --hide-extension "WebtoonViewerPro.app" \
  --app-drop-link 440 190 \
  --no-internet-enable \
  "dist/${DMG_NAME}" \
  "dist/dmg_source"

rm -rf "dist/dmg_source"

echo "=================================================="
echo "✅ macOS 빌드 & DMG 생성 완료!"
echo "파일 위치: dist/${DMG_NAME}"
echo "=================================================="
