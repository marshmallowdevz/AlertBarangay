param(
  [ValidateSet('run', 'debug-apk', 'release-apk')]
  [string]$Action = 'run'
)

$ErrorActionPreference = 'Stop'
$mobileRoot = $PSScriptRoot
$repoRoot = Split-Path -Parent $mobileRoot
$envPath = Join-Path $repoRoot '.env.local'

if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) {
  throw "Missing desktop config: $envPath. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY there, then retry."
}

$config = @{}
foreach ($line in Get-Content -LiteralPath $envPath) {
  if ($line -match '^\s*(VITE_SUPABASE_URL|VITE_SUPABASE_PUBLISHABLE_KEY)\s*=\s*(.*?)\s*$') {
    $value = $Matches[2].Trim()
    if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $config[$Matches[1]] = $value
  }
}

$url = $config['VITE_SUPABASE_URL']
$key = $config['VITE_SUPABASE_PUBLISHABLE_KEY']
if ([string]::IsNullOrWhiteSpace($url) -or [string]::IsNullOrWhiteSpace($key)) {
  throw 'Desktop .env.local must define VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
}

$flutterCommand = Get-Command flutter -ErrorAction SilentlyContinue
$flutterPath = if ($flutterCommand) { $flutterCommand.Source } else { Join-Path $repoRoot 'flutter\bin\flutter.bat' }
if (-not (Test-Path -LiteralPath $flutterPath -PathType Leaf)) {
  throw 'Flutter was not found. Add Flutter to PATH or install it in the repo-level flutter folder.'
}

$flutterArgs = switch ($Action) {
  'run' { @('run') }
  'debug-apk' { @('build', 'apk', '--debug') }
  'release-apk' { @('build', 'apk', '--release') }
}
$flutterArgs += "--dart-define=SUPABASE_URL=$url"
$flutterArgs += "--dart-define=SUPABASE_PUBLISHABLE_KEY=$key"

Push-Location $mobileRoot
try {
  & $flutterPath @flutterArgs
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
