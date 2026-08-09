# ============================================================
# Daftarkan AUTO-BACKUP HARIAN ke Windows Task Scheduler.
# Tiap hari pukul 23:00 menjalankan backup-malam.bat:
#   - backup.mjs       -> data (JSON) ke folder di backup.config.json
#   - backup-foto.mjs  -> foto dari R2 (hanya yang baru; incremental)
#
# JALANKAN SEKALI (klik-kanan > Run with PowerShell, ATAU):
#   powershell -ExecutionPolicy Bypass -File .\JADWAL-AUTO-BACKUP.ps1
#
# Sebelum ini: pastikan BACKUP-1KLIK.bat dan BACKUP-FOTO-1KLIK.bat pernah
# sukses sekali (config terisi + dependency terpasang).
#
# Catatan: komputer harus menyala pukul 23:00. Kalau sedang mati,
# StartWhenAvailable membuat backup langsung jalan begitu komputer
# berikutnya dinyalakan.
# ============================================================

$Root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$Runner = Join-Path $Root "backup-malam.bat"

# Node harus terlihat oleh Task Scheduler.
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
  Write-Error "node.exe tidak ketemu. Install Node.js (https://nodejs.org) lalu buka PowerShell baru."
  exit 1
}

$action = New-ScheduledTaskAction -Execute "cmd.exe" `
  -Argument "/c `"$Runner`"" -WorkingDirectory $Root
# Ganti jam di baris ini kalau perlu (format 24 jam).
$trigger  = New-ScheduledTaskTrigger -Daily -At 23:00
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable

Register-ScheduledTask -TaskName "ABB Star Reward Backup" `
  -Action $action -Trigger $trigger -Settings $settings -Force `
  -Description "Auto-backup harian ABB Star Reward pukul 23:00 (data JSON + foto R2)."

Write-Host ""
Write-Host "OK. Task 'ABB Star Reward Backup' terdaftar -> tiap hari pukul 23:00."
Write-Host "Data  -> folder di backup.config.json (backupDirs)"
Write-Host "Foto  -> folder di foto.config.json (targetDir)"
Write-Host ""
Write-Host "Tes sekarang: Start-ScheduledTask -TaskName 'ABB Star Reward Backup'"
