<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# SwiftDrive Rentals — agent rules

- Booking prices, deposits, statuses, handovers, payments and role changes are written only through security-definer SQL functions (create_booking, set_booking_status, record_handover, record_payment, admin_set_role); tables have no direct insert/update grants for these. Why: the browser must never be trusted with money or status.
- Overlapping live bookings are blocked by the `no_overlap` exclusion constraint on bookings. Why: race-safe availability.
- Pricing rule lives in `calc_rental` (SQL) and is mirrored for instant UI feedback in `src/lib/booking.ts` with tests; change both together.
- Data access is client-side via the browser client with RLS; dashboards live under `src/routes/_authenticated/` and `RoleGate` only hides UI. Why: RLS is the security boundary.
- Backend error codes are raised as `P0001` exceptions with UPPER_SNAKE messages and mapped to friendly text in `src/lib/format.ts#friendlyError`.
- Vehicle photos upload to the private `vehicle-images` bucket and are stored as long-lived signed URLs (workspace blocks public buckets).
- The first registered user is bootstrapped as admin+staff by `handle_new_user`.
