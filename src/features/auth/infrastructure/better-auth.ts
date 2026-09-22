import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import {
  invitations,
  members,
  organizations,
} from "@/features/auth/infrastructure/organization-schema";
import {
  accounts,
  sessions,
  users,
  verifications,
} from "@/features/auth/infrastructure/user-schema";
import { getDb } from "@/shared/lib/db";
import { getServerEnv } from "@/shared/lib/env";

function createAuth() {
  const env = getServerEnv();

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
        organization: organizations,
        member: members,
        invitation: invitations,
      },
    }),
    plugins: [
      // Organização = congregação (roles owner/admin/member, mesmos do app).
      organization(),
    ],
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "member",
          required: false,
        },
      },
    },
  });
}

export const auth = createAuth();

export type Auth = typeof auth;
