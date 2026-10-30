
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

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    // 1. Identify the signed-in user.
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
        { error: "User account not found" },
        { status: 403 }
      );
    }

    // 2. Validate the business ID.
    const { businessId } = await params;
    const id = Number(businessId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Invalid business ID" },
        { status: 400 }
      );
    }

    // 3. Check that the user owns this business.
    const ownership = await pool.query(
      `
      SELECT "id"
      FROM "business"
      WHERE "id" = $1 AND "userId" = $2
      LIMIT 1
      `,
      [id, user.id]
    );

    if (ownership.rowCount === 0) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // 4. Validate the product details.
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid product details" },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;

    if (
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.length > 200 ||
      (input.category != null &&
        (typeof input.category !== "string" ||
          input.category.length > 200)) ||
      (input.description != null &&
        (typeof input.description !== "string" ||
          input.description.length > 5000)) ||
      (input.applications != null &&
        (!Array.isArray(input.applications) ||
          input.applications.length > 30 ||
          !input.applications.every(
            (item: unknown) =>
              typeof item === "string" &&
              item.trim().length > 0 &&
              item.length <= 200
          )))
    ) {
      return NextResponse.json(
        { error: "Invalid product details" },
        { status: 400 }
      );
    }

    // 5. Save the product under the verified business.
    const result = await pool.query(
      `
      INSERT INTO "product"
        ("businessId", "name", "category",
         "description", "applications")
      VALUES ($1, $2, $3, $4, $5::text[])
      RETURNING *
      `,
      [
        id,
        input.name.trim(),
        typeof input.category === "string"
          ? input.category.trim() || null
          : null,
        typeof input.description === "string"
          ? input.description.trim() || null
          : null,
        Array.isArray(input.applications)
          ? input.applications.map((item: string) => item.trim())
          : [],
      ]
    );

    return NextResponse.json(result.rows[0], {
      status: 201,
    });
  } catch (error) {
    console.error("Failed to create product:", error);

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}