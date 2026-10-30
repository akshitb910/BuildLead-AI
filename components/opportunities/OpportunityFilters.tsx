
"use client";

import { useMemo, useState } from "react";

export type OpportunityItem = {
  id: number;
  projectName: string;
  description: string | null;
  location: string | null;
  projectType: string | null;
  stage: string | null;
  status: string;
  relevanceScore: number | null;
  qualificationReason: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  discoveredAt: string;
};

type MatchExplanation = {
  reasons: string[];
  unknowns: string[];
};

function parseExplanation(
  value: string | null
): MatchExplanation | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    const data = parsed as Record<string, unknown>;

    return {
      reasons: Array.isArray(data.reasons)
        ? data.reasons.filter(
            (item): item is string => typeof item === "string"
          )
        : [],
      unknowns: Array.isArray(data.unknowns)
        ? data.unknowns.filter(
            (item): item is string => typeof item === "string"
          )
        : [],
    };
  } catch {
    return null;
  }
}

export default function OpportunityFilters({
  opportunities,
}: {
  opportunities: OpportunityItem[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [projectType, setProjectType] = useState("ALL");
  const [sort, setSort] = useState("SCORE_DESC");

  const statuses = useMemo(
    () => [...new Set(opportunities.map((item) => item.status))].sort(),
    [opportunities]
  );

  const projectTypes = useMemo(
    () =>
      [
        ...new Set(
          opportunities
            .map((item) => item.projectType)
            .filter((value): value is string => Boolean(value))
        ),
      ].sort(),
    [opportunities]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const results = opportunities.filter((item) => {
      const searchableText = [
        item.projectName,
        item.description,
        item.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchableText.includes(query)) &&
        (status === "ALL" || item.status === status) &&
        (projectType === "ALL" || item.projectType === projectType)
      );
    });

    return results.sort((a, b) => {
      if (sort === "NEWEST") {
        return (
          new Date(b.discoveredAt).getTime() -
          new Date(a.discoveredAt).getTime()
        );
      }

      if (sort === "OLDEST") {
        return (
          new Date(a.discoveredAt).getTime() -
          new Date(b.discoveredAt).getTime()
        );
      }

      if (sort === "SCORE_ASC") {
        return (
          (a.relevanceScore ?? -1) -
          (b.relevanceScore ?? -1)
        );
      }

      return (
        (b.relevanceScore ?? -1) -
        (a.relevanceScore ?? -1)
      );
    });
  }, [opportunities, search, status, projectType, sort]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="opportunity-search"
            className="mb-2 block text-sm text-slate-300"
          >
            Search projects
          </label>

          <input
            id="opportunity-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Project name, location..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
          />
        </div>

        <div>
          <label
            htmlFor="opportunity-status"
            className="mb-2 block text-sm text-slate-300"
          >
            Status
          </label>

          <select
            id="opportunity-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
          >
            <option value="ALL">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="opportunity-type"
            className="mb-2 block text-sm text-slate-300"
          >
            Project type
          </label>

          <select
            id="opportunity-type"
            value={projectType}
            onChange={(event) => setProjectType(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
          >
            <option value="ALL">All project types</option>
            {projectTypes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="opportunity-sort"
            className="mb-2 block text-sm text-slate-300"
          >
            Sort by
          </label>

          <select
            id="opportunity-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
          >
            <option value="SCORE_DESC">Highest relevance</option>
            <option value="SCORE_ASC">Lowest relevance</option>
            <option value="NEWEST">Newest first</option>
            <option value="OLDEST">Oldest first</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-slate-400">
        Showing {filtered.length} of {opportunities.length} opportunities
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-slate-300">
            No opportunities match your filters.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("ALL");
              setProjectType("ALL");
              setSort("SCORE_DESC");
            }}
            className="mt-4 text-sm text-blue-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((opportunity) => {
            const explanation = parseExplanation(
              opportunity.qualificationReason
            );

            return (
              <article
                key={opportunity.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {opportunity.projectName}
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                      {[
                        opportunity.location,
                        opportunity.projectType,
                        opportunity.stage,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
                      {opportunity.status}
                    </span>

                    <span className="text-sm font-semibold text-emerald-400">
                      {opportunity.relevanceScore === null
                        ? "Not scored"
                        : `Relevance: ${opportunity.relevanceScore}/100`}
                    </span>
                  </div>
                </div>

                {opportunity.description && (
                  <p className="mt-5 text-slate-300">
                    {opportunity.description}
                  </p>
                )}

                {explanation && (
                  <div className="mt-6 grid gap-5 border-t border-slate-800 pt-5 md:grid-cols-2">
                    <div>
                      <h3 className="mb-3 font-semibold">
                        Matching reasons
                      </h3>

                      {explanation.reasons.length > 0 ? (
                        <ul className="space-y-2">
                          {explanation.reasons.map((reason, index) => (
                            <li
                              key={index}
                              className="text-sm text-emerald-400"
                            >
                              ✓ {reason}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-400">
                          No matching criteria identified.
                        </p>
                      )}
                    </div>

                    <div>
                      <h3 className="mb-3 font-semibold">
                        Missing information
                      </h3>

                      {explanation.unknowns.length > 0 ? (
                        <ul className="space-y-2">
                          {explanation.unknowns.map((unknown, index) => (
                            <li
                              key={index}
                              className="text-sm text-amber-400"
                            >
                              • {unknown}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-400">
                          No missing matching inputs reported.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {opportunity.sourceUrl && (
                  <a
                    href={opportunity.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-block text-sm text-blue-400 hover:underline"
                  >
                    {opportunity.sourceTitle || "View project source"} ↗
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}