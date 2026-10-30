
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type TargetRules = {
  locations: string;
  companyTypes: string;
  projectTypes: string;
  targetRoles: string;
  keywords: string;
};

const initialForm: TargetRules = {
  locations: "",
  companyTypes: "",
  projectTypes: "",
  targetRoles: "",
  keywords: "",
};

const fields: {
  key: keyof TargetRules;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "locations",
    label: "Target locations",
    placeholder: "Bengaluru, Mumbai, Delhi",
  },
  {
    key: "companyTypes",
    label: "Company types",
    placeholder: "Developers, Contractors, Architects",
  },
  {
    key: "projectTypes",
    label: "Project types",
    placeholder: "Residential, Commercial, Hotels",
  },
  {
    key: "targetRoles",
    label: "Decision-maker roles",
    placeholder: "Procurement Managers, Project Managers",
  },
  {
    key: "keywords",
    label: "Opportunity keywords",
    placeholder: "Flooring, New Construction, Renovation",
  },
];

function toList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

export default function TargetSetupPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const router = useRouter();

  const [form, setForm] = useState<TargetRules>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRules() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/businesses/${businessId}/target-rules`
        );

        if (!response.ok) {
          throw new Error("Could not load target preferences.");
        }

        const data = await response.json();
        const rules = data.targetRules;

        if (active && rules) {
          setForm({
            locations: rules.locations.join(", "),
            companyTypes: rules.companyTypes.join(", "),
            projectTypes: rules.projectTypes.join(", "),
            targetRoles: rules.targetRoles.join(", "),
            keywords: rules.keywords.join(", "),
          });
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRules();

    return () => {
      active = false;
    };
  }, [businessId]);

  function update(field: keyof TargetRules, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/businesses/${businessId}/target-rules`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locations: toList(form.locations),
            companyTypes: toList(form.companyTypes),
            projectTypes: toList(form.projectTypes),
            targetRoles: toList(form.targetRoles),
            keywords: toList(form.keywords),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || "Failed to save target preferences."
        );
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-8 text-3xl font-bold">
          Target customer setup
        </h1>

        <p className="mt-3 text-slate-400">
          Define which companies, projects and decision-makers
          BuildLead AI should look for.
        </p>

        {loading ? (
          <p className="mt-8 text-slate-400">
            Loading preferences...
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6"
          >
            {fields.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-2 block font-medium">
                  {field.label}
                </span>

                <textarea
                  rows={2}
                  value={form[field.key]}
                  onChange={(event) =>
                    update(field.key, event.target.value)
                  }
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3"
                />

                <span className="mt-1 block text-xs text-slate-500">
                  Separate multiple entries with commas.
                </span>
              </label>
            ))}

            {error && (
              <p role="alert" className="text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || Boolean(error)}
              className="w-full rounded-lg bg-blue-600 p-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : "Save target preferences"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}