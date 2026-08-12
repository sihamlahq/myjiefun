-- Optional dedicated column for red packet amounts (custom_fields also supported in app).
alter table public.guests
  add column if not exists red_packet_amount numeric(12, 2);

create index if not exists guests_red_packet_amount_idx
  on public.guests (red_packet_amount)
  where red_packet_amount is not null;

insert into public.app_settings (key, value)
values ('redPacket', '{"passcode":"0000"}'::jsonb)
on conflict (key) do nothing;
