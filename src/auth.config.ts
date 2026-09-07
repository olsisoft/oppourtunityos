import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration (no database, no bcrypt). Used by the proxy
 * to gate /app routes with the JWT only. The full config in `auth.ts` adds
 * the Credentials provider.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isProtected = request.nextUrl.pathname.startsWith("/app");
      if (!isProtected) return true;
      return Boolean(auth?.user);
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.name = user.name ?? token.name;
        token.email = user.email ?? token.email;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
