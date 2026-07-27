@echo off
setlocal
cd /d "%~dp0\..\scripts"
title ABB Star Reward - Pindah Database ke Supabase Baru

echo ============================================================
echo    Pindah Data: Supabase LAMA -^> Supabase BARU
echo ============================================================
echo.
echo PRASYARAT:
echo   1. Project Supabase BARU sudah dibuat
echo   2. supabase\setup_fresh.sql sudah dijalankan di SQL Editor project baru
echo   3. Sudah punya file backup JSON dari project lama
echo.

where node >nul 2>nul
if errorlevel 1 ( echo [ERROR] Node.js belum terinstal: https://nodejs.org & pause & exit /b 1 )

if not exist "pindah.config.json" (
  echo [ERROR] pindah.config.json belum ada.
  echo   1^) Copy pindah.config.example.json jadi pindah.config.json
  echo   2^) Isi URL + service_role key project BARU
  echo.
  pause & exit /b 1
)

if not exist "node_modules\@supabase\supabase-js" (
  echo Memasang dependency ^(sekali saja^)...
  call npm install @supabase/supabase-js --silent
  if errorlevel 1 ( echo [ERROR] Gagal install dependency. & pause & exit /b 1 )
)

set "BACKUP="
set /p BACKUP="Path file backup JSON (drag-and-drop ke sini lalu Enter): "
set BACKUP=%BACKUP:"=%
if "%BACKUP%"=="" ( echo [ERROR] Path kosong. & pause & exit /b 1 )

echo.
echo [1/2] Cek dulu ^(dry-run^)...
echo.
call node pindah-supabase.mjs "%BACKUP%" --dry-run
echo.
echo ------------------------------------------------------------
set /p LANJUT="Lanjut pindahkan sungguhan? (y/n): "
if /i not "%LANJUT%"=="y" ( echo Dibatalkan. & pause & exit /b 0 )

echo.
echo [2/2] Memindahkan data...
echo.
call node pindah-supabase.mjs "%BACKUP%"
echo.
pause
