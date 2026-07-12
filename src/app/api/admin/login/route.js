import { authenticateAdmin } from "@/lib/adminAuth";

export async function POST(req) {
  const { email, password } = await req.json();
  const result = await authenticateAdmin(email || "", password || "");

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 401 });
  }

  return Response.json({ user: result.user });
}
