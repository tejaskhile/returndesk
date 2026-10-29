
"use client";

import { useCallback, useEffect, useState } from "react";

const STATUSES = [
  { value: "OPEN", label: "Open", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-800" },
  { value: "IN_REVIEW", label: "In Review", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-900" },
  { value: "APPROVED", label: "Approved", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" },
  { value: "REJECTED", label: "Rejected", dot: "bg-red-500", badge: "bg-red-100 text-red-800" },
  { value: "COMPLETED", label: "Completed", dot: "bg-slate-400", badge: "bg-slate-200 text-slate-700" },
];

const REASONS = [
  { value: "DAMAGED", label: "Damaged" },
  { value: "WRONG_ITEM", label: "Wrong Item" },
  { value: "SIZE_ISSUE", label: "Size Issue" },
  { value: "NOT_AS_DESCRIBED", label: "Not As Described" },
  { value: "CHANGED_MIND", label: "Changed Mind" },
];

function humanize(value = "") {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStatus(status) {
  return STATUSES.find((item) => item.value === status) || STATUSES[0];
}

function formatRelativeDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const difference = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(difference / 60000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "h" : "h"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }) {
  const item = getStatus(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${item.badge}`}
    >
      <span className={`size-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function NavItem({ active, children, href = "#" }) {
  return (
    <a
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-indigo-50 text-slate-800"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {children}
    </a>
  );
}

export default function HomePage() {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const [requests, setRequests] = useState([]);
  const [counts, setCounts] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 8,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce the search input to reduce unnecessary API requests.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput.trim());
      setPage(1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadRequests = useCallback(async (signal) => {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      limit: "8",
      sortBy: "updatedAt",
      sortOrder,
    });

    if (status) params.set("status", status);
    if (reason) params.set("reason", reason);

    const response = await fetch(`/api/requests?${params}`, { signal });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error?.message || "Unable to load requests."
      );
    }

    setRequests(result.data);
    setPagination(result.pagination);
  }, [query, page, status, reason, sortOrder]);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError("");

      try {
        await loadRequests(controller.signal);
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "Something went wrong.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [loadRequests, refreshKey]);

  // Fetch each status total from the server, without downloading every row.
  useEffect(() => {
    const controller = new AbortController();

    async function loadCounts() {
      try {
        const results = await Promise.all(
          STATUSES.map(async (item) => {
            const params = new URLSearchParams({
              status: item.value,
              page: "1",
              limit: "1",
              sortBy: "updatedAt",
              sortOrder: "desc",
            });

            const response = await fetch(
              `/api/requests?${params}`,
              { signal: controller.signal }
            );

            const result = await response.json();

            if (!response.ok) {
              throw new Error("Unable to load status totals.");
            }

            return [item.value, result.pagination.total];
          })
        );

        if (!controller.signal.aborted) {
          setCounts(Object.fromEntries(results));
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Could not load status totals:", err);
        }
      }
    }

    loadCounts();
    return () => controller.abort();
  }, [refreshKey]);

  function selectStatus(value) {
    setStatus((current) => (current === value ? "" : value));
    setPage(1);
  }

  function clearFilters() {
    setSearchInput("");
    setQuery("");
    setStatus("");
    setReason("");
    setSortOrder("desc");
    setPage(1);
  }

  const firstItem =
    pagination.total === 0 ? 0 : (page - 1) * pagination.limit + 1;

  const lastItem = Math.min(
    page * pagination.limit,
    pagination.total
  );

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-[#20263a]">
      <nav className="bg-white min-h-10 flex items-center px-10 py-2 max-sm:px-4">
        <a href="/" className="flex items-center">
          <span className="text-2xl font-bold tracking-tight items-center">
            Return<span className="text-indigo-700">Desk</span>
          </span>
        </a>
      </nav>

      {/* Main dashboard */}
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-7">
        <div className="mx-auto max-w-375">
          {/* Heading */}
          <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Requests
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Review, decide and close out customer returns.
              </p>
            </div>

            <a
              href="/requests/new"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              + New request
            </a>
          </header>

          {/* Status summary cards */}
          <section
            aria-label="Request counts by status"
            className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
          >
            {STATUSES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => selectStatus(item.value)}
                aria-pressed={status === item.value}
                className={`min-w-0 rounded-xl border bg-white p-3.5 text-left transition sm:p-4 ${
                  status === item.value
                    ? "border-indigo-400 ring-2 ring-indigo-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.badge}`}
                >
                  <span className={`size-1.5 rounded-full ${item.dot}`} />
                  {item.label}
                </span>

                <p className="mt-3 text-3xl font-bold leading-none tracking-tight">
                  {counts[item.value] ?? "—"}
                </p>
                <p className="mt-1.5 text-sm text-slate-500">
                  {item.label}
                </p>
              </button>
            ))}
          </section>

          {/* Search, filters and table */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_auto_auto_auto]">
                <label className="relative block min-w-0">
                  <span className="sr-only">Search customer, order or reference</span>
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <SearchIcon />
                  </span>
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search customer, order or reference"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <select
                  aria-label="Filter by status"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All statuses</option>
                  {STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by reason"
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All reasons</option>
                  {REASONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Sort requests"
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </div>

              {(query || status || reason) && (
                <div className="flex items-center justify-between gap-3">
                  <p className="wrap-break-word text-xs text-slate-500">
                    Showing filtered results
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="shrink-0 text-sm font-medium text-indigo-700 hover:text-indigo-900"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="mx-4 mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <p className="font-semibold">Unable to load requests</p>
                <p className="mt-1">{error}</p>
                <button
                  type="button"
                  onClick={() => setRefreshKey((key) => key + 1)}
                  className="mt-3 rounded-md border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] table-auto text-left text-sm">
                <thead>
                  <tr className="border-y border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="px-3.5 py-3">Reference</th>
                    <th className="px-3.5 py-3">Customer</th>
                    <th className="px-3.5 py-3">Order · Item</th>
                    <th className="px-3.5 py-3">Reason</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="whitespace-nowrap px-3.5 py-3">
                      Updated 
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {requests.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-3.5 py-3.5">
                        <a
                          href={`/requests/${item.id}`}
                          className="font-semibold text-slate-800 hover:text-indigo-700"
                        >
                          {item.reference}
                        </a>
                      </td>

                      <td className="px-3.5 py-3.5">
                        <span className="font-medium">
                          {item.customerName}
                        </span>
                      </td>

                      <td className="px-3.5 py-3.5">
                        <span className="text-slate-500">
                          #{item.orderNumber} · {item.itemName} ×{item.quantity}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3.5">
                        {humanize(item.reason)}
                      </td>

                      <td className="px-3.5 py-3.5">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="whitespace-nowrap px-3.5 py-3.5 text-slate-500">
                        {formatRelativeDate(item.updatedAt)}
                      </td>
                    </tr>
                  ))}

                  {!loading && !error && requests.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-16 text-center"
                      >
                        <p className="font-semibold text-slate-800">
                          No requests found
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Try another search or clear your filters.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {requests.map((item) => (
                <article key={item.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a
                        href={`/requests/${item.id}`}
                        className="break-all font-semibold text-indigo-700"
                      >
                        {item.reference}
                      </a>
                      <p className="mt-1 wrap-break-word text-sm font-medium">
                        {item.customerName}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <p className="wrap-break-word text-sm text-slate-500">
                    #{item.orderNumber} · {item.itemName} ×{item.quantity}
                  </p>

                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>{humanize(item.reason)}</span>
                    <span>{formatRelativeDate(item.updatedAt)}</span>
                  </div>
                </article>
              ))}

              {!loading && !error && requests.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <p className="font-semibold">No requests found</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Try changing your search or filters.
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 sm:text-sm">
                {loading
                  ? "Loading requests…"
                  : `Showing ${firstItem}–${lastItem} of ${pagination.total} requests`}
              </p>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={
                    page >= pagination.totalPages || loading
                  }
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}
