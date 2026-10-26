# SkillBridge: build the app with Expo (EAS Build).
# Run it inside the project folder with:
#   powershell -ExecutionPolicy Bypass -File .\deploy.ps1
#
# It copies the Supabase address and publishable key from .env into eas.json, because
# Expo's build service does not upload .env. These two values are public (they are inside
# the app anyway). Your secret keys stay in Supabase and are never part of the app.

$ErrorActionPreference = 'Stop'
$easVersion = '25.3.0'

function Step($t) { Write-Host ""; Write-Host "== $t" -ForegroundColor Cyan }
function Fail($t) { Write-Host ""; Write-Host "Stopped: $t" -ForegroundColor Red; exit 1 }
# Runs Expo's build tool. Named RunEas on purpose: PowerShell ignores capitals, so a helper called "Eas" would call itself.
function EasPath { (Get-Command eas -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1).Source }
function RunEas { & (EasPath) @args; if ($LASTEXITCODE -ne 0) { Fail "the command 'eas $($args[0])' did not finish. Read the message above." } }

if (-not (Test-Path '.\app.json') -or -not (Test-Path '.\eas.json')) { Fail "run this inside the skillbridge1 folder." }

# Expo's build tool, installed once on this laptop (more reliable on Windows than running it through npx)
if (-not (EasPath)) {
  Write-Host "Installing Expo's build tool (eas-cli $easVersion). This happens once..." -ForegroundColor Cyan
  & npm install -g "eas-cli@$easVersion"
  if ($LASTEXITCODE -ne 0) { Fail "could not install eas-cli. Try running PowerShell as Administrator, then run this script again." }
  # Make the new command visible in this window
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + (& npm prefix -g)
  if (-not (EasPath)) { Fail "eas-cli was installed but this window can't find it yet. Close PowerShell, open it again, and run this script again." }
}

# 1. Supabase settings from .env
Step "1 of 4: Reading your Supabase settings from .env"
if (-not (Test-Path '.\.env')) { Fail ".env not found. It should have EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY." }
$vars = @{}
Get-Content '.\.env' | Where-Object { $_ -match '^\s*([A-Z_]+)\s*=\s*(.*)\s*$' } | ForEach-Object {
  $null = $_ -match '^\s*([A-Z_]+)\s*=\s*(.*)\s*$'
  $vars[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
}
$url = $vars['EXPO_PUBLIC_SUPABASE_URL']; $key = $vars['EXPO_PUBLIC_SUPABASE_KEY']
if ($url -notmatch '^https://[a-z0-9]+\.supabase\.co$') { Fail "EXPO_PUBLIC_SUPABASE_URL in .env should look like https://abc.supabase.co" }
if (-not $key) { Fail "EXPO_PUBLIC_SUPABASE_KEY is empty in .env." }
if ($key -like 'sb_secret_*' -or $key -like '*service_role*') { Fail "the key in .env is a SECRET key. Use the publishable (anon) key. A secret key must never go in the app." }

$json = Get-Content '.\eas.json' -Raw | ConvertFrom-Json
$endorse = $vars['EXPO_PUBLIC_ENDORSE_URL']
if (-not $endorse) { Write-Host "   EXPO_PUBLIC_ENDORSE_URL is not in .env, so endorsements stay switched off in this build (see SETUP.md)." -ForegroundColor Yellow; $endorse = '' }
foreach ($profile in @('preview', 'production')) {
  $json.build.$profile.env.EXPO_PUBLIC_SUPABASE_URL = $url
  $json.build.$profile.env.EXPO_PUBLIC_SUPABASE_KEY = $key
  $json.build.$profile.env | Add-Member -NotePropertyName EXPO_PUBLIC_ENDORSE_URL -NotePropertyValue $endorse -Force
}
($json | ConvertTo-Json -Depth 10) | Set-Content '.\eas.json' -Encoding Ascii
Write-Host "   Added the Supabase address and publishable key to eas.json." -ForegroundColor Green

# 2. Expo account
Step "2 of 4: Expo account"
if ($env:EXPO_TOKEN) { Write-Host "   Using EXPO_TOKEN." } else {
  & (EasPath) whoami *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "   Not logged in. Paste an access token from expo.dev > Account settings > Access tokens."
    $s = Read-Host "Expo access token" -AsSecureString
    $env:EXPO_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)).Trim()
  }
}
RunEas whoami

# 3. Link the project to Expo (only the first time)
Step "3 of 4: Linking the project to Expo"
$app = Get-Content '.\app.json' -Raw | ConvertFrom-Json
if ($app.expo.extra.eas.projectId) { Write-Host "   Already linked ($($app.expo.extra.eas.projectId))." } else { RunEas init --force --non-interactive }

# 4. Build
Step "4 of 4: Build"
Write-Host "   1  Android APK to share and install directly (best for the hackathon)"
Write-Host "   2  Android for the Google Play Store (.aab)"
Write-Host "   3  iPhone (needs a paid Apple Developer account)"
$choice = Read-Host "Choose 1, 2 or 3"
switch ($choice) {
  '1' { RunEas build --platform android --profile preview }
  '2' { RunEas build --platform android --profile production }
  '3' { RunEas build --platform ios --profile production }
  default { Fail "choose 1, 2 or 3." }
}

Write-Host ""
Write-Host "Build finished." -ForegroundColor Green
Write-Host "Open the link above (or expo.dev > your project > Builds) to download it or share the install link and QR code."
