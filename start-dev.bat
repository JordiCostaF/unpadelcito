@echo off
setlocal

:: Get the directory of the batch file
set "batch_dir=%~dp0"

:: Create a VBScript to run commands invisibly
>"%temp%\_invisible.vbs" echo CreateObject("Wscript.Shell").Run "cmd /c " & WScript.Arguments(0), 0, False

echo Starting development servers in the background...

:: Run the commands using the VBScript
:: We must change directory first, as the VBS script runs in a different context
wscript.exe "%temp%\_invisible.vbs" "cd /d ""%batch_dir%"" && npm run dev"
wscript.exe "%temp%\_invisible.vbs" "cd /d ""%batch_dir%"" && npm run genkit:watch"

echo.
echo The servers have been started.
echo They will run in the background without a visible window.
echo To stop them, you can use Task Manager to end "Node.js" processes,
echo or run the included 'stop-dev.bat' script.
echo.

:: Clean up the VBS file after a short delay to ensure it's been used
timeout /t 2 /nobreak > nul
del "%temp%\_invisible.vbs"

echo Press any key to close this window.
pause > nul
