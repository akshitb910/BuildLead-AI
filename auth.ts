
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { syncUser } from "@/src/lib/auth/sync-user";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) {
        console.error("Google account or email missing");
        return false;
      }

      try {
        const dbUser = await syncUser(user.email, user.name);

        console.log("Google user synchronized:", dbUser.id);

        return true;
      } catch (error) {
        console.error("DATABASE SYNC ERROR:", error);
        return false;
      }
    },
  },
});