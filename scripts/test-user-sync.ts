
import "dotenv/config";
import { syncUser } from "../src/lib/auth/sync-user";

async function main() {
  const user = await syncUser(
    "sync-test@buildlead.local",
    "Sync Test User"
  );

  console.log("User synchronization successful!");
  console.log({
    id: user.id,
    name: user.name,
    email: user.email,
  });
}

main().catch((error) => {
  console.error("User synchronization failed:", error);
  process.exitCode = 1;
});