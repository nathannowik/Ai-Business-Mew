import Link from "next/link";
import { Logo, Icon, type IconName } from "../components/icons";

const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "phone", title: "AI Receptionist", desc: "Answers every call, books appointments, and transfers when needed." },
  { icon: "target", title: "Lead Follow-Up", desc: "Texts new leads in seconds, qualifies them, and books the job." },
  { icon: "chat", title: "Customer Service", desc: "A website chat that answers from your business's own information." },
  { icon: "megaphone", title: "Marketing", desc: "Generates posts, emails, and ads that sound like your brand." },
  { icon: "document", title: "Documents", desc: "Drafts quotes, proposals, and invoices — download as PDF." },
  { icon: "star", title: "Reviews", desc: "Requests reviews after jobs and drafts thoughtful responses." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <Link href="/login" className="btn-secondary">
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-gradient-to-b from-brand-100/70 to-transparent blur-2xl" />
        <div className="mx-auto max-w-3xl px-6 pb-16 pt-16 text-center sm:pt-24">
          <span className="badge border border-brand-200 bg-brand-50 text-brand-700">
            10 AI services · one control panel
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            The AI back office for
            <br className="hidden sm:block" /> your business
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Mew answers your calls, follows up with leads, replies to customers,
            handles marketing, documents, reviews, and more — all from one place.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/login" className="btn-primary px-6 py-3 text-base">
              Open the dashboard
            </Link>
            <a href="#features" className="btn-secondary px-6 py-3 text-base">
              See what it does
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-400">Demo login: demo@mew.ai / demo1234</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition hover:shadow-card-hover">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-10 text-center text-white shadow-soft">
          <h2 className="text-2xl font-bold text-white">Ready to see it in action?</h2>
          <p className="mx-auto mt-2 max-w-md text-brand-100">
            Sign in to the demo workspace and try every service in minutes.
          </p>
          <Link
            href="/login"
            className="btn mt-6 bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50"
          >
            Get started
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        <div className="flex items-center justify-center gap-4">
          <Link href="/terms" className="hover:text-slate-600">Terms</Link>
          <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
        </div>
        <p className="mt-2">© {new Date().getFullYear()} Mew AI</p>
      </footer>
    </main>
  );
}
