# SwiftDrive Rentals — Architecture & Business Rules

- **Database-Level Integrity**: Booking prices, deposits, statuses, handovers, payments, and role changes are executed only through security-definer SQL functions (`create_booking`, `set_booking_status`, `record_handover`, `record_payment`, `admin_set_role`). Direct table mutations are restricted to enforce transaction safety on the server.
- **Concurrency & Overlap Prevention**: Overlapping live bookings are blocked at the database level by a `no_overlap` PostgreSQL exclusion constraint on bookings.
- **Rental Pricing Logic**: The canonical pricing rule resides in `calc_rental` (SQL) and is mirrored for instant UI feedback in `src/lib/booking.ts` with comprehensive unit tests.
- **Row Level Security (RLS)**: Data access is authenticated via Supabase client protected by PostgreSQL Row Level Security (RLS). Dashboards are mounted under `src/routes/_authenticated/` with client-side role guards.
- **Error Handling**: Database error codes are raised as `P0001` exceptions with standard codes and mapped into clean user-facing notifications in `src/lib/format.ts#friendlyError`.
- **Media Storage**: Vehicle fleet photos are stored in the private `vehicle-images` Supabase storage bucket and retrieved via signed URLs.
- **Initial Admin Bootstrapping**: The first registered system user is bootstrapped with admin and staff privileges via the `handle_new_user` database trigger.
