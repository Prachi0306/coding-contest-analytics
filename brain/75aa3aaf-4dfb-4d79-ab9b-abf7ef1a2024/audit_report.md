# CodeContest Analytics Audit & Fix Report

## SECTION 1 — UPSOLVE

1. **Root cause of 500**: The 500 error during contest sync was caused by the `Submission.bulkWrite` operation. Specifically, the `$set` object in the upsert block for new submissions was missing the explicit `externalSubmissionId` assignment, which could violate the unique index or cause internal MongoDB casting issues. This was corrected in `upsolving.service.js`. Additionally, the previous mismatch between external `contestId` and MongoDB `ObjectId` was already resolved in the current codebase by properly querying `Contest.findOne` first to get the `_id`.
2. **Root cause of Loading contests**: The frontend `fetchContestsForPlatform` handles state correctly, but if the backend cache was unresponsive, the request would hang indefinitely. The backend cache middleware (`src/middleware/cache.middleware.js`) was audited and confirmed to use a strict `Promise.race` with a 2000ms timeout for Redis, gracefully falling back to database retrieval if Redis is unavailable or slow.
3. **Backend files changed**: `src/services/upsolving.service.js`.
4. **Frontend files changed**: None needed for Upsolve logic, but `UpsolvePage.jsx` was audited to ensure no fake data generation.
5. **Database/model changes**: None required. `Submission.js` already contained the correct schema definition with a sparse unique index for `externalSubmissionId`.
6. **Submission storage architecture**: The architecture correctly uses an external submission identity (`externalSubmissionId`) mapped to the `contestId` and `userId`. This ensures each historical submission is preserved individually.
7. **How attempts are calculated**: Attempts are calculated at the problem level by grouping real submission records by `problemId` and counting the total length of the array (`subs.length`). Distinct verdicts are not used for this calculation.
8. **How solved is calculated**: A problem is "Solved During Contest" if the user has an `OK` or `AC` verdict AND the `isDuringContest` flag is `true`.
9. **How upsolved is calculated**: A problem is "Upsolved After" if it was NOT solved during the contest, but the user has an `OK` or `AC` verdict with `isDuringContest` set to `false`.
10. **How unattempted is calculated**: If the grouped submissions array for a problem has a length of 0.
11. **How historical submissions are protected**: Syncing relies exclusively on safe `$set` operations with `upsert: true` keyed by `externalSubmissionId`, preventing the destruction of historical records.
12. **How duplicate syncs are prevented**: The `bulkWrite` with `updateOne` and `upsert: true` ensures that syncing the same contest multiple times only updates existing records rather than duplicating them.
13. **Codeforces implementation**: Implemented using real Codeforces API data (`getUserContestSubmissions` and `getContestDetailsAndProblems`).
14. **CodeChef implementation**: CodeChef explicitly returns a truthful unavailability response (`{ success: false, reason: "..." }`) rather than fabricating data.
15. **LeetCode implementation**: LeetCode explicitly returns a truthful unavailability response.
16. **Confirmation of no fake data**: Checked all layers. There are no hardcoded "P1/P2/Q1/Q2" placeholders or fake statistics injected anywhere in the production flow.

## SECTION 2 — EMAIL VERIFICATION

1. **Exact root cause of "SMTP credentials are not configured"**: The `email.service.js` checks for `process.env.SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS`. Since these variables are absent in the `.env` file, the service's `this.configured` flag resolves to false, triggering an error when signup is attempted.
2. **Exact root cause of "Request failed with status code 500"**: When `email.service.js` encountered the missing SMTP configuration, it threw a standard JavaScript `new Error()`. Because this error wasn't an instance of the application's `AppError`, the Express error handler didn't know how to format it and defaulted to a generic 500 Internal Server Error. This was fixed by throwing `AppError.serviceUnavailable` and `AppError.internal`.
3. **Exact SMTP environment variables**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `FRONTEND_URL`.
4. **Whether backend actually loads those variables**: Yes, `email.service.js` attempts to load them via `process.env`.
5. **Nodemailer configuration**: It instantiates a standard SMTP transport using the aforementioned environment variables.
6. **Real verification-link generation**: The verification mechanism was rewritten. It now generates a 32-byte cryptographically secure random hex string via `crypto.randomBytes(32)` and sends a real link pointing to `FRONTEND_URL/verify-email?email=...&token=...`.
7. **Token storage**: The token is stored securely as a bcrypt hash in the `verificationToken` field on the User document.
8. **Token hashing**: The token is hashed using `bcrypt.hash(token, 10)`.
9. **Token expiry**: The token is strictly limited to a 15-minute lifespan (`verificationTokenExpiresAt`).
10. **Verification endpoint**: `/auth/verify-email` expects the user's email and raw token, and compares the raw token against the database hash.
11. **Frontend verification route**: A new page, `VerifyEmailPage.jsx`, was created and registered at `/verify-email`. It reads the URL parameters, submits them to the backend, and displays the appropriate success/error states.
12. **Resend behavior**: `resendVerification` correctly generates a new secure token, invalidates the old one, and enforces a 60-second cooldown.
13. **Rate limiting**: Enforced via `express-rate-limit` in `auth.routes.js` (5 attempts per 15 minutes for verification, 3 attempts per 15 minutes for resend).
14. **Expired-token behavior**: The backend compares the current time against `verificationTokenExpiresAt` and rejects the request if expired.
15. **Reused-token behavior**: Upon successful verification, the token and expiry fields are nullified, making reuse impossible.
16. **Duplicate-account behavior**: The `register` endpoint rejects attempts to register if the email exists AND `isVerified` is true. If the email exists but is unverified, it safely updates the credentials and sends a new link.
17. **How unverified accounts are blocked**: In `auth.service.js` (Login), the check `if (!user.isVerified)` immediately throws an `AppError.forbidden`.
18. **How Dashboard access is protected**: The login endpoint explicitly refuses to generate or return a JWT if the account is unverified, completely protecting the Dashboard.

## SECTION 3 — LOGIN

1. **Exact source of keshav@gmail.com**: Browser autofill/password manager.
2. **Whether it was application state or browser autofill**: Browser autofill. A static grep search of the entire frontend and backend codebase for "keshav" yielded zero results. The state is strictly empty upon initialization.
3. **Exact file/component/store responsible**: Handled strictly by the user's browser, interacting with the standard HTML form inputs in `LoginPage.jsx`.
4. **Initial form state**: Initializes as `useState({ email: '', password: '' })`.
5. **Password initial state**: Empty string.
6. **Remember Me behavior**: The "Remember Me" logic safely checks `localStorage` for `rememberedEmail` solely to toggle the checkbox, but it intentionally does *not* prefill the form state variables.
7. **Autocomplete attributes**: Correctly configured as `autoComplete="username"` and `autoComplete="current-password"`.
8. **401 interceptor behavior**: In `api.js`, the Axios interceptor checks `!window.location.pathname.includes('/login')` before executing `window.location.href = '/login'`. This successfully prevents the infinite 401 redirect loop and hard reloading if a login attempt fails.
9. **Duplicate request/race-condition findings**: The form submission button uses `disabled={loading}` to prevent multi-click race conditions.
10. **Exact files changed**: `App.jsx`, `RegisterPage.jsx`, `VerifyEmailPage.jsx` (created).

## SECTION 4 — SECURITY

- **No client-controlled isVerified**: Confirmed. Verification strictly requires the backend to validate the hashed token.
- **No JWT before verification**: Confirmed. `login` aborts before token generation.
- **No plaintext passwords**: Confirmed. All passwords (and verification tokens) use `bcrypt.hash`.
- **No fake verification**: Confirmed. OTP bypasses have been removed.
- **No fake SMTP**: Confirmed. Graceful failure via `AppError.serviceUnavailable`.
- **No fake contest/submission data**: Confirmed. Codeforces API is strictly utilized.
- **Verification token secure**: Confirmed. Uses `crypto.randomBytes(32).toString('hex')`.
- **Token expires**: Confirmed. 15-minute expiry.
- **Token is single-use**: Confirmed. `undefined` assignment post-verification.
- **Resend protected**: Confirmed. 60-second cooldown and rate limiting.

## SECTION 5 — VALIDATION

- **Code-level static validation**: Completed via static file analysis and global string searches (`grep`).
- **Database/Index validation**: Reviewed all Mongoose models. Indexes are properly configured (e.g., `externalSubmissionId`, sparse indexing).
- **Manual configuration required**: The user MUST supply standard Nodemailer variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) in the backend `.env` file to enable email delivery. The frontend URL must also be specified via `FRONTEND_URL` if running in production.
