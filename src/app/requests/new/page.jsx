
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REASONS = [
  { value: "DAMAGED", label: "Damaged" },
  { value: "WRONG_ITEM", label: "Wrong Item" },
  { value: "SIZE_ISSUE", label: "Size Issue" },
  { value: "NOT_AS_DESCRIBED", label: "Not As Described" },
  { value: "CHANGED_MIND", label: "Changed Mind" },
];

const initialForm = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  orderNumber: "",
  itemSku: "",
  itemName: "",
  quantity: "1",
  reason: "DAMAGED",
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function Field({ label, required, hint, children }) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export default function NewRequestPage() {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));

    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });

    setServerError("");
  }

  function validate() {
    const next = {};

    if (!form.customerName.trim()) {
      next.customerName = "Customer name is required.";
    }

    if (!form.customerEmail.trim()) {
      next.customerEmail = "Customer email is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail.trim())
    ) {
      next.customerEmail = "Enter a valid email address.";
    }

    if (!form.orderNumber.trim()) {
      next.orderNumber = "Order number is required.";
    }

    if (!form.itemSku.trim()) {
      next.itemSku = "Item SKU is required.";
    }

    if (!form.itemName.trim()) {
      next.itemName = "Item name is required.";
    }

    const quantity = Number(form.quantity);

    if (
      !form.quantity.trim() ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      next.quantity = "Quantity must be a positive whole number.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError("");

    if (!validate()) return;

    setSubmitting(true);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerEmail: form.customerEmail.trim(),
          customerPhone: form.customerPhone.trim(),
          orderNumber: form.orderNumber.trim(),
          itemSku: form.itemSku.trim(),
          itemName: form.itemName.trim(),
          quantity: Number(form.quantity),
          reason: form.reason,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const message =
          result?.error?.message ||
          "Unable to create the return request.";

        if (result?.error?.details) {
          const serverFields = result.error.details;
          const mapped = {};

          for (const [key, messages] of Object.entries(serverFields)) {
            if (Array.isArray(messages) && messages.length) {
              mapped[key] = messages[0];
            }
          }

          if (Object.keys(mapped).length) {
            setErrors((current) => ({ ...current, ...mapped }));
          }
        }

        throw new Error(message);
      }

      // The server-generated ID is used to open the newly created request.
      router.push(`/requests/${result.data.id}`);
      router.refresh();
    } catch (error) {
      setServerError(
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setErrors({});
    setServerError("");
  }

  return (
    <main className="min-h-screen bg-[#f4f6fa] px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-5 text-sm font-medium text-indigo-700 hover:text-indigo-900"
        >
          ← Back to requests
        </button>

        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            ReturnDesk · Requests
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Create return request
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter the customer, order, and item details to start a return.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="space-y-7 p-5 sm:p-7">
            {serverError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-4"
              >
                <p className="text-sm font-semibold text-red-800">
                  Could not create request
                </p>
                <p className="mt-1 text-sm text-red-700">{serverError}</p>
              </div>
            )}

            <section>
              <h2 className="font-semibold">Customer information</h2>
              <p className="mt-1 text-sm text-slate-500">
                Contact details for the person requesting the return.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Customer name" required>
                  <input
                    autoComplete="name"
                    maxLength={120}
                    value={form.customerName}
                    onChange={(event) =>
                      updateField("customerName", event.target.value)
                    }
                    placeholder="e.g. Priya Nair"
                    className={`${inputClass} ${
                      errors.customerName ? "border-red-400" : ""
                    }`}
                    aria-invalid={Boolean(errors.customerName)}
                  />
                  {errors.customerName && (
                    <span className="mt-1 block text-xs text-red-600">
                      {errors.customerName}
                    </span>
                  )}
                </Field>

                <Field label="Email address" required>
                  <input
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={form.customerEmail}
                    onChange={(event) =>
                      updateField("customerEmail", event.target.value)
                    }
                    placeholder="customer@example.com"
                    className={`${inputClass} ${
                      errors.customerEmail ? "border-red-400" : ""
                    }`}
                    aria-invalid={Boolean(errors.customerEmail)}
                  />
                  {errors.customerEmail && (
                    <span className="mt-1 block text-xs text-red-600">
                      {errors.customerEmail}
                    </span>
                  )}
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Phone number" hint="Optional">
                    <input
                      type="tel"
                      autoComplete="tel"
                      maxLength={30}
                      value={form.customerPhone}
                      onChange={(event) =>
                        updateField("customerPhone", event.target.value)
                      }
                      placeholder="Customer phone number"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <h2 className="font-semibold">Order and item</h2>
              <p className="mt-1 text-sm text-slate-500">
                Identify the order and the specific item being returned.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Order number" required>
                  <input
                    maxLength={100}
                    value={form.orderNumber}
                    onChange={(event) =>
                      updateField("orderNumber", event.target.value)
                    }
                    placeholder="e.g. ORD-10482"
                    className={`${inputClass} ${
                      errors.orderNumber ? "border-red-400" : ""
                    }`}
                    aria-invalid={Boolean(errors.orderNumber)}
                  />
                  {errors.orderNumber && (
                    <span className="mt-1 block text-xs text-red-600">
                      {errors.orderNumber}
                    </span>
                  )}
                </Field>

                <Field label="Item SKU" required>
                  <input
                    maxLength={100}
                    value={form.itemSku}
                    onChange={(event) =>
                      updateField("itemSku", event.target.value)
                    }
                    placeholder="e.g. SHIRT-BLU-M"
                    className={`${inputClass} ${
                      errors.itemSku ? "border-red-400" : ""
                    }`}
                    aria-invalid={Boolean(errors.itemSku)}
                  />
                  {errors.itemSku && (
                    <span className="mt-1 block text-xs text-red-600">
                      {errors.itemSku}
                    </span>
                  )}
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Item name" required>
                    <input
                      maxLength={200}
                      value={form.itemName}
                      onChange={(event) =>
                        updateField("itemName", event.target.value)
                      }
                      placeholder="e.g. Linen Shirt"
                      className={`${inputClass} ${
                        errors.itemName ? "border-red-400" : ""
                      }`}
                      aria-invalid={Boolean(errors.itemName)}
                    />
                    {errors.itemName && (
                      <span className="mt-1 block text-xs text-red-600">
                        {errors.itemName}
                      </span>
                    )}
                  </Field>
                </div>

                <Field label="Quantity" required>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.quantity}
                    onChange={(event) =>
                      updateField("quantity", event.target.value)
                    }
                    className={`${inputClass} ${
                      errors.quantity ? "border-red-400" : ""
                    }`}
                    aria-invalid={Boolean(errors.quantity)}
                  />
                  {errors.quantity && (
                    <span className="mt-1 block text-xs text-red-600">
                      {errors.quantity}
                    </span>
                  )}
                </Field>

                <Field label="Return reason" required>
                  <select
                    value={form.reason}
                    onChange={(event) =>
                      updateField("reason", event.target.value)
                    }
                    className={inputClass}
                  >
                    {REASONS.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">
                What happens next?
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                A unique return reference will be generated automatically.
                The new request starts in Open status and can then be reviewed
                by an agent.
              </p>
            </div>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button
              type="button"
              disabled={submitting}
              onClick={resetForm}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Clear form
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating request…" : "Create request"}
            </button>
          </footer>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Fields marked with * are required.
        </p>
      </div>
    </main>
  );
}
