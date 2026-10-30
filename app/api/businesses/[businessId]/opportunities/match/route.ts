
import { auth } from "@/auth";
import { getUserByEmail } from "@/src/lib/auth/sync-user";
import {
  scoreOpportunity,
  type MatchingProduct,
  type MatchingProject,
  type MatchingRules,
} from "@/src/lib/matching/score-opportunity";
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

type OpportunityRow = MatchingProject & {
  id: number;
};

type TargetRuleRow = MatchingRules;

export async function POST(
  _request: Request,
  { params }: RouteContext
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const user = await getUserByEmail(session.user.email);

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 403 }
    );
  }

  const { businessId } = await params;
  const id = Number(businessId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: "Invalid business ID" },
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Only process businesses owned by the signed-in user.
    const businessResult = await client.query(
      `
      SELECT "id"
      FROM "business"
      WHERE "id" = $1 AND "userId" = $2
      FOR UPDATE
      `,
      [id, user.id]
    );

    if (businessResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Load products belonging to this business.
    const productResult =
      await client.query<MatchingProduct>(
        `
        SELECT "name", "category", "applications"
        FROM "product"
        WHERE "businessId" = $1
        `,
        [id]
      );

    // Load saved target preferences.
    const rulesResult =
      await client.query<TargetRuleRow>(
        `
        SELECT
          "locations",
          "projectTypes",
          "keywords"
        FROM "targetRule"
        WHERE "businessId" = $1
        LIMIT 1
        `,
        [id]
      );

    const rules: MatchingRules =
      rulesResult.rows[0] ?? {
        locations: [],
        projectTypes: [],
        keywords: [],
      };

    // Load this business's opportunities and projects.
    const opportunityResult =
      await client.query<OpportunityRow>(
        `
        SELECT
          o."id",
          p."name",
          p."description",
          p."location",
          p."projectType"
        FROM "opportunity" o
        INNER JOIN "project" p
          ON p."id" = o."projectId"
        WHERE o."businessId" = $1
        ORDER BY o."id"
        `,
        [id]
      );

    const results = [];

    for (const opportunity of opportunityResult.rows) {
      const match = scoreOpportunity(
        {
          name: opportunity.name,
          description: opportunity.description,
          location: opportunity.location,
          projectType: opportunity.projectType,
        },
        productResult.rows,
        rules
      );

      const reason = JSON.stringify({
        reasons: match.reasons,
        unknowns: match.unknowns,
        matchedPoints: match.matchedPoints,
        availablePoints: match.availablePoints,
        algorithm: "RULE_BASED_V1",
      });

      await client.query(
        `
        UPDATE "opportunity"
        SET
          "relevanceScore" = $1,
          "qualificationReason" = $2
        WHERE "id" = $3
          AND "businessId" = $4
        `,
        [match.score, reason, opportunity.id, id]
      );

      results.push({
        opportunityId: opportunity.id,
        ...match,
      });
    }

    await client.query("COMMIT");

    return NextResponse.json({
      businessId: id,
      processed: results.length,
      results,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Opportunity matching failed:", error);

    return NextResponse.json(
      { error: "Failed to match opportunities" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}