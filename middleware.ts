import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {
    // Authorization decisions are handled in callbacks.authorized.
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        if (!token) return false;

        const isAdminPath = req.nextUrl.pathname.startsWith("/admin");
        if (isAdminPath) {
          return token.role === "admin";
        }

        return true;
      },
    },
  },
);

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};