
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    website: "",
    description: "",
    location: "",
    industry: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/businesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Could not save your business.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function update(field: keyof typeof form, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p className="mb-2 text-sm text-blue-600">
        BuildLead AI · Step 1
      </p>

      <h1 className="mb-3 text-3xl font-bold">
        Tell us about your business
      </h1>

      <p className="mb-8 text-gray-500">
        We&apos;ll use this information to identify relevant
        business opportunities.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {([
          ["name", "Business name", true],
          ["website", "Website", false],
          ["description", "What does your business do?", false],
          ["location", "Business location", true],
          ["industry", "Industry", true],
        ] as const).map(([field, label, required]) => (
          <label key={field} className="block">
            <span className="mb-2 block font-medium">
              {label}
            </span>

            {field === "description" ? (
              <textarea
                value={form[field]}
                onChange={(event) =>
                  update(field, event.target.value)
                }
                rows={4}
                className="w-full rounded-lg border p-3"
              />
            ) : (
              <input
                type={field === "website" ? "url" : "text"}
                value={form[field]}
                onChange={(event) =>
                  update(field, event.target.value)
                }
                required={required}
                placeholder={
                  field === "website" ? "https://example.com" : ""
                }
                className="w-full rounded-lg border p-3"
              />
            )}
          </label>
        ))}

        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </main>
  );
}