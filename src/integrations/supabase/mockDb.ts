/**
 * @file mockDb.ts
 * @description In-memory and localStorage-backed mock database engine for SwiftDrive Rentals.
 *
 * Provides a local mock layer implementing Supabase REST, RPC, and Auth APIs
 * when the remote Supabase project is unreachable or configured with demo credentials.
 * Pre-seeded with all fleet vehicles, categories, test profiles, reviews, and bookings from seed.sql.
 */

export interface MockCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
}

export interface MockImage {
  id: string;
  vehicle_id: string;
  url: string;
  alt: string;
  sort_order: number;
  storage_path?: string | null;
}

export interface MockVehicle {
  id: string;
  category_id: string;
  make: string;
  model: string;
  year: number;
  transmission: string;
  fuel_type: string;
  seats: number;
  luggage: number;
  daily_rate_lkr: number;
  weekly_rate_lkr: number | null;
  deposit_lkr: number | null;
  location: string;
  registration_no: string;
  mileage_km: number;
  description: string;
  features: string[];
  is_demo: boolean;
  is_active: boolean;
  created_at: string;
}

export interface MockUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  nic_or_passport?: string;
  address?: string;
  roles: string[];
  created_at: string;
}

export interface MockBooking {
  id: string;
  reference: string;
  customer_id: string;
  vehicle_id: string;
  pickup_date: string;
  return_date: string;
  pickup_location: string;
  return_location: string;
  rental_days: number;
  rental_amount_lkr: number;
  deposit_lkr: number;
  status: "pending" | "confirmed" | "active" | "completed" | "cancelled" | "rejected";
  customer_notes?: string;
  staff_notes?: string;
  cancellation_requested?: boolean;
  picked_up_at?: string;
  returned_at?: string;
  created_at: string;
}

export interface MockPayment {
  id: string;
  booking_id: string;
  amount_lkr: number;
  currency: string;
  kind: string;
  method: string;
  status: string;
  provider_reference?: string;
  recorded_by?: string;
  created_at: string;
}

export interface MockReview {
  id: string;
  booking_id: string;
  customer_id: string;
  rating: number;
  comment: string;
  display_name: string;
  is_published: boolean;
  created_at: string;
}

export interface MockInquiry {
  id: string;
  user_id?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  category: string;
  message: string;
  status: string;
  staff_response?: string | null;
  staff_reply?: string | null;
  created_at: string;
  responded_at?: string | null;
  replied_at?: string | null;
  replied_by?: string | null;
}

export interface MockConditionReport {
  id: string;
  booking_id: string;
  kind: "pickup" | "return";
  mileage_km: number;
  fuel_level: string;
  condition: string;
  damage_notes?: string | null;
  recorded_by?: string;
  created_at: string;
}

export interface MockAuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Initial Seed Data
// -----------------------------------------------------------------------------

const DEFAULT_CAT_ID = "10000000-0000-0000-0000-000000000001";
const ADMIN_ID = "a1111111-1111-1111-1111-111111111111";
const STAFF_ID = "b2222222-2222-2222-2222-222222222222";
const CUST1_ID = "c3333333-3333-3333-3333-333333333333";
const CUST2_ID = "d4444444-4444-4444-4444-444444444444";

const WAGON_R_ID = "20000000-0000-0000-0000-000000000001";
const AQUA_ID = "20000000-0000-0000-0000-000000000002";
const PRADO_ID = "20000000-0000-0000-0000-000000000006";
const HIACE_ID = "20000000-0000-0000-0000-00000000000c";

const BOOKING_COMPLETED_ID = "e5555555-5555-5555-5555-555555555551";

const CATEGORIES: MockCategory[] = [
  { id: "10000000-0000-0000-0000-000000000001", slug: "economy", name: "Economy", description: "Compact, fuel-efficient cars for city driving and short trips.", sort_order: 1 },
  { id: "10000000-0000-0000-0000-000000000002", slug: "suv", name: "SUV", description: "Spacious and comfortable for hill country and family travel.", sort_order: 2 },
  { id: "10000000-0000-0000-0000-000000000003", slug: "van", name: "Van", description: "Seating for groups, airport transfers and tours.", sort_order: 3 },
  { id: "10000000-0000-0000-0000-000000000004", slug: "luxury", name: "Luxury", description: "Premium comfort for business and special occasions.", sort_order: 4 },
];

const catMap = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.id]));

const RAW_VEHICLES: Array<{
  cat: string;
  make: string;
  model: string;
  year: number;
  tr: string;
  fuel: string;
  seats: number;
  lug: number;
  daily: number;
  weekly: number;
  dep: number;
  loc: string;
  reg: string;
  km: number;
  descr: string;
  feat: string[];
}> = [
  { cat: "economy", make: "Suzuki", model: "Wagon R", year: 2021, tr: "automatic", fuel: "petrol", seats: 4, lug: 2, daily: 8500, weekly: 52000, dep: 20000, loc: "Negombo", reg: "DEMO-CAB-1001", km: 42000, descr: "A practical city hatchback, easy to park and economical on fuel.", feat: ["Air conditioning", "Bluetooth", "Reverse camera"] },
  { cat: "economy", make: "Toyota", model: "Aqua", year: 2019, tr: "automatic", fuel: "hybrid", seats: 5, lug: 2, daily: 10500, weekly: 65000, dep: 25000, loc: "Negombo", reg: "DEMO-CAD-1002", km: 61000, descr: "Reliable hybrid with excellent fuel economy for long drives.", feat: ["Air conditioning", "Hybrid", "Keyless start"] },
  { cat: "economy", make: "Honda", model: "Fit", year: 2018, tr: "automatic", fuel: "petrol", seats: 5, lug: 3, daily: 9500, weekly: 59000, dep: 20000, loc: "Bandaranaike Airport", reg: "DEMO-CAF-1003", km: 70500, descr: "Versatile hatchback with flexible seating and boot space.", feat: ["Air conditioning", "USB charging"] },
  { cat: "economy", make: "Toyota", model: "Vitz", year: 2020, tr: "automatic", fuel: "petrol", seats: 5, lug: 2, daily: 9000, weekly: 55000, dep: 20000, loc: "Negombo", reg: "DEMO-CAD-1004", km: 48000, descr: "Popular Japanese hatchback, compact, smooth handling and low fuel consumption.", feat: ["Air conditioning", "Power steering", "Bluetooth", "Reverse camera"] },
  { cat: "economy", make: "Nissan", model: "Note e-Power", year: 2021, tr: "automatic", fuel: "hybrid", seats: 5, lug: 3, daily: 11000, weekly: 68000, dep: 25000, loc: "Bandaranaike Airport", reg: "DEMO-CAE-1005", km: 36000, descr: "Innovative hybrid drive delivering instant torque and whisper-quiet city motoring.", feat: ["Electric Drive", "e-Power Hybrid", "Lane Assist", "Reverse Camera"] },

  { cat: "suv", make: "Toyota", model: "Prado", year: 2020, tr: "automatic", fuel: "diesel", seats: 7, lug: 4, daily: 32000, weekly: 200000, dep: 75000, loc: "Negombo", reg: "DEMO-CBA-2001", km: 55000, descr: "Capable 4x4 for hill country roads and long family trips.", feat: ["4WD", "Climate control", "7 seats", "Cruise control"] },
  { cat: "suv", make: "Honda", model: "Vezel", year: 2021, tr: "automatic", fuel: "hybrid", seats: 5, lug: 3, daily: 16500, weekly: 105000, dep: 40000, loc: "Negombo", reg: "DEMO-CBB-2002", km: 38000, descr: "Comfortable compact SUV with hybrid efficiency.", feat: ["Hybrid", "Reverse camera", "Apple CarPlay"] },
  { cat: "suv", make: "Mitsubishi", model: "Outlander", year: 2019, tr: "automatic", fuel: "petrol", seats: 7, lug: 4, daily: 22000, weekly: 140000, dep: 50000, loc: "Bandaranaike Airport", reg: "DEMO-CBC-2003", km: 64000, descr: "Roomy seven-seater for groups who want SUV comfort.", feat: ["7 seats", "Climate control"] },
  { cat: "suv", make: "Toyota", model: "Land Cruiser V8", year: 2021, tr: "automatic", fuel: "diesel", seats: 7, lug: 5, daily: 48000, weekly: 310000, dep: 100000, loc: "Colombo", reg: "DEMO-CBE-2004", km: 41000, descr: "Flagship luxury SUV with legendary off-road reliability and grand road presence.", feat: ["V8 Turbo Diesel", "Sunroof", "Leather interior", "4WD", "Cooled seats"] },
  { cat: "suv", make: "Hyundai", model: "Tucson", year: 2022, tr: "automatic", fuel: "petrol", seats: 5, lug: 4, daily: 24000, weekly: 150000, dep: 50000, loc: "Negombo", reg: "DEMO-CBF-2005", km: 29000, descr: "Modern styling and cutting-edge safety features for island journeys.", feat: ["Panoramic Sunroof", "Apple CarPlay", "Blind Spot Monitor"] },
  { cat: "suv", make: "Kia", model: "Sportage", year: 2021, tr: "automatic", fuel: "petrol", seats: 5, lug: 3, daily: 21000, weekly: 132000, dep: 45000, loc: "Bandaranaike Airport", reg: "DEMO-CBG-2006", km: 34000, descr: "Sporty compact crossover ideal for airport pick-up and coastal touring.", feat: ["Cruise Control", "Rear AC Vents", "Bluetooth", "Touchscreen"] },

  { cat: "van", make: "Toyota", model: "KDH Hiace", year: 2018, tr: "manual", fuel: "diesel", seats: 14, lug: 8, daily: 21000, weekly: 135000, dep: 50000, loc: "Negombo", reg: "DEMO-PH-3001", km: 98000, descr: "High-roof van for tours, events and airport transfers.", feat: ["14 seats", "Rear AC", "Large luggage area"] },
  { cat: "van", make: "Nissan", model: "Caravan", year: 2019, tr: "automatic", fuel: "diesel", seats: 10, lug: 6, daily: 19000, weekly: 120000, dep: 45000, loc: "Bandaranaike Airport", reg: "DEMO-PH-3002", km: 87000, descr: "Comfortable van for families and small groups.", feat: ["10 seats", "Air conditioning"] },
  { cat: "van", make: "Toyota", model: "Hiace Super GL", year: 2020, tr: "automatic", fuel: "diesel", seats: 10, lug: 6, daily: 26000, weekly: 165000, dep: 60000, loc: "Negombo", reg: "DEMO-PH-3003", km: 62000, descr: "Plush velvet interior, individual reclining seats and dual AC for VIP transfers.", feat: ["10 Plush Seats", "Dual Zone AC", "Automatic Sliding Door", "Privacy Glass"] },

  { cat: "luxury", make: "Mercedes-Benz", model: "E-Class", year: 2020, tr: "automatic", fuel: "petrol", seats: 5, lug: 3, daily: 45000, weekly: 285000, dep: 150000, loc: "Negombo", reg: "DEMO-CBK-4001", km: 31000, descr: "Executive saloon for business travel and weddings.", feat: ["Leather seats", "Climate control", "Premium audio"] },
  { cat: "luxury", make: "BMW", model: "5 Series", year: 2019, tr: "automatic", fuel: "diesel", seats: 5, lug: 3, daily: 42000, weekly: 265000, dep: 150000, loc: "Colombo", reg: "DEMO-CBL-4002", km: 44000, descr: "Refined, quiet and powerful for long-distance comfort.", feat: ["Leather seats", "Navigation", "Parking sensors"] },
  { cat: "luxury", make: "Audi", model: "A6 S-Line", year: 2021, tr: "automatic", fuel: "petrol", seats: 5, lug: 3, daily: 46000, weekly: 290000, dep: 150000, loc: "Negombo", reg: "DEMO-CBM-4003", km: 27000, descr: "Prestige German saloon with Matrix LED lighting and refined suspension.", feat: ["S-Line package", "Virtual Cockpit", "Matrix LED", "Bang & Olufsen sound"] },
  { cat: "luxury", make: "BMW", model: "X5 M-Sport", year: 2022, tr: "automatic", fuel: "petrol", seats: 5, lug: 4, daily: 55000, weekly: 350000, dep: 200000, loc: "Colombo", reg: "DEMO-CBN-4004", km: 22000, descr: "Ultimate performance sports activity vehicle with dynamic twin-turbo power.", feat: ["M-Sport package", "Head-up display", "Harman Kardon", "Adaptive air suspension"] },
];

const VEHICLES: MockVehicle[] = RAW_VEHICLES.map((v, i) => {
  const hex = (i + 1).toString().padStart(4, "0");
  return {
    id: `20000000-0000-0000-0000-00000000${hex}`,
    category_id: catMap[v.cat] ?? DEFAULT_CAT_ID,
    make: v.make,
    model: v.model,
    year: v.year,
    transmission: v.tr,
    fuel_type: v.fuel,
    seats: v.seats,
    luggage: v.lug,
    daily_rate_lkr: v.daily,
    weekly_rate_lkr: v.weekly,
    deposit_lkr: v.dep,
    location: v.loc,
    registration_no: v.reg,
    mileage_km: v.km,
    description: v.descr,
    features: v.feat,
    is_demo: true,
    is_active: true,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  };
});

const IMAGES: MockImage[] = VEHICLES.map((v, i) => {
  const cat = CATEGORIES.find((c) => c.id === v.category_id)?.slug ?? "economy";
  return {
    id: `30000000-0000-0000-0000-00000000${(i + 1).toString().padStart(4, "0")}`,
    vehicle_id: v.id,
    url: `/images/${cat}.jpg`,
    alt: `${v.make} ${v.model} photo`,
    sort_order: 0,
    storage_path: null,
  };
});

const USERS: MockUser[] = [
  {
    id: "a1111111-1111-1111-1111-111111111111",
    email: "admin@swiftdrive.lk",
    full_name: "Admin Manager",
    phone: "+94 77 111 2233",
    nic_or_passport: "198512345678",
    address: "Main Street, Negombo",
    roles: ["admin", "staff", "customer"],
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: "b2222222-2222-2222-2222-222222222222",
    email: "staff@swiftdrive.lk",
    full_name: "Kasun Perera",
    phone: "+94 77 444 5566",
    nic_or_passport: "199245678912",
    address: "Beach Road, Negombo",
    roles: ["staff", "customer"],
    created_at: new Date(Date.now() - 50 * 86400000).toISOString(),
  },
  {
    id: "c3333333-3333-3333-3333-333333333333",
    email: "customer@swiftdrive.lk",
    full_name: "Saman Kumara",
    phone: "+94 71 888 9900",
    nic_or_passport: "199578912345",
    address: "Kandy Road, Kadawatha",
    roles: ["customer"],
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: "d4444444-4444-4444-4444-444444444444",
    email: "david.miller@gmail.com",
    full_name: "David Miller",
    phone: "+44 7911 123456",
    nic_or_passport: "GBR987654321",
    address: "London, United Kingdom",
    roles: ["customer"],
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

const now = new Date();
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (days: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return fmtDate(d);
};

const BOOKINGS: MockBooking[] = [
  {
    id: BOOKING_COMPLETED_ID,
    reference: "SD-WGN-9821",
    customer_id: CUST1_ID,
    vehicle_id: WAGON_R_ID, // Wagon R
    pickup_date: addDays(-10),
    return_date: addDays(-5),
    pickup_location: "Negombo Office",
    return_location: "Negombo Office",
    rental_days: 5,
    rental_amount_lkr: 42500,
    deposit_lkr: 20000,
    status: "completed",
    customer_notes: "Weekend trip to Chilaw and Puttalam.",
    staff_notes: "Customer returned vehicle on time and in immaculate condition.",
    picked_up_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    returned_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: "e5555555-5555-5555-5555-555555555552",
    reference: "SD-AQU-4102",
    customer_id: CUST2_ID,
    vehicle_id: AQUA_ID, // Aqua
    pickup_date: addDays(-2),
    return_date: addDays(3),
    pickup_location: "Bandaranaike Airport",
    return_location: "Negombo Office",
    rental_days: 5,
    rental_amount_lkr: 52500,
    deposit_lkr: 25000,
    status: "active",
    customer_notes: "Arrived via Qatar Airways flight QR664. Touring cultural triangle.",
    staff_notes: "Handover executed at BIA airport counter by Kasun.",
    picked_up_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: "e5555555-5555-5555-5555-555555555553",
    reference: "SD-PRD-7703",
    customer_id: CUST1_ID,
    vehicle_id: PRADO_ID, // Prado
    pickup_date: addDays(4),
    return_date: addDays(11),
    pickup_location: "Negombo Office",
    return_location: "Bandaranaike Airport",
    rental_days: 7,
    rental_amount_lkr: 200000,
    deposit_lkr: 75000,
    status: "confirmed",
    customer_notes: "Family vacation across Ella and Nuwara Eliya. Need roof rack installed.",
    staff_notes: "Deposit confirmed via bank wire. Vehicle reserved.",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "e5555555-5555-5555-5555-555555555554",
    reference: "SD-HIA-2099",
    customer_id: CUST2_ID,
    vehicle_id: HIACE_ID, // KDH Hiace
    pickup_date: addDays(14),
    return_date: addDays(17),
    pickup_location: "Bandaranaike Airport",
    return_location: "Bandaranaike Airport",
    rental_days: 3,
    rental_amount_lkr: 63000,
    deposit_lkr: 50000,
    status: "pending",
    customer_notes: "Group of 8 guests arriving for wedding ceremony in Negombo.",
    created_at: new Date().toISOString(),
  },
];

const REVIEWS: MockReview[] = [
  {
    id: "f1111111-1111-1111-1111-111111111111",
    booking_id: BOOKING_COMPLETED_ID,
    customer_id: CUST1_ID,
    rating: 5,
    comment: "Fantastic experience! The Wagon R was spotless, smelling fresh, and extremely fuel-efficient. Pickup and handover at Negombo took under 5 minutes. Highly recommended for hassle-free travel!",
    display_name: "Saman Kumara",
    is_published: true,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: "f2222222-2222-2222-2222-222222222222",
    booking_id: "e5555555-5555-5555-5555-555555555559",
    customer_id: CUST2_ID,
    rating: 5,
    comment: "Seamless airport pickup right at Bandaranaike Arrivals. The Land Cruiser was in pristine condition and navigated the central highlands with ease. Top-tier service in Negombo!",
    display_name: "David Miller",
    is_published: true,
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: "f3333333-3333-3333-3333-333333333333",
    booking_id: "e5555555-5555-5555-5555-555555555558",
    customer_id: CUST1_ID,
    rating: 5,
    comment: "Great weekly rate on the Honda Vezel. Professional staff and transparent inspection reports with zero hidden surprises. Will definitely book again next season.",
    display_name: "Nimal Fernando",
    is_published: true,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
];

const INQUIRIES: MockInquiry[] = [
  {
    id: "g1111111-1111-1111-1111-111111111111",
    user_id: null,
    name: "Nimal Fernando",
    email: "nimal.fernando@gmail.com",
    phone: "+94 77 999 8877",
    category: "pricing",
    message: "Do you provide special monthly discount rates for long-term corporate rentals on hybrid cars like the Aqua or Vezel?",
    status: "responded",
    staff_response: "Dear Mr. Fernando, thank you for reaching out. Yes, we provide corporate long-term packages starting with 20% discounts and scheduled maintenance included.",
    staff_reply: "Dear Mr. Fernando, thank you for reaching out. Yes, we provide corporate long-term packages starting with 20% discounts and scheduled maintenance included.",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    responded_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    replied_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    replied_by: STAFF_ID,
  },
  {
    id: "g2222222-2222-2222-2222-222222222222",
    user_id: null,
    name: "Sarah Jenkins",
    email: "sarah.jenkins@outlook.com",
    phone: "+44 7890 654321",
    category: "booking",
    message: "We are landing at Bandaranaike Airport at 1:30 AM next Wednesday. Is it possible to arrange a late-night vehicle handover directly at the arrivals hall?",
    status: "open",
    staff_response: null,
    staff_reply: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

const AUDIT_LOGS: MockAuditLog[] = [
  {
    id: "h1111111-1111-1111-1111-111111111111",
    actor_id: ADMIN_ID,
    action: "system.seed",
    entity: "platform",
    entity_id: "seed_data",
    details: { message: "Demo fleet, test profiles and rental records initialized" },
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

const POLICIES = {
  id: 1,
  default_deposit_lkr: 25000,
  free_cancellation_hours: 48,
  cancellation_terms: "Bookings can be cancelled free of charge up to 48 hours before pickup. Later cancellation requests are reviewed by our team.",
  deposit_terms: "A refundable security deposit is collected at pickup and returned after the vehicle is inspected on return.",
};

// -----------------------------------------------------------------------------
// State Management with Browser LocalStorage Sync
// -----------------------------------------------------------------------------

interface MockState {
  categories: MockCategory[];
  vehicles: MockVehicle[];
  images: MockImage[];
  users: MockUser[];
  bookings: MockBooking[];
  reviews: MockReview[];
  inquiries: MockInquiry[];
  auditLogs: MockAuditLog[];
  conditionReports: MockConditionReport[];
  payments: MockPayment[];
  policies: typeof POLICIES;
  currentUserId: string | null;
}

const STORAGE_KEY = "swiftdrive_mock_state_v2";

function loadState(): MockState {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback to initial
    }
  }

  return {
    categories: [...CATEGORIES],
    vehicles: [...VEHICLES],
    images: [...IMAGES],
    users: [...USERS],
    bookings: [...BOOKINGS],
    reviews: [...REVIEWS],
    inquiries: [...INQUIRIES],
    auditLogs: [...AUDIT_LOGS],
    conditionReports: [],
    payments: [],
    policies: { ...POLICIES },
    currentUserId: null,
  };
}

let state: MockState = loadState();

function persistState() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }
}

const mockStorage: Record<string, string> = {};

async function readBodyAsUrl(body: unknown): Promise<string> {
  if (typeof window !== "undefined") {
    if (body instanceof Blob || body instanceof File) {
      try {
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(URL.createObjectURL(body));
          reader.readAsDataURL(body);
        });
      } catch {
        return URL.createObjectURL(body);
      }
    }
  }
  return "/images/economy.jpg";
}

// -----------------------------------------------------------------------------
// Request Dispatcher & Matchers
// -----------------------------------------------------------------------------

export async function handleMockSupabaseRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
  headers?: Headers,
  _publicUrl?: string,
): Promise<Response> {
  const urlString =
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(urlString, "http://localhost:5174");
  const pathname = url.pathname;
  const method = init?.method?.toUpperCase() ?? "GET";

  let body: Record<string, unknown> = {};
  if (init?.body && typeof init.body === "string") {
    try {
      body = JSON.parse(init.body);
    } catch {
      // not JSON
    }
  }

  // --- Auth Endpoints ---
  if (pathname.includes("/auth/v1/token")) {
    const email = String(body["email"] ?? "").toLowerCase().trim();
    const user = state.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      return jsonResponse({ error: "Invalid login credentials", message: "Invalid login credentials" }, 400);
    }

    state.currentUserId = user.id;
    persistState();

    const mockToken = `mock-token-${user.id}`;
    return jsonResponse({
      access_token: mockToken,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: `mock-refresh-${user.id}`,
      user: {
        id: user.id,
        email: user.email,
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: { full_name: user.full_name, phone: user.phone },
        aud: "authenticated",
        role: "authenticated",
        created_at: user.created_at,
      },
    });
  }

  if (pathname.includes("/auth/v1/signup")) {
    const email = String(body["email"] ?? "").toLowerCase().trim();
    let user = state.users.find((u) => u.email.toLowerCase() === email);
    if (user) {
      return jsonResponse({ error: "User already registered", message: "User already registered" }, 400);
    }

    const newId = `user-${Date.now()}`;
    const userMeta = (body["data"] as Record<string, unknown>) ?? {};
    user = {
      id: newId,
      email,
      full_name: String(userMeta["full_name"] ?? email.split("@")[0]),
      phone: String(userMeta["phone"] ?? ""),
      roles: ["customer"],
      created_at: new Date().toISOString(),
    };
    state.users.push(user);
    state.currentUserId = user.id;
    persistState();

    return jsonResponse({
      access_token: `mock-token-${user.id}`,
      token_type: "bearer",
      expires_in: 3600,
      refresh_token: `mock-refresh-${user.id}`,
      user: {
        id: user.id,
        email: user.email,
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: { full_name: user.full_name, phone: user.phone },
        aud: "authenticated",
        role: "authenticated",
        created_at: user.created_at,
      },
    });
  }

  if (pathname.includes("/auth/v1/user")) {
    const authHeader = headers?.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    let user = state.users.find((u) => token.includes(u.id));
    if (!user && state.currentUserId) {
      user = state.users.find((u) => u.id === state.currentUserId);
    }
    if (!user) {
      return jsonResponse({ error: "Unauthorized", message: "JWT expired or missing" }, 401);
    }
    return jsonResponse({
      id: user.id,
      email: user.email,
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: { full_name: user.full_name, phone: user.phone },
      aud: "authenticated",
      role: "authenticated",
      created_at: user.created_at,
    });
  }

  if (pathname.includes("/auth/v1/logout")) {
    state.currentUserId = null;
    persistState();
    return jsonResponse({}, 200);
  }

  // --- RPC Endpoints ---
  if (pathname.includes("/rest/v1/rpc/")) {
    const parts = pathname.split("/rest/v1/rpc/");
    const rpcName = (parts[1] ?? "").split("?")[0] ?? "";
    return handleRpc(rpcName, body);
  }

  // --- REST Table Endpoints ---
  if (pathname.includes("/rest/v1/")) {
    const parts = pathname.split("/rest/v1/");
    const table = (parts[1] ?? "").split("?")[0] ?? "";
    return handleTable(table, method, url.searchParams, body, headers);
  }

  // --- Storage Endpoints ---
  if (pathname.includes("/storage/v1/object/sign/")) {
    const path = pathname.replace(/^.*\/storage\/v1\/object\/sign\/[^/]+\//, "");
    const signedUrl = mockStorage[path] ?? "/images/economy.jpg";
    return jsonResponse({
      signedURL: signedUrl,
      signedUrl: signedUrl,
    });
  }

  if (pathname.includes("/storage/v1/object/") && method === "POST") {
    const path = pathname.replace(/^.*\/storage\/v1\/object\/[^/]+\//, "");
    if (init?.body) {
      mockStorage[path] = await readBodyAsUrl(init.body);
    }
    return jsonResponse({
      Key: path,
      Id: path,
    });
  }

  if (pathname.includes("/storage/v1/object/") && method === "DELETE") {
    return jsonResponse({ message: "Deleted" });
  }

  if (pathname.includes("/storage/v1/")) {
    return jsonResponse({
      Key: "mock/photo.jpg",
      signedURL: "/images/economy.jpg",
      signedUrl: "/images/economy.jpg",
    });
  }

  return jsonResponse({ data: [] });
}

// -----------------------------------------------------------------------------
// RPC Handlers
// -----------------------------------------------------------------------------

function handleRpc(name: string, args: Record<string, unknown>): Response {
  switch (name) {
    case "unavailable_vehicle_ids": {
      const p = String(args["_pickup"] ?? "");
      const r = String(args["_return"] ?? "");
      const unavail = state.bookings
        .filter((b) => ["confirmed", "active", "pending"].includes(b.status))
        .filter((b) => b.pickup_date < r && b.return_date > p)
        .map((b) => b.vehicle_id);
      return jsonResponse(Array.from(new Set(unavail)));
    }

    case "vehicle_booked_ranges": {
      const vid = String(args["_vehicle_id"] ?? "");
      const ranges = state.bookings
        .filter((b) => b.vehicle_id === vid && ["confirmed", "active", "pending"].includes(b.status))
        .map((b) => ({
          pickup_date: b.pickup_date,
          return_date: b.return_date,
          status: b.status,
        }));
      return jsonResponse(ranges);
    }

    case "quote_rental": {
      const vid = String(args["_vehicle_id"] ?? "");
      const p = String(args["_pickup"] ?? "");
      const r = String(args["_return"] ?? "");
      const v = state.vehicles.find((x) => x.id === vid);
      if (!v) return jsonResponse({ error: "VEHICLE_NOT_FOUND" }, 400);

      const days = Math.max(1, Math.round((Date.parse(r) - Date.parse(p)) / 86400000));
      let rentalAmount = days * v.daily_rate_lkr;
      if (v.weekly_rate_lkr && days >= 7) {
        const fullWeeks = Math.floor(days / 7);
        const remDays = days % 7;
        rentalAmount = fullWeeks * v.weekly_rate_lkr + remDays * v.daily_rate_lkr;
      }
      const deposit = v.deposit_lkr ?? state.policies.default_deposit_lkr;

      const hasConflict = state.bookings.some(
        (b) =>
          b.vehicle_id === vid &&
          ["pending", "confirmed", "active"].includes(b.status) &&
          b.pickup_date < r &&
          b.return_date > p
      );

      return jsonResponse({
        rental_days: days,
        days,
        daily_rate_lkr: v.daily_rate_lkr,
        weekly_rate_lkr: v.weekly_rate_lkr,
        rental_amount_lkr: rentalAmount,
        deposit_lkr: deposit,
        total_due_lkr: rentalAmount + deposit,
        available: !hasConflict,
      });
    }

    case "create_booking": {
      const vid = String(args["_vehicle_id"] ?? "");
      const v = state.vehicles.find((x) => x.id === vid);
      if (!v) return jsonResponse({ error: "VEHICLE_NOT_FOUND" }, 400);

      const p = String(args["_pickup"] ?? "");
      const r = String(args["_return"] ?? "");

      const hasConflict = state.bookings.some(
        (b) =>
          b.vehicle_id === vid &&
          ["pending", "confirmed", "active"].includes(b.status) &&
          b.pickup_date < r &&
          b.return_date > p
      );
      if (hasConflict) {
        return jsonResponse(
          { error: "VEHICLE_UNAVAILABLE", message: "This vehicle is already reserved for some of those dates." },
          400
        );
      }

      const days = Math.max(1, Math.round((Date.parse(r) - Date.parse(p)) / 86400000));
      let rentalAmount = days * v.daily_rate_lkr;
      if (v.weekly_rate_lkr && days >= 7) {
        rentalAmount = Math.floor(days / 7) * v.weekly_rate_lkr + (days % 7) * v.daily_rate_lkr;
      }

      const bookingId = `book-${Date.now()}`;
      const prefix = v.make.slice(0, 3).toUpperCase();
      const ref = `SD-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newBooking: MockBooking = {
        id: bookingId,
        reference: ref,
        customer_id: state.currentUserId || "c3333333-3333-3333-3333-333333333333",
        vehicle_id: v.id,
        pickup_date: p,
        return_date: r,
        pickup_location: String(args["_pickup_location"] ?? "Negombo Office"),
        return_location: String(args["_return_location"] ?? "Negombo Office"),
        rental_days: days,
        rental_amount_lkr: rentalAmount,
        deposit_lkr: v.deposit_lkr ?? 25000,
        status: "pending",
        customer_notes: String(args["_notes"] ?? ""),
        created_at: new Date().toISOString(),
      };

      state.bookings.unshift(newBooking);
      persistState();

      return jsonResponse({ id: newBooking.id, reference: newBooking.reference });
    }

    case "set_booking_status": {
      const bid = String(args["_booking_id"] ?? "");
      const status = String(args["_status"] ?? "") as MockBooking["status"];
      const b = state.bookings.find((x) => x.id === bid);
      if (b) {
        b.status = status;
        if (args["_note"]) b.staff_notes = String(args["_note"]);
        persistState();
      }
      return jsonResponse(null);
    }

    case "record_handover": {
      const bid = String(args["_booking_id"] ?? "");
      const kind = String(args["_kind"] ?? "") as "pickup" | "return";
      const b = state.bookings.find((x) => x.id === bid);
      if (b) {
        if (kind === "pickup") {
          b.status = "active";
          b.picked_up_at = new Date().toISOString();
        } else {
          b.status = "completed";
          b.returned_at = new Date().toISOString();
        }
        persistState();
      }
      return jsonResponse(null);
    }

    case "record_payment": {
      const bid = String(args["_booking_id"] ?? "");
      const payment: MockPayment = {
        id: `pay-${Date.now()}`,
        booking_id: bid,
        amount_lkr: Number(args["_amount"] ?? 0),
        currency: "LKR",
        kind: String(args["_kind"] ?? "rental"),
        method: String(args["_method"] ?? "cash"),
        status: "succeeded",
        provider_reference: String(args["_reference"] ?? ""),
        created_at: new Date().toISOString(),
      };
      state.payments.push(payment);
      persistState();
      return jsonResponse(null);
    }

    case "customer_cancel_booking": {
      const bid = String(args["_booking_id"] ?? "");
      const b = state.bookings.find((x) => x.id === bid);
      if (b) {
        b.status = "cancelled";
        persistState();
      }
      return jsonResponse("cancelled");
    }

    case "admin_list_staff": {
      const staffList = state.users
        .filter((u) => u.roles.some((r) => r === "admin" || r === "staff"))
        .map((u) => ({
          user_id: u.id,
          email: u.email,
          full_name: u.full_name,
          roles: u.roles,
        }));
      return jsonResponse(staffList);
    }

    case "admin_set_role": {
      const email = String(args["_email"] ?? "").toLowerCase().trim();
      const role = String(args["_role"] ?? "");
      const grant = Boolean(args["_grant"]);
      const u = state.users.find((x) => x.email.toLowerCase() === email);
      if (u) {
        if (grant && !u.roles.includes(role)) {
          u.roles.push(role);
        } else if (!grant) {
          u.roles = u.roles.filter((r) => r !== role);
        }
        persistState();
      }
      return jsonResponse(null);
    }

    default:
      return jsonResponse(null);
  }
}

// -----------------------------------------------------------------------------
// Table Handlers
// -----------------------------------------------------------------------------

function handleTable(
  table: string,
  method: string,
  params: URLSearchParams,
  body: Record<string, unknown>,
  headers?: Headers,
): Response {
  const isSingle = headers?.get("accept")?.includes("vnd.pgrst.object+json");

  switch (table) {
    case "vehicle_categories": {
      let cats = [...state.categories];
      const slugEq = params.get("slug")?.replace(/^eq\./, "");
      if (slugEq) {
        cats = cats.filter((c) => c.slug === slugEq);
      }
      return isSingle
        ? jsonResponse(cats[0] ?? null)
        : jsonResponse(cats);
    }

    case "vehicles": {
      if (method === "POST") {
        const newVehicle: MockVehicle = {
          id: `veh-${Date.now()}`,
          category_id: String(body["category_id"] ?? state.categories[0]?.id ?? DEFAULT_CAT_ID),
          make: String(body["make"] ?? ""),
          model: String(body["model"] ?? ""),
          year: Number(body["year"] ?? 2022),
          transmission: String(body["transmission"] ?? "automatic"),
          fuel_type: String(body["fuel_type"] ?? "petrol"),
          seats: Number(body["seats"] ?? 5),
          luggage: Number(body["luggage"] ?? 2),
          daily_rate_lkr: Number(body["daily_rate_lkr"] ?? 10000),
          weekly_rate_lkr: body["weekly_rate_lkr"] ? Number(body["weekly_rate_lkr"]) : null,
          deposit_lkr: body["deposit_lkr"] ? Number(body["deposit_lkr"]) : null,
          location: String(body["location"] ?? "Negombo"),
          registration_no: String(body["registration_no"] ?? `DEMO-${Date.now().toString().slice(-4)}`),
          mileage_km: Number(body["mileage_km"] ?? 30000),
          description: String(body["description"] ?? ""),
          features: Array.isArray(body["features"]) ? (body["features"] as string[]) : [],
          is_demo: false,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        state.vehicles.push(newVehicle);
        persistState();
        return jsonResponse(newVehicle);
      }

      if (method === "DELETE") {
        const idEq = params.get("id")?.replace(/^eq\./, "");
        if (idEq) {
          state.vehicles = state.vehicles.filter((v) => v.id !== idEq);
          persistState();
        }
        return jsonResponse(null);
      }

      if (method === "PATCH") {
        const idEq = params.get("id")?.replace(/^eq\./, "");
        if (idEq) {
          const v = state.vehicles.find((x) => x.id === idEq);
          if (v) {
            Object.assign(v, body);
            persistState();
            return jsonResponse(v);
          }
        }
        return jsonResponse(null);
      }

      // GET vehicles with join
      let list = state.vehicles.map((v) => {
        const cat = state.categories.find((c) => c.id === v.category_id);
        const imgs = state.images
          .filter((img) => img.vehicle_id === v.id)
          .sort((a, b) => a.sort_order - b.sort_order);

        return {
          ...v,
          category: cat ? { id: cat.id, slug: cat.slug, name: cat.name } : null,
          images: imgs,
        };
      });

      // Filter by is_active
      const activeParam = params.get("is_active");
      if (activeParam === "eq.true") {
        list = list.filter((v) => v.is_active);
      }

      // Filter by category_id
      const catParam = params.get("category_id")?.replace(/^eq\./, "");
      if (catParam) {
        list = list.filter((v) => v.category_id === catParam);
      }

      // Filter by transmission
      const transParam = params.get("transmission")?.replace(/^eq\./, "");
      if (transParam) {
        list = list.filter((v) => v.transmission === transParam);
      }

      // Filter by seats
      const seatsParam = params.get("seats")?.replace(/^gte\./, "");
      if (seatsParam) {
        list = list.filter((v) => v.seats >= Number(seatsParam));
      }

      // Filter by price
      const priceParam = params.get("daily_rate_lkr")?.replace(/^lte\./, "");
      if (priceParam) {
        list = list.filter((v) => v.daily_rate_lkr <= Number(priceParam));
      }

      // Filter by location
      const locParam = params.get("location")?.replace(/^eq\./, "");
      if (locParam) {
        list = list.filter((v) => v.location.toLowerCase() === locParam.toLowerCase());
      }

      // Filter by id
      const idParam = params.get("id")?.replace(/^eq\./, "");
      if (idParam) {
        list = list.filter((v) => v.id === idParam);
        return isSingle ? jsonResponse(list[0] ?? null) : jsonResponse(list);
      }

      // Filter by text search
      const orParam = params.get("or");
      if (orParam) {
        const match = orParam.match(/ilike\.\%([^%]+)\%/);
        if (match?.[1]) {
          const search = match[1].toLowerCase();
          list = list.filter(
            (v) =>
              v.make.toLowerCase().includes(search) ||
              v.model.toLowerCase().includes(search)
          );
        }
      }

      // Exclude IDs
      const idNot = params.get("id");
      if (idNot?.startsWith("not.in.")) {
        const excluded = idNot
          .replace("not.in.(", "")
          .replace(")", "")
          .split(",")
          .map((s) => s.trim());
        list = list.filter((v) => !excluded.includes(v.id));
      }

      // Sorting
      const orderParam = params.get("order");
      if (orderParam?.includes("daily_rate_lkr.asc")) {
        list.sort((a, b) => a.daily_rate_lkr - b.daily_rate_lkr);
      } else if (orderParam?.includes("daily_rate_lkr.desc")) {
        list.sort((a, b) => b.daily_rate_lkr - a.daily_rate_lkr);
      } else if (orderParam?.includes("seats.desc")) {
        list.sort((a, b) => b.seats - a.seats);
      } else if (orderParam?.includes("year.desc")) {
        list.sort((a, b) => b.year - a.year);
      }

      const total = list.length;

      // Pagination
      const offset = Number(params.get("offset") ?? 0);
      const limit = Number(params.get("limit") ?? 9);
      list = list.slice(offset, offset + limit);

      const contentRange = total > 0 ? `${offset}-${Math.min(offset + list.length - 1, total - 1)}/${total}` : "*/0";

      return new Response(JSON.stringify(list), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-range": contentRange,
        },
      });
    }

    case "vehicle_images": {
      if (method === "POST") {
        const items = Array.isArray(body) ? (body as Record<string, unknown>[]) : [body];
        const inserted: MockImage[] = [];

        for (const it of items) {
          const newImg: MockImage = {
            id: `img-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            vehicle_id: String(it["vehicle_id"] ?? ""),
            url: String(it["url"] ?? "/images/economy.jpg"),
            alt: String(it["alt"] ?? "Vehicle photo"),
            sort_order: Number(it["sort_order"] ?? state.images.length),
            storage_path: it["storage_path"] ? String(it["storage_path"]) : null,
          };
          state.images.push(newImg);
          inserted.push(newImg);
        }

        persistState();
        return jsonResponse(Array.isArray(body) ? inserted : (inserted[0] ?? null));
      }

      if (method === "DELETE") {
        const idEq = params.get("id")?.replace(/^eq\./, "");
        if (idEq) {
          state.images = state.images.filter((img) => img.id !== idEq);
          persistState();
        }
        return jsonResponse(null);
      }

      if (method === "PATCH") {
        const idEq = params.get("id")?.replace(/^eq\./, "");
        if (idEq) {
          const img = state.images.find((x) => x.id === idEq);
          if (img) {
            Object.assign(img, body);
            persistState();
            return jsonResponse(img);
          }
        }
        return jsonResponse(null);
      }

      // GET vehicle_images
      let imgs = [...state.images];
      const vidEq = params.get("vehicle_id")?.replace(/^eq\./, "");
      if (vidEq) {
        imgs = imgs.filter((img) => img.vehicle_id === vidEq);
      }
      return jsonResponse(imgs);
    }

    case "business_policies": {
      return jsonResponse(state.policies);
    }

    case "reviews": {
      if (method === "POST") {
        const newReview: MockReview = {
          id: `rev-${Date.now()}`,
          booking_id: String(body["booking_id"] ?? ""),
          customer_id: state.currentUserId ?? CUST1_ID,
          rating: Number(body["rating"] ?? 5),
          comment: String(body["comment"] ?? ""),
          display_name: String(body["display_name"] ?? "Customer"),
          is_published: true,
          created_at: new Date().toISOString(),
        };
        state.reviews.unshift(newReview);
        persistState();
        return jsonResponse(newReview);
      }

      let revs = [...state.reviews];
      const custEq = params.get("customer_id")?.replace(/^eq\./, "");
      if (custEq) {
        revs = revs.filter((r) => r.customer_id === custEq);
      }
      const limit = Number(params.get("limit") ?? 10);
      return jsonResponse(revs.slice(0, limit));
    }

    case "rental_inquiries": {
      if (method === "POST") {
        const inq: MockInquiry = {
          id: `inq-${Date.now()}`,
          user_id: state.currentUserId ?? null,
          name: String(body["name"] ?? ""),
          email: String(body["email"] ?? ""),
          phone: body["phone"] ? String(body["phone"]) : null,
          category: String(body["category"] ?? "general"),
          message: String(body["message"] ?? ""),
          status: "open",
          created_at: new Date().toISOString(),
        };
        state.inquiries.unshift(inq);
        persistState();
        return jsonResponse(inq);
      }

      if (method === "PATCH") {
        const idEq = params.get("id")?.replace(/^eq\./, "");
        const item = state.inquiries.find((x) => x.id === idEq);
        if (item) {
          Object.assign(item, body, { status: "responded" });
          persistState();
        }
        return jsonResponse(null);
      }

      return jsonResponse(state.inquiries);
    }

    case "bookings": {
      let bList = state.bookings.map((b) => {
        const v = state.vehicles.find((x) => x.id === b.vehicle_id);
        const c = state.users.find((x) => x.id === b.customer_id);
        const pays = state.payments.filter((p) => p.booking_id === b.id);
        const reps = state.conditionReports.filter((r) => r.booking_id === b.id);
        return {
          ...b,
          vehicle: v ? { make: v.make, model: v.model, registration_no: v.registration_no, mileage_km: v.mileage_km } : null,
          customer: c ? { full_name: c.full_name, phone: c.phone, nic_or_passport: c.nic_or_passport, driving_licence: "B-1234567" } : null,
          payments: pays,
          reports: reps,
        };
      });

      const custParam = params.get("customer_id")?.replace(/^eq\./, "");
      if (custParam) {
        bList = bList.filter((b) => b.customer_id === custParam);
      }

      const statusParam = params.get("status")?.replace(/^eq\./, "");
      if (statusParam) {
        bList = bList.filter((b) => b.status === statusParam);
      }

      const total = bList.length;
      return new Response(JSON.stringify(bList), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-range": `0-${Math.max(0, total - 1)}/${total}`,
        },
      });
    }

    case "user_roles": {
      const uid = params.get("user_id")?.replace(/^eq\./, "");
      const u = state.users.find((x) => x.id === uid);
      const roles = (u?.roles ?? []).map((role) => ({ role }));
      return jsonResponse(roles);
    }

    case "profiles": {
      const uid = params.get("id")?.replace(/^eq\./, "");
      const u = state.users.find((x) => x.id === uid);
      if (method === "POST" || method === "PATCH") {
        if (u) {
          Object.assign(u, body);
          persistState();
        }
        return jsonResponse(u ?? null);
      }
      return jsonResponse(u ?? null);
    }

    case "audit_logs": {
      return jsonResponse(state.auditLogs);
    }

    default:
      return jsonResponse([]);
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
