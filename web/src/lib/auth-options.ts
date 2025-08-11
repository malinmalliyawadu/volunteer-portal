import type { NextAuthOptions, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import AppleProvider from "next-auth/providers/apple";
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
    // OAuth Providers
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
    // Credentials Provider
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
    async signIn({ user, account, profile }) {
      // Handle OAuth sign-in
      if (account?.provider !== "credentials" && user?.email) {
        try {
          // Check if user already exists
          let existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!existingUser) {
            // Create new user for OAuth sign-in
            const nameParts = user.name?.split(" ") || [];
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || "";

            existingUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name || "",
                firstName,
                lastName,
                role: "VOLUNTEER", // Default role for OAuth users
                profilePhotoUrl: user.image || null,
                // OAuth users don't need a password
                hashedPassword: "",
                // Set default agreement acceptance for OAuth users
                volunteerAgreementAccepted: false, // They'll need to complete profile
                healthSafetyPolicyAccepted: false,
              },
            });
          } else {
            // Update existing user's profile photo if from OAuth
            if (user.image && !existingUser.profilePhotoUrl) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { profilePhotoUrl: user.image },
              });
            }
          }

          // Update the user object with database info for the session
          (user as any).id = existingUser.id;
          (user as any).role = existingUser.role;
          (user as any).phone = existingUser.phone;
          (user as any).firstName = existingUser.firstName;
          (user as any).lastName = existingUser.lastName;
        } catch (error) {
          console.error("Error handling OAuth sign-in:", error);
          return false;
        }
      }
      return true;
    },
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
          t.phone = dbUser.phone || undefined;
          t.role = dbUser.role;
          t.firstName = dbUser.firstName || undefined;
          t.lastName = dbUser.lastName || undefined;
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
  pages: {
    signIn: "/login",
  },
};
