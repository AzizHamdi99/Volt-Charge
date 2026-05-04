import { DefaultSession } from "next-auth";

type UserRole = "admin" | "user";

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    keycloakId?: string;
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    keycloakId?: string;
    role?: UserRole;
  }
}
