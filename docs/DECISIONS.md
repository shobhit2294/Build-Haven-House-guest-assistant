# Product and engineering decisions

## Customer problem and guest journey

Guests need timely, trustworthy answers without hunting through policy pages or waiting for reception. Hotels need fewer repetitive enquiries without an assistant inventing benefits or promising rooms that do not exist.

The guest lands on a calm hotel-branded page, asks a question or selects a suggestion, receives sourced facts, asks a follow-up, and then enters dates and party size to see clear room options. Unknown questions lead to reception confirmation; empty availability invites another date or a multi-room enquiry. No “book now” action pretends to complete a reservation.

## UX choices

- Chat and stay details sit side by side on desktop. On mobile the form follows the chat in normal reading order. An availability prompt focuses the first date field.
- Suggested questions show useful scope and reduce typing. User and assistant messages are visually distinct.
- Source labels establish where facts come from. Mode notices distinguish offline guide answers from AI-assisted routing.
- The form makes dates and guest count explicit; native controls and backend validation avoid ambiguous date assumptions.
- Loading disables duplicate submissions. Failed requests retain a retry action without duplicating the visible user message. Failed date validation preserves entered values.
- Semantic labels, live announcements, visible keyboard focus, reduced-motion styling and no horizontal overflow are included. Full screen-reader and WCAG audits remain production work.

## Where AI helps; where it must not decide

Groq maps varied wording and conversation context to guide topic IDs. This is a deliberately constrained AI-assisted answer pipeline: the LLM does not author the final hotel facts. The server assembles the approved passages selected by the model. This sacrifices conversational flexibility for auditability and avoids generated prices, hours, policies or inventory.

Dates, room capacities, nightly stock, prices, validation and response formatting remain deterministic. A structured stay calls `checkAvailability` even if classification is wrong. Model-produced text beyond the topic list is ignored. Local keyword routing provides a useful free demo and degraded mode, not equivalent language understanding.

## Risks and boundaries

The model can still select the wrong topic, ignore part of a multi-topic question, mishandle pronouns or fail under prompt injection. Allowlisted output prevents invented facts, but does not guarantee relevance or a complete answer. Client history is untrusted and cannot override the system prompt or create new facts; there are no side-effecting tools. A malicious user can still influence classification. Output is rendered as React text, never raw HTML.

The local router is English and keyword based; broad questions such as “tell me more” and complex comparisons may fall back. A pool question about an unsupported detail can return the pool guide without answering that detail; users should use reception for confirmation. Production should add calibrated unknown/clarification detection, fact-level rather than topic-level retrieval, adversarial evaluations, multilingual checks and a carefully evaluated generation layer if needed.

The knowledge base is entirely fictional because the assignment supplied no real property data. It needs hotel approval and freshness controls before real use. An eight-person request returns no single-room options even if several smaller rooms exist, by design.

## Failure handling

| Failure | Guest experience | Engineering response |
| --- | --- | --- |
| Groq timeout (8 seconds), 429/5xx, invalid JSON/topic | Sourced local answer with AI-unavailable notice | Catch and classify locally; no secret/raw provider error exposure |
| Unsupported question | Clear lack-of-verified-information response | No invented answer |
| Missing stay details | Request dates/guest count; focus form | `needsStay: true` |
| Invalid dates or occupancy | Actionable validation text | HTTP 400 and field details |
| No inventory | Explain no matching single room; suggest alternatives | Empty room list is not an exception |
| Frontend network/server failure | Visible error and Try again | 15-second client timeout; preserve draft intent |
| Excessive request rate | Ask guest to wait | Per-process/IP limit, 60 requests/minute |

Structured logs include request ID, method, path, status and duration, not prompts or keys. In-memory rate limits and client-held conversations suit a small demo, not multiple production instances. Health reports configuration mode, not a live provider connectivity check.

## Measuring usefulness

Start with a hotel-reviewed set of answerable, unsupported, ambiguous and adversarial questions. Measure selected-topic accuracy, unsupported-claim rate, fallback precision/recall, follow-up success and room-result correctness. Separate provider latency and outages from relevance failures.

In a consented pilot, measure successful question resolution, repeat/rephrased questions, form completion, availability-to-booking handoff, helpful/not-helpful feedback, p50/p95 response time and reception escalation rate. Track device type and language without retaining unnecessary message content. A fast response that misstates policy is not a success. Compare to the current FAQ/reception baseline; define targets with actual hotel operators rather than inventing observed business outcomes.

## Before production

1. Replace fictional content and inventory with approved knowledge and transactional PMS/booking integration; implement inventory holds and idempotent booking if booking becomes in scope.
2. Add a privacy notice, provider data-processing review, access controls for knowledge edits, secret management, HTTPS, deployment-specific CORS/proxy configuration and distributed rate limits.
3. Run live Groq quality, cost and latency evaluations; add monitoring, alerting, provider circuit breaking, and careful retry/backoff policies.
4. Add authoritative room/rate policy versions, content ownership, freshness timestamps and escalation contact details.
5. Add CI, dependency updates, broader browsers and accessibility testing, localization, timezone boundary tests, load tests and operational runbooks.
