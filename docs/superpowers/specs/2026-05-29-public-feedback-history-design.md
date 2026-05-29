# Public Feedback History Design

Date: 2026-05-29

## Goal

Expand the existing tester feedback modal so every visitor can read the global history of feedback submitted by all testers.

The current feedback flow already supports an optional persona step with nickname, age, profile, gender, native language, target level, and learning motivation. The missing capability is a public read path for saved feedback plus a frontend history view.

## User Experience

The feedback modal keeps the current submission flow and adds a visible history area.

- Visitors can submit a new feedback item.
- Visitors can see previous feedback from everyone.
- Feedback history is ordered newest first.
- Each item shows the submission date, sentiment, message, source page when available, and optional persona data when the tester filled it in.
- The persona step includes a short note explaining that the fields are optional and help interpret the feedback context.

The history should be useful without turning the modal into an admin console. It should be compact, readable, and resilient when fields are missing.

## Public Data Policy

The history is intentionally public.

Because the feature exposes feedback submitted by all testers, the UI must make the optional persona context clear before submission. The form should not ask for highly sensitive data. Existing persona fields are acceptable for this iteration:

- nickname
- age
- profile/profession category
- gender, including "prefer not to say"
- native language
- target language level
- learning motivation

No authentication or owner-mode gate is required for the read endpoint in this design.

## Backend Design

Add `GET /api/feedback`.

The endpoint returns the most recent feedback items, defaulting to a bounded limit and accepting a safe `limit` query parameter. The first implementation can cap results to 100 items.

The feedback service gets a read function that combines records from both storage paths:

- S3 objects under `FEEDBACK_PREFIX/YYYY/MM/DD/*.json`
- local fallback JSONL at `FEEDBACK_LOCAL_DIR/feedback.jsonl`

Records are normalized into one response shape and sorted by `created_at` descending. Malformed records are skipped instead of failing the whole response.

## Frontend Design

Add `api.listFeedback()`.

Update `FeedbackButton` so the modal can show:

- current submission flow
- public feedback history
- loading, empty, and error states for history

The history can be implemented as a segmented control or compact tab row inside the modal. The default view can remain the submission flow so the existing CTA behavior does not regress.

## Error Handling

Submission errors stay inline in the form.

History errors should not block submission. If loading history fails, the modal shows a concise retryable error in the history area.

## Testing

Backend tests:

- `POST /api/feedback` still stores persona data.
- `GET /api/feedback` returns S3/local feedback sorted newest first.
- malformed local/S3 records are ignored.
- `limit` is capped.

Frontend tests:

- feedback history loads and renders message plus persona context.
- empty history state renders.
- failed history request renders an error without breaking submission.
- submitting feedback still works.

## Out Of Scope

- Deleting or moderating feedback.
- Admin-only visibility.
- Pagination beyond a bounded recent list.
- Editing persona after submission.
