@echo off
REM --- Check for and kill existing processes on ports 3000 and 4000 ---
echo Searching for processes on ports 3000 and 4000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo Killing process with PID %%a on port 3000
    taskkill /F /PID %%a
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr "LISTENING"') do (
    echo Killing process with PID %%a on port 4000
    taskkill /F /PID %%a
)
echo Done.

REM --- Start servers in the background ---
echo Starting Next.js dev server and Genkit server in the background...

>"%temp%\run_hidden.vbs" echo Set WshShell = CreateObject("WScript.Shell")
>>"%temp%\run_hidden.vbs" echo WshShell.Run "npm run dev", 0
>>"%temp%\run_hidden.vbs" echo WshShell.Run "npm run genkit:dev", 0

cscript //nologo "%temp%\run_hidden.vbs"
del "%temp%\run_hidden.vbs"

echo Servers are starting... Please wait a moment.

REM --- Wait for the server to initialize (increased to 15 seconds) ---
echo Waiting for servers to start... (15 seconds)
timeout /t 15 /nobreak >nul

REM --- Open the browser ---
echo Opening project in browser...
start http://localhost:3000

echo Launch script finished. The servers are running in the background.
echo Use stop-dev.bat to stop them.
