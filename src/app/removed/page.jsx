
"use client";

import { useEffect, useState } from "react";

function relativeDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function RemovedRequestsPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        q: debouncedQuery,
        page: String(page),
        limit: "10",
      });

      try {
        const response = await fetch(
          `/api/requests/removed?${params}`,
          { signal: controller.signal }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result?.error?.message || "Unable to load removed requests."
          );
        }

        setData(result.data);
        setPagination(result.pagination);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "Unable to load removed requests.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [debouncedQuery, page]);

  return (
    <main className="min-h-screen bg-[#f4f6fa] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <a href="/" className="text-sm font-medium text-indigo-700">
          ← Back to requests
        </a>

        <header className="mb-6 mt-5">
          <h1 className="text-2xl font-bold">Removed requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Archived requests are retained for historical reference.
          </p>
        </header>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="p-4">
            <label className="block">
              <span className="sr-only">
                Search removed requests
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customer, order or reference…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          {error && (
            <p role="alert" className="mx-4 mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading && (
            <p role="status" className="px-4 pb-4 text-sm text-slate-500">
              Loading removed requests…
            </p>
          )}

          {!loading && !error && data.length === 0 && (
            <div className="px-5 py-14 text-center">
              <p className="font-semibold">No removed requests found</p>
              <p className="mt-1 text-sm text-slate-500">
                Archived requests will appear here.
              </p>
            </div>
          )}

          {data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Archived</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <a
                          href={`/requests/${item.id}`}
                          className="font-semibold text-indigo-700 hover:underline"
                        >
                          {item.reference}
                        </a>
                      </td>
                      <td className="px-4 py-3">{item.customerName}</td>
                      <td className="px-4 py-3">{item.orderNumber}</td>
                      <td className="px-4 py-3">{item.status.replaceAll("_", " ")}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {relativeDate(item.archivedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-500">
              {pagination.total} archived request(s)
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
