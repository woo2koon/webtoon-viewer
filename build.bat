@echo off
echo Webtoon Viewer Pro - 빌드 시작...

if exist ".venv\Scripts\python.exe" (
    set "PY_CMD=.venv\Scripts\python.exe"
) else (
    set "PY_CMD=python"
)

:: 1. 필요 라이브러리 확인 및 설치
%PY_CMD% -m pip install pyinstaller pywebview Pillow

:: 2. PyInstaller 빌드 실행
%PY_CMD% -m PyInstaller --noconfirm WebtoonViewerPro.spec

echo.
echo ==================================================
echo ✅ 빌드 완료!
echo 'dist' 폴더 안에 'WebtoonViewerPro' 폴더가 생성되었습니다.
echo ==================================================
pause
