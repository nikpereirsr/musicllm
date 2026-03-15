@echo off
title MusicLLM Local Player
cd /d "%~dp0"

echo.
echo  ================================================
echo   MusicLLM Local Player
echo  ================================================
echo.

:: Check Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python is not installed or not in PATH.
    echo.
    echo  Please install Python from https://www.python.org/downloads/
    echo  Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

:: Set default music folder
set MUSIC_FOLDER=C:\Users\nikol\Music\Nefarious\test\myworkspace

:: If config.json already has a folder, use it (scan_library.py handles this)
:: If the default folder exists, use it automatically
if exist "%MUSIC_FOLDER%" (
    echo  Music folder: %MUSIC_FOLDER%
) else (
    echo  WARNING: Default music folder not found:
    echo    %MUSIC_FOLDER%
    echo.
    set /p MUSIC_FOLDER="  Enter your music folder path: "
)

echo.
echo  Scanning library...
python scan_library.py "%MUSIC_FOLDER%"
if errorlevel 1 (
    echo.
    echo  ERROR: Library scan failed. Check the path above.
    pause
    exit /b 1
)

echo.
echo  Starting player server...
echo  Opening http://localhost:8888 in your browser...
echo.
echo  Press Ctrl+C to stop the server.
echo.

python server.py

pause
