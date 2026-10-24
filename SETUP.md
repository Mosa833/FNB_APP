# SkillBridge backend setup (Supabase)

Do these steps once. Keep every key private and never put the service role key or AI keys in the app.

You will need:
- A Supabase account (supabase.com)
- A Google Cloud account with billing turned on (for address search)
- An Anthropic API key (console.anthropic.com) for interview questions and grading, new skills tests, the career coach and personal guides
- An OpenAI API key (platform.openai.com) for turning recorded answers into text

## 1. Create the Supabase project

1. On supabase.com, click New project. Pick the region closest to South Africa that is offered.
2. Wait until the project is ready.

## 2. Create the database

Option A, in the browser:
1. Open SQL Editor, click New query.
2. Paste everything from `supabase/migrations/20261024000001_schema.sql` and click Run.
3. Make a new query, paste `supabase/migrations/20261024000002_seed.sql` and click Run.
4. Make a new query, paste `supabase/migrations/20261024000003_coach_and_guides.sql` and click Run.

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
2. **Password reset code.** Under Emails (Email Templates), open "Reset password" and add the code to the message, for example:
   ```
   <p>Your SkillBridge reset code is: <strong>{{ .Token }}</strong></p>
   ```
   The app asks for this code, so the email must include `{{ .Token }}`.
3. **Redirect URLs** (only needed for Google sign in). Under URL Configuration, add:
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
npx supabase secrets set ANTHROPIC_API_KEY=your-anthropic-key
npx supabase secrets set OPENAI_API_KEY=your-openai-key
npx supabase functions deploy --no-verify-jwt
```

Optional settings:
- `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`), used for tests, interviews and guides
- `ANTHROPIC_CHAT_MODEL` (default `claude-haiku-5-5`), used for the career coach chat
- `OPENAI_TRANSCRIBE_MODEL` (default `whisper-1`)

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already available to functions. You don't need to set them.

What each function does:
| Function | Job |
|---|---|
| places-autocomplete | Address suggestions while typing (Google Places) |
| generate-test | Makes and saves an 8 question test for a skill that has none yet |
| interview-start | Checks the 3 per month limit and writes 5 questions for the chosen job |
| interview-grade | Turns each recording into text, grades it and writes a better answer |
| career-coach | Career coach chat that knows the user's profile and the jobs they saved or applied for (40 messages per day) |
| career-guide | Writes a personal guide for a job they saved or applied for, or for a problem they describe (10 per day) |
| delete-account | Removes the user's files and account |

## 7. Google sign in (optional)

1. In Google Cloud Console, go to APIs and Services, then Credentials, and create an OAuth client ID of type Web application.
2. Under Authorized redirect URIs, add the callback URL shown in Supabase under Authentication, Sign In / Providers, Google.
3. Paste the Google client ID and secret into that Supabase Google provider page and turn it on.

Until this is done, the Google buttons show an error and email sign up still works.

## 8. Check that it works

1. Sign up in the app. A new row should appear in Table Editor, `profiles`.
2. Type your area on the sign up screen. Suggestions should appear after two letters.
3. Add a skill such as Excel, then open Skills assessment. Excel has a ready test.
4. Add a skill such as Cooking and tap Create my test.
5. Do an interview practice. After the last answer, feedback appears within about a minute.
6. Apply for a job, then open Grow, Mentorship. The job shows under Guides for you. Tap it to get a guide.
7. Tap Ask the career coach and send a question.

## Troubleshooting

- **"Connect Supabase" screen:** the `.env` file is missing or Expo was not restarted with `--clear`.
- **Address search says it is not available:** check the GOOGLE_MAPS_API_KEY secret, that Places API (New) is enabled and that billing is on. Function logs are in the Supabase dashboard under Edge Functions.
- **Interview grading fails:** check the ANTHROPIC_API_KEY and OPENAI_API_KEY secrets and that both accounts have credit. A failed session does not count towards the monthly limit, and the app offers to try grading again.
- **"Server setting ... is missing":** a secret from step 6 was not set.
- **Coach or guides say they are not available:** check ANTHROPIC_API_KEY and that the third migration (coach_and_guides) was run.
