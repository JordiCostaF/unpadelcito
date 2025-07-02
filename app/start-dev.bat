@echo off
REM Este script inicia los servidores de desarrollo en ventanas separadas para que puedas ver los logs.

echo "Cerrando cualquier instancia previa para evitar conflictos..."
call stop-dev.bat >nul 2>&1
echo "Hecho."
echo.

echo "Iniciando servidor de desarrollo de Next.js..."
REM El comando 'start' abre una nueva ventana. El primer "" es para el titulo de la ventana.
REM 'cmd /k' ejecuta el comando y mantiene la ventana abierta para ver los logs.
start "Next.js Dev Server" cmd /k "npm run dev"
echo.

echo "Iniciando servidor de Genkit..."
start "Genkit Dev Server" cmd /k "npm run genkit:dev"
echo.

echo "Dando tiempo a los servidores para que se inicien..."
timeout /t 10 /nobreak >nul
echo.

echo "Abriendo la aplicacion en tu navegador..."
start "" "http://localhost:3000"
echo.

echo "=================================================================="
echo " Los servidores se estan ejecutando en sus propias ventanas.      "
echo " Podras ver los logs y errores en ellas.                          "
echo " Para detener todo, cierra esas dos ventanas o ejecuta stop-dev.bat. "
echo "=================================================================="
