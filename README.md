# Haven House Guest Assistant

This project is a full-stack hotel guest assistant built with React, Vite, and Express. It helps guests ask hotel questions, continue conversations naturally, and check simulated room availability in a clean web interface.

## Customer problem

Hotels receive repeated questions about check-in, breakfast, parking, pool hours, cancellation rules, and availability. A guest assistant reduces friction for visitors and helps staff focus on more complex requests.

The app solves this by giving guests a simple chat experience and a guided stay form without exposing any sensitive API keys or live booking logic in the browser.

## Guest journey

1. A guest opens the app and sees a calm hotel-themed landing view.
2. They ask a question or pick a suggested prompt.
3. The frontend sends the request to the backend API.
4. The backend uses a hotel knowledge base and can route to an AI model when available.
5. If the guest asks for availability, the app captures check-in, check-out, and guest count.
6. The backend checks deterministic room rules and returns clear options or a no-room message.
7. If the answer is uncertain or the model is unavailable, the app falls back safely.

## Why this frontend design

- The interface is simple and calm, matching a hospitality brand.
- Suggested prompts reduce typing friction.
- The conversation stays readable with clear user and assistant messages.
- Date and guest inputs are collected in a dedicated stay form.
- Loading states, retries, and validation messages make the app feel trustworthy.
- The layout is responsive so it works on desktop and mobile.

## AI vs deterministic logic

AI is useful for:
- interpreting natural guest language
- mapping varied questions to hotel topics
- handling follow-up questions and context

Deterministic logic stays in code and should not be left to the model for:
- date validation
- guest count and stay length checks
- room capacity comparisons
- pricing and inventory calculations
- checking whether a fact is actually in the approved hotel guide

This keeps the system safer and more reliable than letting the model invent hotel facts.

## Failure handling and hallucination prevention

The app avoids unsupported answers by:
- using a fixed hotel knowledge base
- validating model output against allowed topics
- only returning facts that are already in the approved guide
- falling back to the local guide when AI fails or times out
- never exposing raw API keys or model errors to the browser

Nearby hotel search is location-aware. The entered area is geocoded with
Nominatim and nearby hotel listings are read from OpenStreetMap Overpass. Groq
classifies the request, but it does not invent hotel names or distances. If a
live provider is unavailable, the assistant returns a clear retry message.

Choose **Use my location** and allow browser location access to find hotels
within 10 km of your device, nearest first. Distances are approximate straight-line
distances, not driving routes. This lookup uses OpenStreetMap directly without an
AI key; coordinates are sent only for that search, not to the AI classifier.
Device location requires HTTPS or localhost. City search remains available if
location permission is denied.

Common failure cases are handled with clear UX:
- network failure → visible error and retry action
- invalid dates → validation message
- no room availability → clear no-option response
- model outage → local guide fallback mode

## Architecture

### Frontend
- React + Vite single-page app
- chat interface and guest input form
- calls backend `/api/chat` and `/api/availability`
- no direct LLM calls from the browser

### Backend
- Express server
- server-side hotel knowledge base module
- validation with Zod
- request logging and structured JSON responses
- basic rate limiting and error handling

### AI / model layer
- Optional Groq integration for topic classification
- local fallback path when the key is missing or the model fails
- model output remains constrained; the final answer is built from trusted hotel data

When `DEMO_MODE=false` and `GROQ_API_KEY` is configured, the app enables live
location lookup. Without a key, the local demo path remains available for the
hotel guide and simulated availability.

### Data flow
- browser sends question + history + optional stay
- backend classifies intent
- if it is a hotel fact, it returns a sourced answer
- if it is availability, it runs deterministic inventory logic
- the frontend renders the answer and any room cards

## Setup

Requirements:
- Node.js 22 or newer
- npm

Install and run locally:

```bash
npm install
cp .env.example .env
npm run dev
```

Then open:

- Frontend: http://127.0.0.1:5173
- API: http://127.0.0.1:3001

## Production build

```bash
npm run build
npm start
```

## Vercel deployment

Import the repository with the project root set to the folder containing
`package.json`. Use the Vite preset, `npm run build`, and output directory `dist`.
The checked-in `api/[...path].js` exposes the Express API as a Vercel Function;
`vercel.json` sets its time limit to 30 seconds for provider lookups.
Do not add an all-path rewrite to `index.html`, because API requests must reach
the function. Set `GROQ_API_KEY`, `GROQ_MODEL`, and `DEMO_MODE=false` in Vercel
environment variables for AI mode. No `PORT` variable is required.

After pushing these files and deploying, check `/api/health` returns JSON with
`"status":"ok"`. If it returns a Vercel 404 page, confirm the deployed commit
includes the `api` folder and the Root Directory points to this project.
For function failures, check the deployment's runtime logs.

## Optional AI configuration

Create a `.env` file based on `.env.example`:

```env
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=3001
DEMO_MODE=false
```

If `GROQ_API_KEY` is missing or `DEMO_MODE=true`, the app falls back to the local hotel guide.

## API examples

```bash
curl http://127.0.0.1:3001/api/health

curl -X POST http://127.0.0.1:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Does the hotel have a pool?"}'

curl -X POST http://127.0.0.1:3001/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Check availability","stay":{"checkIn":"2026-10-10","checkOut":"2026-10-11","adults":2}}'
```

## Testing and evaluation

The app includes automated backend tests and browser tests covering:
- normal guest questions
- missing details
- ambiguous questions
- availability/tool requests
- unsupported assumptions
- follow-up conversation logic
- API failure and fallback behavior
- frontend-to-backend flow

Run checks:

```bash
npm test
npm run build
npm run test:e2e
```

Current verification status is maintained by the automated test commands above.

Additional evaluation notes are in [docs/EVALUATION.md](docs/EVALUATION.md) and product decisions in [docs/DECISIONS.md](docs/DECISIONS.md).

## AI tools used

This project was developed with GitHub Copilot and standard local development tooling, with verification through Node.js tests and Playwright browser checks.

## What would be improved before production

- connect to real hotel inventory and booking systems
- add secure deployment configuration and secret management
- use approved knowledge sources with content review
- run live model quality and latency tests
- add stronger safety checks and adversarial prompt testing
- measure guest success rate and happiness in a real pilot

## Project structure

- `src/main.jsx` — frontend UI and chat behavior
- `src/styles.css` — layout and styling
- `server/app.js` — API routes and validation
- `server/ai.js` — AI routing and fallback logic
- `server/domain.js` — date, capacity, and room availability logic
- `server/hotel.js` — hotel facts and room data
- `tests/backend.test.js` — backend scenarios
- `tests/e2e/guest.spec.js` — end-to-end browser checks
