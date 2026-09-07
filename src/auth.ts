import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import { prisma } from "@/db/prisma";
import { loginSchema } from "@/domain/schemas";
import { logger } from "@/lib/logger";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user) {
          logger.info("auth.login_failed", { reason: "unknown_user" });
          return null;
        }
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) {
          logger.info("auth.login_failed", { reason: "bad_password", userId: user.id });
          return null;
        }
        logger.info("auth.login", { userId: user.id });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
