
import { auth } from "@/auth";
import { getUserByEmail } from "@/src/lib/auth/sync-user";
import TargetPreferencesForm from "@/components/targets/TargetPreferencesForm";
import { notFound, redirect } from "next/navigation";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type PageProps = {
  params: Promise<{
    businessId: string;
  }>;
};

export default async function TargetPreferencesPage({
  params,
}: PageProps) {
  // Require an authenticated session.
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  // Find the signed-in user.
  const user = await getUserByEmail(
    session.user.email
  );

  if (!user) {
    redirect("/login");
  }

  // Validate the business ID.
  const { businessId } = await params;
  const id = Number(businessId);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    notFound();
  }

  // Ensure this business belongs to the user.
  const result = await pool.query(
    `
    SELECT "id"
    FROM "business"
    WHERE "id" = $1
      AND "userId" = $2
    LIMIT 1
    `,
    [id, user.id]
  );

  if (result.rowCount === 0) {
    notFound();
  }

  return <TargetPreferencesForm />;
}