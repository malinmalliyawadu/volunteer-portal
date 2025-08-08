import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

type AppRole = "ADMIN" | "VOLUNTEER";

type TokenWithRole = JWT & { role?: AppRole };

type SessionUserWithRole = { id?: string; role?: AppRole };

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as TokenWithRole;
      if (user) {
        const u = user as { role?: AppRole };
        t.role = u.role;
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as TokenWithRole & { sub?: string };
      const s = session as Session;
      if (s.user) {
        const u = s.user as SessionUserWithRole;
        u.id = t.sub;
        u.role = t.role;
      }
      return s;
    },
  },
};
