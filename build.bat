@echo off
echo Webtoon Viewer Pro - 빌드 시작...

:: 1. 필요 라이브러리 확인 및 설치
python -m pip install pyinstaller pywebview Pillow

:: 2. PyInstaller 빌드 실행
:: --onedir: 폴더 형태 빌드 (이노셋업 결합 시 실행 속도 극대화)
:: --noconsole: 실행 시 터미널 창 숨김
:: --name: 실행 파일 이름 설정
:: --add-data: 리소스 파일 포함 (윈도우는 ; 구분자 사용)
python -m PyInstaller --noconfirm WebtoonViewerPro.spec

echo.
echo ==================================================
echo ✅ 빌드 완료!
echo 'dist' 폴더 안에 'WebtoonViewerPro' 폴더가 생성되었습니다.
echo ==================================================
pause
