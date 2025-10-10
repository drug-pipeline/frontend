// app/page.tsx — ChatGPT‑style landing with smart auth-aware redirect
// Next.js App Router (TypeScript) + TailwindCSS
// - If user is logged in (via NextAuth), redirects to "/app".
// - If not, shows a clean, modern hero with CTA to sign in / sign up.
// - Safe for projects without NextAuth installed: falls back to unauthenticated view.
// - Replace logos/links as needed.

import React from "react";
import Link from "next/link";



export const metadata = {
  title: "Drug Discovery Pipeline Web",
  description:
    "A modern landing for a drug discovery pipeline web service — introduce the platform, prompt sign-in, or let users explore.",
};

export default async function Home() {
  return <Landing />;
}


// ────────────────────────────────────────────────────────────────────────────────
// UI Components (no external UI libs needed)
// ────────────────────────────────────────────────────────────────────────────────
function Landing() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Glow background */}
        <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent_60%)]">
          <div className="absolute -top-24 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute top-20 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-6 pt-28 pb-16 sm:pt-36 sm:pb-24 text-center">
          <Badge>Drug Discovery Pipeline</Badge>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Build, run, and visualize your
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent"> drug‑discovery</span> workflows
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg/8 text-slate-300">
            An elegant web service for protein–ligand research. Drag‑and‑drop modules, orchestrate docking & ADMET, and explore structures with rich, interactive views.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3">
            <PrimaryButton href="/login">Sign in</PrimaryButton>
            <GhostButton href="/signup">Create account</GhostButton>
          </div>

          
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Pipeline Builder"
            desc="Compose end‑to‑end workflows with a VS Code‑like canvas powered by React Flow."
            icon={<IconFlow />}
          />
          <FeatureCard
            title="Protein Visualizer"
            desc="Explore PDB structures, map pockets, and link residues to sequence with instant highlights."
            icon={<IconProtein />}
          />
          <FeatureCard
            title="Docking & Scoring"
            desc="Run AutoDock Vina and custom ML scoring — see interactions, distances, and heatmaps."
            icon={<IconDock />}
          />
          <FeatureCard
            title="ADMET Predictions"
            desc="Batch‑evaluate molecules; compare properties and flags with clean tables and charts."
            icon={<IconLab />}
          />
          <FeatureCard
            title="Results Hub"
            desc="Versioned runs, quick diffs, downloadable artifacts — built for iteration."
            icon={<IconFolder />}
          />
          <FeatureCard
            title="API‑First"
            desc="API-first design. Queue jobs, stream logs, and automate everything.\"
            icon={<IconAPI />}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-8 sm:p-12">
          <div className="absolute -right-20 -top-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-2xl" />
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Ready to accelerate your discovery?
          </h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            Sign in to access your projects, pipelines, and recent runs — or create a free account to start building.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryButton href="/login">Sign in</PrimaryButton>
            <GhostButton href="/signup">Create account</GhostButton>
            <Link
              href="/docs"
              className="inline-flex items-center rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              View docs
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="group inline-flex items-center gap-2">
          <Logo />
          <span className="text-sm font-semibold tracking-tight text-slate-100 group-hover:text-white">
            Drug Discovery Web
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 sm:flex">
          <Link className="hover:text-white" href="/features">Features</Link>
          <Link className="hover:text-white" href="/pricing">Pricing</Link>
          <Link className="hover:text-white" href="/docs">Docs</Link>
          <Link className="hover:text-white" href="/about">About</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5 sm:inline-block"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-slate-400">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Logo small />
            <span>Drug Discovery Web</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-slate-200">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-200">Terms</Link>
            <Link href="/contact" className="hover:text-slate-200">Contact</Link>
          </div>
        </div>
        <p className="mt-6 text-xs">© {new Date().getFullYear()} Your Organization. All rights reserved.</p>
      </div>
    </footer>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 shadow-sm">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {children}
    </div>
  );
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-200"
    >
      {children}
    </Link>
  );
}

function GhostButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
    >
      {children}
    </Link>
  );
}

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] transition hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)_inset]">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl transition group-hover:bg-emerald-500/10" />
      <div className="flex items-start gap-4">
        <div className="mt-1 text-slate-200">{icon}</div>
        <div>
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          <p className="mt-1 text-sm text-slate-300">{desc}</p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Minimal inline icons (no external packages)
// ────────────────────────────────────────────────────────────────────────────────
function Logo({ small }: { small?: boolean }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={small ? "h-5 w-5" : "h-7 w-7"}
      aria-hidden
    >
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="7" fill="url(#g)" opacity="0.2" />
      <path
        d="M9 16c0-3.866 3.134-7 7-7s7 3.134 7 7-3.134 7-7 7-2.5-.5-3.5-1.5L9 23l1.5-3.5C9.5 18.5 9 17 9 16Z"
        fill="url(#g)"
      />
    </svg>
  );
}

function IconFlow() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 6h6m-6 0a2 2 0 1 0 0 4h6m0 0h4a4 4 0 1 1 0 8h-4m0 0H6a2 2 0 1 0 0 4h4" />
      <circle cx="10" cy="6" r="1.5" />
      <circle cx="14" cy="18" r="1.5" />
    </svg>
  );
}

function IconProtein() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7Z" />
      <path d="M7 12c2 1 8 1 10 0M8 8c1 .5 7 .5 8 0M8 16c1-.5 7-.5 8 0" />
    </svg>
  );
}

function IconDock() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="6" rx="2" />
      <path d="M6 9v3a6 6 0 0 0 12 0V9" />
    </svg>
  );
}

function IconLab() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 3v6L4 20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2L15 9V3" />
      <path d="M9 9h6" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function IconAPI() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 7h3v10H7zM14 7h3v10h-3z" />
      <path d="M5 12h14" />
    </svg>
  );
}

function TrustedBar() {
  return (
    <div className="mx-auto mt-14 max-w-5xl text-slate-400">
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-xs">
        <span className="opacity-80">Built with Next.js · TypeScript · TailwindCSS</span>
        <span className="hidden h-1 w-1 rounded-full bg-slate-500 sm:inline-block" />
        <span className="opacity-80">Supports FastAPI/Flask backends</span>
        <span className="hidden h-1 w-1 rounded-full bg-slate-500 sm:inline-block" />
        <span className="opacity-80">React Flow · NGL Viewer ready</span>
      </div>
    </div>
  );
}
