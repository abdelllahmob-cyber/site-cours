import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyAdminToken, getTokenFromRequest } from "@/lib/admin";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!verifyAdminToken(getTokenFromRequest(req) ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { title, bunny_url, code_content, lesson_order } = await req.json();
  const db = getServiceClient();

  const { data, error } = await db
    .from("lessons")
    .update({ title, bunny_url, code_content, lesson_order })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ lesson: data });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!verifyAdminToken(getTokenFromRequest(req) ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getServiceClient();
  const { error } = await db.from("lessons").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ success: true });
}
