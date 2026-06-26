import { NextRequest, NextResponse } from "next/server";

const USERS = [
  { pin: "123456", name: "Руководитель", role: "admin" },
];

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const user = USERS.find((u) => u.pin === String(pin));
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, name: user.name, role: user.role });
}
