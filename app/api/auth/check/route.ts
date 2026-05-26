import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: Request) {
  const { deviceId } = await req.json();

  if (!deviceId) {
    return NextResponse.json({ valid: false });
  }

  const db = getServiceClient();

  const { data: row } = await db
    .from("access_codes")
    .select("id, is_active, label")
    .eq("device_id", deviceId)
    .single();

  if (!row || !row.is_active) {
    return NextResponse.json({ valid: false });
  }

  // Update last_seen
  await db
    .from("access_codes")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", row.id);

  return NextResponse.json({ valid: true, label: row.label });
}
