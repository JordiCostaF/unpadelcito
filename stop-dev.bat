@echo off
echo Stopping all Node.js development server processes...
taskkill /F /IM node.exe /T > nul 2>&1

IF %ERRORLEVEL% EQU 0 (
    echo Successfully terminated Node.js processes.
) ELSE (
    echo No running Node.js processes found to terminate.
)

echo.
echo Press any key to close this window.
pause > nul
