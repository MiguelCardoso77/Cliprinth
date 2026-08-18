@echo off
setlocal

set "CLIPS_DIR=%~dp0storage\clips"

if not exist "%CLIPS_DIR%" (
    echo No clips directory found at "%CLIPS_DIR%".
    exit /b 0
)

set /p CONFIRM=This will permanently delete all projects and their clips. Continue? [y/N]
if /i not "%CONFIRM%"=="y" (
    echo Cancelled.
    exit /b 0
)

for /d %%D in ("%CLIPS_DIR%\*") do rd /s /q "%%D"
del /f /q "%CLIPS_DIR%\*" 2>nul

echo All projects cleared.
endlocal
