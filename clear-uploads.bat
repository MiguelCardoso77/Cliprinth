@echo off
setlocal

set "UPLOAD_DIR=%~dp0storage\uploads"

if not exist "%UPLOAD_DIR%" (
    echo No uploads directory found at "%UPLOAD_DIR%".
    exit /b 0
)

set /p CONFIRM=This will permanently delete all uploaded videos. Continue? [y/N]
if /i not "%CONFIRM%"=="y" (
    echo Cancelled.
    exit /b 0
)

for /d %%D in ("%UPLOAD_DIR%\*") do rd /s /q "%%D"
del /f /q "%UPLOAD_DIR%\*" 2>nul

echo All uploads cleared.
endlocal
