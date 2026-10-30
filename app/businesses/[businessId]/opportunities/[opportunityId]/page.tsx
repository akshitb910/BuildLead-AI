
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Opportunity = {
  id: number;
  businessId: number;
  status: string;
  relevanceScore: number | null;
  qualificationReason: string | null;
  discoveredAt: string;
  projectName: string;
  projectDescription: string | null;
  projectLocation: string | null;
  projectType: string | null;
  projectStage: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
};

function formatQualificationReason(value: string | null): string[] {
  if (!value) {
    return ["This opportunity has not been evaluated yet."];
  }

  try {
    const parsed = JSON.parse(value) as {
      reasons?: unknown;
      matchedPoints?: unknown;
      availablePoints?: unknown;
      algorithm?: unknown;
    };

    const lines: string[] = [];

    if (Array.isArray(parsed.reasons)) {
      lines.push(
        ...parsed.reasons.filter(
          (reason): reason is string => typeof reason === "string"
        )
      );
    }

    if (typeof parsed.matchedPoints === "number") {
      lines.push(`Matched points: ${parsed.matchedPoints}`);
    }

    if (typeof parsed.availablePoints === "number") {
      lines.push(`Available points: ${parsed.availablePoints}`);
    }

    if (typeof parsed.algorithm === "string") {
      lines.push(
        `Scoring method: ${parsed.algorithm.replaceAll("_", " ")}`
      );
    }

    return lines.length > 0 ? lines : [value];
  } catch {
    return [value];
  }
}

export default function OpportunityDetailsPage() {
  const params = useParams();

  const businessId = String(params.businessId);
  const opportunityId = String(params.opportunityId);

  const [opportunity, setOpportunity] =
    useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOpportunity = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/businesses/${businessId}/opportunities`
      );

      const data: {
        opportunities?: Opportunity[];
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load opportunity."
        );
      }

      const selected = (data.opportunities || []).find(
        (item) => String(item.id) === opportunityId
      );

      if (!selected) {
        throw new Error("Opportunity not found.");
      }

      setOpportunity(selected);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [businessId, opportunityId]);

  useEffect(() => {
    fetchOpportunity();
  }, [fetchOpportunity]);

  function formatDate(value: string) {
    if (!value) return "Date unavailable";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <p className="text-slate-400">Loading opportunity...</p>
      </main>
    );
  }

  if (error || !opportunity) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href={`/businesses/${businessId}/opportunities`}
            className="text-sm text-blue-400 hover:underline"
          >
            ← Back to Opportunities
          </Link>

          <div className="mt-8 rounded-xl border border-red-800 bg-red-950 p-6 text-red-300">
            {error || "Opportunity not found."}
          </div>

          <button
            onClick={fetchOpportunity}
            className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">

        <Link
          href={`/businesses/${businessId}/opportunities`}
          className="text-sm text-blue-400 hover:underline"
        >
          ← Back to Opportunities
        </Link>

        <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-400">
              OPPORTUNITY DETAILS
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              {opportunity.projectName}
            </h1>

            <p className="mt-3 text-sm text-slate-400">
              Discovered on {formatDate(opportunity.discoveredAt)}
            </p>
          </div>

          <span className="rounded-full bg-blue-950 px-4 py-2 text-sm font-semibold text-blue-300">
            {opportunity.status}
          </span>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Relevance Score
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-400">
              {opportunity.relevanceScore != null
                ? `${opportunity.relevanceScore}%`
                : "Not evaluated"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Project Type
            </p>
            <p className="mt-2 text-xl font-semibold">
              {opportunity.projectType || "Not specified"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Project Stage
            </p>
            <p className="mt-2 text-xl font-semibold">
              {opportunity.projectStage || "Not specified"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Project Information
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs text-slate-500">
                  Location
                </p>
                <p className="mt-1 text-slate-200">
                  {opportunity.projectLocation || "Not specified"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Description
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {opportunity.projectDescription ||
                    "No description available."}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">
              Qualification
            </h2>

            <div className="mt-5">
              <p className="text-xs text-slate-500">
                Qualification Reason
              </p>


<ul className="mt-3 space-y-3">
  {formatQualificationReason(opportunity.qualificationReason).map(
    (reason, index) => (
      <li
        key={index}
        className="flex items-start gap-2 text-sm leading-6 text-slate-300"
      >
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
        <span>{reason}</span>
      </li>
    )
  )}
</ul>

            </div>

            <div className="mt-6 border-t border-slate-800 pt-5">
              <p className="text-xs text-slate-500">
                Current Status
              </p>
              <p className="mt-2 font-semibold">
                {opportunity.status}
              </p>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">
            Original Project Source
          </h2>

          {opportunity.sourceUrl ? (
            <div className="mt-4">
              <p className="text-sm text-slate-300">
                {opportunity.sourceTitle || "Project Source"}
              </p>

              <a
                href={opportunity.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block break-all text-sm text-blue-400 hover:underline"
              >
                {opportunity.sourceUrl} ↗
              </a>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              No source information available.
            </p>
          )}
        </section>

      </div>
    </main>
  );
}
