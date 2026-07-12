import { getAdminUser } from "@/lib/adminAuth";

export async function GET() {
  const { user, isAdmin } = await getAdminUser();
  return Response.json({ user: isAdmin ? user : null });
}
