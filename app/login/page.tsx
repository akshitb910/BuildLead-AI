
import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
        <h1 className="mb-3 text-3xl font-bold">
          Welcome to BuildLead AI
        </h1>

        <p className="mb-8 text-slate-400">
          Sign in to discover business opportunities
          and manage your outreach.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", {
              redirectTo: "/dashboard",
            });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-200"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}