import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { Pool } from "pg";
import PostgresAdapter from "@auth/pg-adapter";
import nodemailer from "nodemailer";
import { SignJWT } from "jose";

declare global {
  // eslint-disable-next-line no-var
  var __mediBotPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn("DATABASE_URL is not set. NextAuth adapter will fail without it.");
}

const pool =
  global.__mediBotPool ??
  new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  global.__mediBotPool = pool;
}

const emailServer = process.env.EMAIL_SERVER?.trim();
const emailFrom = process.env.EMAIL_FROM?.trim();
const emailEnabled = Boolean(emailServer && emailFrom && /^smtps?:\/\//i.test(emailServer));
const transporter = emailEnabled ? nodemailer.createTransport(emailServer as string) : null;

async function signAccessToken(payload: Record<string, unknown>) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not configured");
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(new TextEncoder().encode(secret));
}

export const authConfig = {
  adapter: PostgresAdapter(pool),
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/signin",
    verifyRequest: "/verify-email",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    ...(emailEnabled
      ? [
          EmailProvider({
            server: emailServer,
            from: emailFrom,
            sendVerificationRequest: async ({ identifier, url }) => {
              const html = `
                <div style="font-family: sans-serif; padding: 32px;">
                  <h2>Sign in to MediBot</h2>
                  <p>Click the button below to verify your email and continue.</p>
                  <p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#4FD1C5;color:#0F172A;border-radius:9999px;text-decoration:none;">Verify Email</a></p>
                  <p>If you did not request this, please ignore this message.</p>
                </div>`;
              await transporter!.sendMail({
                to: identifier,
                from: process.env.EMAIL_FROM,
                subject: "Sign in to MediBot",
                html,
              });
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name ?? token.name;
        token.email = user.email ?? token.email;
        token.provider = account?.provider ?? token.provider ?? "email";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.email = token.email ?? session.user.email;
        session.user.name = token.name ?? session.user.name;
        session.user.provider = token.provider as string | undefined;
      }

      const accessToken = await signAccessToken({
        sub: token.sub,
        email: token.email,
        name: token.name,
        provider: token.provider,
      });

      session.accessToken = accessToken;
      return session;
    },
    async signIn({ user, account }) {
      if (!user?.email) return false;
      try {
        await pool.query("UPDATE users SET provider = $1 WHERE id = $2", [account?.provider ?? "email", user.id]);
      } catch (error) {
        console.error("Failed to update provider", error);
      }
      return true;
    },
  },
} satisfies NextAuthConfig;

export const { handlers: authHandlers, auth, signIn, signOut } = NextAuth(authConfig);

