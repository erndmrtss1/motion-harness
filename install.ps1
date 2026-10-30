<#
  motion-harness kurulumu (Windows) — idempotent; her adım ✓/✗ basar.
  Kullanım (depo kökünde):   powershell -ExecutionPolicy Bypass -File .\install.ps1 [-Log kurulum.log] [-SkipSmoke] [-FromGitHub owner/motion-harness] [-WithHiggsfield]
  Adımlar:
    1 Node >= 20 · ffmpeg (paketle gelen ffmpeg-static; eksik özellik varsa winget Gyan.FFmpeg)
    2 render/: npm ci · Playwright Chromium · npm link (motion-render komutu)
    3 Claude Code plugin kaydı: marketplace add (bu klasör ya da -FromGitHub) + plugin install motion@motion-harness
    4 Higgsfield: CLI oturumu ve bakiye (yalnız okuma; anahtar kopyalanmaz)
    5 smoke: geçici proje → örnek world → 12 kare 960×540 → qc → contact → temizle
    6 özet
#>
param(
  [string]$Log = '',
  [switch]$SkipSmoke,
  [string]$FromGitHub = '',
  [switch]$WithHiggsfield
)
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Render = Join-Path $Root 'render'
$script:fails = 0
$t0 = Get-Date

function Say([string]$m) { Write-Host $m; if ($Log) { Add-Content -Path $Log -Value $m -Encoding utf8 } }
function Ok([string]$m) { Say ("  ✓ " + $m) }
function Bad([string]$m) { Say ("  ✗ " + $m); $script:fails++ }
function Info([string]$m) { Say ("  – " + $m) }
function Have([string]$cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Run([string]$exe, [string[]]$argv) {
  $out = & $exe @argv 2>&1 | Out-String
  if ($Log) { Add-Content -Path $Log -Value $out -Encoding utf8 }
  return @{ code = $LASTEXITCODE; out = $out }
}

if ($Log) { Set-Content -Path $Log -Value ("motion-harness kurulum · " + (Get-Date -Format s)) -Encoding utf8 }
Say "motion-harness kurulumu — $Root"

# ── 1 Node + ffmpeg ─────────────────────────────────────────────────────────
Say "[1/6] Node ve ffmpeg"
if (-not (Have 'node')) {
  if (Have 'winget') { Info 'Node yok → winget OpenJS.NodeJS.LTS'; Run 'winget' @('install','-e','--id','OpenJS.NodeJS.LTS','--silent','--accept-package-agreements','--accept-source-agreements') | Out-Null }
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
}
if (Have 'node') {
  $nv = (& node -v) -replace '^v',''
  if ([int]($nv.Split('.')[0]) -ge 20) { Ok "Node $nv" } else { Bad "Node $nv < 20 (https://nodejs.org)" }
} else { Bad 'Node bulunamadı (https://nodejs.org, >= 20)' }

# ── 2 render/ ───────────────────────────────────────────────────────────────
Say "[2/6] render/ paketi (@motion/harness)"
Push-Location $Render
if (Test-Path (Join-Path $Render 'package-lock.json')) { $r = Run 'npm' @('ci','--no-audit','--no-fund') } else { $r = Run 'npm' @('install','--no-audit','--no-fund') }
if ($r.code -eq 0) { Ok 'npm bağımlılıkları' } else { Bad 'npm ci başarısız (log)' }
$r = Run 'npx' @('playwright','install','chromium')
if ($r.code -eq 0) { Ok 'Playwright Chromium' } else { Bad 'Playwright Chromium indirilemedi' }
$r = Run 'npm' @('link','--no-audit','--no-fund')
if ($r.code -eq 0) { Ok 'npm link → motion-render' } else { Bad 'npm link başarısız' }
Pop-Location
if (Have 'motion-render') { Ok ('motion-render: ' + ((& motion-render --version) | Out-String).Trim()) } else { Bad 'motion-render PATH''te değil (npm prefix -g dizinini PATH''e ekleyin)' }

# ffmpeg özellikleri (doctor json'undan)
$caps = $null
if (Have 'motion-render') {
  try { $caps = (& motion-render doctor --json 2>$null | Out-String | ConvertFrom-Json).ffmpeg } catch { $caps = $null }
}
if ($caps -and $caps.libx264 -and $caps.prores_ks -and $caps.ffv1 -and $caps.loudnorm) { Ok ('ffmpeg: ' + $caps.version) }
else {
  Info 'ffmpeg-static eksik özellik bildirdi → sistem ffmpeg (winget Gyan.FFmpeg)'
  if (-not (Have 'ffmpeg') -and (Have 'winget')) { Run 'winget' @('install','-e','--id','Gyan.FFmpeg','--silent','--accept-package-agreements','--accept-source-agreements') | Out-Null }
  if (Have 'ffmpeg') { [Environment]::SetEnvironmentVariable('MOTION_FFMPEG', (Get-Command ffmpeg).Source, 'User'); $env:MOTION_FFMPEG = (Get-Command ffmpeg).Source; Ok ('MOTION_FFMPEG = ' + $env:MOTION_FFMPEG) }
  else { Bad 'ffmpeg (libx264, prores_ks, ffv1, loudnorm) bulunamadı' }
}

# ── 3 Claude Code plugin ────────────────────────────────────────────────────
Say "[3/6] Claude Code plugin kaydı"
if (-not (Have 'claude')) { Bad 'claude CLI yok (https://code.claude.com) — plugin kaydı atlandı' }
else {
  $src = $Root
  if ($FromGitHub) { $src = $FromGitHub }
  $r = Run 'claude' @('plugin','marketplace','add',$src,'--scope','user')
  if ($r.code -eq 0 -or $r.out -match 'already') { Ok "marketplace: motion-harness ← $src" } else { Bad 'marketplace add başarısız (özel depo için: gh auth login; gh auth setup-git)' }
  # HK-40: kurulu sürüm plugin.json ile karşılaştırılır; eskiyse marketplace + plugin güncellenir, aynıysa "güncel"
  $exp = $null; try { $exp = (Get-Content (Join-Path $Root '.claude-plugin\plugin.json') -Raw | ConvertFrom-Json).version } catch { $exp = $null }
  $ver = { $l = Run 'claude' @('plugin','list'); $m = [regex]::Match($l.out, '(?s)motion@motion-harness.*?Version:\s*([0-9][0-9A-Za-z.\-]*)'); if ($m.Success) { $m.Groups[1].Value } elseif ($l.out -match 'motion@motion-harness') { '?' } else { $null } }
  Run 'claude' @('plugin','marketplace','update','motion-harness') | Out-Null
  $v0 = & $ver
  if (-not $v0) {
    $r = Run 'claude' @('plugin','install','motion@motion-harness','--scope','user','-y')
    if ($r.code -eq 0 -or $r.out -match 'already') { Ok 'plugin: motion@motion-harness kuruldu' } else { Bad 'plugin install başarısız' }
  } elseif ($exp -and $v0 -ne $exp) {
    $r = Run 'claude' @('plugin','update','motion@motion-harness','--scope','user')
    if ($r.code -eq 0) { Ok "plugin: motion güncellendi $v0 → $exp (yeni oturumda yüklenir)" } else { Bad "plugin update başarısız ($v0 → $exp)" }
  } else { Ok "plugin: motion $v0 (güncel)" }
  # PN-104: sürüm aynı kalınca (dal ucu, -dev) önbellek yenilenmez → plugin metinleri (commands/, skills/, agents/, templates/) bu checkout'tan eşitlenir
  $r = Run 'node' @((Join-Path $Render 'bin\motion-render.mjs'),'plugin-sync')
  Say ('  ' + $r.out.Trim())
  if ($r.code -ne 0) { $script:fails++ }
  $v1 = & $ver
  if (-not $v1) { Bad 'doğrulama: plugin listede yok' }
  elseif ($exp -and $v1 -ne $exp) { Bad "doğrulama: kurulu sürüm $v1, depo sürümü $exp" }
  else { Ok "doğrulama: claude plugin list → motion@motion-harness $v1 (komutlar /motion:*; yeni oturumda yüklenir)" }
}

# ── 4 Higgsfield (isteğe bağlı) ─────────────────────────────────────────────
Say "[4/6] Higgsfield (üretken varlık; isteğe bağlı)"
if (-not (Have 'higgsfield') -and $WithHiggsfield) { Run 'npm' @('i','-g','@higgsfield/cli') | Out-Null }
if (Have 'higgsfield') {
  $r = Run 'higgsfield' @('account','status','--json')
  $st = $null; try { $st = $r.out | ConvertFrom-Json } catch { $st = $null }
  if ($st -and $st.credits -ne $null) { Ok ("oturum açık · bakiye " + $st.credits + " kredi (" + $st.subscription_plan_type + ")") }
  else { Info 'Higgsfield CLI var, oturum yok → higgsfield auth login (tarayıcıda) → /motion:doctor' }
} else { Info 'Higgsfield CLI yok (gerekirse: npm i -g @higgsfield/cli → higgsfield auth login). Üretken varlıksız projeler etkilenmez.' }

# ── 5 smoke ────────────────────────────────────────────────────────────────
Say "[5/6] smoke"
if ($SkipSmoke) { Info 'atlandı (-SkipSmoke)' }
elseif (Have 'motion-render') {
  $s0 = Get-Date
  $r = Run 'motion-render' @('smoke')
  $sec = [int]((Get-Date) - $s0).TotalSeconds
  if ($r.code -eq 0) { Ok "smoke: 12 kare 960×540 → qc → contact ($sec s)" } else { Bad "smoke başarısız ($sec s) — log" }
} else { Bad 'smoke: motion-render yok' }

# ── 6 özet ─────────────────────────────────────────────────────────────────
Say "[6/6] özet"
$tot = [int]((Get-Date) - $t0).TotalSeconds
if ($script:fails -eq 0) {
  Ok "kurulum tamam ($tot s)"
  Say ''
  Say '  Yeni projede: boş bir klasörde Claude Code''u aç, "START.md''yi oku, /motion:init" de.'
  Say ("  START.md: " + (Join-Path $Root 'START.md'))
  exit 0
} else {
  Bad ("$($script:fails) adım başarısız ($tot s) — README > Sorun giderme; /motion:doctor")
  exit 1
}
