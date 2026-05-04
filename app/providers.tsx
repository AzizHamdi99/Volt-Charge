"use client";
import { useAuthStore } from "@/store/useAuthStore";
import axios from "axios";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
function AuthSync() {
  const { status } = useSession();
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => {
    if (status === "authenticated") {
      axios
        .get("/api/user/me")
        .then((res) => setUser(res.data))
        .catch(() => clearUser());
    }
    if (status === "unauthenticated") {
      clearUser();
    }
  }, [status]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthSync />
      {children}
    </SessionProvider>
  );
}
