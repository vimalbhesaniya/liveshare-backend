import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">LiveShare API</h1>
      <p className="text-neutral-600">
        Next.js backend with MongoDB + Socket.io. Use the Vite frontend or build
        pages here later.
      </p>
      <ul className="list-disc space-y-2 pl-6 text-sm">
        <li>
          <Link href="/api/health" className="text-blue-600 underline">
            GET /api/health
          </Link>
        </li>
        <li>GET /api/snippets/:uniqueCode</li>
        <li>POST /api/snippets</li>
        <li>PATCH /api/snippets/:uniqueCode</li>
        <li>Socket.io on same origin</li>
      </ul>
    </main>
  );
}
