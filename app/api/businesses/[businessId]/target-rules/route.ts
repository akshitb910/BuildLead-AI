
import { auth } from "@/auth";
import { getUserByEmail } from "@/src/lib/auth/sync-user";
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type RouteContext = {
  params: Promise<{ businessId: string }>;
};

type TargetRules = {
  locations: string[];
  companyTypes: string[];
  projectTypes: string[];
  targetRoles: string[];
  keywords: string[];
};

const fields: (keyof TargetRules)[] = [
  "locations",
  "companyTypes",
  "projectTypes",
  "targetRoles",
  "keywords",
];

async function getOwnedBusiness(
  businessId: string
) {
  const session = await auth();

  if (!session?.user?.email) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  const user = await getUserByEmail(session.user.email);

  if (!user) {
    return { error: "User account not found", status: 403 } as const;
  }

  const id = Number(businessId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return { error: "Invalid business ID", status: 400 } as const;
  }

  const result = await pool.query(
    `
    SELECT "id"
    FROM "business"
    WHERE "id" = $1 AND "userId" = $2
    LIMIT 1
    `,
    [id, user.id]
  );

  if (result.rowCount === 0) {
    return { error: "Business not found", status: 404 } as const;
  }

  return { id } as const;
}

// Retrieve the business's existing targeting profile.
export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { businessId } = await params;
    const access = await getOwnedBusiness(businessId);

    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const result = await pool.query(
      `
      SELECT *
      FROM "targetRule"
      WHERE "businessId" = $1
      LIMIT 1
      `,
      [access.id]
    );

    return NextResponse.json({
      targetRules: result.rows[0] ?? null,
    });
  } catch (error) {
    console.error("Failed to load target rules:", error);

    return NextResponse.json(
      { error: "Failed to load target rules" },
      { status: 500 }
    );
  }
}

// Create or update the targeting profile.
export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { businessId } = await params;
    const access = await getOwnedBusiness(businessId);

    if ("error" in access) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid targeting details" },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;
    const rules = {} as TargetRules;

    for (const field of fields) {
      const value = input[field];

      if (
        !Array.isArray(value) ||
        value.length > 50 ||
        !value.every(
          (item: unknown) =>
            typeof item === "string" &&
            item.trim().length > 0 &&
            item.length <= 200
        )
      ) {
        return NextResponse.json(
          { error: `Invalid ${field}` },
          { status: 400 }
        );
      }

      rules[field] = [
        ...new Set(
          (value as string[]).map((item) => item.trim())
        ),
      ];
    }

    const result = await pool.query(
      `
      INSERT INTO "targetRule"
        (
          "businessId",
          "locations",
          "companyTypes",
          "projectTypes",
          "targetRoles",
          "keywords"
        )
      VALUES (
        $1,
        $2::text[],
        $3::text[],
        $4::text[],
        $5::text[],
        $6::text[]
      )
      ON CONFLICT ("businessId")
      DO UPDATE SET
        "locations" = EXCLUDED."locations",
        "companyTypes" = EXCLUDED."companyTypes",
        "projectTypes" = EXCLUDED."projectTypes",
        "targetRoles" = EXCLUDED."targetRoles",
        "keywords" = EXCLUDED."keywords"
      RETURNING *
      `,
      [
        access.id,
        rules.locations,
        rules.companyTypes,
        rules.projectTypes,
        rules.targetRoles,
        rules.keywords,
      ]
    );

    return NextResponse.json(
      { targetRules: result.rows[0] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to save target rules:", error);

    return NextResponse.json(
      { error: "Failed to save target rules" },
      { status: 500 }
    );
  }
}