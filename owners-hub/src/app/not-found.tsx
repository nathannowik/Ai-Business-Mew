import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="text-stone-600">That page doesn't exist or was deleted.</p>
      <Link href="/" className="btn-primary">Back to today</Link>
    </main>
  );
}
