import { createUser } from "@/services/user/createUser";
import KeycloakProvider from "next-auth/providers/keycloak";
import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import axios from "axios";

type UserRole = "admin" | "user";

interface TokenWithId extends JWT {
  idToken?: string;
  accessToken?: string;
  keycloakId?: string;
  role?: UserRole;
}

type ProfileWithRoles = {
  sub?: string;
  email?: string;
  preferred_username?: string;
};

type AccessTokenClaims = {
  sub?: string;
  email?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
};

function decodeAccessToken(accessToken?: string): AccessTokenClaims {
  if (!accessToken) return {};

  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return {};

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = Buffer.from(padded, "base64").toString("utf8");

    return JSON.parse(decoded) as AccessTokenClaims;
  } catch {
    return {};
  }
}

function resolveRole(accessToken?: string): UserRole {
  const roles = decodeAccessToken(accessToken).realm_access?.roles ?? [];
  return roles.includes("admin") ? "admin" : "user";
}

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      const p = profile as ProfileWithRoles | undefined;
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        const claims = decodeAccessToken(account.access_token);
        token.keycloakId = claims.sub ?? p?.sub ?? account.providerAccountId;
        token.role = resolveRole(account.access_token);
      }

      return token;
    },
    async session({ session, token }) {
      const t = token as TokenWithId;
      session.accessToken = t.accessToken;
      session.keycloakId = t.keycloakId;
      session.role = t.role ?? "user";
      return session;
    },
    async signIn({ profile, account }) {
      try {
        const p = profile as ProfileWithRoles | undefined;
        const claims = decodeAccessToken(account?.access_token);

        await createUser({
          name: p?.preferred_username || claims.preferred_username || "",
          email: p?.email || claims.email || "",
          keycloakId: claims.sub || p?.sub || account?.providerAccountId || "",
          role: resolveRole(account?.access_token),
        });

        return true;
      } catch (error) {
        console.error("Error creating user in MongoDB", error);
        return false;
      }
    },
  },
  events: {
    async signOut({ token }) {
      const t = token as TokenWithId;
      if (!t?.idToken) return;
      await axios.get(
        `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/logout`,
        {
          params: {
            id_token_hint: t.idToken,
          },
        }
      );
    },
  },
};