
"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";

type ProjectForm = {
  name: string;
  description: string;
  location: string;
  projectType: string;
  stage: string;
  sourceUrl: string;
  sourceTitle: string;
};

export default function NewOpportunityPage() {
  const params = useParams();
  const router = useRouter();

  const businessId = String(params.businessId);

  const opportunitiesUrl =
    `/businesses/${businessId}/opportunities`;

  const [form, setForm] = useState<ProjectForm>({
    name: "",
    description: "",
    location: "",
    projectType: "",
    stage: "",
    sourceUrl: "",
    sourceTitle: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(
    field: keyof ProjectForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/businesses/${businessId}/opportunities`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim(),
            location: form.location.trim(),
            projectType: form.projectType.trim(),
            stage: form.stage,
            sourceUrl: form.sourceUrl.trim(),
            sourceTitle: form.sourceTitle.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Failed to save project."
        );
      }

      router.push(opportunitiesUrl);
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

  const inputClass =
    "mt-2 w-full rounded-lg border border-slate-700 " +
    "bg-slate-950 px-4 py-3 text-white " +
    "placeholder:text-slate-500 " +
    "focus:border-blue-500 focus:outline-none";

  const labelClass =
    "block text-sm font-medium text-slate-300";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href={opportunitiesUrl}
          className="text-sm text-blue-400 hover:underline"
        >
          ← Back to opportunities
        </Link>

        <div className="mt-8">
          <h1 className="text-3xl font-bold">
            Add Project
          </h1>

          <p className="mt-3 text-slate-400">
            Add a potential business opportunity and
            record where you found it.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          {/* Project name */}

          <div>
            <label
              htmlFor="project-name"
              className={labelClass}
            >
              Project Name *
            </label>

            <input
              id="project-name"
              type="text"
              required
              maxLength={200}
              value={form.name}
              onChange={(event) =>
                updateField("name", event.target.value)
              }
              placeholder="Residential development project"
              className={inputClass}
            />
          </div>

          {/* Description */}

          <div>
            <label
              htmlFor="project-description"
              className={labelClass}
            >
              Project Description
            </label>

            <textarea
              id="project-description"
              rows={5}
              maxLength={5000}
              value={form.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
              placeholder="Describe the project and its requirements."
              className={inputClass}
            />
          </div>

          {/* Location and type */}

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="project-location"
                className={labelClass}
              >
                Location
              </label>

              <input
                id="project-location"
                type="text"
                maxLength={200}
                value={form.location}
                onChange={(event) =>
                  updateField(
                    "location",
                    event.target.value
                  )
                }
                placeholder="Bengaluru"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="project-type"
                className={labelClass}
              >
                Project Type
              </label>

              <input
                id="project-type"
                type="text"
                maxLength={200}
                value={form.projectType}
                onChange={(event) =>
                  updateField(
                    "projectType",
                    event.target.value
                  )
                }
                placeholder="Residential"
                className={inputClass}
              />
            </div>
          </div>

          {/* Project stage */}

          <div>
            <label
              htmlFor="project-stage"
              className={labelClass}
            >
              Project Stage
            </label>

            <select
              id="project-stage"
              value={form.stage}
              onChange={(event) =>
                updateField(
                  "stage",
                  event.target.value
                )
              }
              className={inputClass}
            >
              <option value="">
                Unknown / Not specified
              </option>

              <option value="Planning">
                Planning
              </option>

              <option value="Tendering">
                Tendering
              </option>

              <option value="Under Construction">
                Under Construction
              </option>

              <option value="Completed">
                Completed
              </option>

              <option value="Other">
                Other
              </option>
            </select>
          </div>

          {/* Source section */}

          <div className="border-t border-slate-800 pt-6">
            <h2 className="text-xl font-semibold">
              Project Source
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Add the webpage where you found
              information about this project.
            </p>
          </div>

          {/* Source URL */}

          <div>
            <label
              htmlFor="source-url"
              className={labelClass}
            >
              Source URL *
            </label>

            <input
              id="source-url"
              type="url"
              required
              maxLength={2000}
              value={form.sourceUrl}
              onChange={(event) =>
                updateField(
                  "sourceUrl",
                  event.target.value
                )
              }
              placeholder="https://example.com/project"
              className={inputClass}
            />
          </div>

          {/* Source title */}

          <div>
            <label
              htmlFor="source-title"
              className={labelClass}
            >
              Source Title
            </label>

            <input
              id="source-title"
              type="text"
              maxLength={300}
              value={form.sourceTitle}
              onChange={(event) =>
                updateField(
                  "sourceTitle",
                  event.target.value
                )
              }
              placeholder="Official project announcement"
              className={inputClass}
            />
          </div>

          {/* Error message */}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {/* Actions */}

          <div className="flex flex-wrap items-center gap-4 border-t border-slate-800 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving project..."
                : "Save Project"}
            </button>

            <Link
              href={opportunitiesUrl}
              className="text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}