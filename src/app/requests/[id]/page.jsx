
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const TRANSITIONS = {
  OPEN: ["IN_REVIEW"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["COMPLETED"],
  REJECTED: [],
  COMPLETED: [],
};

const REASONS = [
  ["DAMAGED", "Damaged"],
  ["WRONG_ITEM", "Wrong Item"],
  ["SIZE_ISSUE", "Size Issue"],
  ["NOT_AS_DESCRIBED", "Not As Described"],
  ["CHANGED_MIND", "Changed Mind"],
];

const RESOLUTIONS = [
  ["REFUND", "Refund"],
  ["REPLACEMENT", "Replacement"],
  ["STORE_CREDIT", "Store Credit"],
];

function humanize(value = "") {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function dateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const primaryButton =
  "rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export default function RequestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [noteContent, setNoteContent] = useState("");
  const [resolution, setResolution] = useState("REFUND");
  const [refundAmount, setRefundAmount] = useState("");

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const loadRequest = useCallback(async (signal) => {
    const response = await fetch(`/api/requests/${id}`, { signal });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error?.message || "Unable to load this request."
      );
    }

    setRequest(result.data);
    setEditForm({
      customerName: result.data.customerName || "",
      customerEmail: result.data.customerEmail || "",
      customerPhone: result.data.customerPhone || "",
      orderNumber: result.data.orderNumber || "",
      itemSku: result.data.itemSku || "",
      itemName: result.data.itemName || "",
      quantity: result.data.quantity,
      reason: result.data.reason,
    });

    setResolution(result.data.resolution || "REFUND");
    setRefundAmount(
      result.data.refundAmount == null
        ? ""
        : String(result.data.refundAmount)
    );
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError("");

      try {
        await loadRequest(controller.signal);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load this request.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [loadRequest]);

  const isEditable =
    request && ["OPEN", "IN_REVIEW"].includes(request.status);

  const canArchive =
    request && ["OPEN", "REJECTED"].includes(request.status);

  const availableTransitions =
    request ? TRANSITIONS[request.status] || [] : [];

  async function apiAction(url, options) {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error?.message || "The operation failed."
      );
    }

    return result.data;
  }

  async function refresh() {
    await loadRequest();
  }

  async function transition(status) {
    setSaving(true);
    setError("");
    setSuccess("");

    const body = { status };

    if (status === "APPROVED") {
      body.resolution = resolution;

      if (resolution === "REFUND") {
        body.refundAmount = Number(refundAmount);
      }
    }

    try {
      await apiAction(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      setSuccess(`Request moved to ${humanize(status)}.`);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addNote(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiAction(`/api/requests/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      });

      setNoteContent("");
      setSuccess("Note added successfully.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiAction(`/api/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          quantity: Number(editForm.quantity),
        }),
      });

      setEditing(false);
      setSuccess("Request details updated.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function archiveRequest() {
    const confirmed = window.confirm(
      "Archive this request? It will be removed from the normal request list."
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiAction(`/api/requests/${id}/archive`, {
        method: "POST",
      });

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function updateEditField(field, value) {
    setEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl animate-pulse rounded-xl border bg-white p-6 text-sm text-slate-500">
          Loading return request…
        </div>
      </main>
    );
  }

  if (error && !request) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-6">
          <h1 className="text-lg font-bold">Unable to open request</h1>
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
          <button
            className={`${secondaryButton} mt-4`}
            onClick={() => router.push("/")}
          >
            Back to requests
          </button>
        </div>
      </main>
    );
  }

  if (!request) return null;

  return (
    <main className="min-h-screen bg-[#f4f6fa] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <button
          onClick={() => router.push("/")}
          className="text-sm font-medium text-indigo-700 hover:text-indigo-900"
        >
          ← Back to requests
        </button>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Return request</p>
            <h1 className="mt-1 break-all text-2xl font-bold">
              {request.reference}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Created {dateTime(request.createdAt)}
            </p>
          </div>

          <span className="w-fit rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-800">
            {humanize(request.status)}
          </span>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {success}
          </div>
        )}

        {/* Workflow controls */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Workflow actions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Only actions permitted for the current status are shown.
          </p>

          {availableTransitions.includes("APPROVED") && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Resolution">
                <select
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  className={inputClass}
                >
                  {RESOLUTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              {resolution === "REFUND" && (
                <Field label="Refund amount">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={refundAmount}
                    onChange={(event) => setRefundAmount(event.target.value)}
                    placeholder="e.g. 49.99"
                    className={inputClass}
                  />
                </Field>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {availableTransitions.map((status) => (
              <button
                key={status}
                type="button"
                disabled={
                  saving ||
                  (status === "APPROVED" &&
                    (!resolution ||
                      (resolution === "REFUND" &&
                        (!refundAmount ||
                          !Number.isFinite(Number(refundAmount)) ||
                          Number(refundAmount) <= 0))))
                }
                onClick={() => transition(status)}
                className={primaryButton}
              >
                {status === "IN_REVIEW"
                  ? "Move to In Review"
                  : status === "APPROVED"
                    ? "Approve request"
                    : status === "REJECTED"
                      ? "Reject request"
                      : "Mark Completed"}
              </button>
            ))}

            {!availableTransitions.length && (
              <p className="text-sm text-slate-500">
                This request has reached a terminal status.
              </p>
            )}

            {canArchive && (
              <button
                type="button"
                disabled={saving}
                onClick={archiveRequest}
                className={secondaryButton}
              >
                Archive request
              </button>
            )}
          </div>
        </section>

        {/* Request details */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Request details</h2>
              <p className="mt-1 text-sm text-slate-500">
                Customer, order and item information.
              </p>
            </div>

            {isEditable && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={secondaryButton}
              >
                Edit details
              </button>
            )}
          </div>

          {editing ? (
            <form
              onSubmit={saveEdit}
              className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <Field label="Customer name">
                <input
                  required
                  maxLength={120}
                  value={editForm.customerName}
                  onChange={(e) => updateEditField("customerName", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Customer email">
                <input
                  required
                  type="email"
                  maxLength={254}
                  value={editForm.customerEmail}
                  onChange={(e) => updateEditField("customerEmail", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Customer phone">
                <input
                  maxLength={30}
                  value={editForm.customerPhone}
                  onChange={(e) => updateEditField("customerPhone", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Order number">
                <input
                  required
                  value={editForm.orderNumber}
                  onChange={(e) => updateEditField("orderNumber", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Item name">
                <input
                  required
                  value={editForm.itemName}
                  onChange={(e) => updateEditField("itemName", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Item SKU">
                <input
                  required
                  value={editForm.itemSku}
                  onChange={(e) => updateEditField("itemSku", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Quantity">
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={editForm.quantity}
                  onChange={(e) => updateEditField("quantity", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Return reason">
                <select
                  value={editForm.reason}
                  onChange={(e) => updateEditField("reason", e.target.value)}
                  className={inputClass}
                >
                  {REASONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button type="submit" disabled={saving} className={primaryButton}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setEditing(false);
                    setEditForm({
                      customerName: request.customerName || "",
                      customerEmail: request.customerEmail || "",
                      customerPhone: request.customerPhone || "",
                      orderNumber: request.orderNumber || "",
                      itemSku: request.itemSku || "",
                      itemName: request.itemName || "",
                      quantity: request.quantity,
                      reason: request.reason,
                    });
                  }}
                  className={secondaryButton}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Customer", request.customerName],
                ["Email", request.customerEmail],
                ["Phone", request.customerPhone || "—"],
                ["Order number", request.orderNumber],
                ["Item", request.itemName],
                ["SKU", request.itemSku],
                ["Quantity", request.quantity],
                ["Reason", humanize(request.reason)],
                ["Last updated", dateTime(request.updatedAt)],
                ["Resolution", humanize(request.resolution) || "—"],
                [
                  "Refund amount",
                  request.refundAmount == null
                    ? "—"
                    : Number(request.refundAmount).toFixed(2),
                ],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {label}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-slate-800">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* Immutable notes */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="font-semibold">Internal notes</h2>
            <p className="mt-1 text-sm text-slate-500">
              Notes are stored as a chronological history and cannot be edited here.
            </p>
          </div>

          <form onSubmit={addNote} className="mt-4 space-y-3">
            <Field label="Add a note">
              <textarea
                required
                maxLength={2000}
                rows={3}
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Record what was reviewed or communicated…"
                className={inputClass}
              />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {noteContent.length}/2000 characters
              </p>
              <button
                type="submit"
                disabled={saving || !noteContent.trim()}
                className={primaryButton}
              >
                {saving ? "Saving…" : "Add note"}
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-4">
            {request.notes?.length ? (
              request.notes.map((note) => (
                <article
                  key={note.id}
                  className="border-l-2 border-indigo-200 pl-4"
                >
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-800">
                    {note.content}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Added {dateTime(note.createdAt)}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                No notes yet. Add the first note above.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
