import { NextResponse } from "next/server";
import { teacherAuthorized } from "@/lib/teacher-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  if (!(await teacherAuthorized())) return NextResponse.json({ error: "교사 로그인이 필요합니다." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("assignments").select("*,students(nickname,emoji,slot_no)").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data || [] });
}
