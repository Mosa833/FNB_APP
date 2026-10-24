<<<<<<< HEAD
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
=======
# SkillBridge (Expo, iOS and Android)

## Run it on your phone with Expo Go

1. Install Node.js 20 or newer on your computer.
2. Install Expo Go on your phone (App Store or Google Play). Use the Expo Go version for SDK 58.
3. Open a terminal in this folder and run:

   npm install
   npx expo start

4. Scan the QR code. On Android, scan it inside Expo Go. On iPhone, scan it with the Camera app.
5. If your phone and computer are on different networks, run `npx expo start --tunnel` instead.

## Where things are

- App.js: the screen list, Android back button and bottom tab bar
- src/store.js: app state (guest or registered user, profile, saved jobs, interview limit) and navigation
- src/ui.js: shared buttons, inputs, cards, chips and the tab bar
- src/data.js: jobs, mentors, guides, test questions and interview questions
- src/screens: auth.js (screens 1 to 5), profile.js (6 to 9), tests.js (10 to 12), jobs.js (13, 14), grow.js (15 to 20), more.js (21)

## Demo notes

- Data is kept in memory, so it resets when the app restarts. A backend and database are the next step.
- Google sign in shows a message until a Google client ID is added.
- Interview practice shows the full flow (questions, timer, record button, retry, next) with a placeholder camera view. Live video needs expo-camera.
- The CV downloads as a real PDF using expo-print and the phone share sheet.
>>>>>>> origin/main
