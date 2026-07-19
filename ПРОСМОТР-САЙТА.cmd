@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  СоюзГеоСтаб — локальный просмотр сайта
echo  --------------------------------------
echo.
echo  Сейчас откроется браузер. Чтобы закрыть просмотр — закройте это окно.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  ОШИБКА: не найден Node.js. Установите его с nodejs.org
  echo  и запустите файл заново.
  echo.
  pause
  exit /b 1
)

start "" http://localhost:4173/
node "%~dp0tools\preview.mjs"
pause
