import Link from "next/link";

export default function Home() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-semibold mb-3">
        Everybody Eats Volunteer Portal
      </h1>
      <p className="text-gray-600 mb-6">
        Pay-what-you-can social kitchen. Help us run community dinners.
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/shifts" className="px-4 py-2 rounded bg-black text-white">
          Browse Shifts
        </Link>
        <Link href="/login" className="px-4 py-2 rounded border">
          Login
        </Link>
      </div>
    </div>
  );
}
