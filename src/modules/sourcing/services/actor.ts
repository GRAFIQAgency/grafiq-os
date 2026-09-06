import "server-only";

import { getCurrentUser } from "@/modules/auth/queries";

export interface Actor {
  id: string | null;
  name: string | null;
}

export async function currentActor(): Promise<Actor> {
  const user = await getCurrentUser();
  return user ? { id: user.user.id, name: user.displayName } : { id: null, name: null };
}
