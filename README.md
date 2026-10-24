# SkillBridge (Expo, iOS and Android, Supabase backend)

## First time

1. Set up the backend by following **SETUP.md**.
2. Copy `.env.example` to `.env` and add your Supabase URL and publishable key.
3. Install and start:
   ```
   npm install
   npx expo start --clear
   ```
4. Scan the QR code with Expo Go (SDK 58).

## Where things are

- `App.js`: screen list, Android back button, tab bar
- `src/lib/supabase.js`: Supabase connection (keeps people logged in)
- `src/lib/api.js`: every database, storage and function call
- `src/lib/match.js`: job match score from the profile
- `src/lib/progress.js`: what makes a profile complete
- `src/store.js`: app state, navigation, guest mode
- `src/components/Autocomplete.js`: search dropdowns (skills, job types, languages) and Google address search
- `src/screens`: auth, profile, tests, jobs, grow (mentors, career coach, guides, interview practice), cv (3 CV templates), more
- `supabase/migrations`: database tables, security rules and starter data
- `supabase/functions`: server code for address search, tests, interview questions and grading, the career coach, personal guides and account deletion

## Guests

Guests can look around, build a profile and take ready-made tests, but nothing is saved. CV builder, interview practice, the career coach, personal guides, saving jobs, applying and booking mentors need an account.

## Good to know

- Only the voice is recorded during interview practice. The camera shows a live preview so people can watch themselves, but no video is stored. This keeps uploads small on mobile data.
- Job distances and travel costs are still sample values. Working them out from each person's address would need the Google Routes API.
