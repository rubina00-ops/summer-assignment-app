import { NextResponse } from "next/server";
import { teacherAuthorized } from "@/lib/teacher-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  if (!(await teacherAuthorized())) return NextResponse.json({ error: "교사 로그인이 필요합니다." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: files } = await supabase.from("assignments").select("file_path").not("file_path", "is", null);
  const paths = (files || []).map(x => x.file_path).filter(Boolean) as string[];
  if (paths.length) await supabase.storage.from("assignments").remove(paths);
  const { error } = await supabase.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
