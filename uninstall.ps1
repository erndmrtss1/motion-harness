<#
  motion-harness kaldırma (Windows). Projelere ve Higgsfield oturumuna dokunmaz.
  Kullanım: powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
#>
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
function Have([string]$c) { return [bool](Get-Command $c -ErrorAction SilentlyContinue) }
if (Have 'claude') {
  & claude plugin uninstall motion@motion-harness --scope user 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host '  ✓ plugin kaldırıldı' } else { Write-Host '  – plugin kurulu değildi' }
  & claude plugin marketplace remove motion-harness 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host '  ✓ marketplace kaldırıldı' } else { Write-Host '  – marketplace kayıtlı değildi' }
}
Push-Location (Join-Path $Root 'render')
& npm unlink -g @motion/harness 2>&1 | Out-Null
Pop-Location
if (Have 'motion-render') { Write-Host '  ✗ motion-render hâlâ PATH''te (npm prefix -g kontrol edin)' } else { Write-Host '  ✓ motion-render kaldırıldı' }
Write-Host '  Depo klasörü silinmedi; Playwright önbelleği (%LOCALAPPDATA%\ms-playwright) başka araçlarca kullanılabilir, elle silinir.'
