import { route } from "@/lib/api";
import { TODOS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export const GET = route(TODOS, async (_req, { user }) => ({ user }));
