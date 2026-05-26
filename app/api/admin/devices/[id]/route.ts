import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyAdminToken, getTokenFromRequest } from "@/lib/admin";

// PATCH: reset device (clear device_id) or toggle is_active
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!verifyAdminToken(getTokenFromRequest(req) ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { action } = await req.json(); // "kick" | "disable" | "enable"
  const db = getServiceClient();

  let update: Record<string, unknown> = {};

  if (action === "kick") {
    // Clear device so code can be reused from a new device
    update = { device_id: null, device_info: "", registered_at: null };
  } else if (action === "disable") {
    update = { is_active: false };
  } else if (action === "enable") {
    update = { is_active: true };
  } else {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const { data, error } = await db
    .from("access_codes")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ device: data });
}

// PUT: update code or label
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!verifyAdminToken(getTokenFromRequest(req) ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { code, label } = await req.json();
  const db = getServiceClient();

  const update: Record<string, string> = {};
  if (code) update.code = code.trim();
  if (label !== undefined) update.label = label;

  const { data, error } = await db
    .from("access_codes")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error?.code === "23505") {
    return NextResponse.json({ error: "code_exists" }, { status: 409 });
  }
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ device: data });
}

// DELETE: permanently delete the access code
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!verifyAdminToken(getTokenFromRequest(req) ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getServiceClient();
  const { error } = await db.from("access_codes").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ success: true });
}
