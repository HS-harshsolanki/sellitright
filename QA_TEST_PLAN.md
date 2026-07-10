# ChapterNew — Master QA Test Plan v2

## 1. Executive Summary

### Test Coverage Stats

| Feature Area                     | Total TCs | P0     | P1      | P2     |
| -------------------------------- | --------- | ------ | ------- | ------ |
| Authentication                   | 14        | 8      | 5       | 1      |
| Sell Flow                        | 15        | 6      | 9       | 0      |
| Phone Verification               | 14        | 6      | 7       | 1      |
| Browse & Marketplace             | 15        | 5      | 9       | 1      |
| Payments                         | 12        | 4      | 7       | 1      |
| Dashboard                        | 14        | 4      | 10      | 0      |
| Messaging & Chat                 | 20        | 8      | 10      | 2      |
| Phone Anti-Sharing System        | 18        | 8      | 7       | 3      |
| Buyer Requests / My Requests     | 10        | 3      | 6       | 1      |
| Account Lifecycle                | 10        | 4      | 5       | 1      |
| Admin Workflows                  | 20        | 5      | 12      | 3      |
| Security & Negative              | 17        | 12     | 5       | 0      |
| Cross-Device, UX & Accessibility | 15        | 2      | 10      | 3      |
| **TOTAL**                        | **194**   | **75** | **103** | **16** |

### Top 10 Risk Areas

1. Double-login regression — most user-visible bug, auth callback cookie fix
2. Phone anti-sharing bypass — emoji padding and plus-sign separator gaps
3. Missing admin unblock endpoint — phone-blocked users permanently stuck
4. Block Buyer / Report Buyer buttons silently fail (endpoints don't exist)
5. Notifications unreachable on mobile bottom nav
6. IDOR on chat threads and listing drafts
7. Payment replay attacks and signature tampering
8. Sell publish gate — unverified sellers must be blocked
9. 200-message thread cap with no pagination
10. Entire thread wiped on violation — legitimate history lost

---

## 2. Test Environments

| Environment             | URL                                   | Notes                                          |
| ----------------------- | ------------------------------------- | ---------------------------------------------- |
| Local (main branch)     | http://localhost:3001                 | Auth fixes, real Supabase, MSG91 OTP           |
| Local (firebase branch) | http://localhost:3002                 | Firebase Phone Auth, emulator OTP              |
| LAN testing             | http://192.168.x.x:3002               | Needs secure cookie fix (NODE_ENV=development) |
| Staging                 | https://chapternew-staging.vercel.app | Firebase branch + real SMS (pending deploy)    |
| Firebase Emulator UI    | http://localhost:4000/logs            | OTP codes visible here in local dev            |

Reset emulator rate limit: `curl -X DELETE http://127.0.0.1:9099/emulator/v1/projects/chapternew-e35ef/accounts`

---

## 3. P0 Gates — Must Pass Before ANY User Testing

**Authentication**

- TC-A01: Google login → lands on dashboard
- TC-A04: Session persists after page refresh
- TC-A05: Unauthenticated /sell → login → returns to /sell
- TC-A06: Logout clears session
- TC-A07: REGRESSION — single Google login, no double-login
- TC-A11: Open redirect ?next=https://evil.com → blocked
- TC-A12: Open redirect ?next=//evil.com → blocked

**Sell & Phone Gate**

- TC-S01: Full 6-step happy path → listing published
- TC-S02: Property type required in step 1
- TC-S03: Location fields validated (city, locality, pincode 6-digit)
- TC-S05: BHK + area required for non-PLOT
- TC-S06: Price minimum ₹1,00,000 enforced
- TC-S09: Unverified phone at step 6 → publish blocked
- TC-S10: Inline verify → publish proceeds
- TC-P01: Phone verification happy path
- TC-P02: Invalid phone formats rejected
- TC-P03: Wrong OTP → clear error
- TC-P10: REGRESSION — OTP field is password-masked
- TC-P11: REGRESSION — label reads "Phone number" not "WhatsApp number"
- TC-P12: REGRESSION — hint says "5 minutes" not "10 minutes"
- TC-P13: Inline phone verify in sell flow

**Browse & Payments**

- TC-B01: Homepage loads without JS errors
- TC-B04: Listings grid renders correctly
- TC-B10: Listing card → detail page
- TC-B11: Listing detail — all sections with real data
- TC-B13: Express interest (logged-in buyer)
- TC-B14: Express interest (logged-out) → login redirect
- TC-PAY01: Full ₹49 unlock flow
- TC-PAY07: SECURITY — payment replay rejected
- TC-PAY08: SECURITY — tampered signature → 400
- TC-PAY09: SECURITY — invalid order ID format rejected

**Security**

- TC-SEC01: IDOR — cannot edit another user's listing → 403
- TC-SEC02: IDOR — cannot delete another user's listing → 403
- TC-SEC03: Unauthenticated create listing → 401
- TC-SEC04: Unauthenticated firebase-verify → 401
- TC-SEC05: Forged Firebase token → 401
- TC-SEC07: XSS in listing title → escaped on render
- TC-SEC08: SQL injection in ?q= → no error exposed
- TC-SEC09: Admin route no key → 401
- TC-SEC10: Admin route wrong key → 401

**Messaging (Critical)**

- TC-MSG07: Unauthenticated /messages → /login
- TC-MSG08: IDOR — cannot access another user's thread → 403
- TC-PHONE-02: Phone in message → offense 1/3 → 422, thread cleared
- TC-PHONE-04: Third offense → 403 permanent account block
- TC-PHONE-05: Blocked user any message → 403 immediately

**Dashboard**

- TC-D01: My listings with status badges
- TC-D05: Buyer requests tab renders
- TC-D06: Accept interest → buyer notified

---

## 4. P1 Gates — Must Pass Before Beta Launch

TC-A02, TC-A03, TC-A08, TC-A09, TC-A10, TC-A13,
TC-S04, TC-S07, TC-S08, TC-S11, TC-S12, TC-S13, TC-S14, TC-S15,
TC-P04, TC-P05, TC-P06, TC-P07, TC-P08, TC-P09, TC-P14,
TC-B02, TC-B03, TC-B05, TC-B06, TC-B07, TC-B08, TC-B09, TC-B12, TC-B15,
TC-PAY02, TC-PAY03, TC-PAY04, TC-PAY05, TC-PAY06, TC-PAY11, TC-PAY12,
TC-D02, TC-D03, TC-D04, TC-D07, TC-D08, TC-D09, TC-D10, TC-D11, TC-D12, TC-D13, TC-D14,
TC-MSG01–MSG06, TC-MSG09–MSG16, TC-MSG17 (bug doc), TC-MSG18 (bug doc),
TC-PHONE-01, TC-PHONE-03, TC-PHONE-06, TC-PHONE-07, TC-PHONE-08, TC-PHONE-09, TC-PHONE-10, TC-PHONE-11, TC-PHONE-12, TC-PHONE-13, TC-PHONE-17, TC-PHONE-18,
TC-REQ01–REQ08,
TC-ACC01–ACC08,
TC-ADM01–ADM17, TC-ADM20,
TC-SEC06, TC-NEG01–NEG07,
TC-UX01 (bug doc), TC-UX02 (bug doc), TC-UX03–UX12

---

## 5. P2 — Nice to Have

TC-A14 (LAN IP session), TC-PAY10 (demo mode), TC-NEG05 (500-char title),
TC-PHONE-14 (emoji bypass — known filter gap), TC-PHONE-15 (plus bypass — known filter gap),
TC-PHONE-16 (price false positive guard),
TC-MSG19 (200-msg cap — known bug), TC-MSG20 (day separators),
TC-ADM18, TC-ADM19 (unblock gap — bug doc), TC-ADM20,
TC-UX13, TC-UX14, TC-UX15,
TC-ACC09, TC-ACC10

---

## 6. Manual Test Execution Checklist

### Authentication

| TC     | Description                                               | Priority | Automation   |
| ------ | --------------------------------------------------------- | -------- | ------------ |
| TC-A01 | Google login → lands on dashboard, session set            | P0       | MANUAL_ONLY  |
| TC-A02 | ?next=/sell → returns to /sell after login                | P1       | AUTOMATED    |
| TC-A03 | Visit /profile unauthed → login → returns to /profile     | P1       | AUTOMATED    |
| TC-A04 | Session persists after hard refresh                       | P0       | AUTOMATED    |
| TC-A05 | Visit /sell unauthed → login → back to /sell              | P0       | AUTOMATED    |
| TC-A06 | Logout → session cleared → /login on next protected visit | P0       | CAN_AUTOMATE |
| TC-A07 | REGRESSION — OAuth triggered ONCE, user stays logged in   | P0       | MANUAL_ONLY  |
| TC-A08 | Expired session → graceful /login redirect, no 500        | P1       | AUTOMATED    |
| TC-A09 | OAuth cancel mid-flow → stays on /login, no crash         | P1       | MANUAL_ONLY  |
| TC-A10 | Invalid callback code → /login?error=auth_failed          | P1       | AUTOMATED    |
| TC-A11 | ?next=https://evil.com → lands on / (blocked)             | P0       | AUTOMATED    |
| TC-A12 | ?next=//evil.com → lands on / (blocked)                   | P0       | AUTOMATED    |
| TC-A13 | New user first login → empty dashboard state              | P1       | CAN_AUTOMATE |
| TC-A14 | LAN IP http://192.168.x.x → session cookie works          | P2       | MANUAL_ONLY  |

### Sell Flow

| TC     | Description                                                          | Priority | Automation   |
| ------ | -------------------------------------------------------------------- | -------- | ------------ |
| TC-S01 | All 6 steps → listing published, visible on /properties              | P0       | CAN_AUTOMATE |
| TC-S02 | Step 1 — no property type → cannot proceed                           | P0       | AUTOMATED    |
| TC-S03 | Step 2 — city required, locality required, pincode exactly 6 digits  | P0       | CAN_AUTOMATE |
| TC-S04 | PLOT type → BHK/furnishing fields skipped in step 3                  | P1       | CAN_AUTOMATE |
| TC-S05 | Non-PLOT → BHK required, area required                               | P0       | CAN_AUTOMATE |
| TC-S06 | Price < ₹1,00,000 → validation error                                 | P0       | AUTOMATED    |
| TC-S07 | Title and description field validation                               | P1       | CAN_AUTOMATE |
| TC-S08 | Upload photo → preview shown → remove photo                          | P1       | CAN_AUTOMATE |
| TC-S09 | Unverified phone at step 6 → inline verifier shown, publish disabled | P0       | AUTOMATED    |
| TC-S10 | Inline phone verify → publish becomes active → publishes             | P0       | CAN_AUTOMATE |
| TC-S11 | Back navigation preserves all field data                             | P1       | CAN_AUTOMATE |
| TC-S12 | Draft autosave → leave page → return → pre-populated                 | P1       | CAN_AUTOMATE |
| TC-S13 | Resume draft via ?draftId=uuid                                       | P1       | CAN_AUTOMATE |
| TC-S14 | Unauthed /sell → login → return to /sell                             | P1       | AUTOMATED    |
| TC-S15 | Publish API failure → error shown, can retry without losing data     | P1       | CAN_AUTOMATE |

### Phone Verification

| TC     | Description                                                       | Priority | Automation   |
| ------ | ----------------------------------------------------------------- | -------- | ------------ |
| TC-P01 | Valid 10-digit Indian number + correct OTP → verified state       | P0       | CAN_AUTOMATE |
| TC-P02 | Invalid formats (9d, 11d, starts 0-5, non-numeric) → all rejected | P0       | CAN_AUTOMATE |
| TC-P03 | Wrong OTP → error, phone NOT marked verified                      | P0       | CAN_AUTOMATE |
| TC-P04 | Expired OTP → specific "OTP expired" message                      | P1       | CAN_AUTOMATE |
| TC-P05 | Resend → OTP input clears, cooldown restarts at 30s               | P1       | CAN_AUTOMATE |
| TC-P06 | Resend button disabled during 30s cooldown, countdown visible     | P1       | CAN_AUTOMATE |
| TC-P07 | Too-many-requests → 5-minute cooldown message                     | P1       | CAN_AUTOMATE |
| TC-P08 | Change number → resets flow, previous confirmation cleared        | P1       | CAN_AUTOMATE |
| TC-P09 | Already verified → shows verified state, no OTP form              | P1       | CAN_AUTOMATE |
| TC-P10 | REGRESSION — OTP input shows dots not digits (type=password)      | P0       | CAN_AUTOMATE |
| TC-P11 | REGRESSION — label is "Phone number" not "WhatsApp number"        | P0       | CAN_AUTOMATE |
| TC-P12 | REGRESSION — hint says "5 minutes" not "10 minutes"               | P0       | CAN_AUTOMATE |
| TC-P13 | Inline verify in sell step 6 → publish proceeds                   | P0       | CAN_AUTOMATE |
| TC-P14 | Phone used by another account → error shown                       | P1       | CAN_AUTOMATE |

### Browse & Marketplace

| TC     | Description                                                       | Priority | Automation   |
| ------ | ----------------------------------------------------------------- | -------- | ------------ |
| TC-B01 | Homepage loads — hero, pain points, how-it-works sections visible | P0       | AUTOMATED    |
| TC-B02 | Search "Mumbai" → /properties?q=Mumbai with results               | P1       | AUTOMATED    |
| TC-B03 | Empty search → blocked (required validation fires)                | P1       | CAN_AUTOMATE |
| TC-B04 | /properties — cards show photo, title, price, location            | P0       | CAN_AUTOMATE |
| TC-B05 | Filter by property type → results update                          | P1       | CAN_AUTOMATE |
| TC-B06 | Filter by price range → only matching listings                    | P1       | CAN_AUTOMATE |
| TC-B07 | Multiple filters combined → AND logic                             | P1       | CAN_AUTOMATE |
| TC-B08 | No results → empty state with CTA                                 | P1       | AUTOMATED    |
| TC-B09 | Clear all filters → full list restored                            | P1       | CAN_AUTOMATE |
| TC-B10 | Listing card click → /listing/[id] correct content                | P0       | AUTOMATED    |
| TC-B11 | Listing detail — photo gallery, details, price, seller section    | P0       | CAN_AUTOMATE |
| TC-B12 | Non-existent listing → 404 page, not 500                          | P1       | AUTOMATED    |
| TC-B13 | Express interest (logged-in buyer) → success, seller notified     | P0       | CAN_AUTOMATE |
| TC-B14 | Express interest (logged-out) → /login?next=/listing/[id]         | P0       | CAN_AUTOMATE |
| TC-B15 | Express interest on own listing → blocked                         | P1       | CAN_AUTOMATE |

### Payments

| TC       | Description                                                            | Priority | Automation   |
| -------- | ---------------------------------------------------------------------- | -------- | ------------ |
| TC-PAY01 | Interest accepted → Razorpay ₹49 → test card → seller contact revealed | P0       | MANUAL_ONLY  |
| TC-PAY02 | Razorpay modal dismissed → no payment, button still active             | P1       | MANUAL_ONLY  |
| TC-PAY03 | Already paid → 409 on create-order, contact shown                      | P1       | CAN_AUTOMATE |
| TC-PAY04 | Seller no verified phone → create-order blocked with error             | P1       | CAN_AUTOMATE |
| TC-PAY05 | Card declined → failure state, can retry                               | P1       | MANUAL_ONLY  |
| TC-PAY06 | Network error during verify → /api/payments/status recovers            | P1       | CAN_AUTOMATE |
| TC-PAY07 | SECURITY — replay same razorpayPaymentId → rejected                    | P0       | AUTOMATED    |
| TC-PAY08 | SECURITY — tampered signature → 400                                    | P0       | AUTOMATED    |
| TC-PAY09 | SECURITY — invalid order ID format → 400/422                           | P0       | AUTOMATED    |
| TC-PAY10 | Demo mode → demo_order, no real charge                                 | P2       | AUTOMATED    |
| TC-PAY11 | Webhook after verify → idempotent, no double-unlock                    | P1       | CAN_AUTOMATE |
| TC-PAY12 | Both buyer + seller receive in-app notification                        | P1       | CAN_AUTOMATE |

### Dashboard

| TC     | Description                                                                    | Priority | Automation   |
| ------ | ------------------------------------------------------------------------------ | -------- | ------------ |
| TC-D01 | My listings with status badges (Active/Pending/Sold)                           | P0       | CAN_AUTOMATE |
| TC-D02 | Empty listings state with "Post First Listing" CTA                             | P1       | CAN_AUTOMATE |
| TC-D03 | Edit listing → /listings/[id]/edit with all fields pre-populated               | P1       | CAN_AUTOMATE |
| TC-D04 | Delete listing → confirm dialog → removed from list                            | P1       | CAN_AUTOMATE |
| TC-D05 | Buyer Requests tab renders all incoming interests                              | P0       | CAN_AUTOMATE |
| TC-D06 | Accept interest → status → Accepted, buyer notified                            | P0       | CAN_AUTOMATE |
| TC-D07 | Decline interest → status → Declined                                           | P1       | CAN_AUTOMATE |
| TC-D08 | Notifications page — list + unread badge in nav                                | P1       | CAN_AUTOMATE |
| TC-D09 | Mark one notification read → badge decrements                                  | P1       | CAN_AUTOMATE |
| TC-D10 | Mark all read → badge clears entirely                                          | P1       | CAN_AUTOMATE |
| TC-D11 | Mobile bottom nav — tabs correct (Listings, Post, Messages, Profile, Requests) | P1       | CAN_AUTOMATE |
| TC-D12 | Desktop sidebar — all items visible, active item highlighted                   | P1       | CAN_AUTOMATE |
| TC-D13 | Display name editable, email field read-only                                   | P1       | CAN_AUTOMATE |
| TC-D14 | Save name → success toast, persists after refresh                              | P1       | CAN_AUTOMATE |

### Messaging & Chat

| TC       | Description                                                                       | Priority | Automation   |
| -------- | --------------------------------------------------------------------------------- | -------- | ------------ |
| TC-MSG01 | Thread list loads with correct thread entries                                     | P1       | CAN_AUTOMATE |
| TC-MSG02 | Open thread → messages load in chronological order                                | P1       | CAN_AUTOMATE |
| TC-MSG03 | Send message → appears immediately in UI, stored in DB                            | P1       | CAN_AUTOMATE |
| TC-MSG04 | Other party's message appears within ~10 seconds (polling)                        | P1       | MANUAL_ONLY  |
| TC-MSG05 | Unread count in thread list updates on new message                                | P1       | CAN_AUTOMATE |
| TC-MSG06 | Thread does NOT exist while interest is PENDING (only after ACCEPTED)             | P1       | CAN_AUTOMATE |
| TC-MSG07 | Visit /messages unauthed → /login                                                 | P0       | CAN_AUTOMATE |
| TC-MSG08 | IDOR — direct API call to another user's thread → 403                             | P0       | CAN_AUTOMATE |
| TC-MSG09 | Locked thread (listing deleted/disabled) → read-only banner, input hidden         | P1       | CAN_AUTOMATE |
| TC-MSG10 | Rate limit — send 21 messages in 60 seconds → 429                                 | P1       | CAN_AUTOMATE |
| TC-MSG11 | Message exactly 2000 chars → accepted                                             | P1       | CAN_AUTOMATE |
| TC-MSG12 | Message > 2000 chars → rejected with error                                        | P1       | CAN_AUTOMATE |
| TC-MSG13 | Press Enter → sends message (not newline)                                         | P1       | CAN_AUTOMATE |
| TC-MSG14 | Press Shift+Enter → adds newline, does NOT send                                   | P1       | CAN_AUTOMATE |
| TC-MSG15 | Thread list shows correct unread badges per thread                                | P1       | CAN_AUTOMATE |
| TC-MSG16 | Global messages bubble visible on /properties, /dashboard, not on /listing/[id]   | P1       | CAN_AUTOMATE |
| TC-MSG17 | BUG — Block Buyer button → silently fails (endpoint missing), no feedback to user | P1       | CAN_AUTOMATE |
| TC-MSG18 | BUG — Report Buyer button → always shows error (endpoint missing)                 | P1       | CAN_AUTOMATE |
| TC-MSG19 | BUG — 201st message: earliest messages vanish with no "load more" option          | P2       | CAN_AUTOMATE |
| TC-MSG20 | Messages grouped with day separator ("Today", "Yesterday", date)                  | P2       | CAN_AUTOMATE |

### Phone Anti-Sharing System

| TC          | Description                                                                                                             | Priority | Automation   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| TC-PHONE-01 | Type "9876543210" → input cleared, soft warning (no DB write, no violation count)                                       | P1       | CAN_AUTOMATE |
| TC-PHONE-02 | Send "call me on 9876543210" → 422 PHONE_NUMBER_BLOCKED, offense 1/3, thread cleared, both parties notified             | P0       | CAN_AUTOMATE |
| TC-PHONE-03 | Second offense → 422, "2 of 3 violations", thread cleared again                                                         | P1       | CAN_AUTOMATE |
| TC-PHONE-04 | Third offense → 403 PHONE_SEND_BLOCKED, account permanently blocked, input bar hidden                                   | P0       | CAN_AUTOMATE |
| TC-PHONE-05 | Blocked user sends innocent "hello" → 403 immediately (block is on account, not content)                                | P0       | CAN_AUTOMATE |
| TC-PHONE-06 | WarningBadge in thread header shows 1/3 after first offense, 2/3 after second                                           | P1       | CAN_AUTOMATE |
| TC-PHONE-07 | Send "98765" (message 1), "43210" (message 2) → server window check detects combined number → offense                   | P1       | CAN_AUTOMATE |
| TC-PHONE-08 | Offense in Thread A + offense in Thread B = 2/3 globally (counter is per-user, not per-thread)                          | P1       | CAN_AUTOMATE |
| TC-PHONE-09 | Get 2 offenses → refresh browser (clears client state) → send phone number → server correctly fires offense 3 → blocked | P1       | CAN_AUTOMATE |
| TC-PHONE-10 | "+91 98765 43210" (country code + spaces) → blocked                                                                     | P1       | CAN_AUTOMATE |
| TC-PHONE-11 | "nau aat saat chhe paanch char teen do ek shoonya" (Hindi word-digits) → blocked                                        | P1       | CAN_AUTOMATE |
| TC-PHONE-12 | Devanagari Unicode digits "९८७६५४३२१०" → blocked                                                                        | P1       | CAN_AUTOMATE |
| TC-PHONE-13 | "9876S43210" (S=5 leet in digit-heavy token) → blocked                                                                  | P1       | CAN_AUTOMATE |
| TC-PHONE-14 | BUG — "9⭐8⭐7⭐6⭐5⭐4⭐3⭐2⭐1⭐0" (emoji padding) → currently NOT blocked (filter gap, fix needed)                   | P2       | CAN_AUTOMATE |
| TC-PHONE-15 | BUG — "9876+543210" (plus separator) → currently NOT blocked (fix needed)                                               | P2       | CAN_AUTOMATE |
| TC-PHONE-16 | "₹9876543210" (price context) → NOT blocked (price guard works correctly)                                               | P2       | CAN_AUTOMATE |
| TC-PHONE-17 | "0123456789" (reversed number) → blocked (reverse check catches it)                                                     | P1       | CAN_AUTOMATE |
| TC-PHONE-18 | Admin → /admin/phone-violations → violations listed with sender name, offense count → mark reviewed                     | P1       | CAN_AUTOMATE |

### Buyer Requests / My Requests Page

| TC       | Description                                                                         | Priority | Automation   |
| -------- | ----------------------------------------------------------------------------------- | -------- | ------------ |
| TC-REQ01 | /requests loads with all buyer's requests listed                                    | P1       | CAN_AUTOMATE |
| TC-REQ02 | Status tabs filter correctly (All / Awaiting / Pay to unlock / Unlocked / Declined) | P1       | CAN_AUTOMATE |
| TC-REQ03 | Pending request card shows SLA countdown ("Seller has Xh left to respond")          | P1       | CAN_AUTOMATE |
| TC-REQ04 | Accepted-unpaid card shows "Pay ₹49" CTA → links to /listing/[id]#unlock            | P1       | CAN_AUTOMATE |
| TC-REQ05 | Unlocked contact card shows WhatsApp button with correct +91 format                 | P1       | CAN_AUTOMATE |
| TC-REQ06 | Unlocked contact card shows Call button with correct tel: format                    | P1       | CAN_AUTOMATE |
| TC-REQ07 | Withdraw pending request → confirm dialog → request removed from list               | P1       | CAN_AUTOMATE |
| TC-REQ08 | Cancel withdraw dialog → request stays, no change                                   | P1       | CAN_AUTOMATE |
| TC-REQ09 | Empty state → CTA to browse marketplace                                             | P1       | CAN_AUTOMATE |
| TC-REQ10 | After payment on listing detail page → /requests card updates to "Unlocked" state   | P0       | CAN_AUTOMATE |

### Account Lifecycle

| TC       | Description                                                                               | Priority | Automation   |
| -------- | ----------------------------------------------------------------------------------------- | -------- | ------------ |
| TC-ACC01 | Export data → JSON file download with correct Content-Disposition header                  | P1       | CAN_AUTOMATE |
| TC-ACC02 | Export data → razorpay_order_id fields are "[redacted]" in JSON                           | P1       | CAN_AUTOMATE |
| TC-ACC03 | Export data unauthed → 401                                                                | P1       | CAN_AUTOMATE |
| TC-ACC04 | Delete account with wrong confirm string ("delete" not "DELETE MY ACCOUNT") → 400         | P1       | CAN_AUTOMATE |
| TC-ACC05 | Delete account with correct "DELETE MY ACCOUNT" → session invalidated, redirect to /login | P0       | CAN_AUTOMATE |
| TC-ACC06 | Post-deletion → /dashboard → /login (session gone), listings anonymized                   | P0       | CAN_AUTOMATE |
| TC-ACC07 | Block user → POST /api/users/[id]/block → 201                                             | P1       | AUTOMATED    |
| TC-ACC08 | Block yourself → 422 with error                                                           | P1       | CAN_AUTOMATE |
| TC-ACC09 | Unblock user → DELETE /api/users/[id]/block → 204 (idempotent)                            | P2       | AUTOMATED    |
| TC-ACC10 | Report listing (buyer) → POST /api/reports → 201, record in reports table                 | P2       | AUTOMATED    |

### Admin Workflows

| TC       | Description                                                                                             | Priority | Automation   |
| -------- | ------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| TC-ADM01 | Admin login with valid credentials → admin session established                                          | P1       | CAN_AUTOMATE |
| TC-ADM02 | Admin login with invalid credentials → 401                                                              | P1       | CAN_AUTOMATE |
| TC-ADM03 | Admin logout → session cleared → admin routes inaccessible                                              | P1       | CAN_AUTOMATE |
| TC-ADM04 | Admin dashboard stat cards show counts (listings, users, payments, reports)                             | P1       | CAN_AUTOMATE |
| TC-ADM05 | Admin listings list — all listings with status filters                                                  | P1       | CAN_AUTOMATE |
| TC-ADM06 | Admin approve listing → listing status becomes ACTIVE on /properties                                    | P1       | CAN_AUTOMATE |
| TC-ADM07 | Admin reject listing with reason → status REJECTED, seller notified                                     | P1       | CAN_AUTOMATE |
| TC-ADM08 | Admin add note to listing → note stored and visible on admin listing detail                             | P1       | CAN_AUTOMATE |
| TC-ADM09 | Admin delete listing → removed from admin list and from /properties                                     | P1       | AUTOMATED    |
| TC-ADM10 | Admin users list — all users with status                                                                | P1       | CAN_AUTOMATE |
| TC-ADM11 | Admin suspend user → user cannot access authenticated routes (hits /login)                              | P1       | CAN_AUTOMATE |
| TC-ADM12 | Admin activate user → access restored                                                                   | P1       | CAN_AUTOMATE |
| TC-ADM13 | Admin reports queue — open reports listed, sorted by date                                               | P1       | AUTOMATED    |
| TC-ADM14 | Admin mark report resolved → moves out of unreviewed queue                                              | P1       | AUTOMATED    |
| TC-ADM15 | Admin payments list — filter by SUCCESS/PENDING/FAILED                                                  | P1       | CAN_AUTOMATE |
| TC-ADM16 | Admin phone-violations — unreviewed violations listed with sender name, offense number, content preview | P1       | CAN_AUTOMATE |
| TC-ADM17 | Admin mark violation reviewed → moves out of unreviewed tab                                             | P1       | CAN_AUTOMATE |
| TC-ADM18 | Admin audit log — paginated list of admin actions with timestamps                                       | P2       | AUTOMATED    |
| TC-ADM19 | BUG — No endpoint to deactivate phone_block_flags → phone-blocked users permanently stuck               | P2       | CAN_AUTOMATE |
| TC-ADM20 | Non-admin authenticated user hits /admin/\* routes → 401 or 403                                         | P1       | AUTOMATED    |

### Security & Negative Tests

| TC       | Description                                                                    | Priority | Automation   |
| -------- | ------------------------------------------------------------------------------ | -------- | ------------ |
| TC-SEC01 | IDOR — GET another user's listing edit page → 403                              | P0       | CAN_AUTOMATE |
| TC-SEC02 | IDOR — DELETE another user's listing via API → 403                             | P0       | CAN_AUTOMATE |
| TC-SEC03 | Unauthenticated POST /api/listings/create → 401                                | P0       | CAN_AUTOMATE |
| TC-SEC04 | Unauthenticated POST /api/phone/firebase-verify → 401                          | P0       | CAN_AUTOMATE |
| TC-SEC05 | Forged Firebase idToken to /api/phone/firebase-verify → 401                    | P0       | CAN_AUTOMATE |
| TC-SEC06 | POST /api/payments/verify missing razorpaySignature → 400                      | P1       | CAN_AUTOMATE |
| TC-SEC07 | Listing title with <script>alert('XSS')</script> → escaped, no alert fires     | P0       | CAN_AUTOMATE |
| TC-SEC08 | SQL injection in /properties?q=' OR '1'='1 → no DB error exposed               | P0       | CAN_AUTOMATE |
| TC-SEC09 | /admin/dashboard with no x-admin-key header → 401                              | P0       | CAN_AUTOMATE |
| TC-SEC10 | /admin/dashboard with wrong x-admin-key → 401                                  | P0       | CAN_AUTOMATE |
| TC-NEG01 | POST /api/listings/create missing title/price/location → 422 with field errors | P0       | CAN_AUTOMATE |
| TC-NEG02 | Pincode field — letters not accepted (numeric only enforced)                   | P0       | CAN_AUTOMATE |
| TC-NEG03 | Price field < ₹1,00,000 → "Price must be at least ₹1,00,000"                   | P0       | CAN_AUTOMATE |
| TC-NEG04 | Photo upload with .pdf file → rejected, not stored                             | P0       | CAN_AUTOMATE |
| TC-NEG05 | Listing title 500 characters → truncated or rejected cleanly, no layout break  | P2       | CAN_AUTOMATE |
| TC-NEG06 | OTP field — 7th digit not accepted (maxLength=6 enforced)                      | P0       | CAN_AUTOMATE |
| TC-NEG07 | Express interest twice on same listing → 409, no duplicate in DB               | P0       | CAN_AUTOMATE |

### Cross-Device, UX & Accessibility

| TC      | Description                                                                                      | Priority | Automation   |
| ------- | ------------------------------------------------------------------------------------------------ | -------- | ------------ |
| TC-UX01 | BUG — Notifications tab is ABSENT from mobile bottom nav (cannot reach /notifications on mobile) | P1       | CAN_AUTOMATE |
| TC-UX02 | BUG — Buyer Requests accessible on desktop sidebar but NOT in mobile bottom nav                  | P1       | CAN_AUTOMATE |
| TC-UX03 | Mobile chat — virtual keyboard does not obscure the message input bar                            | P1       | MANUAL_ONLY  |
| TC-UX04 | Mobile chat send button — tap target is ≥ 40×40px                                                | P1       | CAN_AUTOMATE |
| TC-UX05 | /about page loads without JS errors                                                              | P1       | CAN_AUTOMATE |
| TC-UX06 | /terms page loads, accessible from footer link                                                   | P1       | CAN_AUTOMATE |
| TC-UX07 | /privacy page loads, accessible from footer link                                                 | P1       | CAN_AUTOMATE |
| TC-UX08 | /refund-policy page loads, accessible from footer link                                           | P1       | CAN_AUTOMATE |
| TC-UX09 | All footer links on homepage — no 404 responses                                                  | P1       | CAN_AUTOMATE |
| TC-UX10 | OTP input — screen reader announces "6-digit code, masked" via aria-label                        | P1       | CAN_AUTOMATE |
| TC-UX11 | Phone/OTP error messages use role="alert" so screen readers announce them                        | P1       | CAN_AUTOMATE |
| TC-UX12 | Amber/warning UI (OTP banner, phone verify card) — contrast ratio ≥ 4.5:1 (WCAG AA)              | P2       | MANUAL_ONLY  |
| TC-UX13 | Keyboard-only navigation through all 6 sell form steps (no mouse)                                | P2       | CAN_AUTOMATE |
| TC-UX14 | /listing/[id] at 375px — no horizontal scroll, all info visible                                  | P2       | CAN_AUTOMATE |
| TC-UX15 | /properties at 375px — listing cards stack correctly, filter panel accessible                    | P2       | CAN_AUTOMATE |

---

## 7. User Journeys

### Journey 1: New Seller — Sign Up to Publish

1. Open chapternew.com/login (unauthenticated)
2. Click "Continue with Google" → complete OAuth **once** (regression: single attempt)
3. Land on /dashboard — empty state with "Post Your First Listing" CTA
4. Click CTA → /sell
5. Step 1: Select APARTMENT
6. Step 2: City = Mumbai, Locality = Bandra, Pincode = 400050
7. Step 3: BHK = 2, Area = 850 sqft, Furnishing = Semi-furnished
8. Step 4: Upload 2 photos
9. Step 5: Price = ₹85,00,000, Title = "Spacious 2BHK in Bandra"
10. Step 6: Phone verification widget appears → enter mobile number → receive OTP → enter OTP → verified
11. Publish button activates → click → listing created
12. /dashboard shows new listing as ACTIVE with correct details

✅ Pass: listing visible on /properties, seller phone marked verified in Supabase user_metadata

---

### Journey 2: Returning Buyer — Search to Contact Reveal

1. Login as a different Google account (buyer)
2. Homepage → type "Bandra" in search → /properties?q=Bandra
3. Apply filter: Property Type = APARTMENT, Price max = ₹1,00,00,000
4. Click listing card → /listing/[id]
5. Click "Express Interest" → interest created (status: PENDING), seller notified
6. (Switch to seller account) /dashboard → Buyer Requests → click Accept on buyer's request
7. (Switch to buyer) Notification arrives: "Your interest has been accepted"
8. Navigate to /listing/[id] → "Unlock Contact — ₹49" button appears
9. Click → Razorpay modal opens with ₹49 → enter test card 4111 1111 1111 1111 exp 12/26 CVV 123
10. Payment confirmed → seller's phone and email revealed on page
11. Navigate to /requests → card shows "Unlocked" with WhatsApp and Call buttons

✅ Pass: seller phone in +91XXXXXXXXXX format, both parties received notifications

---

### Journey 3: Unverified User Publish Block

1. Login (no phone verified on this account)
2. Complete sell form steps 1–5 with valid data
3. Arrive at step 6 → InlinePhoneVerification widget shown, Publish button disabled
4. Attempt to click Publish → blocked, no API call made
5. Enter valid 10-digit phone in the inline widget → click Send OTP
6. Enter correct OTP → verified
7. Publish button activates → click → listing published successfully

✅ Pass: listing created ONLY after phone verified, no bypass possible

---

### Journey 4: Mobile Sell Flow (375px viewport)

1. Open app on iPhone (or 375px Chrome DevTools)
2. Login via Google → session persists (check: only one login attempt)
3. Bottom nav: tap "Post" → /sell
4. Complete all 6 steps using mobile keyboard (numeric pad for prices/pincode)
5. Upload photo from device camera roll
6. Step 6 phone verify: OTP field shows numeric keyboard, digits masked (dots)
7. Publish → success
8. Check /dashboard via bottom nav → listing appears

✅ Pass: no layout overflow, virtual keyboard doesn't cover submit button, all steps reachable via touch

---

### Journey 5: Double-Login Regression Check

1. Clear ALL browser cookies and storage
2. Navigate directly to /sell (unauthenticated)
3. Redirected to /login?next=%2Fsell
4. Click "Continue with Google" — complete OAuth flow ONCE
5. Immediately land on /sell (not bounced back to /login)
6. Hard refresh the page → still on /sell, still authenticated
7. Navigate to /dashboard → authenticated, no redirect

✅ Pass: OAuth triggered once, user goes directly to /sell, refresh doesn't log out

---

### Journey 6: Phone Sharing — 3 Strikes to Auto-Block

1. Login as Buyer B. Express interest on a listing. Seller accepts.
2. Open /messages/[interestId] — thread active
3. Type "Call me on 9876543210" in input → client detects, clears input → soft warning shown (no DB write, violation count still 0)
4. Type and SEND "reach me at 98765 43210" → server detects
   → 422 PHONE_NUMBER_BLOCKED, warning: "1 of 3 violations"
   → Entire thread history wiped
   → Both buyer and seller receive notification
   → Seller sees WarningBadge: 1/3 in thread header
5. Send "+91-98765-43210" (with country code and dashes) → server detects
   → 422, warning: "2 of 3 violations"
   → Thread wiped again
   → Seller sees WarningBadge: 2/3
6. Send "nine eight seven six five four three two one zero" (word-digits) → server detects
   → 403 PHONE_SEND_BLOCKED — permanent block
   → phone_block_flags row inserted in DB
   → Input bar hidden/disabled in UI
7. Buyer sends innocent "Can we meet?" → still 403 (block is on account, not content)
8. Buyer refreshes page → input bar still hidden
9. (Admin) /admin/phone-violations → 3 violations visible for Buyer B with content previews

✅ Pass: account blocked on 3rd violation, admin sees all violations, client and server agree

---

### Journey 7: Full Account Lifecycle

1. Login as User X, complete Journey 1 (listing published)
2. As buyer, complete Journey 2 against User X's listing (payment made)
3. Navigate to /profile → Export Data → download JSON file
4. Open JSON → verify: listings array present, payments present with razorpay_order_id = "[redacted]"
5. Navigate to /profile → Delete Account section
6. Type "delete my account" (wrong case) → 400 error
7. Type "DELETE MY ACCOUNT" (exact) → confirm → session invalidated
8. Redirect to /login
9. Navigate to /dashboard → redirected to /login (no active session)
10. Navigate to /properties → User X's listing shows as removed or hidden

✅ Pass: all user data removed or anonymized, session immediately invalidated, no orphaned records

---

### Journey 8: Report → Admin Review → Listing Rejected

1. Login as buyer → navigate to a suspicious listing → click "Report Listing" → select "Misleading Info" → submit
2. Login as admin → /admin/reports → new report visible with listing ID and reporter details
3. Admin clicks through to /admin/listings → finds the reported listing
4. Admin clicks "Reject" → enters reason "Misleading description verified"
5. Listing status changes to REJECTED
6. Navigate to /properties → listing no longer appears in search results
7. (Switch to seller) /dashboard → listing shows status badge "Rejected" with admin's reason
8. /admin/audit-log → rejection action logged with timestamp and admin user

✅ Pass: full audit trail, listing removed from public, seller informed

---

## 8. Critical Bugs Requiring Fixes Before Launch

| #   | Bug                                                                                       | Severity | User Impact                                              |
| --- | ----------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------- |
| B1  | Block Buyer button → /api/chat/threads/[threadId]/status endpoint missing → silent fail   | HIGH     | Sellers cannot block abusive buyers                      |
| B2  | Report Buyer button → /api/chat/threads/[threadId]/report endpoint missing → always error | HIGH     | Sellers cannot report abuse through chat UI              |
| B3  | Notifications absent from mobile bottom nav                                               | HIGH     | Mobile users (majority) cannot see notifications         |
| B4  | No admin endpoint to deactivate phone_block_flags                                         | HIGH     | Falsely blocked users permanently stuck, no admin remedy |
| B5  | Emoji padding not caught "9⭐8⭐7..."                                                     | MEDIUM   | Phone sharing evasion method works                       |
| B6  | Plus sign not in separator set "9876+543210"                                              | MEDIUM   | Phone sharing evasion method works                       |
| B7  | 200-message thread cap with no pagination                                                 | MEDIUM   | Long conversations lose history silently                 |
| B8  | In-memory rate limit resets on cold start                                                 | MEDIUM   | Burst attack possible after server restart               |
| B9  | Entire thread wiped on violation (not just offending message)                             | MEDIUM   | All legitimate prior messages deleted on any violation   |

---

## 9. Automation Suite (Playwright)

### Recommended Structure

```
e2e/
  auth/           login.spec.ts              # TC-A01–A14
  sell/           sell-flow.spec.ts          # TC-S01–S15
  phone/          verification.spec.ts       # TC-P01–P14
  browse/         browse.spec.ts             # TC-B01–B15
  payments/       payments.spec.ts           # TC-PAY01–PAY12
  chat/           messaging.spec.ts          # TC-MSG01–MSG16
                  phone-filter.spec.ts       # TC-PHONE-01–PHONE-18
  security/       idor.spec.ts               # TC-SEC01–SEC05
                  xss.spec.ts                # TC-SEC07–SEC08
  fixtures/       auth.setup.ts             # storageState per account
playwright.config.ts
```

### P0 Automation Priorities (implement in this order)

1. **TC-A07** — Double-login regression (most critical recent fix, highest ROI)
2. **TC-S09 + TC-S10** — Phone gate on publish (catches sell flow regressions)
3. **TC-PHONE-02 + TC-PHONE-04** — Violation counting + auto-block
4. **TC-PAY07 + TC-PAY08** — Payment replay + signature tamper
5. **TC-SEC01 + TC-SEC02** — IDOR on listings

### Sample Playwright Spec — Authentication (TC-A07, TC-A04)

```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication — regression', () => {
  test('TC-A07: single Google login, no second login required', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/sell')
    // Middleware should redirect to login with ?next=/sell
    await expect(page).toHaveURL(/\/login\?next=%2Fsell/)
    // Click Google login (use test OAuth mock or real test account)
    await page.getByRole('button', { name: /continue with google/i }).click()
    // Must land on /sell after ONE OAuth attempt
    await expect(page).toHaveURL('/sell', { timeout: 15000 })
    // Must NOT be on login page
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('TC-A04: session persists after hard refresh', async ({ page }) => {
    // Assumes prior login in storageState fixture
    await page.goto('/dashboard')
    await expect(page).not.toHaveURL(/\/login/)
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page).toHaveURL('/dashboard')
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('TC-A11: open redirect blocked', async ({ page }) => {
    await page.goto('/login?next=https://evil.com')
    await page.getByRole('button', { name: /continue with google/i }).click()
    // After OAuth, must NOT land on evil.com
    await expect(page).not.toHaveURL(/evil\.com/)
    // Must land on a safe internal path
    await expect(page.url()).toMatch(/^https:\/\/chapternew\.com\//)
  })
})
```

---

## 10. Regression Watchlist

### Recent Bug Fixes (verify these hold after every deploy)

| Fix                | What Was Wrong                                                                 | What Changed                                    | Test ID |
| ------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------- | ------- |
| Double-login       | auth/callback returned new NextResponse.redirect() dropping Set-Cookie headers | Cookies written directly onto redirect response | TC-A07  |
| WhatsApp copy      | Profile page label said "WhatsApp number"                                      | Changed to "Phone number"                       | TC-P11  |
| OTP masking        | OTP input was type="text" — digits visible                                     | Changed to type="password"                      | TC-P10  |
| Secure cookie HTTP | @supabase/ssr set Secure=true, HTTP drops Secure cookies                       | secure: false in NODE_ENV=development           | TC-A14  |
| OTP validity hint  | Said "10 minutes" (incorrect)                                                  | Changed to "5 minutes"                          | TC-P12  |

### New Bugs Found in This Audit

| Bug                                    | Test ID     | Status                                |
| -------------------------------------- | ----------- | ------------------------------------- |
| Block Buyer endpoint missing           | TC-MSG17    | Open — needs endpoint created         |
| Report Buyer endpoint missing          | TC-MSG18    | Open — needs endpoint created         |
| Mobile Notifications nav missing       | TC-UX01     | Open — needs MOBILE_ITEMS update      |
| Admin cannot unblock phone_block_flags | TC-ADM19    | Open — needs PATCH endpoint           |
| Emoji padding bypasses phone filter    | TC-PHONE-14 | Open — needs separator set update     |
| Plus sign bypasses phone filter        | TC-PHONE-15 | Open — needs + added to separator set |

---

## 11. Test Accounts Needed

| Account               | Purpose                                                    | Phone Verified  |
| --------------------- | ---------------------------------------------------------- | --------------- |
| Primary Seller        | Main sell flow, publish, receive interests                 | Yes             |
| Primary Buyer         | Express interest, payment, chat                            | No              |
| Unverified Seller     | Publish gate testing (TC-S09)                              | No              |
| IDOR Target           | Victim for SEC tests (owns a listing)                      | No              |
| Admin                 | All /admin/\* workflows                                    | N/A (key-based) |
| Abusive Buyer         | Phone anti-sharing 3-strike journey                        | No              |
| Deleted Account       | Archive after TC-ACC05 (post-deletion tests)               | N/A             |
| Firebase Test Number  | +91 99999 00001, OTP: 000000 (emulator, rate-limit exempt) | N/A             |
| Razorpay Test Card    | 4111 1111 1111 1111, exp 12/26, CVV 123                    | N/A             |
| Razorpay Decline Card | 4000 0000 0000 0002                                        | N/A             |

---

_ChapterNew QA Test Plan v2 — 194 test cases — Generated: 2026-07_
