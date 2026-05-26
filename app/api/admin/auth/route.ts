import { NextResponse } from "next/server";
import { generateAdminToken } from "@/lib/admin";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }

  const token = generateAdminToken(password);
  return NextResponse.json({ token });
}
