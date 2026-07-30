@echo off
setlocal
cd /d "%~dp0"
title ABB Star Reward - Bersihkan Foto Yatim di R2

echo ============================================================
echo    Bersihkan foto YATIM di R2
echo    Foto sisa kunjungan yang sudah dihapus dari database.
echo ============================================================
echo.
echo Saran: jalankan BACKUP-FOTO-1KLIK.bat dulu, supaya semua file
echo punya salinan lokal sebelum ada yang dihapus.
echo.

where node >nul 2>nul
if errorlevel 1 goto NO_NODE
if not exist "foto.config.json" goto NO_CONFIG
if not exist "backup.config.json" goto NO_CONFIG
if exist "node_modules\@aws-sdk\client-s3" goto CHECK2
goto INSTALL
:CHECK2
if exist "node_modules\@supabase\supabase-js" goto DRYRUN

:INSTALL
echo Menyiapkan dependency, sekali saja, butuh internet...
call npm install @aws-sdk/client-s3 @supabase/supabase-js --silent
if errorlevel 1 goto NPM_FAIL

:DRYRUN
echo --- Tahap 1: melihat daftar dulu, belum ada yang dihapus ---
echo.
node bersihkan-foto-r2.mjs
if errorlevel 1 goto FAILED
echo.
set /p JAWAB=Ketik HAPUS lalu Enter untuk menghapus daftar di atas, atau Enter saja untuk batal:
if /i "%JAWAB%"=="HAPUS" goto DELETE
echo.
echo Dibatalkan. Tidak ada yang dihapus.
pause
exit /b 0

:DELETE
echo.
echo --- Tahap 2: menghapus... ---
node bersihkan-foto-r2.mjs --hapus
if errorlevel 1 goto FAILED
echo.
pause
exit /b 0

:NO_NODE
echo [ERROR] Node.js belum terinstal. Download di https://nodejs.org versi LTS.
pause
exit /b 1

:NO_CONFIG
echo [ERROR] Butuh foto.config.json DAN backup.config.json di folder ini.
echo   foto.config.json   - kredensial R2 (copy dari foto.config.example.json)
echo   backup.config.json - service_role key (sudah ada kalau BACKUP-1KLIK jalan)
pause
exit /b 1

:NPM_FAIL
echo [ERROR] Gagal memasang dependency. Pastikan ada koneksi internet.
pause
exit /b 1

:FAILED
echo.
echo Ada yang gagal atau dibatalkan pengaman. Lihat pesan di atas.
pause
exit /b 1
