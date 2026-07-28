# ============================================================
# Daftarkan AUTO-BACKUP HARIAN ke Windows Task Scheduler.
# Menjalankan: node backup.mjs  (tiap hari 12:00 siang).
#
# JALANKAN SEKALI (klik-kanan > Run with PowerShell, ATAU):
#   powershell -ExecutionPolicy Bypass -File .\JADWAL-AUTO-BACKUP.ps1
#
# Sebelum ini: jalankan BACKUP-1KLIK.bat SEKALI dulu (memasang dependency &
# memastikan backup.config.json benar).
# ============================================================

$Root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$Script = Join-Path $Root "backup.mjs"

# Cari node.exe (Task Scheduler butuh path absolut).
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  Write-Error "node.exe tidak ketemu. Install Node.js (https://nodejs.org) lalu buka PowerShell baru."
  exit 1
}

$action  = New-ScheduledTaskAction -Execute $node -Argument "`"$Script`"" -WorkingDirectory $Root
# Ganti jam/hari di baris ini kalau perlu. Contoh mingguan:
#   New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 12:00pm
$trigger  = New-ScheduledTaskTrigger -Daily -At 12:00pm
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable

Register-ScheduledTask -TaskName "ABB Star Reward Backup" `
  -Action $action -Trigger $trigger -Settings $settings -Force `
  -Description "Auto-backup harian data Supabase ABB Star Reward (Node -> JSON)."

Write-Host ""
Write-Host "OK. Task 'ABB Star Reward Backup' terdaftar -> tiap hari 12:00 siang."
Write-Host "Node: $node"
Write-Host "Jalankan sekarang untuk tes: Start-ScheduledTask -TaskName 'ABB Star Reward Backup'"
