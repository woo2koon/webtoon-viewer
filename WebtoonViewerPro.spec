# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[('viewer.html', '.'), ('viewer.js', '.'), ('jszip.min.js', '.'), ('html2canvas.min.js', '.'), ('fonts', 'fonts'), ('logo.png', '.'), ('스크립트 매니저 BG (6).png', '.')],
    hiddenimports=['PIL', 'PIL.Image', 'PIL.PsdImagePlugin', 'psd_tools', 'attrs'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'unittest', 'pydoc', 'test'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='WebtoonViewerPro',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['icon.ico'],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='WebtoonViewerPro',
)
