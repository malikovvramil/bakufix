'use client';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-8">
      <div className="mb-6 text-5xl">🏙️</div>
      <h1 className="text-4xl font-bold mb-2">BakıFix</h1>
      <p className="text-gray-400 mb-10 text-center max-w-md">BakıFix — Bakının Rəqəmsal Problem İdarəetmə Platforması</p>
      <div className="flex gap-4 flex-wrap justify-center">
        <Link href="/public" className="px-6 py-3 bg-brand text-black font-semibold rounded-xl hover:opacity-90">
          İctimai Xəritə
        </Link>
        <Link href="/admin" className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:opacity-90">
          Admin Panel
        </Link>
      </div>
    </div>
  );
}
