# Myjiefun Wedding Guest & Seating Manager

Premium realtime wedding operations app for **Myjiefun**: guest directory, RSVP,
mobile check-in, table planning, ballroom floor plan, reports, settings, and TV
reception mode.

This project is intentionally separate from Sihamla, The Agarwood, and Venus
Makeup Artist. Use a dedicated Supabase project, Vercel project, and domain.

## Stack

- Next.js 15 App Router
- TypeScript strict mode
- Tailwind CSS v4
- Supabase Auth, Postgres, RLS, and Realtime
- Recharts, Fuse.js, dnd-kit, sonner, xlsx, jsPDF

## Product areas

| Route | Purpose |
| --- | --- |
| `/dashboard` | Attendance, RSVP, occupancy, and recent arrival analytics |
| `/guests` | Searchable guest CRUD, filters, CSV import/export, bulk selection |
| `/check-in` | Mobile-first reception check-in, group/partial entry, walk-ins |
| `/tables` | Table create/edit/duplicate/delete, capacity and seat controls |
| `/seating` | Drag-and-drop guest assignment between tables/unassigned |
| `/floor-plan` | Draggable ballroom canvas with table positions and guest popover |
| `/reports` | Attendance, occupancy, RSVP, unassigned, VIP, no-show, walk-in, timeline, group reports |
| `/settings` | Wedding details, theme CSS vars, guest/table/attendance settings |
| `/reception` | Full-screen TV mode with realtime arrivals and table readiness |

The root route redirects to `/dashboard`.

## Supabase setup

1. Create a new Supabase project named **`myjiefun`**.
2. Apply the schema migration:

   ```bash
   supabase db push
   ```

   Or run `supabase/migrations/20260811150000_wedding_guest_manager.sql` in the SQL
   editor.

3. Create staff users in Supabase Auth. New users receive a `profiles` row.
   Update profile roles as needed:
   - `admin`
   - `manager`
   - `checkin_staff`
   - `viewer`

4. Enable Realtime for the public tables if your Supabase project requires
   manual confirmation after the migration.

## Environment variables

```bash
cp .env.example .env.local
```

Fill in values from the **myjiefun** Supabase project:

```env
NEXT_PUBLIC_SITE_URL=https://myjiefun.com
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_PROJECT_ID=myjiefun
```

`SUPABASE_SERVICE_ROLE_KEY` is only required for the seed script and trusted
server-side maintenance.

Pages render setup instructions instead of mock data when Supabase env vars are
missing, so `next build` can succeed in unconfigured environments.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed demo data

The seed script uses the Supabase service role key and clears wedding data before
inserting deterministic sample data:

- 40 reception tables
- 400 seats
- 12 guest groups
- 400 guests with varied RSVP, attendance, VIP, walk-in, checked-in, and
  unassigned states
- Check-in timeline events for already-arrived guests

Run:

```bash
npm run seed
```

The script is intended for development/staging projects. Do not run it against
production data unless you intentionally want to replace guest/table/group data.

## Build and checks

```bash
npm run build
npm run lint
```

## APIs

- `GET /api/health` -> `{ "ok": true }`
- `GET /api/export?type=guests` -> authenticated CSV export of guests

## Deployment

1. Create a Vercel project named **`myjiefun`**.
2. Connect the `sihamlahq/myjiefun` repository.
3. Add the environment variables above.
4. Deploy.
5. Attach `myjiefun.com` and `www.myjiefun.com` in Vercel Domains.
