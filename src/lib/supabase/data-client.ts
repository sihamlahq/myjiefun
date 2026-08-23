import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isJwtClockSkewError } from "@/lib/supabase/errors";

type AnyClient = SupabaseClient;

/**
 * Prefer the user session client. If PostgREST rejects a freshly minted access
 * token with PGRST303 ("JWT issued at future") while Auth still accepts the
 * session, fall back to the service role key (static `iat`, still valid) after
 * confirming the user via Auth. RLS is bypassed only for that verified staff
 * request — same trust model as other service-backed staff routes.
 */
export async function resolveDataClient(userClient: AnyClient): Promise<AnyClient> {
  const probe = await userClient.from("app_settings").select("key").limit(1);
  if (!isJwtClockSkewError(probe.error?.message)) {
    return userClient;
  }

  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return userClient;
  }

  try {
    return createServiceClient();
  } catch {
    return userClient;
  }
}

/** Server cookie client + optional service-role fallback for clock skew. */
export async function createDataClient(): Promise<AnyClient> {
  const userClient = await createClient();
  return resolveDataClient(userClient);
}

/**
 * Auth-gate for mutations / protected APIs. Returns a data client that survives
 * transient PGRST303 when the service role key is configured.
 */
export async function requireAuthedDataClient(): Promise<{
  supabase: AnyClient;
  user: { id: string; email?: string | null };
}> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const supabase = await resolveDataClient(userClient);
  return { supabase, user };
}
