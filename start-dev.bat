@echo off
title Starting UnPadelazo Dev Servers

echo Starting Next.js and Genkit servers in the background...

:: Create a temporary VBScript to run commands hidden
>%temp%\runhidden.vbs echo Set WshShell = CreateObject("WScript.Shell")
>>%temp%\runhidden.vbs echo WshShell.Run "npm run dev", 0, false
>>%temp%\runhidden.vbs echo WshShell.Run "npm run genkit:dev", 0, false

:: Execute the VBScript
cscript //nologo %temp%\runhidden.vbs

:: Delete the temporary VBScript
del %temp%\runhidden.vbs

echo Servers are starting. Waiting a few seconds for them to be ready...
:: Wait for 5 seconds to give servers time to start
timeout /t 5 /nobreak > nul

echo Opening project in browser at http://localhost:3000
:: Open the browser
start "" http://localhost:3000

echo Done. The servers are running in the background.
echo Use stop-dev.bat to stop them.
