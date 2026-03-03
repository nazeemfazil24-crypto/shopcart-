@echo off
REM Simple launcher to open admin panel
echo Opening admin panel on http://localhost:8080
start http://localhost:8080/admin.html

REM Start simple HTTP server using Python
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo Starting HTTP Server...
python -m http.server 8080 >nul 2>&1
if errorlevel 1 (
    echo Python not found. Trying python3...
    python3 -m http.server 8080 >nul 2>&1
    if errorlevel 1 (
        echo Error: Python could not be found.
        echo Please install Python from https://www.python.org/downloads/
        pause
        exit /b 1
    )
)
echo Server running. Press Ctrl+C to stop.
pause
