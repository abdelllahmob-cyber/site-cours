import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const { code, deviceId, deviceInfo } = await req.json();

  if (!code || !deviceId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const db = getServiceClient();

  // Find the code
  const { data: row, error } = await db
    .from("access_codes")
    .select("*")
    .eq("code", code.trim())
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  if (!row.is_active) {
    return NextResponse.json({ error: "code_disabled" }, { status: 403 });
  }

  // Code is unclaimed - claim it for this device
  if (!row.device_id) {
    await db
      .from("access_codes")
      .update({
        device_id: deviceId,
        device_info: deviceInfo || "",
        registered_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      })
      .eq("id", row.id);

    return NextResponse.json({ success: true, label: row.label });
  }

  // Code is already claimed by THIS device
  if (row.device_id === deviceId) {
    await db
      .from("access_codes")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", row.id);

    return NextResponse.json({ success: true, label: row.label });
  }

  // Code is claimed by a DIFFERENT device
  return NextResponse.json({ error: "device_mismatch" }, { status: 403 });
}
