# Paid Thai Daily test on the owner's own Windows computer (instead of a Claude Code session).
# Same runner as before (sandbox/live_haiku.js, owner profile): about 30 minutes, about US$0.30, hard cap per run.
# The site access code is typed at a hidden prompt, goes only to this run's node process, and is never written to a file,
# a log or the screen. This file is plain ASCII on purpose (Windows PowerShell 5.1 misreads UTF-8 without a BOM).
#
# FIRST TIME ONLY, in PowerShell:
#   git clone --depth 1 -b claude/session-continuation-check-a19meq https://github.com/mrkleinman/language-teacher "$HOME\LanguageTeacher\repo"
#
# EACH TEST, in PowerShell:
#   powershell -ExecutionPolicy Bypass -File "$HOME\LanguageTeacher\repo\dev\sandbox\windows\run-daily-test.ps1" -Label D15
#   (add -CheckOnly for the free check: server reachable + access code right, nothing spent)
#
# Folders, all outside the repository (the prompts carry the owner's word list, so they must never reach git):
#   $HOME\LanguageTeacher\repo      this branch, refreshed at the start of every run
#   $HOME\LanguageTeacher\runs      one folder per run (export.txt, log.txt, calls.json, summary.json) + a copy of the spend ledger
#   $HOME\LanguageTeacher\history   optional: earlier Daily exports (.txt) for the recent-lesson repeat check
#   owner backup: -Backup <file>, else the newest thai-backup-*.json in $HOME\LanguageTeacher, else in Downloads
param(
  [string]$Label = "test",
  [string]$Cap = "0.40",
  [string]$SessionCap = "15.00",
  [string]$Backup = "",
  [string]$Targets = "",
  [string]$Branch = "claude/session-continuation-check-a19meq",
  [switch]$CheckOnly,
  [switch]$NoUpdate
)
$ErrorActionPreference = "Stop"
$Root = Join-Path $HOME "LanguageTeacher"
$Repo = Join-Path $Root "repo"
$Dev  = Join-Path $Repo "dev"
$Runs = Join-Path $Root "runs"
$Hist = Join-Path $Root "history"
function Stop-Run([string]$msg) { Write-Host ""; Write-Host ("NOT RUN: " + $msg) -ForegroundColor Red; Write-Host "Nothing was spent."; exit 1 }
function Step([string]$msg) { Write-Host ""; Write-Host ("== " + $msg) -ForegroundColor Cyan }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Stop-Run "Node.js is not installed (nodejs.org)" }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Stop-Run "Git is not installed" }
$nodeMajor = [int](((node -v) -replace '^v', '').Split('.')[0])
if ($nodeMajor -lt 20) { Stop-Run ("Node.js 20 or newer is needed; this computer has " + (node -v)) }
if (-not (Test-Path (Join-Path $Dev "tt.jsx"))) { Stop-Run ("the repository is not at " + $Repo + " (run the FIRST TIME line at the top of this script)") }
New-Item -ItemType Directory -Force -Path $Runs | Out-Null

# 1. Latest branch. If this script itself changed, start the new version (PowerShell already read the old one).
if (-not $NoUpdate) {
  Step ("Getting the latest " + $Branch)
  $self = $MyInvocation.MyCommand.Path
  $before = (Get-FileHash $self).Hash
  git -C $Repo fetch --depth 1 origin $Branch
  if ($LASTEXITCODE -ne 0) { Stop-Run "git fetch failed" }
  git -C $Repo reset --hard FETCH_HEAD
  if ($LASTEXITCODE -ne 0) { Stop-Run "git reset failed" }
  if ((Get-FileHash $self).Hash -ne $before) {
    Write-Host "(this script was updated; starting the new version)"
    & $self @PSBoundParameters -NoUpdate
    exit $LASTEXITCODE
  }
}

# 2. Packages, only when package-lock.json changed.
$lockHash = (Get-FileHash (Join-Path $Dev "package-lock.json")).Hash
$stamp = Join-Path (Join-Path $Dev "node_modules") ".lock-hash"
if (-not (Test-Path $stamp) -or ((Get-Content $stamp -Raw).Trim() -ne $lockHash)) {
  Step "Installing packages"
  Push-Location $Dev
  npm ci --no-audit --no-fund
  $ok = $LASTEXITCODE
  Pop-Location
  if ($ok -ne 0) { Stop-Run "npm ci failed" }
  Set-Content -Path $stamp -Value $lockHash
}

# 3. Build the app.
Step "Building the app"
Push-Location $Dev
node build.js tt.jsx tt.compiled.js
$ok = $LASTEXITCODE
Pop-Location
if ($ok -ne 0) { Stop-Run "build failed" }

# 4. Spend ledger: the copy in runs\ is newer when a run here has not been committed to the branch yet.
$repoLedger = Join-Path (Join-Path $Dev "sandbox") "haiku-spend-ledger.json"
$localLedger = Join-Path $Runs "haiku-spend-ledger.json"
if (Test-Path $localLedger) {
  $nLocal = @((Get-Content $localLedger -Raw -Encoding UTF8 | ConvertFrom-Json).runs).Count
  $nRepo = @((Get-Content $repoLedger -Raw -Encoding UTF8 | ConvertFrom-Json).runs).Count
  if ($nLocal -gt $nRepo) { Copy-Item $localLedger $repoLedger -Force; Write-Host ("(spend ledger: using the local copy, " + $nLocal + " runs)") }
}

# 5. Owner backup and optional history.
if (-not $CheckOnly) {
  if (-not $Backup) {
    $found = Get-ChildItem -Path $Root -Filter "thai-backup-*.json" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $found) { $found = Get-ChildItem -Path (Join-Path $HOME "Downloads") -Filter "thai-backup-*.json" -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 }
    if (-not $found) { Stop-Run ("no thai-backup-*.json found in " + $Root + " or Downloads (or pass -Backup <file>)") }
    $Backup = $found.FullName
  }
  if (-not (Test-Path $Backup)) { Stop-Run ("backup not found: " + $Backup) }
  Write-Host ("Owner backup: " + $Backup)
  $histFiles = @(Get-ChildItem -Path $Hist -Filter "*.txt" -File -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object { $_.FullName })
  Write-Host ("History exports: " + $histFiles.Count)
}

# 6. Access code (hidden), free check, then the paid run.
Step "Site access code"
$sec = Read-Host "Type the site access code and press Enter (it stays hidden)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
try { $env:LT_ACCESS = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
$code = 1
$ran = $false
Push-Location $Dev
try {
  node sandbox/windows/check-access.js
  if ($LASTEXITCODE -ne 0) { throw "access check failed (see the line above)" }
  if ($CheckOnly) { $code = 0; Write-Host ""; Write-Host "Check only: stopping here. Nothing was spent." -ForegroundColor Green }
  else {
    Step ("Paid Daily test " + $Label + " (cap US$ " + $Cap + " per run, US$ " + $SessionCap + " in total)")
    $nodeArgs = @("sandbox/live_haiku.js", "--owner-backup", $Backup, "--out-dir", $Runs, "--cap", $Cap, "--session-cap", $SessionCap, "--label", $Label)
    if ($histFiles.Count -gt 0) { $nodeArgs += @("--history", ($histFiles -join ",")) }
    if ($Targets) { $nodeArgs += @("--targets", $Targets) }
    & node @nodeArgs
    $code = $LASTEXITCODE
    $ran = $true
    Copy-Item $repoLedger $localLedger -Force
  }
} catch {
  Write-Host ""; Write-Host ("NOT RUN: " + $_) -ForegroundColor Red; Write-Host "Nothing was spent."
  $code = 1
} finally {
  Remove-Item Env:LT_ACCESS -ErrorAction SilentlyContinue
  Pop-Location
}
if ($ran) {
  Write-Host ""
  Write-Host ("Finished (exit code " + $code + "). Results: " + $Runs) -ForegroundColor Green
  Write-Host "Tell Claude the run has finished."
}
exit $code
