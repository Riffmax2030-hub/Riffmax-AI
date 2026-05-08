# Riffmax AI — Project Roadmap

A practical, phase-by-phase plan for building an AI-powered website generator. Written for someone learning to code as they build.

---

## What we're building (in plain English)

A web app where a client (anywhere in the world) can:
1. Type their **business name** and **industry** into a form.
2. Paste a link to a **reference website** they admire (e.g. a competitor doing well).
3. Click a button.
4. Watch the AI:
   - Visit and analyze the reference site (layout, color, typography, copywriting tone, conversion elements).
   - Generate a brand-new, **original** landing page tailored to their business.
5. Preview the result, tweak it, and download or deploy it live.

**Important — the ethics of "scraping":** We do not copy or clone other people's sites. That's both illegal (copyright/trademark) and a terrible product (clients want something *theirs*). What we do is **learn from patterns** — the same way a human designer studies sites for inspiration — then have the AI generate something original. This is the difference between a counterfeiter and a designer who reads design blogs.

---

## The architecture (the moving parts)

There are two big pieces of software talking to each other, plus the AI brain:

```
   ┌────────────────────┐         ┌────────────────────────┐         ┌──────────────┐
   │  Frontend (Next.js)│ ──────▶ │  Backend (Python API)  │ ──────▶ │  Claude API  │
   │  Form + preview    │ ◀────── │  Scraper + AI client   │ ◀────── │  Generates   │
   │  Runs in browser   │         │  Runs on a server       │         │  the HTML    │
   └────────────────────┘         └────────────────────────┘         └──────────────┘
```

- **Frontend** (Next.js, which is built on React): the visual part — what the client sees and clicks. Runs in their web browser.
- **Backend** (Python with FastAPI): the engine — does the scraping, talks to Claude, returns the result. Runs on a server.
- **Claude API**: the actual AI. We send it instructions + the design brief, it sends back code.
- **Scraping libraries** (Playwright + BeautifulSoup): the tools that visit a website and pull out structured information.

We split frontend and backend because:
- Browsers can't safely run Python or do heavy scraping.
- Servers can. So we let each side do what it's good at.

---

## The six phases

### Phase 0 — Foundation (the hello-world)
**Goal:** A Next.js page on your machine that, when you click a button, asks the Python backend for a message and displays it. Boring but essential. If this works, the wiring is right.

What we'll set up:
- A project folder structure
- Node.js and Python installed
- A running Next.js dev server (you'll see it at http://localhost:3000)
- A running FastAPI backend (you'll see it at http://localhost:8000)
- One button that proves they talk to each other

**Why this comes first:** Every later phase depends on this plumbing. Skipping it leads to debugging nightmares.

### Phase 1 — The scraper
**Goal:** Give the backend a URL → it returns a structured JSON "design brief" about that site.

The brief includes:
- Layout structure (what sections exist, in what order)
- Color palette (the dominant 4–6 colors)
- Typography (fonts and sizes)
- Copywriting tone (we'll use Claude itself to summarize this)
- Conversion elements (CTAs, social proof, forms)

**Tools:** Playwright (loads pages like a real browser, handles JavaScript-rendered sites), BeautifulSoup (parses the HTML), and a small Claude call to read the copy and describe the tone.

### Phase 2 — AI generation
**Goal:** Send the design brief + business inputs to Claude → get back original HTML/CSS/JS for a landing page.

This phase is mostly about **prompt engineering** — writing the instructions to Claude well enough that the output is consistently good. We'll iterate here a lot.

### Phase 3 — Interactive frontend UI
**Goal:** Replace the boring Phase 0 button with a real product UI.

Includes:
- A clean form (business name, industry, reference URL)
- Loading states with progress ("Analyzing reference site...", "Generating your page...")
- Live preview iframe of the generated site
- Edit/regenerate buttons
- Download as HTML file

### Phase 4 — Deployment
**Goal:** Real clients on real internet.

- Frontend deployed to **Vercel** (free tier, fits Next.js perfectly)
- Backend deployed to **Railway** or **Render** (free/cheap tier for FastAPI)
- A "Deploy this site" button that publishes the generated site to a live URL

### Phase 5 — Polish & grow
**Goal:** Turn the MVP into a business.

- Multi-page sites (Home, About, Services, Contact)
- AI image generation for hero sections
- Client accounts (sign up, save projects)
- Billing (Stripe)
- Pre-built design styles to choose from
- Custom domains

We don't touch any of this until Phase 4 is solid.

---

## How we'll work together

1. **One phase at a time.** Don't get overwhelmed by the whole list — we focus on the active phase only.
2. **I explain everything.** Each step, I'll tell you (a) what we're doing, (b) why, (c) what each command/file does. Stop me anytime.
3. **You run the commands yourself.** I'll write them; you run them on your machine. That's how the code becomes *yours*, not mine.
4. **We test as we go.** After every change, we verify it works before adding more. This is the single biggest difference between programmers who finish projects and ones who don't.
5. **Ask "dumb" questions.** Nothing is dumb. If a word doesn't make sense, ask. Coding is mostly vocabulary.

---

## What you need installed

Before Phase 0, please make sure these are installed on your computer (we'll do this together if not):
- **Node.js** (for the frontend) — https://nodejs.org
- **Python 3.11+** (for the backend) — https://python.org
- **A code editor** — VS Code is recommended, free at https://code.visualstudio.com
- **An Anthropic API key** for Claude — https://console.anthropic.com

---

## Next step

When you're ready, say *"let's start Phase 0"* and I'll walk you through setting up the project foundation, one command at a time.
