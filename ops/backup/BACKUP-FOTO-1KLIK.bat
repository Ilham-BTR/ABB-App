@echo off
setlocal
cd /d "%~dp0"
title ABB Star Reward - Backup Foto dari R2

echo ============================================================
echo    ABB Star Reward - Backup Foto R2 ke lokal (1 klik)
echo ============================================================
echo.

REM --- 1. Cek Node.js ---
where node >nul 2>nul
if errorlevel 1 goto NO_NODE

REM --- 2. Cek konfigurasi (R2 + database, untuk penamaan file) ---
if not exist "foto.config.json" goto NO_CONFIG
if not exist "backup.config.json" goto NO_CONFIG

REM --- 3. Pasang dependency sekali ---
if exist "node_modules\@aws-sdk\client-s3" goto CHECK2
goto INSTALL
:CHECK2
if exist "node_modules\@supabase\supabase-js" goto RUN_BACKUP

:INSTALL
echo Menyiapkan dependency, sekali saja, butuh internet...
call npm install @aws-sdk/client-s3 @supabase/supabase-js --silent
if errorlevel 1 goto NPM_FAIL

:RUN_BACKUP
echo Mengunduh foto dari R2...
echo.
node backup-foto.mjs
if errorlevel 1 goto BACKUP_FAIL

echo.
echo ============================================================
echo    SELESAI. Cek folder tujuan: targetDir di foto.config.json
echo ============================================================
echo.
pause
exit /b 0

:NO_NODE
echo [ERROR] Node.js belum terinstal. Download di https://nodejs.org versi LTS.
echo.
pause
exit /b 1

:NO_CONFIG
echo [ERROR] Butuh foto.config.json DAN backup.config.json di folder ini.
echo.
echo   foto.config.json:
echo   Langkah 1 - Copy "foto.config.example.json" jadi "foto.config.json"
echo   Langkah 2 - Isi r2AccessKeyId dan r2SecretAccessKey
echo                nilainya sama dengan scripts\migrate.config.json
echo   Langkah 3 - Isi targetDir dengan folder tujuan, mis. D:\Backup\ABB\foto
echo.
echo   backup.config.json: sudah ada kalau BACKUP-1KLIK.bat pernah jalan.
echo   Dipakai untuk membaca nama toko dari database saat menamai file.
echo.
pause
exit /b 1

:NPM_FAIL
echo.
echo [ERROR] Gagal memasang dependency. Pastikan ada koneksi internet.
echo.
pause
exit /b 1

:BACKUP_FAIL
echo.
echo ============================================================
echo    Ada yang gagal. Lihat pesan error di atas.
echo    Skrip aman diulang - file yang sudah terunduh tidak diunduh ulang.
echo ============================================================
echo.
pause
exit /b 1
