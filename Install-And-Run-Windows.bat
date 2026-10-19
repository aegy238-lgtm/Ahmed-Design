@echo off
chcp 65001 >nul
title SVGA Genius Studio - المثبت والمشغل التلقائي
echo ========================================================
echo       SVGA AHMED STUDIO - تثبيت وتشغيل المشروع
echo ========================================================
echo.
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] لم يتم العثور على Node.js، جاري فتح النسخة المستقلة مباشرة...
    start "" "SVGA-Studio-Standalone.html"
    exit /b 0
)
if not exist "node_modules" (
    echo [*] جاري تثبيت مكتبات المشروع لأول مرة (npm install)...
    call npm install
)
echo [*] جاري تشغيل سيرفر المنصة على http://localhost:3000 ...
start "" "http://localhost:3000"
call npm run dev
pause
