# tools/render-oncesi.ps1 — render / encode öncesi makine denetimi (motion paketi şablonu; motion-render init kopyalar). Yalnız okuma.
#   powershell -NoProfile -File tools/render-oncesi.ps1 [-KlonHead <sha|etiket>] [-Klon <dizin>] [-Izinli a/,b.mjs] [-Sessiz] [-Surecsiz]
# Denetimler (çıkış 0 temiz · 1 engel):
#   (i)  kurulu harness klonu (motion-render'ın koştuğu dizin) HEAD'i beklenen tabanda mı ve ağacı temiz mi. İzinli yollardaki
#        değişiklik uyarıdır (render/probe/encode yoluna girmeyen dosyalar), dışındaki her değişiklik engel.
#        Taban: -KlonHead ya da proje dosyası tools/harness-taban.txt (ilk dolu satır: SHA ya da etiket; '#' yorum). Taban yoksa (i) bilgi olarak atlanır.
#        Klon: -Klon → $env:MOTION_HARNESS_CLONE → 'motion-render --where' → 'npm prefix -g' bağı (node_modules\@motion\harness → <klon>\render).
#   (ii) başka bir Playwright Chromium (ms-playwright yolu) / chrome-headless-shell / ffmpeg süreci var mı. Kullanıcının kendi Chrome'u engel değildir.
# Çıktı: son satır tek satırlık özet; engel varsa öncesinde süreç satırları (kullanıcı dizini %USERPROFILE% ile maskeli; -Sessiz ile basılmaz).
# Çıktı ASCII'dir: Windows PowerShell 5.1 yönlendirilen çıktıyı OEM kod sayfasıyla yazar (Türkçe harf ve · bozulmasın).
# -Surecsiz: (ii) atlanır (yalnız klon denetimi; tanı ve test için — render kapısı olarak kullanılmaz). Linux/macOS: tools/render-oncesi.sh.
param([string]$KlonHead = '', [string]$Klon = '', [string[]]$Izinli = @(), [switch]$Sessiz, [switch]$Surecsiz)
$Proje = Split-Path -Parent $PSScriptRoot
$Izinli = @($Izinli | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim().Replace('\', '/') } | Where-Object { $_ })
function Maskele([string]$s) {
  if (-not $s) { return '' }
  if ($env:USERPROFILE) { $s = $s -replace [regex]::Escape($env:USERPROFILE), '%USERPROFILE%' }
  return ($s -replace '(?i)[A-Z]:\\Users\\[^\\"\s]+', '%USERPROFILE%')
}

# ── (i) kurulu klon ─────────────────────────────────────────────────────────────
function Bul-Klon {
  if ($Klon) { return @($Klon, 'parametre') }
  if ($env:MOTION_HARNESS_CLONE) { return @($env:MOTION_HARNESS_CLONE, 'MOTION_HARNESS_CLONE') }
  if (Get-Command motion-render -ErrorAction SilentlyContinue) {
    $w = @(& motion-render --where 2>$null) | Select-Object -First 1
    if ($LASTEXITCODE -eq 0 -and $w -and (Test-Path (Join-Path $w.Trim() 'render'))) { return @($w.Trim(), 'motion-render --where') }
  }
  if (Get-Command npm -ErrorAction SilentlyContinue) {
    $pre = @(& npm prefix -g 2>$null) | Select-Object -First 1
    if ($pre) {
      foreach ($p in @((Join-Path $pre.Trim() 'node_modules\@motion\harness'), (Join-Path $pre.Trim() 'lib\node_modules\@motion\harness'))) {
        if (Test-Path $p) {
          $it = Get-Item $p -Force; $t = $it.FullName
          if ($it.Target) { $t = @($it.Target)[0]; if (-not [IO.Path]::IsPathRooted($t)) { $t = Join-Path (Split-Path -Parent $p) $t } }
          return @((Split-Path -Parent $t), 'npm prefix -g')
        }
      }
    }
  }
  return @($null, 'bulunamadi')
}
$taban = $KlonHead.Trim(); $tabanKaynak = '-KlonHead'
if (-not $taban) {
  $tf = Join-Path $Proje 'tools\harness-taban.txt'
  if (Test-Path $tf) { $taban = @(Get-Content $tf | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }) | Select-Object -First 1; $tabanKaynak = 'tools/harness-taban.txt' }
}
$k = Bul-Klon; $kdir = $k[0]; $kyol = $k[1]
$engel = @(); $uyari = @(); $klonOzet = ''
$gitVar = [bool](Get-Command git -ErrorAction SilentlyContinue)
$klonGit = $kdir -and $gitVar -and (Test-Path (Join-Path $kdir '.git'))
$degisen = @(); $disari = @(); $h = '?'; $dal = '?'
if ($klonGit) {
  $h = (@(& git -C $kdir rev-parse --short HEAD 2>$null) | Select-Object -First 1); $dal = (@(& git -C $kdir rev-parse --abbrev-ref HEAD 2>$null) | Select-Object -First 1)
  $degisen = @(@(& git -C $kdir status --porcelain 2>$null) | Where-Object { $_ } | ForEach-Object { $p = $_.Substring(3).Trim('"'); if ($p -match ' -> ') { $p = ($p -split ' -> ')[-1].Trim('"') }; $p })
  $disari = @($degisen | Where-Object { $p = $_; -not ($Izinli | Where-Object { $p.StartsWith($_) }) })
}
if (-not $taban) {
  $klonOzet = 'klon bilgi: taban yok (tools/harness-taban.txt ya da -KlonHead) -> denetim atlandi' + $(if ($klonGit) { " - $(Maskele $kdir) ($kyol) - dal $dal - HEAD $h - degisen $($degisen.Count)" } else { " - klon $kyol" })
} elseif (-not $klonGit) {
  $engel += "klon denetlenemedi ($(if ($kdir) { (Maskele $kdir) + ", " })$kyol$(if (-not $gitVar) { ', git yok' })) - taban $taban ($tabanKaynak)"
} else {
  $head = @(& git -C $kdir rev-parse HEAD 2>$null) | Select-Object -First 1
  $bek = @(& git -C $kdir rev-parse --verify --quiet "$taban^{commit}" 2>$null) | Select-Object -First 1
  if (-not $bek) { $engel += "taban cozulemedi: $taban ($tabanKaynak; klonda boyle bir SHA/etiket yok)" }
  elseif ($head -ne $bek) { $engel += "KURULU KLON DEGISTI: HEAD $h != taban $taban ($tabanKaynak)" }
  if ($disari.Count) { $engel += "klonda izinli disi degisiklik $($disari.Count): $((@($disari) | Select-Object -First 6) -join ', ')" }
  if ($degisen.Count -gt $disari.Count) { $uyari += "izinli yolda degisiklik $($degisen.Count - $disari.Count) (render yolu disi)" }
  $klonOzet = "klon $(Maskele $kdir) ($kyol) - dal $dal - HEAD $h (taban $taban) - degisen $($degisen.Count) (izinli disi $($disari.Count))"
}

# ── (ii) süreçler ───────────────────────────────────────────────────────────────
$surecOzet = 'surec taramasi atlandi (-Surecsiz)'
if (-not $Surecsiz) {
  $ad = @('ffmpeg.exe', 'chrome.exe', 'chrome-headless-shell.exe', 'headless_shell.exe')
  $tum = @(Get-CimInstance Win32_Process | Where-Object { $ad -contains $_.Name.ToLower() })
  $pw = { param($x) ($x.ExecutablePath -match 'ms-playwright') -or ($x.CommandLine -match 'ms-playwright') }
  $ff = @($tum | Where-Object { $_.Name -ieq 'ffmpeg.exe' })
  $cr = @($tum | Where-Object { $_.Name -imatch 'headless' -or ($_.Name -ieq 'chrome.exe' -and (& $pw $_)) })
  $kullanici = @($tum | Where-Object { $_.Name -ieq 'chrome.exe' -and -not (& $pw $_) })
  $surecOzet = "ffmpeg $($ff.Count) - Playwright Chromium $($cr.Count) - kullanici Chrome $($kullanici.Count) (engel degil)"
  if ($ff.Count -or $cr.Count) {
    $engel += "baska render/encode sureci var"
    if (-not $Sessiz) {
      foreach ($p in @($ff + $cr)) {
        $c = Maskele $p.CommandLine; if ($c.Length -gt 140) { $c = $c.Substring(0, 140) }
        $t = ''; if ($p.CreationDate) { $t = $p.CreationDate.ToString('HH:mm:ss') }
        'ENGEL {0} {1} {2} :: {3}' -f $p.ProcessId, $p.Name, $t, $c
      }
    }
  }
}
if ($uyari.Count -and -not $Sessiz) { foreach ($u in $uyari) { "uyari: $u" } }
if ($engel.Count) { 'render-oncesi: ENGEL -> render yok, DUR - ' + ($engel -join ' - ') + ' - ' + $surecOzet; exit 1 }
'render-oncesi: temiz - ' + $klonOzet + ' - ' + $surecOzet; exit 0
