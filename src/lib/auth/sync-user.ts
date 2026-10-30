
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type DatabaseUser = {
  id: number;
  email: string;
  name: string | null;
};

export async function syncUser(
  email: string,
  name?: string | null
): Promise<DatabaseUser> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("A valid email is required");
  }

  const result = await pool.query<DatabaseUser>(
    `
    INSERT INTO "user" ("email", "name")
    VALUES ($1, $2)
    ON CONFLICT ("email")
    DO UPDATE SET "email" = EXCLUDED."email"
    RETURNING "id", "email", "name"
    `,
    [normalizedEmail, name ?? null]
  );

  return result.rows[0];
}

export async function getUserByEmail(email: string) {
  const result = await pool.query<DatabaseUser>(
    `
    SELECT "id", "email", "name"
    FROM "user"
    WHERE "email" = $1
    LIMIT 1
    `,
    [email.trim().toLowerCase()]
  );

  return result.rows[0] ?? null;
}