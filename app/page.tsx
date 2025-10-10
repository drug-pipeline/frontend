// app/page.tsx — Monochrome high-contrast landing (v2)
// - Floating Docs + Help (same style)
// - Single CTA moved above feature grid
// - Feature cards hover radius fixed (overflow-hidden)
// - Feature cards link to /documentation
// - Footer sticks to bottom

import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Drug Discovery Pipeline Web",
  description:
    "Build, run, and visualize drug-discovery workflows — simple, fast, and focused.",
};

export default function Home() {
  return <Landing />;
}

function Landing() {
  return (
    <main className="relative flex min-h-screen flex-col bg-white text-zinc-900">
      {/* Floating buttons (Docs + Help) */}
      <div className="fixed right-4 top-4 z-50 flex gap-2">
        <FloatingPill href="/docs" label="Docs" />
        <FloatingPill href="/help" label="Help" />
      </div>

      {/* HERO (monochrome geometry) */}
      <section className="relative overflow-hidden">
        {/* Big shapes */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-16rem] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full bg-zinc-900/10 blur-3xl" />
          <div className="absolute right-[-14rem] top-[6rem] h-[30rem] w-[30rem] rotate-12 rounded-[999px] bg-zinc-900/5 blur-2xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(24,24,27,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,27,0.08)_1px,transparent_1px)] bg-[size:32px_32px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4">
          <div className="mx-auto grid min-h-[52vh] place-items-center py-16 sm:py-24">
            <div className="max-w-3xl text-center">
              <Badge>Drug Discovery Pipeline</Badge>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
                Build. Run. Visualize.
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
                Compose end-to-end workflows for protein–ligand research,
                visualize structures, and review docking &amp; ADMET results — all in a clean, focused UI.
              </p>
            </div>
          </div>
        </div>

        {/* Concentric outline accent */}
        <div className="pointer-events-none absolute left-1/2 top-[20%] -z-10 -translate-x-1/2 opacity-60">
          <svg viewBox="0 0 600 600" width="760" height="760" className="max-w-none" aria-hidden>
            <circle cx="300" cy="300" r="250" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="2" />
            <circle cx="300" cy="300" r="200" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="2" />
            <circle cx="300" cy="300" r="150" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="2" />
            <circle cx="300" cy="300" r="100" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="2" />
          </svg>
        </div>
      </section>

      {/* SINGLE CTA — moved above feature grid */}
      <section className="relative mx-auto w-full max-w-7xl px-4 pb-12">
        <div className="grid place-items-center rounded-xl border-2 border-zinc-900 bg-white p-6 text-center">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Ready to get started?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Sign in if you already have an account — or create one to start building your first pipeline.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton href="/login">Sign in</PrimaryButton>
            <SecondaryButton href="/signup">Create account</SecondaryButton>
          </div>
        </div>
      </section>

      {/* FEATURE GRID — stronger cards, fixed hover radius, link to /documentation */}
      <section className="relative mx-auto w-full max-w-7xl px-4 pb-16">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureLink
            href="/documentation"
            title="Compose Pipelines"
            desc="Drag, connect, and iterate on modules to shape your workflow."
          />
          <FeatureLink
            href="/documentation"
            title="Visualize Structures"
            desc="Inspect PDBs, highlight residues, and link to sequences instantly."
          />
          <FeatureLink
            href="/documentation"
            title="Docking & Scoring"
            desc="Run Vina or custom scoring; review interactions and distances."
          />
          <FeatureLink
            href="/documentation"
            title="ADMET at a Glance"
            desc="Batch-evaluate molecules and compare properties side by side."
          />
        </ul>
      </section>

      <SiteFooter />
    </main>
  );
}

/* ── UI bits ─────────────────────────────────────────────────────────────── */

function FloatingPill({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border-2 border-zinc-900 bg-white/90 px-3 py-1.5 text-xs font-semibold tracking-tight text-zinc-900 shadow-[0_0_0_1px_rgba(0,0,0,0.06)_inset] hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
    >
      {label}
    </Link>
  );
}

function FeatureLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-xl border-2 border-zinc-900 bg-white p-5 transition"
      >
        {/* Hover fill (clipped by overflow + same radius) */}
        <div className="absolute inset-0 transition group-hover:bg-zinc-900" aria-hidden />
        <div className="relative">
          <h3 className="text-lg font-extrabold leading-tight tracking-tight group-hover:text-white">
            {title}
          </h3>
          <p className="mt-2 text-sm text-zinc-700 group-hover:text-zinc-200">{desc}</p>
        </div>
        {/* corner accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-2 -top-2 h-6 w-6 rounded-full border-2 border-zinc-900 bg-white transition group-hover:bg-zinc-900"
        />
      </Link>
    </li>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border-2 border-zinc-900 bg-white px-3 py-1 text-[11px] font-semibold tracking-tight text-zinc-900">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-900" />
      {children}
    </span>
  );
}

function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg border-2 border-zinc-900 bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black active:translate-y-[1px]"
    >
      {children}
    </Link>
  );
}

function SecondaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg border-2 border-zinc-900 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 active:translate-y-[1px]"
    >
      {children}
    </Link>
  );
}

function SiteFooter() {
  // Sticks to bottom via flex container (mt-auto)
  return (
    <footer className="mt-auto border-t border-zinc-200">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-zinc-500">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Logo small />
            <span>Drug Discovery Web</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-zinc-700">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-700">Terms</Link>
            <Link href="/contact" className="hover:text-zinc-700">Contact</Link>
          </div>
        </div>
        <p className="mt-6 text-xs">
          © {new Date().getFullYear()} Your Organization. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

function Logo({ small }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={small ? "h-5 w-5" : "h-7 w-7"} aria-hidden>
      <rect x="2" y="2" width="28" height="28" rx="7" fill="#000000" opacity="0.08" />
      <path
        d="M9 16c0-3.866 3.134-7 7-7s7 3.134 7 7-3.134 7-7 7-2.5-.5-3.5-1.5L9 23l1.5-3.5C9.5 18.5 9 17 9 16Z"
        fill="#000000"
        opacity="0.6"
      />
    </svg>
  );
}
