import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

type AppRole = "ADMIN" | "VOLUNTEER";

type TokenWithProfile = JWT & {
  role?: AppRole;
  phone?: string;
  firstName?: string;
  lastName?: string;
};

type SessionUserWithProfile = {
  id?: string;
  role?: AppRole;
  phone?: string;
  firstName?: string;
  lastName?: string;
};

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
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const t = token as TokenWithProfile;
      if (user) {
        const u = user as {
          role?: AppRole;
          phone?: string;
          firstName?: string;
          lastName?: string;
        };
        t.role = u.role;
        t.phone = u.phone;
        t.firstName = u.firstName;
        t.lastName = u.lastName;
      }

      // Handle session updates (like profile changes)
      if (trigger === "update" && session) {
        // Update token with fresh user data from database
        const dbUser = await prisma.user.findUnique({
          where: { id: t.sub },
          select: {
            name: true,
            phone: true,
            role: true,
            firstName: true,
            lastName: true,
          },
        });
        if (dbUser) {
          t.name = dbUser.name;
          t.phone = dbUser.phone;
          t.role = dbUser.role;
          t.firstName = dbUser.firstName;
          t.lastName = dbUser.lastName;
        }
      }

      return t;
    },
    async session({ session, token }) {
      const t = token as TokenWithProfile & { sub?: string };
      const s = session as Session;
      if (s.user) {
        const u = s.user as SessionUserWithProfile;
        u.id = t.sub;
        u.role = t.role;
        u.phone = t.phone;
        u.firstName = t.firstName;
        u.lastName = t.lastName;
      }
      return s;
    },
  },
};
