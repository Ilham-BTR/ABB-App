@echo off
setlocal
cd /d "%~dp0..\scripts"
title ABB Star Reward - Pindah Database ke Supabase Baru

echo ============================================================
echo    Pindah Data: Supabase LAMA - Supabase BARU
echo ============================================================
echo.
echo PRASYARAT:
echo   1. Project Supabase BARU sudah dibuat
echo   2. supabase\setup_fresh.sql sudah dijalankan di SQL Editor project baru
echo   3. Sudah punya file backup JSON dari project lama
echo.

where node >nul 2>nul
if errorlevel 1 goto NO_NODE
if not exist "pindah.config.json" goto NO_CONFIG
if exist "node_modules\@supabase\supabase-js" goto ASK_FILE

echo Memasang dependency, sekali saja...
call npm install @supabase/supabase-js --silent
if errorlevel 1 goto NPM_FAIL

:ASK_FILE
set "BACKUP="
set /p BACKUP="Path file backup JSON - drag-and-drop ke sini lalu Enter: "
set BACKUP=%BACKUP:"=%
if "%BACKUP%"=="" goto EMPTY_PATH

echo.
echo [1/2] Cek dulu - dry-run...
echo.
call node pindah-supabase.mjs "%BACKUP%" --dry-run
echo.
echo ------------------------------------------------------------
set "LANJUT="
set /p LANJUT="Lanjut pindahkan sungguhan? (y/n): "
if /i not "%LANJUT%"=="y" goto BATAL

echo.
echo [2/2] Memindahkan data...
echo.
call node pindah-supabase.mjs "%BACKUP%"
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
echo [ERROR] File pindah.config.json belum ada.
echo.
echo   Langkah 1 - Copy pindah.config.example.json jadi pindah.config.json
echo   Langkah 2 - Isi URL dan service_role key project BARU
echo.
pause
exit /b 1

:EMPTY_PATH
echo [ERROR] Path file backup kosong.
echo.
pause
exit /b 1

:NPM_FAIL
echo [ERROR] Gagal memasang dependency. Cek koneksi internet.
echo.
pause
exit /b 1
