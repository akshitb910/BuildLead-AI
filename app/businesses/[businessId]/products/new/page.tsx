
"use client";

import { useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function AddProductPage() {
  const params = useParams<{ businessId: string }>();
  const router = useRouter();
  const businessId = params.businessId;

  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    applications: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/businesses/${businessId}/products`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            category: form.category,
            description: form.description,
            applications: form.applications
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save product");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  function update(field: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-xl">
        <Link
          href="/dashboard"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-8 text-3xl font-bold">Add a product</h1>

        <p className="mt-3 text-slate-400">
          Tell BuildLead AI what your business sells.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block">Product name *</span>
            <input
              required
              maxLength={200}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Porcelain Tiles"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
            />
          </label>

          <label className="block">
            <span className="mb-2 block">Category</span>
            <input
              maxLength={200}
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              placeholder="Flooring"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
            />
          </label>

          <label className="block">
            <span className="mb-2 block">Description</span>
            <textarea
              rows={4}
              maxLength={5000}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe your product..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
            />
          </label>

          <label className="block">
            <span className="mb-2 block">
              Applications (separate with commas)
            </span>
            <textarea
              rows={3}
              value={form.applications}
              onChange={(e) => update("applications", e.target.value)}
              placeholder="Residential flooring, Hotels, Commercial interiors"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
            />
          </label>

          {error && (
            <p role="alert" className="text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save product"}
          </button>
        </form>
      </div>
    </main>
  );
}