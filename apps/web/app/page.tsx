import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Mew AI
        </h1>
        <p className="mt-3 max-w-md text-slate-600">
          One control panel to run your business&apos;s AI services — starting
          with an AI receptionist that answers calls, books appointments, and
          transfers when needed.
        </p>
      </div>
      <Link
        href="/login"
        className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-brand-700"
      >
        Open the dashboard
      </Link>
    </main>
  );
}
