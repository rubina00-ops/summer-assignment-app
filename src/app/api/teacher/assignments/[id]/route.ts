import { NextResponse } from "next/server";
import { teacherAuthorized } from "@/lib/teacher-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await teacherAuthorized())) return NextResponse.json({ error: "교사 로그인이 필요합니다." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json();
  const status = String(body.status || "");
  if (!["submitted","revision_requested","approved"].includes(status)) return NextResponse.json({ error: "상태가 올바르지 않습니다." }, { status: 400 });
  const patch: Record<string, unknown> = { status, revision_message: status === "revision_requested" ? String(body.revisionMessage || "").trim().slice(0, 500) : null, approved_at: status === "approved" ? new Date().toISOString() : null };
  if (status === "revision_requested" && !patch.revision_message) return NextResponse.json({ error: "수정 안내를 적어 주세요." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("assignments").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await teacherAuthorized())) return NextResponse.json({ error: "교사 로그인이 필요합니다." }, { status: 401 });
  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("assignments").select("file_path").eq("id", id).maybeSingle();
  if (data?.file_path) await supabase.storage.from("assignments").remove([data.file_path]);
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
