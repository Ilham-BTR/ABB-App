@echo off
setlocal
cd /d "%~dp0..\scripts"
title ABB Star Reward - Migrasi Foto ke R2

echo ============================================================
echo    Migrasi Foto: Supabase Storage - Cloudflare R2
echo ============================================================
echo.
echo File lama di Supabase TIDAK dihapus, tetap jadi cadangan.
echo.

where node >nul 2>nul
if errorlevel 1 goto NO_NODE
if not exist "migrate.config.json" goto NO_CONFIG
if exist "node_modules\@aws-sdk\client-s3" goto DRYRUN

echo Memasang dependency, sekali saja...
call npm install @supabase/supabase-js @aws-sdk/client-s3 --silent
if errorlevel 1 goto NPM_FAIL

:DRYRUN
echo [1/2] Cek dulu - dry-run, tidak ada yang dipindahkan...
echo.
call node migrate-photos-to-r2.mjs --dry-run
echo.
echo ------------------------------------------------------------
set "LANJUT="
set /p LANJUT="Lanjut migrasi sungguhan? (y/n): "
if /i not "%LANJUT%"=="y" goto BATAL

echo.
echo [2/2] Menjalankan migrasi...
echo.
call node migrate-photos-to-r2.mjs
echo.
pause
exit /b 0

:BATAL
echo Dibatalkan.
pause
exit /b 0

:NO_NODE
echo [ERROR] Node.js belum terinstal. Install dulu di https://nodejs.org
echo.
pause
exit /b 1

:NO_CONFIG
echo [ERROR] File migrate.config.json belum ada.
echo.
echo   Langkah 1 - Copy migrate.config.example.json jadi migrate.config.json
echo   Langkah 2 - Isi kredensial Supabase sumber foto dan R2
echo.
pause
exit /b 1

:NPM_FAIL
echo [ERROR] Gagal memasang dependency. Cek koneksi internet.
echo.
pause
exit /b 1
