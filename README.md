# Riffmax AI

> Website Riffing Powered by Claude

Tell Riffmax what you want to build, paste a site you admire, and get an original multi-page website in seconds. Claude generates the code, Firecrawl maps the reference, Unsplash adds real photography, and Vercel ships it live.

## Stack

- **Frontend** — Next.js 14 (App Router) + TypeScript + Tailwind CSS, deployed on Vercel
- **Backend** — FastAPI (Python), deployed on Railway
- **AI** — Anthropic Claude (Sonnet for generation, Haiku for parsing)
- **Scraping** — Firecrawl (map + scrape)
- **Images** — Unsplash API
- **Hosting client sites** — Vercel API (one project per generated site)

## Local development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate         # Windows
# source venv/bin/activate    # macOS/Linux
pip install -r requirements.txt
# create backend/.env with the keys listed below
uvicorn main:app --reload --port 8000
```

Backend runs at http://localhost:8000. Visit http://localhost:8000/docs for the FastAPI docs.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:3000.

## Required API keys

Each goes in `backend/.env`:

| Key | Get one at | Used for |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com | Claude API (generation, refinement, parsing) |
| `FIRECRAWL_API_KEY` | firecrawl.dev | Mapping and scraping reference sites |
| `UNSPLASH_ACCESS_KEY` | unsplash.com/developers | Real photos for generated sites |
| `VERCEL_TOKEN` | vercel.com/account/tokens | One-click deploy of generated sites |

## Project structure

```
.
├── frontend/              Next.js 14 app
│   └── app/
│       ├── layout.tsx     Root layout + metadata
│       ├── page.tsx       Homepage (AI agent box)
│       └── icon.svg       Favicon
├── backend/               FastAPI app
│   ├── main.py            All endpoints
│   ├── requirements.txt   Python deps
│   ├── Procfile           Railway start command
│   └── skills/            Industry pattern files
│       └── industries/
│           ├── coffee-shops/SKILL.md
│           ├── saas/SKILL.md
│           └── restaurants/SKILL.md
├── README.md
├── ROADMAP.md
└── .gitignore
```

## API endpoints

- `POST /api/build` — main flow: description + reference URL → multi-page website
- `POST /api/refine` — apply user feedback to a single page
- `POST /api/deploy` — push the generated pages live to Vercel
- `GET /api/hello` — healthcheck

## License

© 2025 Riffmax AI. All rights reserved.
