import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyAdminToken, getTokenFromRequest } from "@/lib/admin";

// GET: list all access codes + their device status
export async function GET(req: Request) {
  if (!verifyAdminToken(getTokenFromRequest(req) ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getServiceClient();
  const { data, error } = await db
    .from("access_codes")
    .select("id, code, label, device_id, device_info, registered_at, last_seen, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ devices: data });
}

// POST: add a new access code
export async function POST(req: Request) {
  if (!verifyAdminToken(getTokenFromRequest(req) ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { code, label } = await req.json();
  if (!code) return NextResponse.json({ error: "missing_code" }, { status: 400 });

  const db = getServiceClient();
  const { data, error } = await db
    .from("access_codes")
    .insert({ code: code.trim(), label: label ?? "" })
    .select()
    .single();

  if (error?.code === "23505") {
    return NextResponse.json({ error: "code_exists" }, { status: 409 });
  }
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ device: data });
}
