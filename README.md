# SwiftDrive Rentals — Negombo Car Rental Platform

SwiftDrive Rentals is a modern full-stack car rental platform built with TanStack Start, React 19, Tailwind CSS, and Supabase.

---

## 🔐 Test Profile Login Details

All test accounts come pre-seeded and verified in the database with the default password: **`Password123!`**

| Role | Email | Password | Name | Access & Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@swiftdrive.lk` | `Password123!` | Admin Manager | Full administrative access, fleet CRUD, role assignments, audit logs |
| **Staff** | `staff@swiftdrive.lk` | `Password123!` | Kasun Perera | Staff dashboard, booking approvals, pickup/return inspections, payments |
| **Customer** | `customer@swiftdrive.lk` | `Password123!` | Saman Kumara | Customer portal, vehicle reservations, personal bookings, reviews |
| **Tourist Customer** | `david.miller@gmail.com` | `Password123!` | David Miller | International customer with active airport rental reservation |

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js** (v20+) or **Bun** (v1.2+)
- **npm** or **bun**

### 2. Setup Environment Variables
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://ylyvzfkvmkkoemtyvnpa.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 3. Install Dependencies
```sh
npm install
# or
bun install
```

### 4. Run Development Server
```sh
npm run dev -- --port 5174
# or
bun dev -- --port 5174
```
Access the application at [http://localhost:5174](http://localhost:5174).

---

## 🗄️ Database Setup & Seeding

The database uses Supabase PostgreSQL with Row Level Security (RLS) and security-definer functions.

1. **Schema & Policies**: Run [drizzle/migrations/0000_migration.sql](drizzle/migrations/0000_migration.sql) in the [Supabase SQL Editor](https://supabase.com/dashboard).
2. **Seed Data**: Run [supabase/seed.sql](supabase/seed.sql) to populate:
   - The test accounts above (`admin`, `staff`, `customer`).
   - 18 realistic vehicles across Economy, SUV, Van, and Luxury categories.
   - Sample bookings across all states (`completed`, `active`, `confirmed`, `pending`).
   - Vehicle condition inspection reports (mileage, fuel, damage notes).
   - Deposit and rental payment records.
   - Customer reviews and rental inquiries.

---

## 🛠️ Built With
- **Frontend / SSR**: [TanStack Start](https://tanstack.com/start) & [TanStack Router](https://tanstack.com/router)
- **UI & Components**: [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev)
- **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL, Row Level Security, Auth)
- **Validation & State**: [Zod](https://zod.dev), [React Hook Form](https://react-hook-form.com), [TanStack Query](https://tanstack.com/query)
