import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith("/login");

  // Guest phone camera stays public (QR). LED Kiss Cam controller requires staff login.
  const isKissCamCamera = path.startsWith("/reception/kiss-cam/camera");
  const isKissCamLed =
    path === "/reception/kiss-cam" ||
    (path.startsWith("/reception/kiss-cam/") && !isKissCamCamera);

  const isPublic =
    isAuthPage ||
    isKissCamCamera ||
    (path.startsWith("/reception") && !isKissCamLed) ||
    path.startsWith("/api/health") ||
    path.startsWith("/api/kiss-cam");

  if (!user && !isPublic) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  if (user && isAuthPage) {
    const next = request.nextUrl.searchParams.get("next");
    const safeNext =
      next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")
        ? next
        : "/dashboard";
    const redirect = request.nextUrl.clone();
    redirect.pathname = safeNext;
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return supabaseResponse;
}
