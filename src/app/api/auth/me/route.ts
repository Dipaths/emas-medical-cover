import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const u = await getSessionUser(req);
  if (!u) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ email: u.email, name: u.name, roles: u.roles, mustChangePassword: u.mustChangePassword });
}
