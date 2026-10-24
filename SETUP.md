# SkillBridge backend setup (Supabase)

Do these steps once. Keep every key private and never put the service role key or AI keys in the app.

You will need:
- A Supabase account (supabase.com)
- A Google Cloud account with billing turned on (for address search)
- A Groq API key (console.groq.com/keys, free plan available) for the career coach, interview questions, interview grading and skills test feedback
- A Gemini API key (aistudio.google.com) for job match scores, skills tests, guides and turning recorded answers into text
- Adzuna keys (developer.adzuna.com) and a JSearch key (app.openwebninja.com/api/jsearch) for live job search in South Africa

## Quick way (Windows): setup.ps1

After step 1 below, run this inside the project folder:
```
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```
It asks for your keys one at a time and does steps 2, 4 and 6 for you: it creates the tables, writes the `.env` file, saves the server keys in Supabase and deploys the functions. You still do the two clicks in step 3 and the Google steps in 5 and 7. If something fails, fix it and run the script again. It is safe to run more than once.

If you prefer the browser, paste `supabase/setup_all.sql` into the SQL Editor once instead of running the three migration files.

## 1. Create the Supabase project

1. On supabase.com, click New project. Pick the region closest to South Africa that is offered.
2. Wait until the project is ready.

## 2. Create the database

Option A, in the browser:
1. Open SQL Editor, click New query.
2. Paste everything from `supabase/migrations/20261024000001_schema.sql` and click Run.
3. Make a new query, paste `supabase/migrations/20261024000002_seed.sql` and click Run.
4. Make a new query, paste `supabase/migrations/20261024000003_coach_and_guides.sql` and click Run.
5. Make a new query, paste `supabase/migrations/20261024000004_live_jobs.sql` and click Run.
6. Make a new query, paste `supabase/migrations/20261024000005_jsearch.sql` and click Run.
7. Make a new query, paste `supabase/migrations/20261024000006_cv_import.sql` and click Run.
8. Make a new query, paste `supabase/migrations/20261024000007_job_search.sql` and click Run.

Run them in this order.

Option B, with the Supabase CLI (run inside the project folder):
```
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```
The project ref is the part of your project URL before `.supabase.co`.

This creates the tables, security rules, storage buckets (avatars, certificates, interview-audio), the skills list, 6 ready-made tests, demo jobs and mentors.

## 3. Login settings

In Authentication:

1. **Confirm email.** Under Sign In / Providers, then Email, you can switch off "Confirm email" for the hackathon so people can use the app straight after signing up. If you leave it on, the app tells people to check their email first.
2. **Password reset PIN.** Under Emails (Email Templates), open **Reset password**:
   - Subject: `Your SkillBridge PIN`
   - Message body: paste everything from `supabase/templates/reset_password.html`
   - Click **Save**.
   The app asks for this PIN, so the email must include `{{ .Token }}`. The PIN length (6 digits by default) and how long it lasts are set under Sign In / Providers, Email.
3. **Redirect URLs** (needed for the confirmation email and Google sign in). Under URL Configuration, add both of these. Without them, the confirmation link opens Chrome on a page that doesn't exist:
   ```
   exp://**
   skillbridge://**
   ```

## 4. Connect the app

1. In Project Settings, open API Keys. Copy the Project URL and the publishable key (or the legacy anon key).
2. In the project folder, copy `.env.example` to a new file called `.env` and paste the two values.
3. Restart Expo with `npx expo start --clear` so it reads the new file.

## 5. Google Maps key (address search)

1. In Google Cloud Console, create or choose a project and make sure billing is on.
2. Go to APIs and Services, then Library, and enable **Places API (New)**.
3. Go to Credentials, create an API key, then edit it and under API restrictions choose Places API (New) only.
4. Google charges per address search after any free usage. Set a budget alert under Billing so there are no surprises.

The key stays on the server (in the places-autocomplete function). It is never inside the app.

## 6. Add the secret keys and deploy the functions

Run inside the project folder (after `npx supabase link` from step 2):
```
npx supabase secrets set GOOGLE_MAPS_API_KEY=your-google-key
npx supabase secrets set GROQ_API_KEY=your-groq-key
npx supabase secrets set GEMINI_API_KEY=your-gemini-key
npx supabase functions deploy --no-verify-jwt
```

Optional settings:
- `GROQ_MODEL` (tries `openai/gpt-oss-120b`, then `llama-3.3-70b-versatile`, then `qwen/qwen3.6-27b`), used for interview questions, grading and test feedback
- `GROQ_CHAT_MODEL` (tries `llama-3.3-70b-versatile` first, for quick replies), used for the career coach chat
- `GEMINI_MODEL` (default `gemini-3.5-flash`), used to turn recordings into text

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already available to functions. You don't need to set them.

What each function does:
| Function | Job |
|---|---|
| places-autocomplete | Address suggestions while typing (Google Places) |
| generate-test | Gemini makes and saves an 8 question test for a skill that has none yet |
| interview-start | Checks the 3 per month limit and writes 5 questions for the chosen job |
| interview-grade | Turns each recording into text, grades it and writes a better answer |
| jobs-for-me | Searches Adzuna and JSearch live for the user, removes duplicates and posts older than 30 days, adds company board jobs, and asks Gemini for the user's chance of getting each job |
| jobs-sync | Pulls jobs from the Greenhouse and SmartRecruiters companies in `job_sources` (runs every 3 hours) |
| test-feedback | Groq explains the questions the user got wrong in a skills test |
| cv-import | Reads an uploaded CV (PDF, Word or photo) and returns profile details for the user to review. Gemini reads PDFs and photos, Groq picks out the details. The file is deleted straight after |
| ai-health | Tests every key, AI model, job source and database update, and says what to fix |
| career-coach | Career coach chat that knows the user's profile and the jobs they saved or applied for (40 messages per day) |
| career-guide | Gemini writes a personal guide for a job they saved or applied for, or for a problem they describe (10 per day) |
| delete-account | Removes the user's files and account |

## 7. Google sign in (optional)

1. In Google Cloud Console, go to APIs and Services, then Credentials, and create an OAuth client ID of type Web application.
2. Under Authorized redirect URIs, add the callback URL shown in Supabase under Authentication, Sign In / Providers, Google.
3. Paste the Google client ID and secret into that Supabase Google provider page and turn it on.

Until this is done, the Google buttons show an error and email sign up still works.

## 8. Which AI does what

| Feature | AI |
|---|---|
| Job match score and chance of getting the job | Gemini |
| Skills test questions | Gemini |
| Mentorship guides | Gemini |
| Turning interview recordings into text | Gemini |
| Interview grading and better answers | Groq |
| Feedback on skills tests (the score itself is marked exactly by the database) | Groq |
| Career coach chat | Groq |
| Interview questions | Groq |

Optional: `GEMINI_TEXT_MODEL` sets the Gemini model for matching, tests and guides (default: the same as `GEMINI_MODEL`).

## 9. Live jobs

**Adzuna** (searched live for each person, every 3 hours or when they tap Refresh):
1. Sign up at developer.adzuna.com and open your dashboard to see your `app_id` and `app_key`.
2. Save them: `npx supabase secrets set ADZUNA_APP_ID=... ADZUNA_APP_KEY=... --project-ref YOUR_REF` (setup.ps1 also asks for them).
3. Adzuna's terms say people must be sent to jobs through Adzuna's own link, so the Apply button does that, and the app shows "Jobs by Adzuna".

**JSearch** (Google for Jobs: LinkedIn, Indeed, local job boards and company career pages):
1. Get a key at app.openwebninja.com/api/jsearch. There is a free tier. Check your plan's monthly limit on their pricing page.
2. Save it: `npx supabase secrets set JSEARCH_API_KEY=... --project-ref YOUR_REF` (setup.ps1 also asks for it).
3. Each search uses 1 request credit and returns up to 10 jobs. The app searches up to 2 terms per person, at most every 3 hours or when they tap Refresh. To use fewer credits set `JSEARCH_MAX_QUERIES=1`, or `0` to pause JSearch.
4. When a job has a link straight to the employer, the app uses it. The app shows which site each job comes from.
5. Optional: `JSEARCH_EXCLUDE_PUBLISHERS` is a comma separated list of sites to leave out (default `BeBee`).

**Search box:** users can search for any job and place. Each search runs a live Adzuna and JSearch search (1 JSearch credit), at most once every 20 seconds per user. Set `JSEARCH_ON_SEARCH=0` to search only Adzuna and stored jobs.

**Same job on several sites:** the app keeps one copy, in this order: the company's own board, a direct employer link, Adzuna, then other job sites.

**Greenhouse and SmartRecruiters** (no keys; you choose the companies):
1. Find companies hiring in South Africa that use them. Their careers page address shows the name to use:
   - `job-boards.greenhouse.io/acme` or `boards.greenhouse.io/acme` means Greenhouse, name `acme`
   - `jobs.smartrecruiters.com/AcmeGroup` means SmartRecruiters, name `AcmeGroup`
2. Add them in the SQL Editor:
   ```
   insert into public.job_sources (provider, token, company_name) values
     ('greenhouse', 'acme', 'Acme'),
     ('smartrecruiters', 'AcmeGroup', 'Acme Group');
   ```
   Only jobs in South Africa (or remote and open to Africa) are kept.
3. setup.ps1 made `supabase/schedule_jobs_sync.sql`. Paste it into the SQL Editor and click Run. It runs the sync every 3 hours.
4. To run it once straight away, in PowerShell (use the CRON_SECRET from that file):
   ```
   Invoke-RestMethod -Method Post -Uri "https://YOUR_REF.supabase.co/functions/v1/jobs-sync" -Headers @{ "x-cron-secret" = "YOUR_CRON_SECRET" }
   ```
   It lists how many jobs each company has. If one says "failed", check its name in `job_sources`. The `last_error` column shows why.

**Sample jobs:** the 6 sample jobs only show when there are fewer than 5 real jobs.

**Postman:** import `SkillBridge-jobs.postman_collection.json` to try each job API with your keys before you add them to Supabase.

## 10. Check that it works

1. Sign up in the app. A new row should appear in Table Editor, `profiles`.
2. Type your area on the sign up screen. Suggestions should appear after two letters.
3. Add a skill such as Excel, then open Skills assessment. Excel has a ready test.
4. Add a skill such as Cooking and tap Create my test.
5. Do an interview practice. After the last answer, feedback appears within about a minute.
6. Apply for a job, then open Grow, Mentorship. The job shows under Guides for you. Tap it to get a guide.
7. Tap Ask the career coach and send a question.

## Health check: find out what is not working

Run this whenever a feature fails. It tests every key, every AI model, address search, the job sources and the database updates.

1. If you have no CRON_SECRET yet, make one (any long random text works):
   ```
   npx supabase secrets set CRON_SECRET=pick-a-long-random-text --project-ref YOUR_REF
   ```
2. Run the check in PowerShell, using the same text:
   ```
   $r = Invoke-RestMethod -Method Post -Uri "https://YOUR_REF.supabase.co/functions/v1/ai-health" -Headers @{ "x-cron-secret" = "pick-a-long-random-text" } -ContentType "application/json" -Body '{}'
   $r.summary
   $r.results | Format-Table check, ok, detail -Wrap
   $r.results | Where-Object { -not $_.ok } | Format-List check, fix
   $r.models_your_keys_can_use | Format-List
   ```
3. Every line with `ok` False has a `fix` underneath. The output shows which models worked and never shows your keys.

To also test JSearch (uses 1 credit), send `-Body '{"jsearch":true}'`.

**Models:** each feature tries a short list of models in order, so one model your account can't use no longer breaks the feature. To choose your own, set `GROQ_MODEL`, `GROQ_CHAT_MODEL`, `GEMINI_TEXT_MODEL` or `GEMINI_MODEL` to a name the health check lists under "models your keys can use".

## Troubleshooting

- **"Rate limit" or features failing when many people test at once:** Groq's free plan limits requests per minute. The app waits and retries once. For a demo with many users, upgrade the Groq plan at console.groq.com.

- **"Connect Supabase" screen:** the `.env` file is missing or Expo was not restarted with `--clear`.
- **Address search says it is not available:** check the GOOGLE_MAPS_API_KEY secret, that Places API (New) is enabled and that billing is on. Function logs are in the Supabase dashboard under Edge Functions.
- **Interview grading fails:** check the GROQ_API_KEY and GEMINI_API_KEY secrets and that both accounts have credit. A failed session does not count towards the monthly limit, and the app offers to try grading again.
- **"Server setting ... is missing":** a secret from step 6 was not set.
- **Jobs tab shows sample jobs only:** add the Adzuna or JSearch keys or some companies to `job_sources`, and check the jobs-for-me and jobs-sync logs.
- **No JSearch jobs:** the jobs-for-me logs show "JSearch error" with the reason, for example a wrong key or a used-up monthly limit.
- **Jobs show but no chances:** check GEMINI_API_KEY. The jobs-for-me logs show "Scoring batch failed" if Gemini refused.
- **Coach or guides say they are not available:** check GROQ_API_KEY (coach) or GEMINI_API_KEY (guides) and that the third migration (coach_and_guides) was run.
