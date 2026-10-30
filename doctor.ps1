<#
  motion-harness ortam denetimi (Windows): motion-render doctor + plugin kaydı. Proje klasöründe çalıştırılırsa projeyi de denetler.
  Kullanım: powershell -ExecutionPolicy Bypass -File .\doctor.ps1
#>
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
function Have([string]$c) { return [bool](Get-Command $c -ErrorAction SilentlyContinue) }
if (Have 'motion-render') { & motion-render doctor; $code = $LASTEXITCODE } else { Write-Host '  ✗ motion-render yok → install.ps1'; $code = 1 }
exit $code
