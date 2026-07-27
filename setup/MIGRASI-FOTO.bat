@echo off
setlocal
cd /d "%~dp0\..\scripts"
title ABB Star Reward - Migrasi Foto ke R2

echo ============================================================
echo    Migrasi Foto: Supabase Storage (lama) -^> Cloudflare R2
echo ============================================================
echo.
echo File lama di Supabase TIDAK dihapus (tetap jadi cadangan).
echo.

where node >nul 2>nul
if errorlevel 1 ( echo [ERROR] Node.js belum terinstal: https://nodejs.org & pause & exit /b 1 )

if not exist "migrate.config.json" (
  echo [ERROR] migrate.config.json belum ada.
  echo   1^) Copy migrate.config.example.json jadi migrate.config.json
  echo   2^) Isi kredensial Supabase LAMA + R2
  echo.
  pause & exit /b 1
)

if not exist "node_modules\@supabase\supabase-js" (
  echo Memasang dependency ^(sekali saja^)...
  call npm install @supabase/supabase-js @aws-sdk/client-s3 --silent
  if errorlevel 1 ( echo [ERROR] Gagal install dependency. & pause & exit /b 1 )
)

echo [1/2] Cek dulu ^(dry-run^) - tidak ada yang dipindahkan...
echo.
call node migrate-photos-to-r2.mjs --dry-run
echo.
echo ------------------------------------------------------------
set /p LANJUT="Lanjut migrasi sungguhan? (y/n): "
if /i not "%LANJUT%"=="y" ( echo Dibatalkan. & pause & exit /b 0 )

echo.
echo [2/2] Menjalankan migrasi...
echo.
call node migrate-photos-to-r2.mjs
echo.
pause
