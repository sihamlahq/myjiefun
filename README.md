# Myjiefun

Independent website for **Myjiefun** (`https://myjiefun.com`).

This project is **separate** from:

| Brand | Keep separate |
| --- | --- |
| Sihamla | `v0-sihamla` repo + its Supabase + Vercel |
| The Agarwood | `theagarwood.com` + its own projects |
| Venus Makeup Artist | `venusmakeupartist` repo + its Supabase + Vercel |

Do **not** reuse those Supabase keys, Vercel projects, or domains.

## 1. Create a new Supabase project named `myjiefun`

1. Open [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → name it exactly **`myjiefun`**
3. In **SQL Editor**, run in order:
   - `supabase/migrations/20260811140000_enquiries.sql`
   - `supabase/migrations/20260811140100_app_settings.sql`
4. Copy **Project URL**, **anon key**, and **service_role key** from **Project Settings → API**

## 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in Myjiefun-only values:

```env
NEXT_PUBLIC_SITE_URL=https://myjiefun.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 4. Create a new Vercel project named `myjiefun`

1. Push this app to the **`sihamlahq/myjiefun`** GitHub repo (not Sihamla / Venus / Agarwood)
2. In [vercel.com](https://vercel.com) → **Add New Project**
3. Import **`sihamlahq/myjiefun`**
4. Set the Vercel project name to **`myjiefun`**
5. Root directory: repository root (this app)
6. Add the same env vars under **Settings → Environment Variables**
7. Deploy

After deploy you get a URL like `https://myjiefun.vercel.app`.

## 5. Attach domain `myjiefun.com`

1. Vercel project **`myjiefun`** → **Domains**
2. Add `myjiefun.com` and `www.myjiefun.com`
3. At your registrar, point DNS to Vercel

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS 4
- Supabase (enquiries + site settings)

## API

- `POST /api/enquiries` — public reservation / contact form → `enquiries` table in the **myjiefun** Supabase project
