import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/session";
import { isAdmin, ADMIN_EMAIL } from "@/lib/allowlist";

async function requireAdmin() {
  const user = await getUser();
  if (!user || !isAdmin(user.email)) return null;
  return user;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entries = await prisma.allowedEmail.findMany({
    orderBy: { createdAt: "asc" },
  });

  // Always include admin email in the response
  const adminInDb = entries.some((e) => e.email === ADMIN_EMAIL);

  return NextResponse.json({
    adminEmail: ADMIN_EMAIL,
    entries: adminInDb ? entries : [{ id: "admin", email: ADMIN_EMAIL, addedBy: "system", createdAt: new Date().toISOString() }, ...entries],
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email } = await request.json();
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();

  const existing = await prisma.allowedEmail.findUnique({ where: { email: normalized } });
  if (existing) {
    return NextResponse.json({ error: "Email already in allowlist" }, { status: 409 });
  }

  const entry = await prisma.allowedEmail.create({
    data: { email: normalized, addedBy: admin.email },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email parameter required" }, { status: 400 });
  }

  if (email === ADMIN_EMAIL) {
    return NextResponse.json({ error: "Cannot remove admin email" }, { status: 400 });
  }

  await prisma.allowedEmail.deleteMany({ where: { email } });

  return NextResponse.json({ ok: true });
}
