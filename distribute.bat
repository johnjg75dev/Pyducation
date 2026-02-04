@echo off
setlocal
set ROOT=%~dp0
cd /d %ROOT%

node distribute.js
if errorlevel 1 exit /b 1

echo.
echo Done. Output: dist\index.html
