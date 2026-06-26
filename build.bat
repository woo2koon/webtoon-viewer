@echo off
echo Webtoon Viewer Pro - 빌드 시작...

:: 1. 필요 라이브러리 확인 및 설치
python -m pip install pyinstaller pywebview

:: 2. PyInstaller 빌드 실행
:: --onefile: 단일 실행 파일 생성
:: --noconsole: 실행 시 터미널 창 숨김
:: --name: 실행 파일 이름 설정
:: --add-data: 리소스 파일 포함 (윈도우는 ; 구분자 사용)
python -m PyInstaller --noconsole --onefile --icon "icon.ico" --name "WebtoonViewerPro" --add-data "viewer.html;." --add-data "viewer.js;." --add-data "jszip.min.js;." --add-data "html2canvas.min.js;." --add-data "fonts;fonts" main.py

echo.
echo ==================================================
echo ✅ 빌드 완료!
echo 'dist' 폴더 안에 'WebtoonViewerPro.exe' 파일이 생성되었습니다.
echo ==================================================
pause
