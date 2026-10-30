
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

function optionalText(
  value: unknown,
  maxLength: number
): string | null | undefined {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return undefined;
  }

  return trimmed || null;
}

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const user = await getUserByEmail(
      session.user.email
    );

    if (!user) {
      return NextResponse.json(
        { error: "User account not found" },
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

    const result = await pool.query(
      `
      SELECT
        o."id",
        o."businessId",
        o."status",
        o."relevanceScore",
        o."qualificationReason",
        o."discoveredAt",
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
        SELECT "url", "title"
        FROM "projectSource"
        WHERE "projectId" = p."id"
        ORDER BY "retrievedAt" DESC, "id" DESC
        LIMIT 1
      ) s ON TRUE
      WHERE b."id" = $1
        AND b."userId" = $2
      ORDER BY o."discoveredAt" DESC, o."id" DESC
      `,
      [id, user.id]
    );

    return NextResponse.json({
      opportunities: result.rows,
    });
  } catch (error) {
    console.error("Failed to fetch opportunities:", error);

    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}


export async function POST(
  request: Request,
  { params }: RouteContext
) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const user = await getUserByEmail(
      session.user.email
    );

    if (!user) {
      return NextResponse.json(
        { error: "User account not found" },
        { status: 403 }
      );
    }

    const { businessId } = await params;
    const id = Number(businessId);

    if (
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid business ID" },
        { status: 400 }
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
        { error: "Invalid project details" },
        { status: 400 }
      );
    }

    const input = body as Record<
      string,
      unknown
    >;

    const name = optionalText(
      input.name,
      200
    );

    const description = optionalText(
      input.description,
      5000
    );

    const location = optionalText(
      input.location,
      200
    );

    const projectType = optionalText(
      input.projectType,
      200
    );

    const stage = optionalText(
      input.stage,
      200
    );

    const sourceTitle = optionalText(
      input.sourceTitle,
      300
    );

    if (
      !name ||
      description === undefined ||
      location === undefined ||
      projectType === undefined ||
      stage === undefined ||
      sourceTitle === undefined
    ) {
      return NextResponse.json(
        {
          error: "Invalid project details",
        },
        { status: 400 }
      );
    }

    if (
      typeof input.sourceUrl !== "string" ||
      input.sourceUrl.trim().length === 0 ||
      input.sourceUrl.length > 2000
    ) {
      return NextResponse.json(
        {
          error: "A valid source URL is required",
        },
        { status: 400 }
      );
    }

    let sourceUrl: string;

    try {
      const parsed = new URL(
        input.sourceUrl.trim()
      );

      if (
        parsed.protocol !== "http:" &&
        parsed.protocol !== "https:"
      ) {
        throw new Error(
          "Unsupported URL protocol"
        );
      }

      // Fragments identify sections of a page,
      // not separate project sources.
      parsed.hash = "";

      sourceUrl = parsed.toString();

      if (sourceUrl.length > 2000) {
        throw new Error("URL too long");
      }
    } catch {
      return NextResponse.json(
        {
          error:
            "A valid HTTP or HTTPS source URL is required",
        },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Confirm that this business belongs
      // to the signed-in user.
      const ownership =
        await client.query(
          `
          SELECT "id"
          FROM "business"
          WHERE "id" = $1
            AND "userId" = $2
          LIMIT 1
          `,
          [id, user.id]
        );

      if (ownership.rowCount === 0) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            error: "Business not found",
          },
          { status: 404 }
        );
      }

      // Serialize submissions for the same
      // source URL, then for the same business.
      // This reduces duplicate creation when
      // requests arrive simultaneously through
      // this API route.
      await client.query(
        `
        SELECT pg_advisory_xact_lock(
          hashtext($1),
          hashtext($2)
        )
        `,
        ["BUILDLEAD_SOURCE", sourceUrl]
      );

      await client.query(
        `
        SELECT pg_advisory_xact_lock(
          $1::integer,
          $2::integer
        )
        `,
        [912345, id]
      );

      // First check whether another project
      // already uses this source URL.
      const existingSource =
        await client.query<{
          id: number;
          projectId: number;
        }>(
          `
          SELECT
            "id",
            "projectId"
          FROM "projectSource"
          WHERE "url" = $1
          ORDER BY "id" ASC
          LIMIT 1
          `,
          [sourceUrl]
        );

      const source =
        existingSource.rows[0];

      if (source) {
        // This source already identifies
        // an existing project. Check whether
        // this business already has it.
        const existingOpportunity =
          await client.query<{
            id: number;
          }>(
            `
            SELECT "id"
            FROM "opportunity"
            WHERE "businessId" = $1
              AND "projectId" = $2
            LIMIT 1
            `,
            [id, source.projectId]
          );

        if (
          existingOpportunity.rowCount !== 0
        ) {
          await client.query(
            "ROLLBACK"
          );

          return NextResponse.json(
            {
              error:
                "This project is already in your opportunities.",
              duplicate: true,
              reason: "SOURCE_URL",
              opportunityId:
                existingOpportunity.rows[0].id,
            },
            { status: 409 }
          );
        }

        // The source exists, but this
        // business has not received the
        // project yet. Reuse it instead
        // of creating another project.
        const opportunityResult =
          await client.query(
            `
            INSERT INTO "opportunity"
              (
                "businessId",
                "projectId",
                "status"
              )
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [
              id,
              source.projectId,
              "DISCOVERED",
            ]
          );

        await client.query("COMMIT");

        return NextResponse.json(
          {
            message:
              "Existing project added to your opportunities.",
            reusedProject: true,
            projectId: source.projectId,
            opportunity:
              opportunityResult.rows[0],
          },
          { status: 201 }
        );
      }

      // No matching URL exists. Check for
      // a potential duplicate within this
      // business using project name and
      // location.
      const possibleDuplicate =
        await client.query<{
          id: number;
          projectId: number;
          projectName: string;
        }>(
          `
          SELECT
            o."id",
            p."id" AS "projectId",
            p."name" AS "projectName"
          FROM "opportunity" o
          INNER JOIN "project" p
            ON p."id" = o."projectId"
          WHERE o."businessId" = $1
            AND lower(trim(p."name")) =
                lower(trim($2::text))
            AND lower(
                  trim(
                    COALESCE(
                      p."location",
                      ''
                    )
                  )
                ) =
                lower(
                  trim(
                    COALESCE(
                      $3::text,
                      ''
                    )
                  )
                )
          LIMIT 1
          `,
          [id, name, location]
        );

      if (
        possibleDuplicate.rowCount !== 0
      ) {
        await client.query("ROLLBACK");

        return NextResponse.json(
          {
            error:
              "A project with the same name and location already exists in your opportunities. Check it before adding another.",
            duplicate: true,
            reason: "NAME_AND_LOCATION",
            opportunityId:
              possibleDuplicate.rows[0].id,
            projectId:
              possibleDuplicate.rows[0].projectId,
          },
          { status: 409 }
        );
      }

      // No duplicate found. Create
      // the project.
      const projectResult =
        await client.query(
          `
          INSERT INTO "project"
            (
              "name",
              "description",
              "location",
              "projectType",
              "stage"
            )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
          `,
          [
            name,
            description,
            location,
            projectType,
            stage,
          ]
        );

      const project =
        projectResult.rows[0];

      // Store the submitted source.
      const sourceResult =
        await client.query(
          `
          INSERT INTO "projectSource"
            (
              "projectId",
              "url",
              "title",
              "sourceType"
            )
          VALUES ($1, $2, $3, $4)
          RETURNING *
          `,
          [
            project.id,
            sourceUrl,
            sourceTitle,
            "USER_SUBMITTED",
          ]
        );

      // Create the opportunity for
      // this business.
      const opportunityResult =
        await client.query(
          `
          INSERT INTO "opportunity"
            (
              "businessId",
              "projectId",
              "status"
            )
          VALUES ($1, $2, $3)
          RETURNING *
          `,
          [
            id,
            project.id,
            "DISCOVERED",
          ]
        );

      await client.query("COMMIT");

      return NextResponse.json(
        {
          message:
            "Project created successfully.",
          reusedProject: false,
          project,
          source:
            sourceResult.rows[0],
          opportunity:
            opportunityResult.rows[0],
        },
        { status: 201 }
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(
      "Failed to create opportunity:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create opportunity",
      },
      { status: 500 }
    );
  }
}