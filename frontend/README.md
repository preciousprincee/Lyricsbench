# LyricBench — your songwriting notebook

A local-first, PWA-ready collaborative lyric-writing tool built with React + Vite + Tailwind CSS. Powered by Groq for fast AI inference. No account, no cloud sync, no subscription.

---

## What it does

- **Sound Bible**: a persistent style profile built through a conversational onboarding chat, or pasted in. Encodes your themes, vocabulary, imagery, rhyme habits, and flow references so the AI writes in *your* voice.
- **Pre-write step**: per-song configuration (structure, cadence, rhyme tightness, tone, flow reference) that overrides Sound Bible defaults for that song only.
- **Collaborative editor**: write your own lines, or ask the AI to draft a full verse, the next single line, or 3 alternatives to a specific line. Accept, try again, or dismiss.
- **Cadence ruler**: real-time syllable count and stress-pattern dots in the left margin. Lines that break the verse's rhythmic flow are flagged in rust-red — so you can *see* why a line feels clunky.
- **Rhyme panel**: auto-detects the last word on your current line and fetches contextually aware rhyme suggestions (perfect + slant + near), scored against rhymes already used in the song.
- **PWA**: installable on mobile and desktop, works offline for editing existing songs.

---

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Groq API Key

1. Get a free key at [console.groq.com](https://console.groq.com)
2. Open the app → Settings → paste your key → Save
3. Optionally run the Test button to verify it works

Your key is stored in `localStorage` only — never uploaded anywhere.

---

## Deploy to Vercel

```bash
npm run build
```

Then push to GitHub and connect the repo in Vercel. The `vercel.json` is already configured for SPA routing and Vite output.

Or use the Vercel CLI:

```bash
npx vercel --prod
```

---

## PWA Icons

The app ships with minimal placeholder icons. To generate proper ones:

```bash
npx pwa-asset-generator public/favicon.svg public/icons --index public/index.html
```

Or drop your own `icon-192.png` and `icon-512.png` into `public/icons/`.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 |
| Routing | React Router 6 |
| AI | Groq (OpenAI-compatible API) |
| Models | Llama 3.3 70B / 3.1 8B / Mixtral / Gemma 2 |
| PWA | vite-plugin-pwa + Workbox |
| Persistence | localStorage (local-first, no backend) |
| Cadence engine | Custom offline syllable + stress estimator |

---

## File structure

```
src/
  lib/
    cadence.js        # Syllable counting + stress patterns (offline)
    groq.js           # Groq API client
    promptBuilder.js  # Sound Bible + pre-write → system prompt
    storage.js        # localStorage helpers
  components/
    Layout.jsx        # Nav header + outlet
    PreWriteModal.jsx # Per-song config modal
    CadenceRuler.jsx  # Margin syllable/stress visualizer
    RhymePanel.jsx    # Contextual rhyme suggestions
  pages/
    Onboarding.jsx    # Conversational Sound Bible builder
    SoundBible.jsx    # View/edit style profile
    Library.jsx       # Song list
    Workspace.jsx     # Main collaborative editor
    Settings.jsx      # API key + model config
```

---

## Customisation notes

- **Add more Groq models**: edit the `MODELS` array in `src/pages/Settings.jsx`
- **Change onboarding questions**: edit `ONBOARDING_SYSTEM_PROMPT` in `src/lib/promptBuilder.js`
- **Adjust cadence sensitivity**: the `deviation >= 4` threshold in `CadenceRuler.jsx` controls when lines flag as off-rhythm
- **Color palette**: all tokens are in `tailwind.config.js`
