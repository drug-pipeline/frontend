// app/page.tsx — CTA 강조 + 컴팩트 푸터 (v4)

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

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-16rem] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full bg-zinc-900/10 blur-3xl" />
          <div className="absolute right-[-14rem] top-[6rem] h-[30rem] w-[30rem] rotate-12 rounded-[999px] bg-zinc-900/5 blur-2xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(24,24,27,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,27,0.06)_1px,transparent_1px)] bg-[size:32px_32px]" />
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

        <div className="pointer-events-none absolute left-1/2 top-[20%] -z-10 -translate-x-1/2 opacity-60">
          <svg viewBox="0 0 600 600" width="760" height="760" className="max-w-none" aria-hidden>
            <circle cx="300" cy="300" r="250" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="2" />
            <circle cx="300" cy="300" r="200" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="2" />
            <circle cx="300" cy="300" r="150" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="2" />
            <circle cx="300" cy="300" r="100" fill="none" stroke="currentColor" strokeOpacity="0.06" strokeWidth="2" />
          </svg>
        </div>
      </section>

      {/* CTA — buttons first, checklist later */}
      <section className="relative mx-auto w-full max-w-7xl px-4 pb-12">
        <div className="relative rounded-2xl p-[1px]">
          {/* subtle gradient ring */}
          <div className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_120deg,rgba(0,0,0,0.1),rgba(0,0,0,0.04),rgba(0,0,0,0.12))]" />
          <div className="relative rounded-2xl bg-white/80 p-6 backdrop-blur-sm sm:p-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Ready to get started?
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Jump in now — sign in or create your account.
              </p>

              {/* ✨ Button focus zone */}
              <div className="relative mx-auto mt-6 max-w-xl">
                {/* soft spotlight behind buttons */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 rounded-xl"
                  style={{
                    background:
                      "radial-gradient(40% 60% at 50% 40%, rgba(0,0,0,0.06), transparent 70%)",
                  }}
                />
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <PrimaryButton href="/pipeline" size="lg">
                    Sign in
                  </PrimaryButton>
                  <SecondaryButton href="/signup" size="lg">
                    Create account
                  </SecondaryButton>
                </div>
              </div>

              {/* divider */}
              <div className="mx-auto mt-6 h-px w-24 bg-zinc-200/80" />

              {/* compact checklist (smaller + 아래로 이동) */}
              <ul className="mx-auto mt-4 grid max-w-2xl gap-2 text-left sm:grid-cols-3 sm:gap-3">
                <CheckItem small>Drag &amp; connect modules</CheckItem>
                <CheckItem small>Structure visualization</CheckItem>
                <CheckItem small>Docking &amp; ADMET review</CheckItem>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE GRID — keep as is (you said it's great!) */}
      <section className="relative mx-auto w-full max-w-7xl px-4 pb-16">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            href="/documentation"
            icon={<IconFlow />}
            title="Compose Pipelines"
            desc="Drag, connect, and iterate on modules to shape your workflow."
          />
          <FeatureCard
            href="/documentation"
            icon={<IconProtein />}
            title="Visualize Structures"
            desc="Inspect PDBs, highlight residues, and link to sequences instantly."
          />
          <FeatureCard
            href="/documentation"
            icon={<IconDock />}
            title="Docking & Scoring"
            desc="Run Vina or custom scoring; review interactions and distances."
          />
          <FeatureCard
            href="/documentation"
            icon={<IconLab />}
            title="ADMET at a Glance"
            desc="Batch-evaluate molecules and compare properties side by side."
          />
        </ul>
      </section>

      {/* FOOTER — ultra-compact, no brand label */}
      <SiteFooter />
    </main>
  );
}

/* ── UI bits ─────────────────────────────────────────────────────────────── */

function FloatingPill({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-xs font-semibold tracking-tight text-zinc-900 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-300"
    >
      {label}
    </Link>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-tight text-zinc-900 shadow-sm">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-900" />
      {children}
    </span>
  );
}

function PrimaryButton({
  href,
  children,
  size = "md",
}: {
  href: string;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  const cls =
    size === "lg"
      ? "px-7 py-3.5 text-[15px]"
      : "px-6 py-3 text-sm";
  return (
    <Link
      href={href}
      className={`group inline-flex min-w-[10rem] items-center justify-center gap-1.5 rounded-lg bg-zinc-900 text-white shadow-sm transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-zinc-400 active:translate-y-[1px] ${cls}`}
    >
      {children}
      <ArrowRight className="size-4 translate-x-0 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function SecondaryButton({
  href,
  children,
  size = "md",
}: {
  href: string;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  const cls =
    size === "lg"
      ? "px-7 py-3.5 text-[15px]"
      : "px-6 py-3 text-sm";
  return (
    <Link
      href={href}
      className={`inline-flex min-w-[10rem] items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-300 active:translate-y-[1px] ${cls}`}
    >
      {children}
    </Link>
  );
}

function CheckItem({
  children,
  small = false,
}: {
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-md border border-zinc-200/70 bg-white/70 px-3 py-2 shadow-sm ${
        small ? "text-[12px]" : "text-sm"
      }`}
    >
      <IconCheck className="size-4" />
      <span className="text-zinc-700">{children}</span>
    </li>
  );
}

/* Feature Card */
function FeatureCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group relative block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm ring-1 ring-transparent transition hover:-translate-y-0.5 hover:shadow-md hover:ring-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-2 -top-2 h-6 w-6 rounded-full bg-zinc-900/5 transition group-hover:bg-zinc-900/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(30rem 30rem at 80% -10%, rgba(0,0,0,0.05), transparent 60%)",
          }}
        />
        <div className="relative">
          <div className="mb-3 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 shadow-sm">
            <span className="opacity-80">{icon}</span>
          </div>
          <h3 className="text-lg font-extrabold leading-tight tracking-tight">
            {title}
          </h3>
          <p className="mt-2 text-sm text-zinc-700">{desc}</p>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-zinc-900">
            <span>Learn more</span>
            <ArrowRight className="size-4 translate-x-0 transition group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
    </li>
  );
}

/* Icons */
function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path d="M16.7 5.7l-7.7 7.7-3.7-3.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconFlow() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path d="M6 6h4v4H6zM14 14h4v4h-4z" fill="currentColor" opacity=".15" />
      <path d="M10 8h4m0 0v4m0 0h4M6 8h0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconProtein() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <circle cx="7" cy="7" r="3" fill="currentColor" opacity=".15" />
      <circle cx="17" cy="17" r="3" fill="currentColor" opacity=".15" />
      <path d="M9.5 9.5l5 5M4 12c4 0 12 0 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconDock() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <circle cx="6" cy="12" r="2" fill="currentColor" opacity=".15" />
      <circle cx="18" cy="12" r="2" fill="currentColor" opacity=".15" />
      <path d="M8 12h8M12 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconLab() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path d="M9 3v5l-4 8a4 4 0 003.6 5.7h6.8A4 4 0 0019 16l-4-8V3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 8h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* Ultra-compact footer (no brand) */
function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200/80">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 text-xs text-zinc-500">
        <div className="flex flex-wrap gap-4">
          <Link href="/privacy" className="hover:text-zinc-700">Privacy</Link>
          <Link href="/terms" className="hover:text-zinc-700">Terms</Link>
          <Link href="/contact" className="hover:text-zinc-700">Contact</Link>
        </div>
        <span>© {new Date().getFullYear()} KRIBB</span>
      </div>
    </footer>
  );
}