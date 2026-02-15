import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }

      // Ensure user exists in DB (handles DB reset while JWT persists)
      if (account || !token.dbSynced) {
        if (token.id && token.email) {
          const [existing] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, token.id as string))
            .limit(1);

          if (!existing) {
            await db
              .insert(users)
              .values({
                id: token.id as string,
                email: token.email,
                name: token.name || null,
                image: (token.picture as string) || null,
              })
              .onConflictDoNothing();
          }
          token.dbSynced = true;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/library") ||
        request.nextUrl.pathname.startsWith("/create") ||
        request.nextUrl.pathname.startsWith("/study") ||
        request.nextUrl.pathname.startsWith("/lessons") ||
        request.nextUrl.pathname.startsWith("/contacts") ||
        request.nextUrl.pathname.startsWith("/settings");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      return true;
    },
  },
});
