# SkillBridge one-time setup for Windows.
# Run it inside the project folder with:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
#
# Your keys are typed here on your own laptop. They are sent only to Supabase,
# never shown on screen, and never saved inside the app.

$ErrorActionPreference = 'Stop'
$cli = 'supabase@2.122.0'

function Step($text) { Write-Host ""; Write-Host "== $text" -ForegroundColor Cyan }
function Done($text) { Write-Host "   $text" -ForegroundColor Green }
function Fail($text) { Write-Host ""; Write-Host "Stopped: $text" -ForegroundColor Red; exit 1 }

function ReadSecret($prompt) {
  $secure = Read-Host $prompt -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr).Trim() }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Supabase {
  & npx --yes $cli @args
  if ($LASTEXITCODE -ne 0) { Fail "the Supabase command 'supabase $($args[0])' did not finish. Read the message above, fix it and run this script again. It is safe to run more than once." }
}

if (-not (Test-Path '.\package.json') -or -not (Test-Path '.\supabase\migrations')) {
  Fail "run this script inside the skillbridge folder (the one with package.json)."
}

Write-Host "SkillBridge setup" -ForegroundColor Cyan
Write-Host "Have these ready: your Supabase project ref, publishable key and database password."
Write-Host "The Google Maps, Groq and Gemini keys are optional now. Press Enter to skip any of them."

# 1. Project details and the app's .env file
Step "1 of 5: Your Supabase project"
$ref = (Read-Host "Project ref (the part before .supabase.co in your project URL)").Trim()
if ($ref -match '^https?://([a-z0-9]+)\.supabase\.co') { $ref = $Matches[1] }
if ($ref -notmatch '^[a-z0-9]{20}$') { Fail "that does not look like a project ref. It is 20 lowercase letters and numbers, for example abcdefghijklmnopqrst." }
$publishable = (Read-Host "Publishable key (sb_publishable_...) or legacy anon key").Trim()
if (-not $publishable) { Fail "the publishable key is needed for the app to connect." }
if ($publishable -like 'sb_secret_*' -or $publishable -like '*service_role*') { Fail "that is a secret key. Use the publishable (or anon) key. The secret key must never go in the app." }

$envLines = @(
  "EXPO_PUBLIC_SUPABASE_URL=https://$ref.supabase.co",
  "EXPO_PUBLIC_SUPABASE_KEY=$publishable"
)
Set-Content -Path '.\.env' -Value $envLines -Encoding Ascii
Done "Saved .env for the app."

# 2. Log in to the Supabase command line tool
Step "2 of 5: Log in to Supabase"
Write-Host "   Paste an access token from supabase.com > Account > Access Tokens,"
Write-Host "   or press Enter to log in with the browser instead."
$token = ReadSecret "Access token"
if ($token) { Supabase login --token $token } else { Supabase login }
Done "Logged in."

# 3. Link the project and create the tables
Step "3 of 5: Create the database tables"
Write-Host "   The database password is the one you chose when you created the project."
Write-Host "   Forgot it? Supabase > Project Settings > Database > Reset database password."
$dbPassword = ReadSecret "Database password"
if (-not $dbPassword) { Fail "the database password is needed to create the tables." }
Supabase link --project-ref $ref --password $dbPassword
Supabase db push --linked --include-all --password $dbPassword --yes
Done "Tables, security rules, storage and starter data are in place."

# 4. Server keys (kept in Supabase, never in the app)
Step "4 of 5: Server keys"
$google = ReadSecret "Google Maps key (Places API New), or Enter to skip"
Write-Host "   The Groq key comes from console.groq.com/keys (it starts with gsk_)."
$groq = ReadSecret "Groq API key, or Enter to skip"
$gemini = ReadSecret "Gemini API key (from aistudio.google.com), or Enter to skip"
Write-Host "   Adzuna keys come from developer.adzuna.com > Dashboard > API access details."
$adzunaId = (Read-Host "Adzuna app_id, or Enter to skip").Trim()
$adzunaKey = ""
if ($adzunaId) { $adzunaKey = ReadSecret "Adzuna app_key" }
Write-Host "   The JSearch key comes from app.openwebninja.com/api/jsearch (free tier available)."
$jsearch = ReadSecret "JSearch API key, or Enter to skip"

$secretLines = @()
if ($google) { $secretLines += "GOOGLE_MAPS_API_KEY=$google" }
if ($groq) { $secretLines += "GROQ_API_KEY=$groq" }
if ($gemini) { $secretLines += "GEMINI_API_KEY=$gemini" }
if ($adzunaId -and $adzunaKey) { $secretLines += "ADZUNA_APP_ID=$adzunaId"; $secretLines += "ADZUNA_APP_KEY=$adzunaKey" }
if ($jsearch) { $secretLines += "JSEARCH_API_KEY=$jsearch" }

# A random secret so only your scheduled job can run the company board sync
$cronSecret = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
$secretLines += "CRON_SECRET=$cronSecret"

if ($secretLines.Count -gt 0) {
  $tmp = Join-Path $env:TEMP ("sb-secrets-" + [guid]::NewGuid().ToString() + ".env")
  try {
    Set-Content -Path $tmp -Value $secretLines -Encoding Ascii
    Supabase secrets set --env-file $tmp --project-ref $ref
  } finally {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  }
  Done "Saved $($secretLines.Count) key(s) in Supabase."
} else {
  Write-Host "   Skipped. Run this script again later to add them." -ForegroundColor Yellow
}

# 5. Deploy the server functions (no Docker needed)
Step "5 of 5: Deploy the server functions"
Supabase functions deploy --project-ref $ref --no-verify-jwt --use-api
Done "Functions deployed."

# The schedule for the Greenhouse and SmartRecruiters sync, ready to paste into the SQL Editor
$scheduleSql = @"
-- Runs the job board sync every 3 hours. Paste into Supabase > SQL Editor and click Run.
-- This file holds your CRON_SECRET. Don't share it or commit it.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('skillbridge-jobs-sync') where exists (select 1 from cron.job where jobname = 'skillbridge-jobs-sync');
select cron.schedule('skillbridge-jobs-sync', '0 */3 * * *', `$`$
  select net.http_post(
    url := 'https://$ref.supabase.co/functions/v1/jobs-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '$cronSecret'),
    body := '{}'::jsonb
  );
`$`$);
"@
Set-Content -Path '.\supabase\schedule_jobs_sync.sql' -Value $scheduleSql -Encoding Ascii

Write-Host ""
Write-Host "All done." -ForegroundColor Green
Write-Host "Left to do in the Supabase dashboard:"
Write-Host "  1. Authentication > Sign In / Providers > Email: turn off 'Confirm email' for the hackathon."
Write-Host "  2. Authentication > Emails > Reset password: add {{ .Token }} to the message."
Write-Host ""
Write-Host "  3. For Greenhouse and SmartRecruiters jobs: add companies to job_sources, then paste"
Write-Host "     supabase\schedule_jobs_sync.sql into the SQL Editor (see SETUP.md, step 9)."
Write-Host ""
Write-Host "Then start the app with:  npx expo start --clear"
if (-not $google) { Write-Host "Location search will work after you add the Google key." -ForegroundColor Yellow }
if (-not $adzunaId -and -not $jsearch) { Write-Host "Live job search needs the Adzuna or JSearch keys. Until then the Jobs tab shows sample and company board jobs." -ForegroundColor Yellow }
if (-not $groq -or -not $gemini) { Write-Host "Gemini runs job matching, skills tests, guides and transcription. Groq runs the coach, interview questions, grading and test feedback." -ForegroundColor Yellow }
