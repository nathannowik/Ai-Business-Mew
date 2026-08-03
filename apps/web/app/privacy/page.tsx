import Link from "next/link";
import { Logo } from "../../components/icons";

export const metadata = { title: "Privacy Policy — Mew AI" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/"><Logo /></Link>
      <h1 className="mt-8 text-3xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: {new Date().getFullYear()}</p>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        This is a starting template, not legal advice. Have a lawyer review and
        adapt it (including for GDPR/CCPA) before relying on it.
      </div>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">What we collect</h2>
          <p>Account details (name, email, business name), the business data you add (knowledge, contacts, appointments), and communications processed through the Service (calls, messages, chats). We also store credentials for tools you connect, encrypted at rest.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">How we use it</h2>
          <p>To provide the Service — routing calls, following up with leads, answering customers, generating documents, and reporting. We do not sell your data.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Sub-processors</h2>
          <p>We rely on third parties to deliver the Service, which may include AI providers, telephony, email, payments, and hosting. Each processes data only to provide their part of the Service.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Your rights</h2>
          <p>You can export all of your data or permanently delete your account at any time from <span className="font-medium">Settings → Account</span>. Deletion removes your organization and its data.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Retention</h2>
          <p>We keep your data while your account is active and delete it after account deletion, except where retention is legally required.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
          <p>For privacy requests, contact your account manager.</p>
        </section>
      </div>

      <p className="mt-10 text-sm">
        <Link href="/terms" className="text-brand-600 hover:underline">Terms of Service</Link>
        <span className="mx-2 text-slate-300">·</span>
        <Link href="/" className="text-brand-600 hover:underline">Home</Link>
      </p>
    </main>
  );
}
