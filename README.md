# Altrium CRM — frontend

React + Vite UI for the `Altrium_Project_Backend` ASP.NET Core API. Covers every
controller the backend exposes: companies, contacts, leads, deals, engagements,
follow-ups and users.

## Running it

Start the API first (from the backend solution):

```bash
dotnet run --launch-profile http
```

Then the UI:

```bash
npm install && npm run dev
```

The dev server listens on <http://localhost:5173> and proxies `/api` to
`http://localhost:5169` (the backend's `http` launch profile). The backend
registers no CORS policy, so the proxy — not a direct cross-origin call — is what
makes the two talk in development.

To point at the HTTPS profile instead:

```bash
VITE_PROXY_TARGET=https://localhost:7069 npm run dev
```

Copy `.env.example` to `.env` to change either the proxy target or the base URL
the browser calls (`VITE_API_BASE_URL`).

## What each screen does

| Route | Screen | Notes |
| --- | --- | --- |
| `/` | Dashboard | Pipeline value, win rate, stage breakdown, lead funnel, next follow-ups, recent activity. |
| `/companies` | Companies | Owner is a picker over `/api/Users`. |
| `/contacts` | Contacts | Filterable by company. `phone` is sent as `null` when blank, matching the nullable column. |
| `/leads` | Leads | Status pills double as filters; score is validated to 0–100 before the request goes out. |
| `/deals` | Deals | Board and table views. Dragging a card between columns issues a `PUT` with the new stage. |
| `/engagements` | Engagements | Filterable by type. |
| `/follow-ups` | Follow-ups | Open / overdue / completed views; the row checkbox toggles `completed` via `PUT`. |
| `/team` | Team | Users, with a count of the accounts and deals each one owns. |

## How it talks to the API

`src/api/client.js` wraps `fetch` and normalises the three error shapes ASP.NET
can return (a bare string, `ProblemDetails`, or a ModelState dictionary) into one
message that surfaces in the form or as a toast. `createResource(route)` builds
the five CRUD calls each controller shares, and `src/api/endpoints.js` names the
routes exactly as the controllers do — the backend mixes plural and singular
(`Companies` but `Contact`, `Deals` but `Engagement`), so those strings are not
interchangeable.

Enum values in `src/constants/enums.js` mirror `Data/CrmEnums.cs`. The forms only
offer those values, so the server-side `400`s for a bad status or stage should be
unreachable from the UI.

`DELETE` is a soft delete on the backend (`is_active = 0`) and the list endpoints
filter on `is_active = 1`, so the delete dialog says "archived" rather than
"deleted" — the row leaves the UI but stays in the database.

Dates from `<input type="date">` are sent without a timezone suffix
(`2026-11-30T00:00:00`). Serialising to UTC would move the date back a day for
anyone east of Greenwich.

## Known backend gaps this UI works around

- **No CORS policy.** Fine in dev thanks to the proxy; a deployed build served
  from a different origin needs `AddCors` on the backend.
- **No authentication.** There is no login screen because there is no auth
  endpoint to call. The Team screen manages user records, nothing more.
- **`password_hash` is stored verbatim.** `UserRepository` writes whatever string
  arrives, so the Team form labels the field "Password hash" and says so rather
  than pretending to hash a password. Leaving it blank on an edit keeps the
  stored value (`COALESCE` in the update statement).
- **No paging, sorting or filtering endpoints.** Every list is `GET /api/<route>`
  in full; search, sort and filters run client-side. That is fine at demo scale
  and will need server-side paging once the tables get large.
