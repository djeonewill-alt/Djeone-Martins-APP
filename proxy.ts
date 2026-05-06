import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = [
  "/cadastro",
  "/auth/callback",
  "/lista-espera",
];

const PUBLIC_PREFIXES = [
  "/ep/",
  "/api/og",
];

const FILE_EXTENSION_REGEX = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|css|js|map)$/i;

function isPublicPath(pathname: string) {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isStaticOrInternal(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    FILE_EXTENSION_REGEX.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isStaticOrInternal(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminEmail = (process.env.ADMIN_EMAIL || "djeonewill@gmail.com").toLowerCase();

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = isPublicPath(pathname);
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/cadastro";
    redirectUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/cadastro") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";

    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAdmin) {
    const userEmail = (user.email || "").toLowerCase();

    if (userEmail !== adminEmail) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.set("admin", "denied");

      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|css|js|map)$).*)",
  ],
};