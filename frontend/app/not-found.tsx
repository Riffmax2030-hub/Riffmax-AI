import Link from "next/link";

export const metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-20 text-center">
      <div className="text-7xl font-bold bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent mb-2">
        404
      </div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
        We couldn&apos;t find that page
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
        The URL might be mistyped, or the page may have moved.
      </p>
      <div className="flex items-center justify-center gap-2">
        <Link
          href="/"
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          Go home
        </Link>
        <Link
          href="/templates"
          className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          Browse templates
        </Link>
      </div>
    </div>
  );
}
