# for snegu — a recovery companion

A full-stack, realtime, deploy-ready care app built by Ribtu for Snegu. Two roles, one database, a lot of love.

- **Snegu's view** — today's gentle checklist, water cups, meals, moods, cycle tracker, letters, and the Spotify playlist.
- **Ribtu's view** — watches her activity in realtime (no editing), sees her calendar and cycle, sends live love notes that pop up on her screen.
- **AI cycle analysis** — uses free Google Gemini to give a gentle, non-medical summary of her pattern.
- **Streaks and calendar** — every "cared-for" day becomes a pink dot. No guilt, no pressure, just a soft record.

## Stack

- **Next.js 14** (App Router, TypeScript, Tailwind)
- **Supabase** (Postgres + realtime + auth is optional, we use shared PINs instead)
- **Google Gemini** (free AI — 15 rpm, no card)
- **Vercel** (hosting — free)

---

## 1. Prerequisites

- Node.js 18+ installed ([nodejs.org](https://nodejs.org))
- A free [Supabase](https://supabase.com) account
- A free [Gemini API key](https://aistudio.google.com/app/apikey)
- A free [Vercel](https://vercel.com) account (for deploy)

---

## 2. Install locally

```bash
cd snegu-app
npm install
```

---

## 3. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Pick a region close to you (e.g. Mumbai / Singapore).
3. Wait ~2 minutes for the project to spin up.
4. Go to **Settings → API**. You need two values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Go to **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql`, click Run.
6. Realtime is already configured by the schema. Verify at **Database → Replication** — you should see `daily_log`, `period_log`, `love_note` with realtime ON.

---

## 4. Get a free Gemini key

1. Visit [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Click **Create API Key** → copy it. Free tier gives 15 requests/min with no card required.

---

## 5. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then open `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SNEGU_PIN=1234        # pick her PIN
RIBTU_PIN=5678        # pick yours
SESSION_SECRET=some-long-random-string-32+chars
GEMINI_API_KEY=AIzaSy...
AI_PROVIDER=gemini
NEXT_PUBLIC_SPOTIFY_PLAYLIST=6LUsXD61YZWpwPZCzx9UWB
```

To generate a `SESSION_SECRET`:

```bash
# On Windows PowerShell:
[Convert]::ToBase64String((1..48 | % { Get-Random -Max 256 }))
# On macOS/Linux:
openssl rand -hex 32
```

---

## 6. Run it

```bash
npm run dev
```

Open http://localhost:3000 → enter either PIN → you're in.

- Snegu's PIN → lands on `/snegu`
- Ribtu's PIN → lands on `/ribtu`

Open the app in two browsers (or one normal + one incognito) to test realtime.

---

## 7. Deploy to Vercel (free)

### Option A — one-click GitHub deploy

1. Create a new GitHub repo and push this folder:

```bash
git init
git add .
git commit -m "for snegu, with love"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/snegu-app.git
git push -u origin main
```

2. Go to [vercel.com/new](https://vercel.com/new) → Import your repo.
3. When prompted, add the same env vars from `.env.local` under **Environment Variables**.
4. Click **Deploy**. Wait ~90 seconds.
5. You get a URL like `snegu-app.vercel.app` — share it with her.

### Option B — CLI deploy

```bash
npm i -g vercel
vercel
# follow prompts; paste env vars when asked or later add via vercel dashboard
vercel --prod
```

---

## 8. Making it feel like yours

- **Change the app title**: `app/layout.tsx`
- **Change reasons list**: `components/ReasonsCarousel.tsx`
- **Change the checklist**: `components/DailyDashboard.tsx`
- **Change the Spotify playlist**: set `NEXT_PUBLIC_SPOTIFY_PLAYLIST` to any other playlist ID
- **Add inside jokes**: open any page, write more — it's your app

---

## 9. Privacy and security

- Auth is **PIN-based** and shared — the cookie is signed with your `SESSION_SECRET`, so it can't be forged.
- Only the `anon` Supabase key is exposed to the browser.
- Row-level policies are permissive (via app-level auth) — if you want stricter security later, replace with policies that check a JWT claim.
- Don't share PINs with anyone else. If you suspect a leak, change both and change `SESSION_SECRET` — all existing sessions invalidate.

---

## 10. Structure

```
snegu-app/
├── app/
│   ├── api/                # login, logout, daily, period, notes, insight
│   ├── login/              # PIN screen
│   ├── snegu/              # Snegu's dashboard (editable)
│   │   ├── page.tsx        # today
│   │   ├── calendar/       # her calendar + streaks
│   │   ├── cycle/          # period tracker + AI insight
│   │   └── notes/          # letters board
│   ├── ribtu/              # Ribtu's dashboard (read-only)
│   │   ├── page.tsx        # her day, live
│   │   ├── calendar/
│   │   ├── cycle/
│   │   └── notes/
│   └── page.tsx            # redirects to login or role home
├── components/             # UI components
├── lib/                    # types, auth, supabase client, ai, streak, date
├── supabase/
│   └── schema.sql          # run this once in Supabase SQL editor
├── .env.example
└── README.md
```

---

## 11. Troubleshooting

- **"Gemini not working"** — make sure `GEMINI_API_KEY` is set in `.env.local` AND restarted `npm run dev`. On Vercel, check the Environment Variables page.
- **"Realtime not updating"** — verify in Supabase dashboard → Database → Replication that realtime is on for `daily_log`, `period_log`, `love_note`.
- **"I see 'unauthorized' on API calls"** — your session cookie is missing. Re-login via `/login`.
- **"I forgot my PIN"** — change it in Vercel env vars and redeploy.

---

made with care, by ribtu. always.
