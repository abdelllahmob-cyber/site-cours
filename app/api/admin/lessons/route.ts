import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { verifyAdminToken, getTokenFromRequest } from "@/lib/admin";

export async function GET(req: Request) {
  if (!verifyAdminToken(getTokenFromRequest(req) ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getServiceClient();
  const { data: lessons, error } = await db
    .from("lessons")
    .select("*")
    .order("lesson_order", { ascending: true });

  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ lessons });
}

export async function POST(req: Request) {
  if (!verifyAdminToken(getTokenFromRequest(req) ?? "")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { title, bunny_url, code_content, lesson_order } = await req.json();

  if (!title || !bunny_url) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const db = getServiceClient();

  // Auto-calculate order if not provided
  let order = lesson_order;
  if (!order) {
    const { data: last } = await db
      .from("lessons")
      .select("lesson_order")
      .order("lesson_order", { ascending: false })
      .limit(1)
      .single();
    order = (last?.lesson_order ?? 0) + 1;
  }

  const { data, error } = await db
    .from("lessons")
    .insert({ title, bunny_url, code_content: code_content ?? "[]", lesson_order: order })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ lesson: data });
}
