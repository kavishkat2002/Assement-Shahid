-- =====================================================================
-- SwiftDrive Rentals — Complete Seed Data
-- Database: https://ylyvzfkvmkkoemtyvnpa.supabase.co
-- Platform: Vehicles, Test Profiles (Admin, Staff, Customer), Rentals,
--           Payments, Condition Reports, Inquiries and Reviews.
-- =====================================================================

-- 1. SEED TEST USER PROFILES (Admin, Staff, Customer)
-- Passwords for all accounts: Password123!
-- Encrypted using pgcrypto blowfish hash.
do $$
declare
  v_admin_id uuid := 'a1111111-1111-1111-1111-111111111111';
  v_staff_id uuid := 'b2222222-2222-2222-2222-222222222222';
  v_cust1_id uuid := 'c3333333-3333-3333-3333-333333333333';
  v_cust2_id uuid := 'd4444444-4444-4444-4444-444444444444';
  v_pw_hash text;
  v_inst uuid;
begin
  select coalesce(instance_id, '00000000-0000-0000-0000-000000000000'::uuid)
  into v_inst
  from auth.users limit 1;
  v_inst := coalesce(v_inst, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Standard blowfish crypt for Password123!
  v_pw_hash := extensions.crypt('Password123!', extensions.gen_salt('bf'));

  -- 1.1 ADMIN USER
  if not exists (select 1 from auth.users where email = 'admin@swiftdrive.lk') then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token
    ) values (
      v_admin_id, v_inst, 'authenticated', 'authenticated', 'admin@swiftdrive.lk', v_pw_hash,
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Admin Manager","phone":"+94 77 111 2233"}'::jsonb,
      now(), now(), '', ''
    );
  else
    select id into v_admin_id from auth.users where email = 'admin@swiftdrive.lk';
    update auth.users set encrypted_password = v_pw_hash, email_confirmed_at = now() where id = v_admin_id;
  end if;

  -- 1.2 STAFF USER
  if not exists (select 1 from auth.users where email = 'staff@swiftdrive.lk') then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token
    ) values (
      v_staff_id, v_inst, 'authenticated', 'authenticated', 'staff@swiftdrive.lk', v_pw_hash,
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Kasun Perera","phone":"+94 77 444 5566"}'::jsonb,
      now(), now(), '', ''
    );
  else
    select id into v_staff_id from auth.users where email = 'staff@swiftdrive.lk';
    update auth.users set encrypted_password = v_pw_hash, email_confirmed_at = now() where id = v_staff_id;
  end if;

  -- 1.3 CUSTOMER 1 (Saman Kumara)
  if not exists (select 1 from auth.users where email = 'customer@swiftdrive.lk') then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token
    ) values (
      v_cust1_id, v_inst, 'authenticated', 'authenticated', 'customer@swiftdrive.lk', v_pw_hash,
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Saman Kumara","phone":"+94 71 888 9900"}'::jsonb,
      now(), now(), '', ''
    );
  else
    select id into v_cust1_id from auth.users where email = 'customer@swiftdrive.lk';
    update auth.users set encrypted_password = v_pw_hash, email_confirmed_at = now() where id = v_cust1_id;
  end if;

  -- 1.4 CUSTOMER 2 (Tourist David Miller)
  if not exists (select 1 from auth.users where email = 'david.miller@gmail.com') then
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token
    ) values (
      v_cust2_id, v_inst, 'authenticated', 'authenticated', 'david.miller@gmail.com', v_pw_hash,
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"David Miller","phone":"+44 7911 123456"}'::jsonb,
      now(), now(), '', ''
    );
  else
    select id into v_cust2_id from auth.users where email = 'david.miller@gmail.com';
    update auth.users set encrypted_password = v_pw_hash, email_confirmed_at = now() where id = v_cust2_id;
  end if;

  -- Ensure Profiles Exist
  insert into public.profiles (id, full_name, phone, nic_or_passport, address)
  values
    (v_admin_id, 'Admin Manager', '+94 77 111 2233', '198512345678', 'Main Street, Negombo'),
    (v_staff_id, 'Kasun Perera', '+94 77 444 5566', '199245678912', 'Beach Road, Negombo'),
    (v_cust1_id, 'Saman Kumara', '+94 71 888 9900', '199578912345', 'Kandy Road, Kadawatha'),
    (v_cust2_id, 'David Miller', '+44 7911 123456', 'GBR987654321', 'London, United Kingdom')
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    nic_or_passport = coalesce(public.profiles.nic_or_passport, excluded.nic_or_passport),
    address = coalesce(public.profiles.address, excluded.address);

  -- Assign User Roles
  insert into public.user_roles (user_id, role)
  values
    (v_admin_id, 'admin'),
    (v_admin_id, 'staff'),
    (v_admin_id, 'customer'),
    (v_staff_id, 'staff'),
    (v_staff_id, 'customer'),
    (v_cust1_id, 'customer'),
    (v_cust2_id, 'customer')
  on conflict do nothing;

end $$;


-- 2. SEED ADDITIONAL DIVERSE VEHICLES
with c as (select id, slug from public.vehicle_categories)
insert into public.vehicles (
  category_id, make, model, year, transmission, fuel_type,
  seats, luggage, daily_rate_lkr, weekly_rate_lkr, deposit_lkr,
  location, registration_no, mileage_km, description, features, is_demo, is_active
)
select
  c.id, v.make, v.model, v.year, v.tr, v.fuel,
  v.seats, v.lug, v.daily, v.weekly, v.dep,
  v.loc, v.reg, v.km, v.descr, v.feat, true, true
from (values
  ('economy','Toyota','Vitz',2020,'automatic','petrol',5,2,9000,55000,20000,'Negombo','DEMO-CAD-1004',48000,'Popular Japanese hatchback, compact, smooth handling and low fuel consumption.',array['Air conditioning','Power steering','Bluetooth','Reverse camera']),
  ('economy','Nissan','Note e-Power',2021,'automatic','hybrid',5,3,11000,68000,25000,'Bandaranaike Airport','DEMO-CAE-1005',36000,'Innovative hybrid drive delivering instant torque and whisper-quiet city motoring.',array['Electric Drive','e-Power Hybrid','Lane Assist','Reverse Camera']),
  ('suv','Toyota','Land Cruiser V8',2021,'automatic','diesel',7,5,48000,310000,100000,'Colombo','DEMO-CBE-2004',41000,'Flagship luxury SUV with legendary off-road reliability and grand road presence.',array['V8 Turbo Diesel','Sunroof','Leather interior','4WD','Cooled seats']),
  ('suv','Hyundai','Tucson',2022,'automatic','petrol',5,4,24000,150000,50000,'Negombo','DEMO-CBF-2005',29000,'Modern styling and cutting-edge safety features for island journeys.',array['Panoramic Sunroof','Apple CarPlay','Blind Spot Monitor']),
  ('suv','Kia','Sportage',2021,'automatic','petrol',5,3,21000,132000,45000,'Bandaranaike Airport','DEMO-CBG-2006',34000,'Sporty compact crossover ideal for airport pick-up and coastal touring.',array['Cruise Control','Rear AC Vents','Bluetooth','Touchscreen']),
  ('van','Toyota','Hiace Super GL',2020,'automatic','diesel',10,6,26000,165000,60000,'Negombo','DEMO-PH-3003',62000,'Plush velvet interior, individual reclining seats and dual AC for VIP transfers.',array['10 Plush Seats','Dual Zone AC','Automatic Sliding Door','Privacy Glass']),
  ('luxury','Audi','A6 S-Line',2021,'automatic','petrol',5,3,46000,290000,150000,'Negombo','DEMO-CBM-4003',27000,'Prestige German saloon with Matrix LED lighting and refined suspension.',array['S-Line package','Virtual Cockpit','Matrix LED','Bang & Olufsen sound']),
  ('luxury','BMW','X5 M-Sport',2022,'automatic','petrol',5,4,55000,350000,200000,'Colombo','DEMO-CBN-4004',22000,'Ultimate performance sports activity vehicle with dynamic twin-turbo power.',array['M-Sport package','Head-up display','Harman Kardon','Adaptive air suspension'])
) as v(cat, make, model, year, tr, fuel, seats, lug, daily, weekly, dep, loc, reg, km, descr, feat)
join c on c.slug = v.cat
on conflict (registration_no) do update set
  daily_rate_lkr = excluded.daily_rate_lkr,
  weekly_rate_lkr = excluded.weekly_rate_lkr,
  is_active = true;

-- Attach Category Photos to new Vehicles
insert into public.vehicle_images (vehicle_id, url, alt, sort_order)
select v.id, '/images/' || c.slug || '.jpg', v.make || ' ' || v.model || ' photo', 0
from public.vehicles v
join public.vehicle_categories c on c.id = v.category_id
where not exists (select 1 from public.vehicle_images vi where vi.vehicle_id = v.id);


-- 3. SEED REALISTIC RENTAL DETAILS & BOOKING LIFECYCLES
do $$
declare
  v_wagon_r uuid;
  v_aqua uuid;
  v_prado uuid;
  v_hiace uuid;
  v_cust1_id uuid;
  v_cust2_id uuid;
  v_staff_id uuid;

  v_b_completed uuid := 'e5555555-5555-5555-5555-555555555551';
  v_b_active    uuid := 'e5555555-5555-5555-5555-555555555552';
  v_b_confirmed uuid := 'e5555555-5555-5555-5555-555555555553';
  v_b_pending   uuid := 'e5555555-5555-5555-5555-555555555554';
begin
  select id into v_wagon_r from public.vehicles where registration_no = 'DEMO-CAB-1001';
  select id into v_aqua from public.vehicles where registration_no = 'DEMO-CAD-1002';
  select id into v_prado from public.vehicles where registration_no = 'DEMO-CBA-2001';
  select id into v_hiace from public.vehicles where registration_no = 'DEMO-PH-3001';

  select id into v_cust1_id from auth.users where email = 'customer@swiftdrive.lk';
  select id into v_cust2_id from auth.users where email = 'david.miller@gmail.com';
  select id into v_staff_id from auth.users where email = 'staff@swiftdrive.lk';

  -- 3.1 COMPLETED BOOKING (Past 5-day rental on Wagon R)
  if not exists (select 1 from public.bookings where id = v_b_completed) and v_wagon_r is not null and v_cust1_id is not null then
    insert into public.bookings (
      id, reference, customer_id, vehicle_id,
      pickup_date, return_date, pickup_location, return_location,
      rental_days, rental_amount_lkr, deposit_lkr, status,
      customer_notes, staff_notes, picked_up_at, returned_at, created_at
    ) values (
      v_b_completed, 'SD-WGN-9821', v_cust1_id, v_wagon_r,
      (current_date - interval '10 days')::date, (current_date - interval '5 days')::date,
      'Negombo Office', 'Negombo Office',
      5, 42500, 20000, 'completed',
      'Weekend trip to Chilaw and Puttalam.',
      'Customer returned vehicle on time and in immaculate condition.',
      (current_date - interval '10 days' + time '09:30'),
      (current_date - interval '5 days' + time '16:45'),
      (current_date - interval '14 days')
    );

    -- Condition Reports for Completed Booking
    insert into public.vehicle_condition_reports (
      booking_id, kind, mileage_km, fuel_level, condition, damage_notes, recorded_by, created_at
    ) values
      (v_b_completed, 'pickup', 41500, 'full', 'excellent', null, v_staff_id, current_date - interval '10 days'),
      (v_b_completed, 'return', 42000, 'full', 'excellent', 'Clean interior, no scratches.', v_staff_id, current_date - interval '5 days');

    -- Payments for Completed Booking (Deposit + Rental paid)
    insert into public.payments (
      booking_id, amount_lkr, currency, kind, method, status, provider_reference, recorded_by, created_at
    ) values
      (v_b_completed, 20000, 'LKR', 'deposit', 'card_terminal', 'succeeded', 'AUTH-842910', v_staff_id, current_date - interval '10 days'),
      (v_b_completed, 42500, 'LKR', 'rental', 'cash', 'succeeded', 'RCP-10492', v_staff_id, current_date - interval '10 days'),
      (v_b_completed, 20000, 'LKR', 'refund', 'card_terminal', 'succeeded', 'REF-842910', v_staff_id, current_date - interval '5 days');

    -- Customer Review for Completed Booking
    insert into public.reviews (
      booking_id, customer_id, rating, comment, display_name, is_published, created_at
    ) values (
      v_b_completed, v_cust1_id, 5,
      'Fantastic experience! The Wagon R was spotless, smelling fresh, and extremely fuel-efficient. Pickup and handover at Negombo took under 5 minutes. Highly recommended for hassle-free travel!',
      'Saman Kumara', true, current_date - interval '4 days'
    );
  end if;


  -- 3.2 ACTIVE BOOKING (Currently on the road on Toyota Aqua)
  if not exists (select 1 from public.bookings where id = v_b_active) and v_aqua is not null and v_cust2_id is not null then
    insert into public.bookings (
      id, reference, customer_id, vehicle_id,
      pickup_date, return_date, pickup_location, return_location,
      rental_days, rental_amount_lkr, deposit_lkr, status,
      customer_notes, staff_notes, picked_up_at, created_at
    ) values (
      v_b_active, 'SD-AQU-4102', v_cust2_id, v_aqua,
      (current_date - interval '2 days')::date, (current_date + interval '3 days')::date,
      'Bandaranaike Airport', 'Negombo Office',
      5, 52500, 25000, 'active',
      'Arrived via Qatar Airways flight QR664. Touring the cultural triangle.',
      'Handover executed at BIA airport counter by Kasun.',
      (current_date - interval '2 days' + time '11:15'),
      (current_date - interval '6 days')
    );

    -- Pickup Condition Report for Active Booking
    insert into public.vehicle_condition_reports (
      booking_id, kind, mileage_km, fuel_level, condition, damage_notes, recorded_by, created_at
    ) values (
      v_b_active, 'pickup', 60800, 'full', 'good', 'Minor rim scuff on left rear wheel noted before departure.', v_staff_id, current_date - interval '2 days'
    );

    -- Payments Recorded for Active Booking
    insert into public.payments (
      booking_id, amount_lkr, currency, kind, method, status, provider_reference, recorded_by, created_at
    ) values
      (v_b_active, 25000, 'LKR', 'deposit', 'card_terminal', 'succeeded', 'VISA-77192', v_staff_id, current_date - interval '2 days'),
      (v_b_active, 52500, 'LKR', 'rental', 'card_terminal', 'succeeded', 'VISA-77193', v_staff_id, current_date - interval '2 days');
  end if;


  -- 3.3 CONFIRMED BOOKING (Upcoming luxury trip on Toyota Prado)
  if not exists (select 1 from public.bookings where id = v_b_confirmed) and v_prado is not null and v_cust1_id is not null then
    insert into public.bookings (
      id, reference, customer_id, vehicle_id,
      pickup_date, return_date, pickup_location, return_location,
      rental_days, rental_amount_lkr, deposit_lkr, status,
      customer_notes, staff_notes, created_at
    ) values (
      v_b_confirmed, 'SD-PRD-7703', v_cust1_id, v_prado,
      (current_date + interval '4 days')::date, (current_date + interval '11 days')::date,
      'Negombo Office', 'Bandaranaike Airport',
      7, 200000, 75000, 'confirmed',
      'Family vacation across Ella and Nuwara Eliya. Need roof rack installed.',
      'Deposit confirmed via bank wire. Vehicle reserved and scheduled for full detailing.',
      (current_date - interval '1 day')
    );

    -- Deposit Advance Payment Recorded
    insert into public.payments (
      booking_id, amount_lkr, currency, kind, method, status, provider_reference, recorded_by, created_at
    ) values (
      v_b_confirmed, 75000, 'LKR', 'deposit', 'bank_transfer', 'succeeded', 'BOC-TXN-98214', v_staff_id, current_date - interval '1 day'
    );
  end if;


  -- 3.4 PENDING BOOKING (Awaiting staff review on Toyota Hiace Van)
  if not exists (select 1 from public.bookings where id = v_b_pending) and v_hiace is not null and v_cust2_id is not null then
    insert into public.bookings (
      id, reference, customer_id, vehicle_id,
      pickup_date, return_date, pickup_location, return_location,
      rental_days, rental_amount_lkr, deposit_lkr, status,
      customer_notes, created_at
    ) values (
      v_b_pending, 'SD-HIA-2099', v_cust2_id, v_hiace,
      (current_date + interval '14 days')::date, (current_date + interval '17 days')::date,
      'Bandaranaike Airport', 'Bandaranaike Airport',
      3, 63000, 50000, 'pending',
      'Group of 8 guests arriving for wedding ceremony in Negombo. Require baby booster seats if available.',
      now()
    );
  end if;

end $$;


-- 4. SEED SAMPLE RENTAL INQUIRIES
insert into public.rental_inquiries (
  name, email, phone, category, message, status, staff_response, created_at, responded_at
) values
  (
    'Nimal Fernando', 'nimal.fernando@gmail.com', '+94 77 999 8877',
    'pricing',
    'Do you provide special monthly discount rates for long-term corporate rentals on hybrid cars like the Aqua or Vezel?',
    'responded',
    'Dear Mr. Fernando, thank you for reaching out. Yes, we provide corporate long-term packages starting with 20% discounts and scheduled maintenance included. We will email our full corporate rate card today.',
    current_date - interval '3 days',
    current_date - interval '2 days'
  ),
  (
    'Sarah Jenkins', 'sarah.jenkins@outlook.com', '+44 7890 654321',
    'booking',
    'We are landing at Bandaranaike Airport at 1:30 AM next Wednesday. Is it possible to arrange a late-night vehicle handover directly at the arrivals hall?',
    'open',
    null,
    current_date - interval '1 day',
    null
  ),
  (
    'Dilshan Mendis', 'dilshan.mendis@yahoo.com', '+94 71 555 4433',
    'general',
    'Is a local endorsement required for foreign drivers with an International Driving Permit (IDP) before driving in Sri Lanka?',
    'responded',
    'Yes Dilshan, visitors driving on an IDP need an endorsement from AAC in Colombo. Alternatively, our staff can assist you with local temporary permit documentation upon arrival.',
    current_date - interval '5 days',
    current_date - interval '4 days'
  );

-- 5. AUDIT LOG INITIALIZATION
insert into public.audit_logs (actor_id, action, entity, entity_id, details, created_at)
values
  (null, 'system.seed', 'platform', 'seed_data', '{"message":"Demo fleet, test profiles and rental records seeded successfully"}'::jsonb, now());

-- 6. STORAGE BUCKET CONFIGURATION & POLICIES FOR FLEET PHOTOS
-- Creates the private 'vehicle-images' bucket for vehicle photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-images',
  'vehicle-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- Storage RLS Policies
drop policy if exists "vehicle images read" on storage.objects;
drop policy if exists "vehicle images admin write" on storage.objects;
drop policy if exists "vehicle images admin delete" on storage.objects;

create policy "vehicle images read"
  on storage.objects for select
  using (bucket_id = 'vehicle-images');

create policy "vehicle images admin write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vehicle-images'
    and (public.has_role(auth.uid(), 'admin') or public.is_staff(auth.uid()))
  );

create policy "vehicle images admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'vehicle-images'
    and (public.has_role(auth.uid(), 'admin') or public.is_staff(auth.uid()))
  );


