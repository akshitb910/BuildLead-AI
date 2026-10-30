import { auth, signOut } from "@/auth";
import { getUserByEmail } from "@/src/lib/auth/sync-user";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Pool } from "pg";
import MatchOpportunitiesButton from "@/components/dashboard/MatchOpportunitiesButton";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// DATABASE TYPES

type Business = {
  id: number;
  name: string;
  industry: string;
  location: string;
  website: string | null;
  description: string | null;
};

type Product = {
  id: number;
  businessId: number;
  name: string;
  category: string | null;
  description: string | null;
  applications: string[];
};

type Opportunity = {
  id: number;
  businessId: number;
  status: string;
  relevanceScore: number | null;
  projectName: string;
  projectDescription: string | null;
  projectLocation: string | null;
  projectType: string | null;
  projectStage: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  qualificationReason: string | null;
};

// DATABASE QUERIES

async function getUserBusinesses(
  userId: number
): Promise<Business[]> {
  const result = await pool.query<Business>(
    `
    SELECT
      "id",
      "name",
      "industry",
      "location",
      "website",
      "description"
    FROM "business"
    WHERE "userId" = $1
    ORDER BY "createdAt" DESC, "id" DESC
    `,
    [userId]
  );

  return result.rows;
}

async function getUserProducts(
  userId: number
): Promise<Product[]> {
  const result = await pool.query<Product>(
    `
    SELECT
      p."id",
      p."businessId",
      p."name",
      p."category",
      p."description",
      p."applications"
    FROM "product" p
    INNER JOIN "business" b
      ON b."id" = p."businessId"
    WHERE b."userId" = $1
    ORDER BY p."createdAt" DESC, p."id" DESC
    `,
    [userId]
  );

  return result.rows;
}

async function getUserOpportunities(
  userId: number
): Promise<Opportunity[]> {
  const result = await pool.query<Opportunity>(
    `
    SELECT
      o."id",
      o."businessId",
      o."status",
      o."relevanceScore",
      o."qualificationReason",
      p."name" AS "projectName",
      p."description" AS "projectDescription",
      p."location" AS "projectLocation",
      p."projectType" AS "projectType",
      p."stage" AS "projectStage",
      s."url" AS "sourceUrl",
      s."title" AS "sourceTitle"
    FROM "opportunity" o
    INNER JOIN "business" b
      ON b."id" = o."businessId"
    INNER JOIN "project" p
      ON p."id" = o."projectId"
    LEFT JOIN LATERAL (
      SELECT
        "url",
        "title"
      FROM "projectSource"
      WHERE "projectId" = p."id"
      ORDER BY "retrievedAt" DESC, "id" DESC
      LIMIT 1
    ) s ON TRUE
    WHERE b."userId" = $1
    ORDER BY o."discoveredAt" DESC, o."id" DESC
    `,
    [userId]
  );

  return result.rows;
}

// DASHBOARD

type MatchExplanation = {
  reasons: string[];
  unknowns: string[];
  matchedPoints: number;
  availablePoints: number;
  algorithm: string;
};

function parseMatchExplanation(
  value: string | null
): MatchExplanation | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const data = parsed as Record<string, unknown>;

    return {
      reasons: Array.isArray(data.reasons)
        ? data.reasons.filter(
            (item): item is string =>
              typeof item === "string"
          )
        : [],

      unknowns: Array.isArray(data.unknowns)
        ? data.unknowns.filter(
            (item): item is string =>
              typeof item === "string"
          )
        : [],

      matchedPoints:
        typeof data.matchedPoints === "number"
          ? data.matchedPoints
          : 0,

      availablePoints:
        typeof data.availablePoints === "number"
          ? data.availablePoints
          : 0,

      algorithm:
        typeof data.algorithm === "string"
          ? data.algorithm
          : "UNKNOWN",
    };
  } catch {
    return null;
  }
}
export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await getUserByEmail(session.user.email);

  if (!user) {
    redirect("/login");
  }

  const [businesses, products, opportunities] =
    await Promise.all([
      getUserBusinesses(user.id),
      getUserProducts(user.id),
      getUserOpportunities(user.id),
    ]);

  const scored = opportunities.filter((item) => item.relevanceScore !== null);
  const highMatches = scored.filter((item) => (item.relevanceScore ?? 0) >= 70).length;
  const averageScore = scored.length
    ? Math.round(scored.reduce((sum, item) => sum + (item.relevanceScore ?? 0), 0) / scored.length)
    : null;
  const recentOpportunities = opportunities.slice(0, 5);
  const primaryBusiness = businesses[0];

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900 lg:flex">

<aside className="flex flex-col border-b border-slate-200 bg-white px-5 py-6 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-5">

  {/* BRAND */}
  <Link href="/dashboard" className="flex items-center gap-3">
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2">
        <path d="M3 21V9l9-6 9 6v12h-6v-7h-6v7H3Z" strokeLinejoin="round"/>
      </svg>
    </span>
    <span>
      <span className="block text-lg font-bold tracking-tight text-slate-900">
        BuildLead <span className="text-blue-600">AI</span>
      </span>
      <span className="block text-[11px] font-medium tracking-wide text-slate-400">
        INTELLIGENT LEAD DISCOVERY
      </span>
    </span>
  </Link>

  {/* NAVIGATION */}
  <nav className="mt-10 flex flex-wrap gap-2 lg:flex-col" aria-label="Main navigation">

    <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 lg:block">
      Workspace
    </p>

    <Link
      href="/dashboard"
      aria-current="page"
      className="group flex items-center gap-3 rounded-xl bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700 transition-colors"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="8" height="8" rx="2"/>
        <rect x="13" y="3" width="8" height="5" rx="2"/>
        <rect x="13" y="10" width="8" height="11" rx="2"/>
        <rect x="3" y="13" width="8" height="8" rx="2"/>
      </svg>
      Overview
      <span className="ml-auto h-2 w-2 rounded-full bg-blue-600"/>
    </Link>

    {primaryBusiness && (
      <>
        <Link
          href={`/businesses/${primaryBusiness.id}/opportunities`}
          className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-700"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9"/>
            <circle cx="12" cy="12" r="4"/>
            <path d="m15 9 5-5"/>
          </svg>
          Opportunities
        </Link>

        <Link
          href={`/businesses/${primaryBusiness.id}/targets`}
          className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-700"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9"/>
            <circle cx="12" cy="12" r="5"/>
            <circle cx="12" cy="12" r="1.5"/>
          </svg>
          Target customers
        </Link>

        <Link
          href={`/businesses/${primaryBusiness.id}/products/new`}
          className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-700"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
            <path d="m12 3 9 5-9 5-9-5 9-5Z"/>
            <path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>
          </svg>
          Add product
        </Link>
      </>
    )}

    <div className="my-3 hidden border-t border-slate-100 lg:block"/>

    <p className="mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 lg:block">
      Management
    </p>

    <Link
      href="/onboarding"
      className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-700"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 21V7l9-4 9 4v14"/>
        <path d="M9 21v-7h6v7M12 7v5M9.5 9.5h5"/>
      </svg>
      Add business
    </Link>
  </nav>

  {/* BOTTOM ACCOUNT SECTION */}
  <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-4 lg:mt-auto">
    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
      Signed in as
    </p>

    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
        {(session.user.name || session.user.email || "U").charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {session.user.name || "Your account"}
        </p>
        <p className="truncate text-xs text-slate-500">
          {session.user.email}
        </p>
      </div>
    </div>

    <form action={async () => {
      "use server";
      await signOut({ redirectTo: "/login" });
    }}>
      <button
        type="submit"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8">
          <path d="M10 17l5-5-5-5M15 12H3"/>
          <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>
        </svg>
        Sign out
      </button>
    </form>
  </div>
</aside>


      <div className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-600">WORKSPACE / OVERVIEW</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Good to see you, {session.user.name?.split(" ")[0] || "there"}</h1>
              <p className="mt-2 text-sm text-slate-500">Your businesses and opportunities, all in one place.</p>
            </div>
            <Link href="/onboarding" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">+ Add business</Link>
          </header>

          <section

  aria-label="Workspace statistics"
  className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
>
  {[
    {
      label: "Businesses",
      value: businesses.length,
      hint: "Active business profiles",
      icon: "🏢",
      accent: "bg-blue-50 text-blue-700",
    },
    {
      label: "Products & services",
      value: products.length,
      hint: "Across your businesses",
      icon: "📦",
      accent: "bg-violet-50 text-violet-700",
    },
    {
      label: "Opportunities",
      value: opportunities.length,
      hint: "Total discovered leads",
      icon: "🎯",
      accent: "bg-amber-50 text-amber-700",
    },
    {
      label: "Average relevance",
      value: averageScore === null ? "—" : `${averageScore}%`,
      hint: `${highMatches} matches scored 70+`,
      icon: "📊",
      accent: "bg-emerald-50 text-emerald-700",
    },
  ].map((stat) => (
    <div
      key={stat.label}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          {stat.label}
        </p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${stat.accent}`}>
          {stat.icon}
        </span>
      </div>

      <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">
        {stat.value}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        {stat.hint}
      </p>
    </div>
  ))}

</section>
          <section className="mt-9">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-xl font-bold">Your businesses</h2><p className="mt-1 text-sm text-slate-500">Manage products, targeting and opportunity matching.</p></div>
            </div>
            {businesses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <h3 className="text-xl font-semibold">Set up your first business</h3>
                <p className="mt-2 text-sm text-slate-500">Add your business to start finding relevant opportunities.</p>
                <Link href="/onboarding" className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Get started</Link>
              </div>
            ) : (
              <div className="grid gap-5 xl:grid-cols-2">
                {businesses.map((business) => {
                  const businessProducts = products.filter((p) => p.businessId === business.id);
                  const businessOpportunities = opportunities.filter((o) => o.businessId === business.id);
                  return (

<article
  key={business.id}
  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60"
>
  {/* BUSINESS HEADER */}
  <div className="flex items-start justify-between gap-4">
    <div className="flex min-w-0 items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-bold text-blue-700 transition-colors group-hover:bg-blue-600 group-hover:text-white">
        {business.name.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-xl font-bold tracking-tight text-slate-900">
          {business.name}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {[business.industry, business.location]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </div>

    <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Active
    </span>
  </div>

  {/* DESCRIPTION */}
  {business.description && (
    <p className="mt-5 line-clamp-2 text-sm leading-6 text-slate-600">
      {business.description}
    </p>
  )}

  {/* WEBSITE */}
  {business.website && (
    <a
      href={
        business.website.startsWith("http")
          ? business.website
          : `https://${business.website}`
      }
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex max-w-full items-center gap-1.5 break-all text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
    >
      {business.website}
      <span>↗</span>
    </a>
  )}

  {/* BUSINESS METRICS */}
  <div className="mt-6 grid grid-cols-2 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/70 py-4">
    <div className="px-4">
      <p className="text-2xl font-bold tracking-tight text-slate-900">
        {businessProducts.length}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">
        Products & services
      </p>
    </div>

    <div className="px-4">
      <p className="text-2xl font-bold tracking-tight text-slate-900">
        {businessOpportunities.length}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500">
        Opportunities found
      </p>
    </div>
  </div>

  {/* PRODUCTS */}
  <div className="mt-6">
    <div className="flex items-center justify-between">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Products & services
      </p>
      <span className="text-xs text-slate-400">
        {businessProducts.length} total
      </span>
    </div>

    {businessProducts.length > 0 ? (
      <div className="mt-3 flex flex-wrap gap-2">
        {businessProducts.slice(0, 4).map((product) => (
          <span
            key={product.id}
            className="rounded-lg border border-slate-100 bg-slate-100/80 px-3 py-2 text-xs font-medium text-slate-700"
          >
            {product.name}
          </span>
        ))}

        {businessProducts.length > 4 && (
          <span className="rounded-lg px-2 py-2 text-xs font-medium text-slate-500">
            +{businessProducts.length - 4} more
          </span>
        )}
      </div>
    ) : (
      <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-500">
        No products added yet.
      </p>
    )}
  </div>

  {/* ACTIONS */}
  <div className="mt-7 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
    <Link
      href={`/businesses/${business.id}/opportunities`}
      className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
    >
      View opportunities →
    </Link>

    <Link
      href={`/businesses/${business.id}/targets`}
      className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      Targets
    </Link>

    <Link
      href={`/businesses/${business.id}/products/new`}
      className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      + Product
    </Link>
  </div>

  {/* MATCHING ACTION */}
  <div className="mt-4 rounded-xl bg-blue-50/60 p-4">
    <p className="mb-3 text-xs font-medium text-slate-600">
      Find projects that match this business's products.
    </p>
    <MatchOpportunitiesButton businessId={business.id} />
  </div>
</article>

                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-9 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
  <div>
    <h2 className="text-xl font-bold tracking-tight text-slate-900">
      Recent opportunities
    </h2>
    <p className="mt-1 text-sm text-slate-500">
      Your latest saved projects and match scores.
    </p>
  </div>

  {primaryBusiness && (
    <Link
      href={`/businesses/${primaryBusiness.id}/opportunities`}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
    >
      View all opportunities →
    </Link>
  )}
</div>

{recentOpportunities.length === 0 ? (
  <div className="px-6 py-12 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
      🔎
    </div>
    <h3 className="mt-4 font-semibold text-slate-900">
      No opportunities yet
    </h3>
    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
      Add a project from your business's opportunities page to start tracking potential leads.
    </p>
  </div>
) : (
  <div className="divide-y divide-slate-100">    {recentOpportunities.map((opportunity) => {
const explanation = parseMatchExplanation(opportunity.qualificationReason);      const score = opportunity.relevanceScore;
      const scoreColor =
        score === null
          ? "bg-slate-100 text-slate-500"
          : score >= 75
            ? "bg-emerald-50 text-emerald-700"
            : score >= 50
              ? "bg-blue-50 text-blue-700"
              : "bg-amber-50 text-amber-700";

      return (
        <div
          key={opportunity.id}
          className="group flex flex-wrap items-center justify-between gap-5 px-6 py-5 transition-colors hover:bg-slate-50/80"
        >
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-lg shadow-sm">
              🏗️
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-slate-900">
                {opportunity.projectName}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {[opportunity.projectLocation, opportunity.projectType, opportunity.projectStage]
                  .filter(Boolean)
                  .join(" · ") || "Project details unavailable"}
              </p>

              {explanation?.reasons?.[0] && (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  <span className="mr-1">✓</span>
                  {explanation.reasons[0]}
                </p>
              )}

              {opportunity.sourceUrl && (
                <a
                  href={opportunity.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {opportunity.sourceTitle || "View project source"} ↗
                </a>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium capitalize text-slate-600">
              {opportunity.status.replace(/_/g, " ")}
            </span>

            <div className={`min-w-[76px] rounded-xl px-3 py-2 text-center ${scoreColor}`}>
              <p className="text-lg font-bold leading-none">
                {score === null ? "—" : `${score}%`}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider opacity-75">
                Match
              </p>
            </div>
          </div>
        </div>
      );
    })}
  </div>
)}

          </section>
          <p className="mt-8 text-center text-xs text-slate-400">BuildLead AI · Your sales intelligence workspace</p>
        </div>
      </div>
    </main>
  );
}
