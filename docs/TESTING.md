# SwiftDrive Rentals — Test plan

Fill in **Actual result**, **Pass/Fail** and **Evidence** only after running each test yourself. Nothing below has been pre-filled.

Automated unit tests: `bunx vitest run` (booking date, pricing, transition and balance rules in `src/lib/booking.test.ts`).

## Demo setup
1. The **first account registered** becomes administrator (and staff). Register it first.
2. Register a second account as a customer.
3. As admin, open Admin → Staff and grant "Staff" to a third account if you want to test staff separately.

| ID | Objective | Preconditions | Steps | Expected result | Actual | Pass/Fail | Evidence |
|---|---|---|---|---|---|---|---|
| T01 | Home renders on mobile/tablet/desktop | — | Open `/` at 375, 768, 1280 px | No horizontal scroll, menu button works on mobile | | | |
| T02 | Registration validation | — | Submit signup with empty fields / short password | Inline errors shown, nothing created | | | |
| T03 | Duplicate email | Account exists | Sign up with same email | "An account with this email already exists" | | | |
| T04 | Wrong password | Account exists | Sign in with wrong password | "Incorrect email or password." | | | |
| T05 | Password reset | Account exists | Forgot password → open email link → set new password | Can sign in with new password | | | |
| T06 | Catalogue filters | — | Filter by SUV, Automatic, 7+ seats | Only matching vehicles; reset clears all | | | |
| T07 | Date availability filter | Booking exists for vehicle X on dates D | Search catalogue for overlapping dates | Vehicle X not listed | | | |
| T08 | Invalid dates | — | On vehicle page set return before pickup | Error shown, button disabled | | | |
| T09 | Backend rejects invalid dates | Signed in | Call `create_booking` with return ≤ pickup (browser console) | Error INVALID_DATES | | | |
| T10 | Price calculated server-side | — | Book 9 days on a car with weekly rate | Total = weekly + 2 × daily | | | |
| T11 | Overlap prevented | Pending booking exists | Second customer books overlapping dates | "already reserved" message | | | |
| T12 | Concurrent booking | Two signed-in sessions | Submit same dates at the same time | Exactly one succeeds | | | |
| T13 | Status transitions | Staff signed in, pending booking | Confirm → try Reject on confirmed booking | Reject not offered; DB rejects INVALID_TRANSITION | | | |
| T14 | Customer cancellation | Pending booking | Cancel from My account | Status becomes cancelled | | | |
| T15 | Late cancellation request | Confirmed booking < 48h away | Cancel | Flagged as cancellation request for staff | | | |
| T16 | Pickup handover | Confirmed booking | Staff records pickup | Status active, condition report saved, audit logged | | | |
| T17 | Return handover + overdue | Active booking past return date | Filter "Overdue", record return | Shown as overdue; then completed, mileage updated | | | |
| T18 | Payments | Confirmed booking | Staff records deposit | Customer sees paid amount and outstanding balance | | | |
| T19 | Customer data isolation | Two customers | Customer B queries bookings via console | Only own rows returned | | | |
| T20 | Role protection | Customer signed in | Open `/admin`, call `admin_set_role` | Access restricted / FORBIDDEN | | | |
| T21 | Admin vehicle CRUD + photo | Admin | Add vehicle, upload photo, archive it | Appears in catalogue, then hidden | | | |
| T22 | Inquiry + duplicate | — | Submit inquiry twice with same text | Second shows "already received" | | | |
| T23 | Staff reply visible | Signed-in customer inquiry | Staff replies | Reply visible in customer's Inquiries tab | | | |
| T24 | Network failure | — | Go offline, submit inquiry | Friendly error; typed data kept | | | |
| T25 | Reviews | Completed booking | Leave review | Appears on home page | | | |

## Assessment notes
- Competitor comparison, wireframes, UAT feedback and screenshots must be collected by the student — none are included or invented here.
- Payment: no online gateway is configured. Staff record payments actually received. An online sandbox gateway can be added later.
