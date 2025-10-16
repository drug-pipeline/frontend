"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type FormState = {
  username: string;
  password: string;
  email: string;
  institution: string;
  country: string;
  role: string;
  purpose: string;
  agree: boolean;
  newsletter: boolean;
};

const ALLOWED_EMAIL_SUFFIXES = [
  ".ac",
  ".edu",
  ".ac.kr",
  ".edu.kr",
  ".re",
  ".research",
  ".gov",
  ".go.kr",
];

export default function SignupPage() {
  return <Signup />;
}

function Signup() {
  const [form, setForm] = useState<FormState>({
    username: "",
    password: "",
    email: "",
    institution: "",
    country: "",
    role: "",
    purpose: "",
    agree: false,
    newsletter: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const passwordStrength = useMemo(() => {
    const v = form.password;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[a-z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    return Math.min(score, 4); // 0~4
  }, [form.password]);

  const emailOk = useMemo(() => {
    const e = form.email.trim().toLowerCase();
    if (!e || !e.includes("@") || e.startsWith("@")) return false;
    return ALLOWED_EMAIL_SUFFIXES.some((suf) => e.endsWith(suf));
  }, [form.email]);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.username) e.username = "Required";
    if (!form.password) e.password = "Required";
    if (!form.email) e.email = "Required";
    if (form.email && !emailOk)
      e.email = "Use a school/institution email (e.g., *.ac, *.edu, *.ac.kr)";
    if (!form.agree) e.agree = "You must agree to the Terms & Privacy";
    return e;
  }, [form, emailOk]);

  function onChange<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function onSubmit(e?: React.SyntheticEvent) {
    e?.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length === 0) {
      // TODO: Hook up to your API later
      console.log("Signup payload:", form);
      alert(
        "Account created (demo).\n\nA verification email will be sent to your institutional address."
      );
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-white text-zinc-900">
      {/* Inject base styles for .input class */}
      <StyleInjector />

      {/* Floating buttons (Docs + Help) */}
      <div className="fixed right-4 top-4 z-50 flex gap-2">
        <FloatingPill href="/docs" label="Docs" />
        <FloatingPill href="/help" label="Help" />
      </div>

      {/* Background ornaments */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-16rem] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full bg-zinc-900/10 blur-3xl" />
        <div className="absolute right-[-14rem] top-[6rem] h-[30rem] w-[30rem] rotate-12 rounded-[999px] bg-zinc-900/5 blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(24,24,27,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,27,0.06)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* Header / Hero */}
      <section className="relative mx-auto w-full max-w-7xl px-4">
        <div className="mx-auto grid min-h-[28vh] place-items-center py-12 sm:py-16">
          <div className="max-w-3xl text-center">
            <Badge>Create your account</Badge>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Join the Pipeline
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
              Sign up with your institutional email to start building, running,
              and visualizing workflows.
            </p>
          </div>
        </div>
      </section>

      {/* Form Card */}
      <section className="relative mx-auto w-full max-w-7xl px-4 pb-16">
        <div className="relative rounded-2xl p-[1px]">
          <div className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_120deg,rgba(0,0,0,0.1),rgba(0,0,0,0.04),rgba(0,0,0,0.12))]" />
          <div className="relative grid gap-8 rounded-2xl bg-white/80 p-6 backdrop-blur-sm sm:grid-cols-5 sm:p-8">
            {/* Left: Email Verification (softer tone) */}
            <div className="sm:col-span-2">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-tight text-zinc-900 shadow-sm">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-900" />
                  Email verification (after sign-up)
                </div>
                <h3 className="mt-3 text-lg font-extrabold leading-tight tracking-tight">
                  Use your institutional email
                </h3>
                <p className="mt-2 text-sm text-zinc-700">
                  To help keep research spaces trustworthy and secure,
                  we’ll send a brief verification link to your school or institute address
                  after you sign up. Supported academic/research domains include{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5">.ac</code>,{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5">.edu</code>,{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5">.ac.kr</code>,{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5">.edu.kr</code>,{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5">.re</code>,{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5">.research</code>,{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5">.gov</code>,{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5">.go.kr</code>.
                </p>

                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <IconCheck className="size-4" />
                    Protects your account and project data
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck className="size-4" />
                    Helps keep academic/industry spaces healthy
                  </li>
                </ul>

                <div className="mt-5 h-px w-full bg-zinc-200/80" />

                <p className="mt-4 text-xs text-zinc-600">
                  Tip: If you have multiple addresses, use the one issued by your
                  school or research organization for a smoother verification.
                </p>
              </div>
            </div>

            {/* Right: Form */}
            <form
              onSubmit={onSubmit}
              className="sm:col-span-3"
              noValidate
              aria-labelledby="signupFormTitle"
            >
              <h2 id="signupFormTitle" className="sr-only">
                Sign up form
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Username */}
                <Field
                  label="Username (ID)"
                  required
                  hint="3–24 characters; letters, digits, underscore"
                  invalid={submitted && !!errors.username}
                  errorMsg={errors.username}
                >
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    className={`input ${INPUT_EMPH}`}
                    value={form.username}
                    onChange={(e) => onChange("username", e.target.value)}
                    pattern="^[A-Za-z0-9_]{3,24}$"
                    required
                  />
                </Field>

                {/* Password */}
                <Field
                  label="Password"
                  required
                  hint="At least 8 characters; mix of cases, numbers, symbols recommended"
                  invalid={submitted && !!errors.password}
                  errorMsg={errors.password}
                >
                  <input
                    type="password"
                    name="new-password"
                    autoComplete="new-password"
                    className={`input ${INPUT_EMPH}`}
                    value={form.password}
                    onChange={(e) => onChange("password", e.target.value)}
                    required
                  />
                  <PasswordStrength strength={passwordStrength} />
                </Field>

                {/* Email */}
                <Field
                  label="Institutional Email"
                  required
                  hint="Must end with .ac, .edu, .ac.kr, .edu.kr, .re, .research, .gov, .go.kr"
                  invalid={submitted && !!errors.email}
                  errorMsg={errors.email}
                  full
                >
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    className={`input ${INPUT_EMPH}`}
                    value={form.email}
                    onChange={(e) => onChange("email", e.target.value)}
                    required
                  />
                  <div
                    className={`mt-1 text-xs ${
                      form.email
                        ? emailOk
                          ? "text-emerald-700"
                          : "text-rose-700"
                        : "text-zinc-500"
                    }`}
                  >
                    {form.email
                      ? emailOk
                        ? "Eligible institutional domain ✓"
                        : "This email does not appear to be from an eligible institutional domain."
                      : "Enter your school/research email."}
                  </div>
                </Field>

                {/* Institution */}
                <Field label="School / Institute" hint="e.g., KAIST, KRIBB" full>
                  <input
                    type="text"
                    className={`input ${INPUT_EMPH}`}
                    value={form.institution}
                    onChange={(e) => onChange("institution", e.target.value)}
                    placeholder=""
                  />
                </Field>

                {/* Country */}
                <Field label="Country">
                  <select
                    className={`input ${INPUT_EMPH}`}
                    value={form.country}
                    onChange={(e) => onChange("country", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option>Korea, Republic of</option>
                    <option>United States</option>
                    <option>Japan</option>
                    <option>China</option>
                    <option>Canada</option>
                    <option>Germany</option>
                    <option>United Kingdom</option>
                    <option>France</option>
                    <option>Australia</option>
                    <option>Other</option>
                  </select>
                </Field>

                {/* Role */}
                <Field label="Role">
                  <select
                    className={`input ${INPUT_EMPH}`}
                    value={form.role}
                    onChange={(e) => onChange("role", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option>Student</option>
                    <option>Researcher</option>
                    <option>Professor / PI</option>
                    <option>Industry Scientist/Engineer</option>
                    <option>Other</option>
                  </select>
                </Field>

                {/* Purpose */}
                <Field
                  label="Intended Use"
                  hint="What will you use the platform for? (optional)"
                  full
                >
                  <textarea
                    className={`input min-h-[88px] ${INPUT_EMPH}`}
                    value={form.purpose}
                    onChange={(e) => onChange("purpose", e.target.value)}
                    placeholder="e.g., kinase selectivity mapping, docking triage, ADMET filtering…"
                  />
                </Field>
              </div>

              {/* Agreements */}
              <div className="mt-5 space-y-3">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 rounded border-zinc-300"
                    checked={form.agree}
                    onChange={(e) => onChange("agree", e.target.checked)}
                    required
                  />
                </label>
                <div className="ml-7 -mt-5 text-sm text-zinc-700">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="underline underline-offset-4 hover:text-zinc-900"
                  >
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="underline underline-offset-4 hover:text-zinc-900"
                  >
                    Privacy Policy
                  </Link>
                  .
                  {submitted && errors.agree && (
                    <div className="mt-1 text-xs text-rose-700">
                      {errors.agree}
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 rounded border-zinc-300"
                    checked={form.newsletter}
                    onChange={(e) => onChange("newsletter", e.target.checked)}
                  />
                  <span className="text-zinc-700">
                    Send me occasional product updates (optional)
                  </span>
                </label>
              </div>

              {/* Submit */}
              <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <PrimaryButton href="#" onClick={(e) => onSubmit(e)} size="lg">
                  Create account
                </PrimaryButton>
                <p className="text-sm text-zinc-600">
                  Already have an account?{" "}
                  <Link
                    href="/pipeline"
                    className="font-semibold text-zinc-900 underline underline-offset-4"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

/* ── UI bits (kept consistent with landing) ─────────────────────────────── */

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
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  size?: "md" | "lg";
  onClick?: (e: React.MouseEvent) => void;
}) {
  const cls = size === "lg" ? "px-7 py-3.5 text-[15px]" : "px-6 py-3 text-sm";
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group inline-flex min-w-[10rem] items-center justify-center gap-1.5 rounded-lg bg-zinc-900 text-white shadow-sm transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-zinc-400 active:translate-y-[1px] ${cls}`}
    >
      {children}
      <ArrowRight className="size-4 translate-x-0 transition group-hover:translate-x-0.5" />
    </Link>
  );
}

function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        d="M16.7 5.7l-7.7 7.7-3.7-3.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M5 12h12M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200/80">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 text-xs text-zinc-500">
        <div className="flex flex-wrap gap-4">
          <Link href="/privacy" className="hover:text-zinc-700">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-zinc-700">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-zinc-700">
            Contact
          </Link>
        </div>
        <span>© {new Date().getFullYear()} KRIBB</span>
      </div>
    </footer>
  );
}

/* Small helpers */
function Field(props: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  invalid?: boolean;
  errorMsg?: string;
  full?: boolean;
}) {
  const { label, children, required, hint, invalid, errorMsg, full } = props;
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-sm font-semibold tracking-tight">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      <div className="mt-1">{children}</div>
      {hint && !invalid && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      {invalid && errorMsg && (
        <p className="mt-1 text-xs text-rose-700">{errorMsg}</p>
      )}
    </div>
  );
}

function PasswordStrength({ strength }: { strength: number }) {
  const labels = ["Very weak", "Weak", "Good", "Strong", "Excellent"];
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 w-full rounded ${
              i < strength ? "bg-zinc-900" : "bg-zinc-200"
            }`}
          />
        ))}
      </div>
      <div className="mt-1 text-xs text-zinc-600">{labels[strength]}</div>
    </div>
  );
}

/* Input emphasis helper (Tailwind classes) */
const INPUT_EMPH =
  "bg-zinc-50/80 ring-1 ring-inset ring-zinc-300 focus:bg-white focus:ring-zinc-400 shadow-inner";

/* Plain CSS injector for the .input base (safe without Tailwind @apply) */
const style = `
.input {
  width: 100%;
  border-radius: 0.5rem;           /* rounded-lg */
  border: 1px solid rgb(228,228,231); /* border-zinc-200 */
  background: #fff;                /* bg-white */
  padding: 0.5rem 0.75rem;         /* px-3 py-2 */
  font-size: 0.875rem;             /* text-sm */
  box-shadow: 0 1px 1px rgba(0,0,0,0.02); /* shadow-sm-ish */
  outline: none;
  transition: box-shadow .2s, border-color .2s, background .2s;
}
.input::placeholder { color: rgb(161,161,170); } /* text-zinc-400 */
.input:focus {
  border-color: rgb(212,212,216);  /* focus:border-zinc-300 */
  box-shadow: 0 0 0 2px rgba(212,212,216,1); /* focus:ring-zinc-300 */
}
`;

function StyleInjector() {
  return <style dangerouslySetInnerHTML={{ __html: style }} />;
}
