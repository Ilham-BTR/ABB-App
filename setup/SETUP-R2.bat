@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0.."
title ABB Star Reward - Setup R2 + Edge Function

echo ============================================================
echo    ABB Star Reward - Setup Upload Foto ke Cloudflare R2
echo ============================================================
echo.
echo Script ini akan:
echo   Langkah 1 - Menyimpan kredensial R2 sebagai SECRET di Supabase
echo   Langkah 2 - Men-deploy Edge Function "get-upload-url"
echo.
echo Kredensial hanya dikirim ke Supabase. Tidak disimpan di file,
echo tidak masuk Git, tidak dikirim ke mana pun.
echo.
echo Siapkan dulu dari Cloudflare - R2:
echo   - Account ID        : ada di sidebar halaman R2
echo   - Access Key ID     : dari Manage R2 API Tokens
echo   - Secret Access Key : muncul sekali saat token dibuat
echo   - Nama bucket       : mis. abb-star-reward-photos
echo.
pause
echo.

where node >nul 2>nul
if errorlevel 1 goto NO_NODE

set "PROJECT_REF="
set /p PROJECT_REF="Supabase project ref project BARU: "
if "%PROJECT_REF%"=="" goto EMPTY

set "R2_BUCKET=abb-star-reward-photos"
set /p R2_BUCKET="Nama bucket R2 [%R2_BUCKET%]: "

set "R2_ACCOUNT_ID="
set /p R2_ACCOUNT_ID="Cloudflare Account ID: "
if "%R2_ACCOUNT_ID%"=="" goto EMPTY

set "R2_ACCESS_KEY_ID="
set /p R2_ACCESS_KEY_ID="R2 Access Key ID: "
if "%R2_ACCESS_KEY_ID%"=="" goto EMPTY

set "R2_SECRET_ACCESS_KEY="
set /p R2_SECRET_ACCESS_KEY="R2 Secret Access Key: "
if "%R2_SECRET_ACCESS_KEY%"=="" goto EMPTY

echo.
echo ------------------------------------------------------------
echo [1/4] Login Supabase - browser akan terbuka...
echo ------------------------------------------------------------
call npx -y supabase@latest login
if errorlevel 1 goto FAIL_LOGIN

echo.
echo ------------------------------------------------------------
echo [2/4] Menghubungkan ke project %PROJECT_REF%...
echo ------------------------------------------------------------
call npx -y supabase@latest link --project-ref %PROJECT_REF%
if errorlevel 1 goto FAIL_LINK

echo.
echo ------------------------------------------------------------
echo [3/4] Menyimpan secret R2 ke Supabase...
echo ------------------------------------------------------------
call npx -y supabase@latest secrets set R2_ACCOUNT_ID=%R2_ACCOUNT_ID% R2_ACCESS_KEY_ID=%R2_ACCESS_KEY_ID% R2_SECRET_ACCESS_KEY=%R2_SECRET_ACCESS_KEY% R2_BUCKET=%R2_BUCKET%
if errorlevel 1 goto FAIL_SECRET

echo.
echo ------------------------------------------------------------
echo [4/4] Deploy Edge Function get-upload-url...
echo ------------------------------------------------------------
call npx -y supabase@latest functions deploy get-upload-url
if errorlevel 1 goto FAIL_DEPLOY

echo.
echo ============================================================
echo    SELESAI. Upload foto sekarang mengarah ke R2.
echo.
echo    Berikutnya:
echo    - Set VITE_R2_PUBLIC_URL di Cloudflare Pages
echo    - Migrasi foto lama: jalankan MIGRASI-FOTO.bat
echo ============================================================
echo.
pause
exit /b 0

:NO_NODE
echo [ERROR] Node.js belum terinstal. Install dulu di https://nodejs.org
echo.
pause
exit /b 1

:EMPTY
echo.
echo [ERROR] Ada isian yang kosong. Jalankan lagi dan isi semuanya.
echo.
pause
exit /b 1

:FAIL_LOGIN
echo.
echo [ERROR] Login Supabase gagal.
pause
exit /b 1

:FAIL_LINK
echo.
echo [ERROR] Gagal menghubungkan ke project. Cek project ref-nya.
pause
exit /b 1

:FAIL_SECRET
echo.
echo [ERROR] Gagal menyimpan secret.
pause
exit /b 1

:FAIL_DEPLOY
echo.
echo [ERROR] Deploy Edge Function gagal.
pause
exit /b 1
