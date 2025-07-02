@echo off
title UnPadelazo Development Launcher

echo =========================================
echo  Starting UnPadelazo Development Servers
echo =========================================
echo.
echo This script will open two new terminal windows:
echo 1. Next.js App Server (Frontend)
echo 2. Genkit Dev Server (AI Backend)
echo.
echo Please wait for both servers to start up completely.
echo You can close this window once they are running.
echo.

REM Start the Next.js development server in a new window
echo Starting Next.js server on http://localhost:3000 ...
start "UnPadelazo - Next.js" cmd /k "npm run dev"

REM Start the Genkit watcher in a new window
echo Starting Genkit server on http://localhost:4000 ...
start "UnPadelazo - Genkit" cmd /k "npm run genkit:watch"

echo.
echo Launching servers...
timeout /t 3 >nul
echo.
echo All servers have been launched in separate windows.
echo You can now close this launcher window.
pause
