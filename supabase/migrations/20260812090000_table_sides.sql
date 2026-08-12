-- Groom side (男方) and bride side (女方) table types for seating color coding.
do $$ begin
  alter type public.table_type add value if not exists 'groom_side';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.table_type add value if not exists 'bride_side';
exception when duplicate_object then null;
end $$;
