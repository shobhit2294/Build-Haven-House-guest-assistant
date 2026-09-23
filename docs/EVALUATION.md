# Evaluation and observed results

Verified on 23 September 2026, Windows, Node.js 24.14.1, npm 11.11.0, Vite 6.4.3, Playwright Chromium 153. Tests use future dates generated at run time, with no paid services or real guest data.

## Observed execution

- Dependency install: successful; npm reported **0 vulnerabilities** at installation time.
- `npm test`: **20 passed, 0 failed** (about 0.53 seconds in the unrestricted local run).
- `npm run build`: **passed**; 28 modules transformed; JavaScript about 232.49 kB / 72.76 kB gzip, CSS 7.52 kB / 2.41 kB gzip in the observed build.
- `npm run test:e2e`: **6 passed, 0 failed**, 6.8 seconds in the final run. Real built React frontend and Express backend on port 4317, in demo mode. The positive inventory fixture finds a future date with rooms so routine mock sell-outs do not make the test brittle.
- Desktop screenshot (1440 px wide) and mobile screenshot (390 px wide) visually inspected: no overlapping panels, clipped form controls or horizontal page overflow. Conversation history intentionally scrolls inside its panel.
- Live Groq: **not run**, because no key was supplied. Model interface, validation, timeout and fallback tested with injected provider responses; those tests do not establish live model answer quality, latency or account compatibility.

Initial execution issues were environmental: the default server port was occupied, then the test browser was missing. The test server was moved to dedicated port 4317 and Chromium installed. Both suites passed after these fixes. Restricted execution also prevented one build; the successful build and browser run used permitted local execution.

## Backend scenarios

| # | Scenario | Expected and observed result |
| --- | --- | --- |
| 1 | Check-in question | 3:00 PM with check-in source; PASS |
| 2 | Pool → “And when is it open?” | Pool hours retained through topic context; PASS |
| 3 | Breakfast assumed free for all rooms | Correct Family Suite inclusion and INR 650 exception; PASS |
| 4 | Suitable room for three guests | Garden Twin recommendation and capacities; PASS |
| 5 | Cancellation policy | 48-hour cutoff and non-refundable exception; PASS |
| 6 | Helipad / ambiguous “Is it included?” without context | Verified-information fallback; PASS |
| 7 | Availability without stay details | `needsStay: true`; PASS |
| 8 | Availability with valid structured stay | Exact deterministic tool result; PASS |
| 9 | Eight guests | No matching single room, useful alternative guidance; PASS |
| 10 | Repeated inventory calls | Stable stock, capacity, whole-stay totals; PASS |
| 11 | Multi-night stay | Stock no greater than any included night; PASS |
| 12 | Impossible/past dates, zero/long stay, invalid occupancy | Rejected by domain validation; PASS |
| 13 | Empty/oversized question, untrusted role, bad context/type | HTTP 400; PASS |
| 14 | Malformed JSON / oversized body | Safe HTTP 400 / 413; PASS |
| 15 | Provider exception, bad status, invalid JSON or topic | Local fallback without secrets; PASS |
| 16 | Successful provider response | Server-side endpoint/auth and bounded context sent; PASS |
| 17 | Provider timeout | Local fallback; PASS |
| 18 | Provider tries to supply invented answer text | Only verified selected facts reach the guest; PASS |
| 19 | Excessive calls | Structured HTTP 429 after configured limit; PASS |
| 20 | Request logging | Request ID/status/duration, no question text; PASS |

## Browser scenarios

| # | Scenario | Observed result |
| --- | --- | --- |
| 1 | Open app → pool → follow-up → missing availability → form → results → unsupported → reset | Full frontend/backend journey passed; real inventory response and result cards |
| 2 | Delayed API | Loading status visible, duplicate submission disabled, answer recovered |
| 3 | Network failure then retry | Useful connection error, retry succeeded, error cleared |
| 4 | Equal dates then eight-guest valid stay | Date-order error, followed by clear no-room response |
| 5 | Mobile at 390 × 844 | No horizontal page overflow, question answered and form reachable |
| 6 | Desktop at 1440 × 1100 | Healthy loaded app and screenshot captured |

Browser network delay/failure are injected at the browser network layer. Normal requests and retried requests hit the actual Express server. Model failure is tested in the backend suite, not by inducing a real Groq outage.

## Honest evaluation limits

This is a functional and deterministic regression suite, not evidence of live LLM semantic accuracy. No human guest study, live hotel data, real booking, production load test, Firefox/WebKit run, exhaustive accessibility audit or deployed uptime measurement was performed. The current local router intentionally has limited English paraphrase support. Live model evaluation should include adversarial instructions, multi-topic requests, room-specific pronouns, unsupported amenities, and policy exceptions before production.

The product metrics and future evaluation plan are in [DECISIONS.md](DECISIONS.md). Screenshots: [desktop](desktop.png), [mobile](mobile.png).
