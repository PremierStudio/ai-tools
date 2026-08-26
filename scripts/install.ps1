$ErrorActionPreference = "Stop"

$requiredMajor = 22

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "ai-tools requires Node.js >= $requiredMajor. Install Node first: https://nodejs.org/"
}

$nodeVersion = node -p "process.versions.node"
$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")

if ($nodeMajor -lt $requiredMajor) {
  Write-Error "Detected Node.js v$nodeVersion. ai-tools requires Node.js >= $requiredMajor."
}

Write-Host "Running ai-tools via npx..."
npx @itz4blitz/ai-tools@latest @args
