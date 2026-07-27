@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0\.."
title ABB Star Reward - Setup R2 + Edge Function

echo ============================================================
echo    ABB Star Reward - Setup Upload Foto ke Cloudflare R2
echo ============================================================
echo.
echo Script ini akan:
echo   1. Menyimpan kredensial R2 sebagai SECRET di Supabase
echo   2. Men-deploy Edge Function "get-upload-url"
echo.
echo Kredensial HANYA dikirim ke Supabase (tidak disimpan di file,
echo tidak masuk Git, tidak dikirim ke mana pun).
echo.
echo Siapkan dulu dari Cloudflare - R2:
echo   - Account ID          (sidebar R2)
echo   - Access Key ID       (Manage R2 API Tokens)
echo   - Secret Access Key   (muncul sekali saat token dibuat)
echo   - Nama bucket         (mis. abb-star-reward-photos)
echo.
pause
echo.

REM --- Cek Node ---
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js belum terinstal. Install dulu: https://nodejs.org
  pause & exit /b 1
)

REM --- Input ---
set "PROJECT_REF=uvhtowutaroeqmavhmxn"
set /p PROJECT_REF="Supabase project ref [%PROJECT_REF%]: "

set "R2_BUCKET=abb-star-reward-photos"
set /p R2_BUCKET="Nama bucket R2 [%R2_BUCKET%]: "

set "R2_ACCOUNT_ID="
set /p R2_ACCOUNT_ID="Cloudflare Account ID: "

set "R2_ACCESS_KEY_ID="
set /p R2_ACCESS_KEY_ID="R2 Access Key ID: "

set "R2_SECRET_ACCESS_KEY="
set /p R2_SECRET_ACCESS_KEY="R2 Secret Access Key: "

if "%R2_ACCOUNT_ID%"=="" ( echo [ERROR] Account ID kosong. & pause & exit /b 1 )
if "%R2_ACCESS_KEY_ID%"=="" ( echo [ERROR] Access Key ID kosong. & pause & exit /b 1 )
if "%R2_SECRET_ACCESS_KEY%"=="" ( echo [ERROR] Secret Access Key kosong. & pause & exit /b 1 )

echo.
echo ------------------------------------------------------------
echo [1/4] Login Supabase (browser akan terbuka)...
echo ------------------------------------------------------------
call npx -y supabase@latest login
if errorlevel 1 ( echo [ERROR] Login gagal. & pause & exit /b 1 )

echo.
echo ------------------------------------------------------------
echo [2/4] Menghubungkan ke project %PROJECT_REF%...
echo ------------------------------------------------------------
call npx -y supabase@latest link --project-ref %PROJECT_REF%
if errorlevel 1 ( echo [ERROR] Link project gagal. & pause & exit /b 1 )

echo.
echo ------------------------------------------------------------
echo [3/4] Menyimpan secret R2 ke Supabase...
echo ------------------------------------------------------------
call npx -y supabase@latest secrets set R2_ACCOUNT_ID=%R2_ACCOUNT_ID% R2_ACCESS_KEY_ID=%R2_ACCESS_KEY_ID% R2_SECRET_ACCESS_KEY=%R2_SECRET_ACCESS_KEY% R2_BUCKET=%R2_BUCKET%
if errorlevel 1 ( echo [ERROR] Gagal menyimpan secret. & pause & exit /b 1 )

echo.
echo ------------------------------------------------------------
echo [4/4] Deploy Edge Function get-upload-url...
echo ------------------------------------------------------------
call npx -y supabase@latest functions deploy get-upload-url
if errorlevel 1 ( echo [ERROR] Deploy function gagal. & pause & exit /b 1 )

echo.
echo ============================================================
echo    SELESAI! Upload foto sekarang mengarah ke R2.
echo.
echo    Langkah berikutnya:
echo      - Set VITE_R2_PUBLIC_URL di Cloudflare Pages
echo        (mis. https://img.abb-form.click)
echo      - Migrasi foto lama: MIGRASI-FOTO.bat
echo ============================================================
echo.
pause
