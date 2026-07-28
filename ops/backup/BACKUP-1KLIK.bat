@echo off
setlocal
cd /d "%~dp0"
title ABB Star Reward - Backup Database

echo ============================================================
echo    ABB Star Reward - Backup Database (1 klik)
echo ============================================================
echo.

REM --- 1. Cek Node.js ---
where node >nul 2>nul
if errorlevel 1 goto NO_NODE

REM --- 2. Cek konfigurasi ---
if not exist "backup.config.json" goto NO_CONFIG

REM --- 3. Pasang dependency sekali (self-contained di folder ini) ---
if exist "node_modules\@supabase\supabase-js" goto RUN_BACKUP
echo Menyiapkan dependency, sekali saja, butuh internet...
call npm install @supabase/supabase-js --silent
if errorlevel 1 goto NPM_FAIL

:RUN_BACKUP
echo Menjalankan backup...
echo.
node backup.mjs
if errorlevel 1 goto BACKUP_FAIL

echo.
echo ============================================================
echo    SELESAI. Backup berhasil dibuat.
echo    Cek folder tujuan: backupDir / backupDirs di backup.config.json
echo ============================================================
echo.
pause
exit /b 0

:NO_NODE
echo [ERROR] Node.js belum terinstal di komputer ini.
echo.
echo   Download dan install dulu di:  https://nodejs.org
echo   Pilih versi LTS, lalu jalankan file ini lagi.
echo.
pause
exit /b 1

:NO_CONFIG
echo [ERROR] File backup.config.json belum ada.
echo.
echo   Langkah 1 - Copy "backup.config.example.json" jadi "backup.config.json"
echo   Langkah 2 - Isi supabaseUrl dan serviceRoleKey
echo                dari Supabase: Project Settings - API
echo   Langkah 3 - Isi backupDirs dengan folder tujuan, mis. OneDrive dan D:
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
echo    GAGAL. Lihat pesan error di atas atau file backup.log
echo ============================================================
echo.
pause
exit /b 1
