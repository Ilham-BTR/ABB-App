@echo off
REM Dipanggil Task Scheduler tiap malam - TANPA pause, jalan senyap.
REM Backup data (JSON) selalu; backup foto ikut kalau confignya ada.
REM Riwayat tercatat di backup.log (ditulis oleh backup.mjs).
setlocal
cd /d "%~dp0"
node backup.mjs
if exist "foto.config.json" node backup-foto.mjs
exit /b 0
