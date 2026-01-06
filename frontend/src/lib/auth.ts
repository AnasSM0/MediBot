import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

if (typeof window !== "undefined") {
  throw new Error("This module must not be imported in the browser");
}
import EmailProvider from "next-auth/providers/email";
import { Pool } from "pg";
import PostgresAdapter from "@auth/pg-adapter";
import nodemailer from "nodemailer";
import { SignJWT } from "jose";

declare global {
  // eslint-disable-next-line no-var
  var __mediBotPool: Pool | undefined;
}

let connectionString = process.env.DATABASE_URL;

// Convert asyncpg URL to standard postgres URL if needed
if (connectionString?.includes('postgresql+asyncpg://')) {
  connectionString = connectionString.replace('postgresql+asyncpg://', 'postgresql://');
}

// Only initialize pool if DATABASE_URL is provided to prevent connection errors
const pool = connectionString 
  ? (global.__mediBotPool ?? new Pool({
      connectionString,
      ssl: connectionString?.includes('neon.tech') || process.env.NODE_ENV === "production" 
        ? { rejectUnauthorized: false } 
        : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }))
  : undefined;

// Handle pool errors only if pool exists
pool?.on('error', (err: Error) => {
  console.error('Unexpected database pool error:', err);
});

if (process.env.NODE_ENV !== "production" && pool) {
  global.__mediBotPool = pool;
}

const emailServer = process.env.EMAIL_SERVER?.trim();
const emailFrom = process.env.EMAIL_FROM?.trim();
const emailEnabled = Boolean(emailServer && emailFrom && /^smtps?:\/\//i.test(emailServer));
const transporter = emailEnabled && emailServer ? nodemailer.createTransport(emailServer) : null;

async function signAccessToken(payload: Record<string, unknown>) {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error("NEXTAUTH_SECRET is not configured");
      throw new Error("NEXTAUTH_SECRET is not configured");
    }
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(new TextEncoder().encode(secret));
  } catch (error) {
    console.error("Error signing access token:", error);
    return null;
  }
}

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "development-secret-key";

export const authConfig = {
  secret: AUTH_SECRET,
  trustHost: true,
//   adapter: PostgresAdapter(pool),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
    verifyRequest: "/verify-email",
  },
  providers: [
    GoogleProvider({
      clientId: (() => {
        const id = process.env.GOOGLE_CLIENT_ID;
        console.log("GOOGLE_CLIENT_ID present:", !!id);
        return id ?? "";
      })(),
      clientSecret: (() => {
        const secret = process.env.GOOGLE_CLIENT_SECRET;
        console.log("GOOGLE_CLIENT_SECRET present:", !!secret);
        return secret ?? "";
      })(),
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
        // await pool.query("UPDATE users SET provider = $1 WHERE id = $2", [account?.provider ?? "email", user.id]);
      } catch (error) {
        console.error("Failed to update provider", error);
      }
      return true;
    },
  },
} satisfies NextAuthConfig;

export const { handlers: authHandlers, auth, signIn, signOut } = NextAuth(authConfig);

