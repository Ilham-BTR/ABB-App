@echo off
setlocal
cd /d "%~dp0"
title ABB Star Reward - Pasang Jadwal Backup 23:00

echo ============================================================
echo    Pasang jadwal auto-backup tiap malam pukul 23:00
echo    Tujuan: C:\Users\Ilham_PC\OneDrive\Backup App\Backup-ABB Form
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 goto NO_NODE
if not exist "backup.config.json" goto NO_CONFIG

echo [1/3] Mengatur folder tujuan di config...
node atur-folder-jadwal.mjs
if errorlevel 1 goto FAILED
echo.

echo [2/3] Mendaftarkan jadwal ke Task Scheduler...
powershell -NoProfile -ExecutionPolicy Bypass -File "JADWAL-AUTO-BACKUP.ps1"
if errorlevel 1 goto FAILED
echo.

echo [3/3] Tes langsung: menjalankan backup sekarang...
powershell -NoProfile -Command "Start-ScheduledTask -TaskName 'ABB Star Reward Backup'"
if errorlevel 1 goto FAILED

echo.
echo ============================================================
echo    SELESAI. Tunggu 1-2 menit, lalu cek folder:
echo    C:\Users\Ilham_PC\OneDrive\Backup App\Backup-ABB Form
echo    Harus ada file supabase_backup_...json baru.
echo    Riwayat tiap malam tercatat di backup.log.
echo ============================================================
echo.
pause
exit /b 0

:NO_NODE
echo [ERROR] Node.js belum terinstal. Download di https://nodejs.org versi LTS.
pause
exit /b 1

:NO_CONFIG
echo [ERROR] backup.config.json belum ada.
echo   Jalankan BACKUP-1KLIK.bat sekali dulu sampai sukses, baru pasang jadwal.
pause
exit /b 1

:FAILED
echo.
echo Ada yang gagal. Lihat pesan di atas.
pause
exit /b 1
