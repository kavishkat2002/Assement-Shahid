
create extension if not exists btree_gist;

create type public.app_role as enum ('customer','staff','admin');
create type public.booking_status as enum ('pending','confirmed','active','completed','cancelled','rejected');
create type public.payment_status as enum ('pending','succeeded','failed','refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  nic_or_passport text,
  driving_licence text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('staff','admin'))
$$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'phone');
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  -- Demo bootstrap: the very first account becomes administrator.
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id,'admin'),(new.id,'staff') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.business_policies (
  id int primary key default 1 check (id = 1),
  default_deposit_lkr numeric(12,2) not null default 25000,
  free_cancellation_hours int not null default 48,
  late_return_fee_per_day_lkr numeric(12,2) not null default 0,
  additional_driver_fee_lkr numeric(12,2) not null default 0,
  min_rental_days int not null default 1,
  max_rental_days int not null default 60,
  cancellation_terms text not null default '',
  deposit_terms text not null default '',
  updated_at timestamptz not null default now()
);
grant select on public.business_policies to anon, authenticated;
grant update on public.business_policies to authenticated;
grant all on public.business_policies to service_role;
alter table public.business_policies enable row level security;
create policy "policies public read" on public.business_policies for select to anon, authenticated using (true);
create policy "policies admin update" on public.business_policies for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.vehicle_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  sort_order int not null default 0
);
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.vehicle_categories(id),
  make text not null,
  model text not null,
  year int not null check (year between 1990 and 2100),
  transmission text not null check (transmission in ('automatic','manual')),
  fuel_type text not null check (fuel_type in ('petrol','diesel','hybrid','electric')),
  seats int not null check (seats between 1 and 20),
  luggage int not null default 2,
  daily_rate_lkr numeric(12,2) not null check (daily_rate_lkr > 0),
  weekly_rate_lkr numeric(12,2) check (weekly_rate_lkr is null or weekly_rate_lkr > 0),
  deposit_lkr numeric(12,2),
  location text not null default 'Negombo',
  registration_no text not null unique,
  mileage_km int not null default 0,
  description text not null default '',
  features text[] not null default '{}',
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicles_search_idx on public.vehicles (is_active, category_id, daily_rate_lkr);
create index vehicles_name_idx on public.vehicles (lower(make || ' ' || model));
create table public.vehicle_images (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  url text not null,
  storage_path text,
  alt text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.vehicle_images (vehicle_id, sort_order);
grant select on public.vehicle_categories, public.vehicles, public.vehicle_images to anon, authenticated;
grant insert, update, delete on public.vehicle_categories, public.vehicles, public.vehicle_images to authenticated;
grant all on public.vehicle_categories, public.vehicles, public.vehicle_images to service_role;
alter table public.vehicle_categories enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_images enable row level security;
create policy "cat read" on public.vehicle_categories for select to anon, authenticated using (true);
create policy "cat admin" on public.vehicle_categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "veh read" on public.vehicles for select to anon, authenticated using (is_active or public.is_staff(auth.uid()));
create policy "veh admin" on public.vehicles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "img read" on public.vehicle_images for select to anon, authenticated using (true);
create policy "img admin" on public.vehicle_images for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('SD-' || upper(substr(md5(gen_random_uuid()::text),1,8))),
  customer_id uuid not null references public.profiles(id),
  vehicle_id uuid not null references public.vehicles(id),
  pickup_date date not null,
  return_date date not null,
  pickup_location text not null,
  return_location text not null,
  rental_days int not null,
  rental_amount_lkr numeric(12,2) not null,
  deposit_lkr numeric(12,2) not null,
  status public.booking_status not null default 'pending',
  customer_notes text,
  staff_notes text,
  cancellation_requested boolean not null default false,
  picked_up_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dates_valid check (return_date > pickup_date),
  -- Concurrency guard: PostgreSQL rejects two live bookings for one vehicle with overlapping dates, even under simultaneous requests.
  constraint no_overlap exclude using gist (
    vehicle_id with =, daterange(pickup_date, return_date, '[)') with &&
  ) where (status in ('pending','confirmed','active'))
);
create index on public.bookings (customer_id, pickup_date);
create index on public.bookings (status, pickup_date);
grant select on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "booking read" on public.bookings for select to authenticated using (customer_id = auth.uid() or public.is_staff(auth.uid()));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount_lkr numeric(12,2) not null check (amount_lkr > 0),
  currency text not null default 'LKR',
  kind text not null check (kind in ('deposit','rental','refund','other')),
  method text not null check (method in ('cash','card_terminal','bank_transfer','online')),
  status public.payment_status not null default 'succeeded',
  provider_reference text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index on public.payments (booking_id);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "payment read" on public.payments for select to authenticated using (
  public.is_staff(auth.uid()) or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()));

create table public.vehicle_condition_reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('pickup','return')),
  mileage_km int not null check (mileage_km >= 0),
  fuel_level text not null check (fuel_level in ('empty','quarter','half','three_quarter','full')),
  condition text not null check (condition in ('excellent','good','fair','damaged')),
  damage_notes text,
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (booking_id, kind)
);
grant select on public.vehicle_condition_reports to authenticated;
grant all on public.vehicle_condition_reports to service_role;
alter table public.vehicle_condition_reports enable row level security;
create policy "report read" on public.vehicle_condition_reports for select to authenticated using (
  public.is_staff(auth.uid()) or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid()));

create table public.rental_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) between 5 and 255 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or char_length(phone) <= 30),
  category text not null check (category in ('general','booking','pricing','corporate','long_term','other')),
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'open' check (status in ('open','responded','closed')),
  staff_response text,
  responded_by uuid references public.profiles(id),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.rental_inquiries (status, created_at desc);
grant insert on public.rental_inquiries to anon, authenticated;
grant select, update on public.rental_inquiries to authenticated;
grant all on public.rental_inquiries to service_role;
alter table public.rental_inquiries enable row level security;
create policy "inq anon insert" on public.rental_inquiries for insert to anon with check (user_id is null and status = 'open' and staff_response is null);
create policy "inq auth insert" on public.rental_inquiries for insert to authenticated with check ((user_id is null or user_id = auth.uid()) and status = 'open' and staff_response is null);
create policy "inq read" on public.rental_inquiries for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "inq staff update" on public.rental_inquiries for update to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create or replace function public.inquiry_dedupe() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.rental_inquiries where lower(email)=lower(new.email) and message=new.message and created_at > now() - interval '10 minutes') then
    raise exception 'DUPLICATE_INQUIRY' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger inquiry_dedupe before insert on public.rental_inquiries for each row execute function public.inquiry_dedupe();

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  customer_id uuid not null references public.profiles(id),
  rating int not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 5 and 1000),
  display_name text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon, authenticated;
grant insert, update on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews public read" on public.reviews for select to anon, authenticated using (is_published or customer_id = auth.uid() or public.is_staff(auth.uid()));
create policy "reviews own insert" on public.reviews for insert to authenticated with check (
  customer_id = auth.uid() and exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid() and b.status = 'completed'));
create policy "reviews admin moderate" on public.reviews for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body text not null,
  cover_url text,
  topic text not null default 'guide',
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select on public.blog_posts to anon, authenticated;
grant insert, update, delete on public.blog_posts to authenticated;
grant all on public.blog_posts to service_role;
alter table public.blog_posts enable row level security;
create policy "blog read" on public.blog_posts for select to anon, authenticated using (is_published or public.has_role(auth.uid(),'admin'));
create policy "blog admin" on public.blog_posts for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.audit_logs (created_at desc);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "audit read" on public.audit_logs for select to authenticated using (public.is_staff(auth.uid()));

create or replace function public.log_audit(_action text, _entity text, _entity_id text, _details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (actor_id, action, entity, entity_id, details) values (auth.uid(), _action, _entity, _entity_id, coalesce(_details,'{}'));
$$;
revoke execute on function public.log_audit(text,text,text,jsonb) from public, anon, authenticated;

-- Admin vehicle changes are audited automatically.
create or replace function public.audit_vehicle_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_audit('vehicle.'||lower(tg_op),'vehicle', coalesce(new.id, old.id)::text,
    jsonb_build_object('name', coalesce(new.make, old.make)||' '||coalesce(new.model, old.model)));
  return coalesce(new, old);
end $$;
create trigger vehicles_audit after insert or update or delete on public.vehicles for each row execute function public.audit_vehicle_change();

-- PRICING: days = return - pickup. If a weekly rate exists and days >= 7, full weeks use the weekly rate and remaining days the daily rate.
create or replace function public.calc_rental(_vehicle_id uuid, _pickup date, _return date)
returns table (rental_days int, rental_amount_lkr numeric, deposit_lkr numeric)
language plpgsql stable security definer set search_path = public as $$
declare v public.vehicles; p public.business_policies; d int;
begin
  select * into v from public.vehicles where id = _vehicle_id and is_active;
  if not found then raise exception 'VEHICLE_NOT_FOUND' using errcode='P0001'; end if;
  select * into p from public.business_policies where id = 1;
  if _pickup is null or _return is null or _return <= _pickup then raise exception 'INVALID_DATES' using errcode='P0001'; end if;
  if _pickup < (now() at time zone 'Asia/Colombo')::date then raise exception 'PICKUP_IN_PAST' using errcode='P0001'; end if;
  d := _return - _pickup;
  if d < p.min_rental_days or d > p.max_rental_days then raise exception 'DURATION_OUT_OF_RANGE' using errcode='P0001'; end if;
  rental_days := d;
  if v.weekly_rate_lkr is not null and d >= 7 then
    rental_amount_lkr := (d / 7) * v.weekly_rate_lkr + (d % 7) * v.daily_rate_lkr;
  else
    rental_amount_lkr := d * v.daily_rate_lkr;
  end if;
  deposit_lkr := coalesce(v.deposit_lkr, p.default_deposit_lkr);
  return next;
end $$;
revoke execute on function public.calc_rental(uuid,date,date) from public, anon, authenticated;

create or replace function public.is_vehicle_available(_vehicle_id uuid, _pickup date, _return date)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.bookings
    where vehicle_id = _vehicle_id and status in ('pending','confirmed','active')
      and daterange(pickup_date, return_date, '[)') && daterange(_pickup, _return, '[)'))
$$;
grant execute on function public.is_vehicle_available(uuid,date,date) to anon, authenticated;

create or replace function public.quote_rental(_vehicle_id uuid, _pickup date, _return date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q record;
begin
  select * into q from public.calc_rental(_vehicle_id, _pickup, _return);
  return jsonb_build_object('rental_days', q.rental_days, 'rental_amount_lkr', q.rental_amount_lkr,
    'deposit_lkr', q.deposit_lkr, 'available', public.is_vehicle_available(_vehicle_id, _pickup, _return));
end $$;
grant execute on function public.quote_rental(uuid,date,date) to anon, authenticated;

create or replace function public.unavailable_vehicle_ids(_pickup date, _return date)
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct vehicle_id from public.bookings
  where status in ('pending','confirmed','active') and daterange(pickup_date, return_date, '[)') && daterange(_pickup, _return, '[)')
$$;
grant execute on function public.unavailable_vehicle_ids(date,date) to anon, authenticated;

-- Booked date ranges for one vehicle (no customer data exposed).
create or replace function public.vehicle_booked_ranges(_vehicle_id uuid)
returns table (pickup_date date, return_date date) language sql stable security definer set search_path = public as $$
  select pickup_date, return_date from public.bookings
  where vehicle_id=_vehicle_id and status in ('pending','confirmed','active') and return_date >= current_date order by pickup_date
$$;
grant execute on function public.vehicle_booked_ranges(uuid) to anon, authenticated;

-- BOOKING CREATION: price, deposit and status are computed here; browser values are never trusted.
create or replace function public.create_booking(_vehicle_id uuid, _pickup date, _return date, _pickup_location text, _return_location text, _notes text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q record; b public.bookings;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode='P0001'; end if;
  if char_length(coalesce(_pickup_location,'')) not between 2 and 100 or char_length(coalesce(_return_location,'')) not between 2 and 100 then
    raise exception 'INVALID_LOCATION' using errcode='P0001'; end if;
  select * into q from public.calc_rental(_vehicle_id, _pickup, _return);
  if not public.is_vehicle_available(_vehicle_id, _pickup, _return) then raise exception 'VEHICLE_UNAVAILABLE' using errcode='P0001'; end if;
  begin
    insert into public.bookings (customer_id, vehicle_id, pickup_date, return_date, pickup_location, return_location, rental_days, rental_amount_lkr, deposit_lkr, customer_notes)
    values (auth.uid(), _vehicle_id, _pickup, _return, _pickup_location, _return_location, q.rental_days, q.rental_amount_lkr, q.deposit_lkr, left(_notes, 1000))
    returning * into b;
  exception when exclusion_violation then
    raise exception 'VEHICLE_UNAVAILABLE' using errcode='P0001';
  end;
  perform public.log_audit('booking.created','booking', b.id::text, jsonb_build_object('reference', b.reference));
  return jsonb_build_object('id', b.id, 'reference', b.reference);
end $$;
grant execute on function public.create_booking(uuid,date,date,text,text,text) to authenticated;

-- STATUS TRANSITIONS (staff): pending -> confirmed | rejected | cancelled; confirmed -> cancelled. Pickup/return handled by record_handover.
create or replace function public.set_booking_status(_booking_id uuid, _status public.booking_status, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings; ok boolean;
begin
  if not public.is_staff(auth.uid()) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into b from public.bookings where id = _booking_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  ok := (b.status='pending' and _status in ('confirmed','rejected','cancelled'))
     or (b.status='confirmed' and _status = 'cancelled');
  if not ok then raise exception 'INVALID_TRANSITION' using errcode='P0001'; end if;
  update public.bookings set status=_status, staff_notes = coalesce(nullif(left(_note,1000),''), staff_notes), cancellation_requested=false, updated_at=now() where id=_booking_id;
  perform public.log_audit('booking.'||_status::text,'booking', _booking_id::text, jsonb_build_object('from', b.status, 'note', _note, 'reference', b.reference));
end $$;
grant execute on function public.set_booking_status(uuid,public.booking_status,text) to authenticated;

create or replace function public.customer_cancel_booking(_booking_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare b public.bookings; p public.business_policies;
begin
  select * into b from public.bookings where id=_booking_id and customer_id=auth.uid() for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if b.status not in ('pending','confirmed') then raise exception 'INVALID_TRANSITION' using errcode='P0001'; end if;
  select * into p from public.business_policies where id=1;
  -- Free cancellation if still pending, or if pickup is further away than the configured window. Otherwise staff review it.
  if b.status='pending' or (b.pickup_date::timestamp - (now() at time zone 'Asia/Colombo')) >= make_interval(hours => p.free_cancellation_hours) then
    update public.bookings set status='cancelled', updated_at=now() where id=b.id;
    perform public.log_audit('booking.cancelled_by_customer','booking', b.id::text, jsonb_build_object('reference', b.reference));
    return 'cancelled';
  end if;
  update public.bookings set cancellation_requested=true, updated_at=now() where id=b.id;
  perform public.log_audit('booking.cancellation_requested','booking', b.id::text, jsonb_build_object('reference', b.reference));
  return 'requested';
end $$;
grant execute on function public.customer_cancel_booking(uuid) to authenticated;

create or replace function public.record_handover(_booking_id uuid, _kind text, _mileage int, _fuel text, _condition text, _damage text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  if not public.is_staff(auth.uid()) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  select * into b from public.bookings where id=_booking_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if _kind='pickup' and b.status <> 'confirmed' then raise exception 'INVALID_TRANSITION' using errcode='P0001'; end if;
  if _kind='return' and b.status <> 'active' then raise exception 'INVALID_TRANSITION' using errcode='P0001'; end if;
  insert into public.vehicle_condition_reports (booking_id, kind, mileage_km, fuel_level, condition, damage_notes, recorded_by)
  values (_booking_id, _kind, _mileage, _fuel, _condition, nullif(left(_damage,2000),''), auth.uid());
  if _kind='pickup' then
    update public.bookings set status='active', picked_up_at=now(), updated_at=now() where id=_booking_id;
  else
    update public.bookings set status='completed', returned_at=now(), updated_at=now() where id=_booking_id;
    update public.vehicles set mileage_km = greatest(mileage_km, _mileage), updated_at=now() where id=b.vehicle_id;
  end if;
  perform public.log_audit('handover.'||_kind,'booking', _booking_id::text, jsonb_build_object('reference', b.reference, 'mileage',_mileage,'fuel',_fuel,'condition',_condition));
end $$;
grant execute on function public.record_handover(uuid,text,int,text,text,text) to authenticated;

-- PAYMENTS: staff record money actually received. No online gateway is configured, so nothing is marked paid by a customer click.
create or replace function public.record_payment(_booking_id uuid, _amount numeric, _kind text, _method text, _reference text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if _amount is null or _amount <= 0 or _amount > 10000000 then raise exception 'INVALID_AMOUNT' using errcode='P0001'; end if;
  if not exists (select 1 from public.bookings where id=_booking_id) then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  insert into public.payments (booking_id, amount_lkr, kind, method, status, provider_reference, recorded_by)
  values (_booking_id, round(_amount,2), _kind, _method, 'succeeded', nullif(left(_reference,100),''), auth.uid());
  perform public.log_audit('payment.recorded','booking', _booking_id::text, jsonb_build_object('amount',_amount,'kind',_kind,'method',_method));
end $$;
grant execute on function public.record_payment(uuid,numeric,text,text,text) to authenticated;

create or replace function public.admin_set_role(_email text, _role public.app_role, _grant boolean)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  if _role = 'customer' then raise exception 'INVALID_ROLE' using errcode='P0001'; end if;
  select id into uid from auth.users where lower(email)=lower(trim(_email));
  if uid is null then raise exception 'USER_NOT_FOUND' using errcode='P0001'; end if;
  if uid = auth.uid() and _role='admin' and not _grant then raise exception 'CANNOT_REMOVE_SELF' using errcode='P0001'; end if;
  if _grant then insert into public.user_roles(user_id, role) values (uid,_role) on conflict do nothing;
  else delete from public.user_roles where user_id=uid and role=_role; end if;
  perform public.log_audit(case when _grant then 'role.granted' else 'role.revoked' end,'user', uid::text, jsonb_build_object('role',_role,'email',_email));
end $$;
grant execute on function public.admin_set_role(text,public.app_role,boolean) to authenticated;

create or replace function public.admin_list_staff()
returns table (user_id uuid, email text, full_name text, roles text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN' using errcode='P0001'; end if;
  return query select u.id, u.email::text, p.full_name, array_agg(r.role::text order by r.role)
    from auth.users u join public.user_roles r on r.user_id=u.id left join public.profiles p on p.id=u.id
    where r.role in ('staff','admin') group by u.id, u.email, p.full_name;
end $$;
grant execute on function public.admin_list_staff() to authenticated;

create policy "vehicle images read" on storage.objects for select using (bucket_id='vehicle-images');
create policy "vehicle images admin write" on storage.objects for insert to authenticated with check (bucket_id='vehicle-images' and public.has_role(auth.uid(),'admin'));
create policy "vehicle images admin delete" on storage.objects for delete to authenticated using (bucket_id='vehicle-images' and public.has_role(auth.uid(),'admin'));

insert into public.business_policies (id, default_deposit_lkr, free_cancellation_hours, cancellation_terms, deposit_terms) values
(1, 25000, 48,
 'Demonstration policy: bookings can be cancelled free of charge up to 48 hours before pickup. Later cancellation requests are reviewed by our team.',
 'Demonstration policy: a refundable security deposit is collected at pickup and returned after the vehicle is inspected on return.');

insert into public.vehicle_categories (slug, name, description, sort_order) values
('economy','Economy','Compact, fuel-efficient cars for city driving and short trips.',1),
('suv','SUV','Spacious and comfortable for hill country and family travel.',2),
('van','Van','Seating for groups, airport transfers and tours.',3),
('luxury','Luxury','Premium comfort for business and special occasions.',4);

with c as (select id, slug from public.vehicle_categories)
insert into public.vehicles (category_id, make, model, year, transmission, fuel_type, seats, luggage, daily_rate_lkr, weekly_rate_lkr, deposit_lkr, location, registration_no, mileage_km, description, features, is_demo)
select c.id, v.make, v.model, v.year, v.tr, v.fuel, v.seats, v.lug, v.daily, v.weekly, v.dep, v.loc, v.reg, v.km, v.descr, v.feat, true
from (values
 ('economy','Suzuki','Wagon R',2021,'automatic','petrol',4,2,8500,52000,20000,'Negombo','DEMO-CAB-1001',42000,'A practical city hatchback, easy to park and economical on fuel.',array['Air conditioning','Bluetooth','Reverse camera']),
 ('economy','Toyota','Aqua',2019,'automatic','hybrid',5,2,10500,65000,25000,'Negombo','DEMO-CAD-1002',61000,'Reliable hybrid with excellent fuel economy for long drives.',array['Air conditioning','Hybrid','Keyless start']),
 ('economy','Honda','Fit',2018,'automatic','petrol',5,3,9500,59000,20000,'Bandaranaike Airport','DEMO-CAF-1003',70500,'Versatile hatchback with flexible seating and boot space.',array['Air conditioning','USB charging']),
 ('suv','Toyota','Prado',2020,'automatic','diesel',7,4,32000,200000,75000,'Negombo','DEMO-CBA-2001',55000,'Capable 4x4 for hill country roads and long family trips.',array['4WD','Climate control','7 seats','Cruise control']),
 ('suv','Honda','Vezel',2021,'automatic','hybrid',5,3,16500,105000,40000,'Negombo','DEMO-CBB-2002',38000,'Comfortable compact SUV with hybrid efficiency.',array['Hybrid','Reverse camera','Apple CarPlay']),
 ('suv','Mitsubishi','Outlander',2019,'automatic','petrol',7,4,22000,140000,50000,'Bandaranaike Airport','DEMO-CBC-2003',64000,'Roomy seven-seater for groups who want SUV comfort.',array['7 seats','Climate control']),
 ('van','Toyota','KDH Hiace',2018,'manual','diesel',14,8,21000,135000,50000,'Negombo','DEMO-PH-3001',98000,'High-roof van for tours, events and airport transfers.',array['14 seats','Rear AC','Large luggage area']),
 ('van','Nissan','Caravan',2019,'automatic','diesel',10,6,19000,120000,45000,'Bandaranaike Airport','DEMO-PH-3002',87000,'Comfortable van for families and small groups.',array['10 seats','Air conditioning']),
 ('luxury','Mercedes-Benz','E-Class',2020,'automatic','petrol',5,3,45000,285000,150000,'Negombo','DEMO-CBK-4001',31000,'Executive saloon for business travel and weddings.',array['Leather seats','Climate control','Premium audio']),
 ('luxury','BMW','5 Series',2019,'automatic','diesel',5,3,42000,265000,150000,'Colombo','DEMO-CBL-4002',44000,'Refined, quiet and powerful for long-distance comfort.',array['Leather seats','Navigation','Parking sensors'])
) as v(cat, make, model, year, tr, fuel, seats, lug, daily, weekly, dep, loc, reg, km, descr, feat)
join c on c.slug = v.cat;

insert into public.vehicle_images (vehicle_id, url, alt, sort_order)
select v.id, '/images/' || c.slug || '.jpg', v.make || ' ' || v.model || ' (representative category photo)', 0
from public.vehicles v join public.vehicle_categories c on c.id = v.category_id;

insert into public.blog_posts (slug, title, excerpt, body, topic, cover_url) values
('negombo-to-kandy-road-trip','Negombo to Kandy: a relaxed road trip','How to plan an easy drive from the coast to the hill capital.',
 E'The drive from Negombo to Kandy is about 110 km and usually takes three to four hours depending on traffic.\n\nStart early to avoid congestion around Kadawatha. The Central Expressway now covers the first section, after which the A1 climbs gently through Kegalle and the Kadugannawa pass.\n\nGood places to stop include the Pinnawala area and roadside cafés near Kadugannawa. In Kandy, parking near the lake fills up quickly on weekends, so check with your hotel in advance.\n\nThis article is general travel guidance written for SwiftDrive Rentals. Always check current road conditions before you travel.','road-trip','/images/blog-road.jpg'),
('driving-in-sri-lanka-tips','Driving in Sri Lanka: practical tips for visitors','Licences, road etiquette and what to expect on local roads.',
 E'Sri Lanka drives on the left. Visitors need either a Sri Lankan driving permit or an International Driving Permit endorsed by the Automobile Association of Ceylon.\n\nExpect buses and three-wheelers to stop suddenly. Use your horn briefly to signal when overtaking on narrow roads, and keep speeds moderate in towns.\n\nFuel stations are common along main roads, but fill up before driving into rural or hill areas.\n\nThis article is general guidance, not legal advice. Please confirm current licensing requirements before your trip.','driving-tips','/images/blog-tips.jpg'),
('weekend-near-negombo','A weekend near Negombo','Lagoons, fish markets and quiet beaches within an hour''s drive.',
 E'Negombo is a convenient base just 20 minutes from Bandaranaike International Airport.\n\nVisit the Negombo fish market early in the morning, take a boat ride on the lagoon, or drive north to the quieter beaches around Waikkal and Kochchikade.\n\nFor a half-day trip, Muthurajawela Marsh offers guided boat tours through wetland habitats.\n\nThis article was written for SwiftDrive Rentals as illustrative destination content.','destinations','/images/blog-beach.jpg');
