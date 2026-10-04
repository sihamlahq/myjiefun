-- Wedding dinner table V3 seating apply
-- Safe to re-run: upserts tables by table_number, upserts guests by name_en
begin;


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  'VIP',
  'VIP',
  'vip'::public.table_type,
  12,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  0,
  100,
  100
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '1',
  'Table 1',
  'family'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  1,
  240,
  100
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '2',
  'Table 2',
  'family'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  2,
  380,
  100
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '3',
  'Table 3',
  'family'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  3,
  520,
  100
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '4',
  'Table 4 (was 3A)',
  'family'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  4,
  660,
  100
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '5',
  'Table 5',
  'normal'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  5,
  800,
  100
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '6',
  'Table 6',
  'normal'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  6,
  100,
  240
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '7',
  'Table 7',
  'normal'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  7,
  240,
  240
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '8',
  'Table 8',
  'normal'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  8,
  380,
  240
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '9',
  'Table 9',
  'family'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  9,
  520,
  240
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '10',
  'Table 10',
  'family'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  10,
  660,
  240
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '11',
  'Table 11',
  'family'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  11,
  800,
  240
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '12',
  'Table 12',
  'family'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  12,
  100,
  380
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '13',
  'Table 13',
  'normal'::public.table_type,
  11,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  13,
  240,
  380
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '14',
  'Table 14 (was 13A)',
  'normal'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  14,
  380,
  380
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '15',
  'Table 15',
  'family'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  15,
  520,
  380
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '16',
  'Table 16',
  'family'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  16,
  660,
  380
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '17',
  'Table 17',
  'family'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  17,
  800,
  380
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '18',
  'Table 18',
  'family'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  18,
  100,
  520
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '19',
  'Table 19',
  'normal'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  19,
  240,
  520
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '20',
  'Table 20',
  'normal'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  20,
  380,
  520
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '21',
  'Table 21',
  'normal'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  21,
  520,
  520
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


insert into public.reception_tables (table_number, name, table_type, capacity, location, status, notes, sort_order, pos_x, pos_y)
values (
  '22',
  'Table 22',
  'normal'::public.table_type,
  10,
  '',
  'active'::public.table_status,
  'Wedding dinner table V3',
  22,
  660,
  520
)
on conflict (table_number) do update set
  name = excluded.name,
  table_type = excluded.table_type,
  capacity = greatest(public.reception_tables.capacity, excluded.capacity),
  status = 'active'::public.table_status,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  updated_at = now();


-- Fill missing seats for V3 tables
insert into public.seats (table_id, seat_number)
select t.id, s.n
from public.reception_tables t
cross join lateral generate_series(1, t.capacity) as s(n)
where t.notes = 'Wedding dinner table V3'
  and not exists (
    select 1 from public.seats x where x.table_id = t.id and x.seat_number = s.n
  );


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = 'VIP';
  if v_table_id is null then
    raise exception 'missing table VIP';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Ling Ah Meng') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Ling Ah Meng', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      true, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = true,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = 'VIP';
  if v_table_id is null then
    raise exception 'missing table VIP';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Soh Soo Yen') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Soh Soo Yen', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      true, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = true,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = 'VIP';
  if v_table_id is null then
    raise exception 'missing table VIP';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Ling Chia Jun') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Ling Chia Jun', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      true, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = true,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = 'VIP';
  if v_table_id is null then
    raise exception 'missing table VIP';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Ling Chia Wee') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Ling Chia Wee', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      true, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = true,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = 'VIP';
  if v_table_id is null then
    raise exception 'missing table VIP';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Ling May Loong') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Ling May Loong', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      true, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = true,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = 'VIP';
  if v_table_id is null then
    raise exception 'missing table VIP';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Ling Mey Seng') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Ling Mey Seng', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      true, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = true,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = 'VIP';
  if v_table_id is null then
    raise exception 'missing table VIP';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Ah Thye') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Ah Thye', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      true, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = true,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = 'VIP';
  if v_table_id is null then
    raise exception 'missing table VIP';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Daniel Chin') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Daniel Chin', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      true, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = true,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = 'VIP';
  if v_table_id is null then
    raise exception 'missing table VIP';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Esther Lee') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Esther Lee', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      true, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = true,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = 'VIP';
  if v_table_id is null then
    raise exception 'missing table VIP';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Lee Yih Chyun') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Lee Yih Chyun', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      true, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = true,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = 'VIP';
  if v_table_id is null then
    raise exception 'missing table VIP';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Chew Yong Kiew') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Chew Yong Kiew', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      true, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = true,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = 'VIP';
  if v_table_id is null then
    raise exception 'missing table VIP';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Lee Yeep Choon') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Lee Yeep Choon', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      true, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = true,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '1';
  if v_table_id is null then
    raise exception 'missing table 1';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('李业坚') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '李业坚', '李业坚', '', '', '',
      'confirmed'::public.rsvp_status, 6, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '李业坚' <> '' then '李业坚' else name_zh end,
      expected_count = 6,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '1';
  if v_table_id is null then
    raise exception 'missing table 1';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Lee Tai') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Lee Tai', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '1';
  if v_table_id is null then
    raise exception 'missing table 1';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Pot Lee') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Pot Lee', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '2';
  if v_table_id is null then
    raise exception 'missing table 2';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('李彩玲') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '李彩玲', '李彩玲', '', '', '',
      'confirmed'::public.rsvp_status, 8, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '李彩玲' <> '' then '李彩玲' else name_zh end,
      expected_count = 8,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '2';
  if v_table_id is null then
    raise exception 'missing table 2';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Wen Ley & Yih Tyng') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Wen Ley & Yih Tyng', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '3';
  if v_table_id is null then
    raise exception 'missing table 3';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('李永平') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '李永平', '李永平', '', '', '',
      'confirmed'::public.rsvp_status, 7, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '李永平' <> '' then '李永平' else name_zh end,
      expected_count = 7,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '3';
  if v_table_id is null then
    raise exception 'missing table 3';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('李云仙') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '李云仙', '李云仙', '', '', '',
      'confirmed'::public.rsvp_status, 3, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '李云仙' <> '' then '李云仙' else name_zh end,
      expected_count = 3,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '4';
  if v_table_id is null then
    raise exception 'missing table 4';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('李永和夫妇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '李永和夫妇', '李永和夫妇', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '李永和夫妇' <> '' then '李永和夫妇' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '4';
  if v_table_id is null then
    raise exception 'missing table 4';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('李彩风夫妇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '李彩风夫妇', '李彩风夫妇', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '李彩风夫妇' <> '' then '李彩风夫妇' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '4';
  if v_table_id is null then
    raise exception 'missing table 4';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('李永龙夫妇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '李永龙夫妇', '李永龙夫妇', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '李永龙夫妇' <> '' then '李永龙夫妇' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '4';
  if v_table_id is null then
    raise exception 'missing table 4';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('李永成夫妇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '李永成夫妇', '李永成夫妇', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '李永成夫妇' <> '' then '李永成夫妇' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '4';
  if v_table_id is null then
    raise exception 'missing table 4';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('李永江夫妇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '李永江夫妇', '李永江夫妇', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '李永江夫妇' <> '' then '李永江夫妇' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '5';
  if v_table_id is null then
    raise exception 'missing table 5';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Victor Chew & Yih Shyan''s Family') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Victor Chew & Yih Shyan''s Family', '', '', '', '',
      'confirmed'::public.rsvp_status, 9, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 9,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '6';
  if v_table_id is null then
    raise exception 'missing table 6';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Yap Yong Han') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Yap Yong Han', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '6';
  if v_table_id is null then
    raise exception 'missing table 6';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Agnes Lee') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Agnes Lee', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '6';
  if v_table_id is null then
    raise exception 'missing table 6';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('康宏宇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '康宏宇', '康宏宇', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '康宏宇' <> '' then '康宏宇' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '6';
  if v_table_id is null then
    raise exception 'missing table 6';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Eric Thong') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Eric Thong', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '6';
  if v_table_id is null then
    raise exception 'missing table 6';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Lim Eng Sing') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Lim Eng Sing', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '6';
  if v_table_id is null then
    raise exception 'missing table 6';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('许颂夫妇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '许颂夫妇', '许颂夫妇', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '许颂夫妇' <> '' then '许颂夫妇' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '6';
  if v_table_id is null then
    raise exception 'missing table 6';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Naa At Baan') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Naa At Baan', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '6';
  if v_table_id is null then
    raise exception 'missing table 6';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Chin KH秦閣宏') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Chin KH秦閣宏', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '6';
  if v_table_id is null then
    raise exception 'missing table 6';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('CHENG LONG') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'CHENG LONG', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '7';
  if v_table_id is null then
    raise exception 'missing table 7';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Emily Tee 郑慧琪合家') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Emily Tee 郑慧琪合家', '', '', '', '',
      'confirmed'::public.rsvp_status, 3, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 3,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '7';
  if v_table_id is null then
    raise exception 'missing table 7';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Liew De Lung夫妇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Liew De Lung夫妇', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '7';
  if v_table_id is null then
    raise exception 'missing table 7';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Vicky Tan 陈慧雯') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Vicky Tan 陈慧雯', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '7';
  if v_table_id is null then
    raise exception 'missing table 7';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Joy Lee 李柔彬') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Joy Lee 李柔彬', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '7';
  if v_table_id is null then
    raise exception 'missing table 7';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Loh Jia Yi') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Loh Jia Yi', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '7';
  if v_table_id is null then
    raise exception 'missing table 7';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Gan Kian Man') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Gan Kian Man', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '7';
  if v_table_id is null then
    raise exception 'missing table 7';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Wendy (Tai Yaan Baby Land)') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Wendy (Tai Yaan Baby Land)', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '8';
  if v_table_id is null then
    raise exception 'missing table 8';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Lee Ee Ping 李玉萍') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Lee Ee Ping 李玉萍', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '8';
  if v_table_id is null then
    raise exception 'missing table 8';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Wong Jing Mun 黄靖雯') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Wong Jing Mun 黄靖雯', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '8';
  if v_table_id is null then
    raise exception 'missing table 8';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Choo Siet Ding 朱雪婷') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Choo Siet Ding 朱雪婷', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '8';
  if v_table_id is null then
    raise exception 'missing table 8';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Piong Choon Tein 房春婷') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Piong Choon Tein 房春婷', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '8';
  if v_table_id is null then
    raise exception 'missing table 8';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Wong Xiao Pin 筱嫔') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Wong Xiao Pin 筱嫔', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '8';
  if v_table_id is null then
    raise exception 'missing table 8';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Cindy Tan夫妇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Cindy Tan夫妇', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '8';
  if v_table_id is null then
    raise exception 'missing table 8';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Lee Sheng Yong李生勇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Lee Sheng Yong李生勇', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '8';
  if v_table_id is null then
    raise exception 'missing table 8';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Chong Yen San 庄雁善') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Chong Yen San 庄雁善', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '8';
  if v_table_id is null then
    raise exception 'missing table 8';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Simie (Tai Yaan Baby Land)') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Simie (Tai Yaan Baby Land)', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '9';
  if v_table_id is null then
    raise exception 'missing table 9';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('大姑Family') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '大姑Family', '', '', '', '',
      'confirmed'::public.rsvp_status, 7, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 7,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '9';
  if v_table_id is null then
    raise exception 'missing table 9';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Ah Yoke') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Ah Yoke', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '9';
  if v_table_id is null then
    raise exception 'missing table 9';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Mei Choo') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Mei Choo', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '10';
  if v_table_id is null then
    raise exception 'missing table 10';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Yap Kok Seong (表哥)') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Yap Kok Seong (表哥)', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '10';
  if v_table_id is null then
    raise exception 'missing table 10';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('郭雅丽 （四舅母）') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '郭雅丽 （四舅母）', '郭雅丽 （四舅母）', '', '', '',
      'confirmed'::public.rsvp_status, 6, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '郭雅丽 （四舅母）' <> '' then '郭雅丽 （四舅母）' else name_zh end,
      expected_count = 6,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '10';
  if v_table_id is null then
    raise exception 'missing table 10';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('苏素雪 （二姨）') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '苏素雪 （二姨）', '苏素雪 （二姨）', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '苏素雪 （二姨）' <> '' then '苏素雪 （二姨）' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '11';
  if v_table_id is null then
    raise exception 'missing table 11';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('苏伟杰Wei Kit （表哥）') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '苏伟杰Wei Kit （表哥）', '', '', '', '',
      'confirmed'::public.rsvp_status, 6, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 6,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '11';
  if v_table_id is null then
    raise exception 'missing table 11';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('蘇碧玲 (表姐）') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '蘇碧玲 (表姐）', '蘇碧玲 (表姐）', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '蘇碧玲 (表姐）' <> '' then '蘇碧玲 (表姐）' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '11';
  if v_table_id is null then
    raise exception 'missing table 11';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('苏进森 （五舅）') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '苏进森 （五舅）', '苏进森 （五舅）', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '苏进森 （五舅）' <> '' then '苏进森 （五舅）' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '12';
  if v_table_id is null then
    raise exception 'missing table 12';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('苏伟武Wei Bu （表哥）') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '苏伟武Wei Bu （表哥）', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '12';
  if v_table_id is null then
    raise exception 'missing table 12';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('苏伟安Wei An （表哥）') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '苏伟安Wei An （表哥）', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '12';
  if v_table_id is null then
    raise exception 'missing table 12';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Soh Wai Kong 蘇偉光') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Soh Wai Kong 蘇偉光', '', '', '', '',
      'confirmed'::public.rsvp_status, 3, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 3,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '12';
  if v_table_id is null then
    raise exception 'missing table 12';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Soh Mei Yin 蘇美螢 （表姐）') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Soh Mei Yin 蘇美螢 （表姐）', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '12';
  if v_table_id is null then
    raise exception 'missing table 12';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Soh Wai Tuck 苏伟德 （表哥）') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Soh Wai Tuck 苏伟德 （表哥）', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '13';
  if v_table_id is null then
    raise exception 'missing table 13';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Anni Leong 梁艾莉') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Anni Leong 梁艾莉', '', '', '', '',
      'confirmed'::public.rsvp_status, 3, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 3,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '13';
  if v_table_id is null then
    raise exception 'missing table 13';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Marie Lim 林静婷') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Marie Lim 林静婷', '', '', '', '',
      'confirmed'::public.rsvp_status, 3, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 3,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '13';
  if v_table_id is null then
    raise exception 'missing table 13';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Kishar Wong') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Kishar Wong', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '13';
  if v_table_id is null then
    raise exception 'missing table 13';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('冰妹') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '冰妹', '冰妹', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '冰妹' <> '' then '冰妹' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '13';
  if v_table_id is null then
    raise exception 'missing table 13';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Lynn Low 刘美伶') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Lynn Low 刘美伶', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '13';
  if v_table_id is null then
    raise exception 'missing table 13';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Fifi 古翠欣') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Fifi 古翠欣', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '13';
  if v_table_id is null then
    raise exception 'missing table 13';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('阿赖/ 黎慧仪') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '阿赖/ 黎慧仪', '阿赖/ 黎慧仪', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '阿赖/ 黎慧仪' <> '' then '阿赖/ 黎慧仪' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '14';
  if v_table_id is null then
    raise exception 'missing table 14';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Wong Xiao Hui 黄晓慧夫妇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Wong Xiao Hui 黄晓慧夫妇', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '14';
  if v_table_id is null then
    raise exception 'missing table 14';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Wong Xiao Ying') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Wong Xiao Ying', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '14';
  if v_table_id is null then
    raise exception 'missing table 14';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Winky 马咏琪') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Winky 马咏琪', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '14';
  if v_table_id is null then
    raise exception 'missing table 14';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Ma Hin Mun 马庆敏') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Ma Hin Mun 马庆敏', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '14';
  if v_table_id is null then
    raise exception 'missing table 14';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Lee Chun Hung 李俊宏') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Lee Chun Hung 李俊宏', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '14';
  if v_table_id is null then
    raise exception 'missing table 14';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Alex Lee Jau Shing 李昭信') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Alex Lee Jau Shing 李昭信', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '14';
  if v_table_id is null then
    raise exception 'missing table 14';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Qiu Jie Ying') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Qiu Jie Ying', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '14';
  if v_table_id is null then
    raise exception 'missing table 14';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Ning Fung') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Ning Fung', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '14';
  if v_table_id is null then
    raise exception 'missing table 14';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Candy Loke Hui Teng') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Candy Loke Hui Teng', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '15';
  if v_table_id is null then
    raise exception 'missing table 15';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Mey Loong Family') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Mey Loong Family', '', '', '', '',
      'confirmed'::public.rsvp_status, 5, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 5,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '15';
  if v_table_id is null then
    raise exception 'missing table 15';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Mey Seng Family') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Mey Seng Family', '', '', '', '',
      'confirmed'::public.rsvp_status, 5, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 5,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '16';
  if v_table_id is null then
    raise exception 'missing table 16';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Jacky Soh') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Jacky Soh', '', '', '', '',
      'confirmed'::public.rsvp_status, 3, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 3,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '16';
  if v_table_id is null then
    raise exception 'missing table 16';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('宋友誠合家 （五姨丈）') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '宋友誠合家 （五姨丈）', '宋友誠合家 （五姨丈）', '', '', '',
      'confirmed'::public.rsvp_status, 4, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '宋友誠合家 （五姨丈）' <> '' then '宋友誠合家 （五姨丈）' else name_zh end,
      expected_count = 4,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '16';
  if v_table_id is null then
    raise exception 'missing table 16';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Shelly & 张展耀 （表姐）') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Shelly & 张展耀 （表姐）', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '16';
  if v_table_id is null then
    raise exception 'missing table 16';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Lucy (Rose) （表姐）') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Lucy (Rose) （表姐）', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '17';
  if v_table_id is null then
    raise exception 'missing table 17';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Yee Ping Family') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Yee Ping Family', '', '', '', '',
      'confirmed'::public.rsvp_status, 6, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 6,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '17';
  if v_table_id is null then
    raise exception 'missing table 17';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Foong 姑Family') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Foong 姑Family', '', '', '', '',
      'confirmed'::public.rsvp_status, 4, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 4,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '18';
  if v_table_id is null then
    raise exception 'missing table 18';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Yee Wen Family') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Yee Wen Family', '', '', '', '',
      'confirmed'::public.rsvp_status, 9, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 9,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '19';
  if v_table_id is null then
    raise exception 'missing table 19';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Ah Fu 李宜富') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Ah Fu 李宜富', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '19';
  if v_table_id is null then
    raise exception 'missing table 19';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('农汶毅夫妇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '农汶毅夫妇', '农汶毅夫妇', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '农汶毅夫妇' <> '' then '农汶毅夫妇' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '19';
  if v_table_id is null then
    raise exception 'missing table 19';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('陈联顺') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '陈联顺', '陈联顺', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '陈联顺' <> '' then '陈联顺' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '19';
  if v_table_id is null then
    raise exception 'missing table 19';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Robson Sooi 徐德权夫妇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Robson Sooi 徐德权夫妇', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '19';
  if v_table_id is null then
    raise exception 'missing table 19';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Wong Kal Man 黄家铭') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Wong Kal Man 黄家铭', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '19';
  if v_table_id is null then
    raise exception 'missing table 19';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Steven') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Steven', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '19';
  if v_table_id is null then
    raise exception 'missing table 19';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('李奇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '李奇', '李奇', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '李奇' <> '' then '李奇' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '19';
  if v_table_id is null then
    raise exception 'missing table 19';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Jing Yit 方靖毓') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Jing Yit 方靖毓', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '20';
  if v_table_id is null then
    raise exception 'missing table 20';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Law Weng Ki 刘永齐 &Vonn') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Law Weng Ki 刘永齐 &Vonn', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '20';
  if v_table_id is null then
    raise exception 'missing table 20';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('QING YANG') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'QING YANG', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '20';
  if v_table_id is null then
    raise exception 'missing table 20';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Yap Jing Bing夫妇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Yap Jing Bing夫妇', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '20';
  if v_table_id is null then
    raise exception 'missing table 20';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Jojo Tan 川洲') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Jojo Tan 川洲', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '20';
  if v_table_id is null then
    raise exception 'missing table 20';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Phat') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Phat', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '20';
  if v_table_id is null then
    raise exception 'missing table 20';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Phon') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Phon', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '20';
  if v_table_id is null then
    raise exception 'missing table 20';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Aaric Lai 业苈') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Aaric Lai 业苈', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '20';
  if v_table_id is null then
    raise exception 'missing table 20';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Lim Kim Tat 林欽逹') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Lim Kim Tat 林欽逹', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '21';
  if v_table_id is null then
    raise exception 'missing table 21';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('黄荟秦 & 刘家僥合家') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      '黄荟秦 & 刘家僥合家', '', '', '', '',
      'confirmed'::public.rsvp_status, 3, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 3,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '21';
  if v_table_id is null then
    raise exception 'missing table 21';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Lim Chan Tong 林镇东') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Lim Chan Tong 林镇东', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '21';
  if v_table_id is null then
    raise exception 'missing table 21';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Joe Lee 李耀祖') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Joe Lee 李耀祖', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '21';
  if v_table_id is null then
    raise exception 'missing table 21';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Wenart/ Tony夫妇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Wenart/ Tony夫妇', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '21';
  if v_table_id is null then
    raise exception 'missing table 21';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Li Chin') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Li Chin', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '21';
  if v_table_id is null then
    raise exception 'missing table 21';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Chea Cheng (Chocolate)') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Chea Cheng (Chocolate)', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '21';
  if v_table_id is null then
    raise exception 'missing table 21';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Lim Chun Tat 林俊达') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Lim Chun Tat 林俊达', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '22';
  if v_table_id is null then
    raise exception 'missing table 22';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Danny Lim 林道俊') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Danny Lim 林道俊', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '22';
  if v_table_id is null then
    raise exception 'missing table 22';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Sharly Chin陈慧玲') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Sharly Chin陈慧玲', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '22';
  if v_table_id is null then
    raise exception 'missing table 22';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Keong') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Keong', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '22';
  if v_table_id is null then
    raise exception 'missing table 22';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Eric Lim Kuok Yuan') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Eric Lim Kuok Yuan', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '22';
  if v_table_id is null then
    raise exception 'missing table 22';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Mervin Wong') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Mervin Wong', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '22';
  if v_table_id is null then
    raise exception 'missing table 22';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Wen Zi 陈文欣/ 颜志伟') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Wen Zi 陈文欣/ 颜志伟', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '22';
  if v_table_id is null then
    raise exception 'missing table 22';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Chui Chui 陈翠翠') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Chui Chui 陈翠翠', '', '', '', '',
      'confirmed'::public.rsvp_status, 1, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 1,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;


do $$
declare
  v_table_id uuid;
  v_guest_id uuid;
begin
  select id into v_table_id from public.reception_tables where table_number = '22';
  if v_table_id is null then
    raise exception 'missing table 22';
  end if;

  select id into v_guest_id from public.guests where lower(name_en) = lower('Fung Sheng Yong 冯胜勇') limit 1;

  if v_guest_id is null then
    insert into public.guests (
      guest_code, name_en, name_zh, nickname, phone, email,
      rsvp_status, expected_count, attendance_status, table_id, seat_id,
      is_vip, is_walk_in, dietary, relationship, category, notes, custom_fields
    ) values (
      'G-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
      'Fung Sheng Yong 冯胜勇', '', '', '', '',
      'confirmed'::public.rsvp_status, 2, 'not_arrived'::public.attendance_status, v_table_id, null,
      false, false, '', '', 'wedding-dinner-v3', 'Imported from Wedding dinner table V3', '{}'::jsonb
    );
  else
    update public.guests set
      name_zh = case when '' <> '' then '' else name_zh end,
      expected_count = 2,
      rsvp_status = 'confirmed'::public.rsvp_status,
      table_id = v_table_id,
      is_vip = false,
      category = 'wedding-dinner-v3',
      notes = 'Imported from Wedding dinner table V3',
      updated_at = now()
    where id = v_guest_id;
  end if;
end $$;

commit;

-- Verify:
select t.table_number, count(g.id) as parties, coalesce(sum(g.expected_count),0) as pax, t.capacity
from public.reception_tables t
left join public.guests g on g.table_id = t.id
where t.notes = 'Wedding dinner table V3'
group by t.table_number, t.capacity, t.sort_order
order by t.sort_order, t.table_number;