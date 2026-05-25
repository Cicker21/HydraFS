$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  cargo build --bin hydrafs_tools --release

  $source = Join-Path $root 'target\release\hydrafs_tools.exe'
  $dest = Join-Path $root 'hydrafs_tools-x86_64-pc-windows-msvc.exe'

  if (-not (Test-Path $source)) {
    throw "Tools binary was not built at $source"
  }

  Copy-Item $source $dest -Force
}
finally {
  Pop-Location
}
