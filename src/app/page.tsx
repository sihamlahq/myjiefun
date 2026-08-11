import Image from "next/image";
import Link from "next/link";
import { EnquiryForm } from "@/components/enquiry-form";

const menu = [
  {
    name: "Jie Bowl",
    note: "Silky noodles, chili oil, soft egg, crunchy shallots",
  },
  {
    name: "Night Market Skewers",
    note: "Charred chicken, sesame glaze, pickles on the side",
  },
  {
    name: "Mango Fizz",
    note: "Fresh mango, lime leaf, sparkling soda",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-foam text-ink">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
          <Link
            href="/"
            className="section-title text-2xl text-foam md:text-3xl"
            aria-label="Myjiefun home"
          >
            Myjiefun
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-foam/90 md:flex">
            <a href="#menu" className="transition hover:text-mango">
              Menu
            </a>
            <a href="#story" className="transition hover:text-mango">
              Story
            </a>
            <a href="#visit" className="transition hover:text-mango">
              Visit
            </a>
          </nav>
          <a
            href="#visit"
            className="rounded-full bg-mango px-4 py-2 text-sm font-semibold text-ink transition hover:bg-mango-deep"
          >
            Reserve a table
          </a>
        </div>
      </header>

      <section className="relative min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/hero.jpg"
            alt="Shared plates and warm lights at Myjiefun"
            fill
            priority
            className="object-cover anim-drift"
            sizes="100vw"
          />
          <div className="hero-wash absolute inset-0 mix-blend-multiply opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/35 to-ink/20" />
          <div className="grain" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 md:px-8 md:pb-20">
          <p className="anim-rise mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-mango">
            Myjiefun
          </p>
          <h1 className="anim-rise anim-rise-delay-1 section-title max-w-3xl text-5xl text-foam sm:text-6xl md:text-8xl">
            Eat. Laugh.
            <br />
            Linger.
          </h1>
          <p className="anim-rise anim-rise-delay-2 mt-5 max-w-xl text-base leading-relaxed text-foam/90 md:text-lg">
            A hangout for shared plates, cold drinks, and unhurried evenings.
            Come hungry. Leave happier.
          </p>
          <div className="anim-rise anim-rise-delay-3 mt-8 flex flex-wrap gap-3">
            <a
              href="#menu"
              className="rounded-full bg-foam px-6 py-3 text-sm font-semibold text-ink transition hover:bg-mist"
            >
              See the menu
            </a>
            <a
              href="#visit"
              className="rounded-full border border-foam/40 px-6 py-3 text-sm font-semibold text-foam transition hover:border-foam hover:bg-foam/10"
            >
              Find us
            </a>
          </div>
        </div>
      </section>

      <section id="menu" className="relative bg-forest text-foam">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-[0.9fr_1.1fr] md:gap-16 md:px-8 md:py-28">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-mango">
              On the table
            </p>
            <h2 className="section-title text-4xl md:text-5xl">
              Small plates.
              <br />
              Big mood.
            </h2>
            <p className="mt-5 max-w-md text-foam/80">
              Built for sharing — bold flavors, easy pacing, and something cold
              within reach.
            </p>
          </div>
          <ul className="space-y-0 divide-y divide-foam/15 border-y border-foam/15">
            {menu.map((item) => (
              <li
                key={item.name}
                className="flex flex-col gap-1 py-6 transition hover:pl-2 md:flex-row md:items-baseline md:justify-between md:gap-8"
              >
                <h3 className="section-title text-2xl md:text-3xl">{item.name}</h3>
                <p className="max-w-sm text-sm text-foam/75 md:text-right">
                  {item.note}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="story" className="relative overflow-hidden bg-foam">
        <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-mango/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-jade/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-jade">
            Our story
          </p>
          <h2 className="section-title max-w-3xl text-4xl text-ink md:text-6xl">
            Fun first. Food that keeps up.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/75">
            Myjiefun started as a simple idea: a place where friends can drop in,
            order too much, and stay longer than planned. We cook for the table,
            not the timeline — and we keep the lights warm enough to linger.
          </p>
        </div>
      </section>

      <section id="visit" className="bg-ink text-foam">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:items-end md:gap-16 md:px-8 md:py-28">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-mango">
              Visit
            </p>
            <h2 className="section-title text-4xl md:text-5xl">
              Save a seat.
              <br />
              Bring your people.
            </h2>
            <p className="mt-5 max-w-md text-foam/75">
              Walk-ins welcome. Reservations recommended for weekends and groups
              of six or more.
            </p>
          </div>
          <div className="space-y-6 border-t border-foam/15 pt-8 md:border-t-0 md:pt-0">
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-foam/50">
                Hours
              </p>
              <p className="mt-2 text-lg">Tue–Sun · 12:00 – 22:00</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.16em] text-foam/50">
                Location
              </p>
              <p className="mt-2 text-lg">Coming soon — stay tuned</p>
            </div>
            <EnquiryForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-foam/10 bg-ink px-5 py-8 text-sm text-foam/55 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="section-title text-xl text-foam">Myjiefun</p>
          <p>© {new Date().getFullYear()} Myjiefun. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
