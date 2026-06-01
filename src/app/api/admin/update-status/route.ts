import { getCurrentUser } from "@/lib/auth";
import { readUpdateStatus } from "@/lib/update-status.server";

// Status nie cachen – wird vom Admin-UI im Sekundentakt gepollt.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const status = await readUpdateStatus();
  return Response.json(status ?? { state: "idle" });
}
