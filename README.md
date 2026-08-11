# Myjiefun

Brand website for **Myjiefun** — a hangout for shared plates, cold drinks, and easy evenings.

**Domain:** [https://myjiefun.com](https://myjiefun.com)

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS 4

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Domain & deploy

1. Deploy this folder to [Vercel](https://vercel.com) (or Netlify).
2. In the project → **Domains**, add `myjiefun.com` and `www.myjiefun.com`.
3. At your domain registrar, point DNS:
   - `A` / `ALIAS` / `CNAME` for apex → Vercel (follow their DNS instructions)
   - `CNAME` `www` → `cname.vercel-dns.com`
4. Set env `NEXT_PUBLIC_SITE_URL=https://myjiefun.com` in the host dashboard.

Until the custom domain is connected, Vercel will also give a free URL like `https://myjiefun.vercel.app`.
