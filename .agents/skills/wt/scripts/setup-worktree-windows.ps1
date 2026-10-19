# Worktree bootstrap for web + expo + portless (`/wt` skill).
# Runs inside the new worktree. ROOT_WORKTREE_PATH = main checkout.
$ErrorActionPreference = 'Stop'

if (-not $env:ROOT_WORKTREE_PATH) {
  throw 'ROOT_WORKTREE_PATH is required'
}

$Root = $env:ROOT_WORKTREE_PATH
# Matches portless.json / `bun web` (`portless run --name *.heynbord`).
$WebPortlessName = 'web.heynbord'

Write-Host '==> Installing workspace dependencies'
bun install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw "bun install failed ($LASTEXITCODE)" }

function Sync-AppEnvs {
  param(
    [Parameter(Mandatory = $true)][string]$AppDir,
    [Parameter(Mandatory = $true)][string[]]$Files
  )

  New-Item -ItemType Directory -Force -Path $AppDir | Out-Null
  $copied = 0

  foreach ($f in $Files) {
    $src = Join-Path (Join-Path $Root $AppDir) $f
    if (Test-Path $src) {
      Copy-Item $src (Join-Path $AppDir $f) -Force
      Write-Host "    copied $AppDir/$f"
      $copied++
    }
  }

  $example = Join-Path $AppDir '.env.example'
  if (Test-Path $example) {
    foreach ($f in $Files) {
      $target = Join-Path $AppDir $f
      if (-not (Test-Path $target)) {
        Copy-Item $example $target -Force
        Write-Host "    seeded $AppDir/$f from example"
        $copied++
      }
    }
  }

  if ($copied -eq 0) {
    Write-Host "    warning: no env files found in $Root/$AppDir (copy .env.example manually)"
  }
}

Write-Host '==> Syncing app env files from main checkout'
Sync-AppEnvs -AppDir 'apps/web' -Files @('.env.local', '.env.prod')
Sync-AppEnvs -AppDir 'apps/expo' -Files @('.env.local')

Write-Host '==> Checking portless (required for bun web)'
if (-not (Get-Command portless -ErrorAction SilentlyContinue)) {
  Write-Host 'error: portless not on PATH. Install once on the machine:'
  Write-Host '  npm install -g portless'
  Write-Host '  # or: bun add -g portless'
  throw 'portless missing'
}

$webUrl = $null
try { $webUrl = (portless get $WebPortlessName 2>$null | Select-Object -First 1).Trim() } catch {}
if (-not $webUrl) { $webUrl = "https://$WebPortlessName.localhost" }

Write-Host ''
Write-Host 'Worktree setup complete.'
Write-Host "  Web URL:  $webUrl"
Write-Host '  Start:    bun web   # or: bun expo'
Write-Host ''
