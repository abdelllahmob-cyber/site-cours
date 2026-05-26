import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET(req: Request) {
  // Verify device is registered
  const deviceId = req.headers.get("x-device-id");

  if (!deviceId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getServiceClient();

  const { data: device } = await db
    .from("access_codes")
    .select("id, is_active")
    .eq("device_id", deviceId)
    .single();

  if (!device || !device.is_active) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: lessons, error } = await db
    .from("lessons")
    .select("id, title, bunny_url, code_content, lesson_order")
    .order("lesson_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ lessons });
}
