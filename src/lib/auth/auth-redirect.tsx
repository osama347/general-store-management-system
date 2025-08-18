import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export interface SessionData {
  user: User;
}

/**
 * Retrieves the current session from Supabase server-side.
 * Returns null if no valid session exists.
 */
export async function getSession(): Promise<SessionData | null> {
  const supabase = createClient();

  const {
    data: { session },
    error,
  } = await (await supabase).auth.getSession();

  if (error || !session) {
    return null;
  }

  return { user: session.user };
}
