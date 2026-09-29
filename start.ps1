$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$portableNode = Join-Path $projectRoot '.tools\node-v22.18.0-win-x64'
$portableNpm = Join-Path $portableNode 'npm.cmd'

if (Test-Path -LiteralPath $portableNpm) {
  $env:PATH = "$portableNode;$env:PATH"
  & $portableNpm run dev
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
  npm run dev
} else {
  Write-Error 'Node.js is required. Install Node.js 20.19+ or 22.12+, then run npm install and npm run dev.'
  exit 1
}
