import Link from "next/link";
import { Logo } from "../../components/icons";

export const metadata = { title: "Terms of Service — Mew AI" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/"><Logo /></Link>
      <h1 className="mt-8 text-3xl font-bold text-slate-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: {new Date().getFullYear()}</p>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        This is a starting template, not legal advice. Have a lawyer review and
        adapt it before you rely on it with real customers.
      </div>

      <div className="prose prose-slate mt-8 space-y-6 text-sm leading-relaxed text-slate-600">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Agreement</h2>
          <p>By creating an account or using Mew AI (the &quot;Service&quot;), you agree to these Terms. If you use the Service on behalf of a business, you represent that you&apos;re authorized to bind that business.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. The Service</h2>
          <p>Mew AI provides AI-assisted tools for handling calls, messages, scheduling, documents, and related business tasks. Features depend on your plan and on third-party integrations you connect (e.g. telephony, calendar, payments).</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. Your responsibilities</h2>
          <p>You are responsible for the content and communications sent through your account, for obtaining any consents required to contact your customers (including SMS/telephony consent), and for complying with applicable laws.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Billing</h2>
          <p>Paid plans are billed in advance on a recurring basis and are non-refundable except where required by law. You can cancel at any time; access continues through the end of the current period.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. AI output</h2>
          <p>AI-generated content may be inaccurate. You are responsible for reviewing AI output before relying on or sending it. The Service is provided &quot;as is&quot; without warranties.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">6. Termination</h2>
          <p>You may delete your account at any time from your account settings. We may suspend or terminate accounts that violate these Terms.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900">7. Contact</h2>
          <p>Questions about these Terms? Contact your account manager.</p>
        </section>
      </div>

      <p className="mt-10 text-sm">
        <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>
        <span className="mx-2 text-slate-300">·</span>
        <Link href="/" className="text-brand-600 hover:underline">Home</Link>
      </p>
    </main>
  );
}
