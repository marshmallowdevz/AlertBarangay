import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getRequiredRole } from "@/lib/auth/roles";
import { resolveAppRole } from "@/lib/auth/resolve-app-role";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const requiredRole = getRequiredRole(pathname);
  const isEntryRoute = pathname === "/" || pathname === "/login";

  const redirectTo = (path: string) => {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  if (!user) {
    if (requiredRole) return redirectTo("/login");
    return response;
  }

  if (!requiredRole && !isEntryRoute) return response;

  let resolution;
  try {
    resolution = await resolveAppRole(supabase, user.id);
  } catch {
    if (requiredRole) return redirectTo("/login");
    return response;
  }

  if (!resolution.ok) {
    if (requiredRole) return redirectTo("/login");
    return response;
  }

  if (isEntryRoute) return redirectTo(resolution.destination);
  if (requiredRole && resolution.role !== requiredRole) return redirectTo(resolution.destination);

  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
