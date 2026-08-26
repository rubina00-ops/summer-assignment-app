import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: students, error } = await supabase
      .from("students")
      .select("id,slot_no,nickname,emoji,assignments(id,assignment_type,title,content,file_path,file_name,status,created_at)")
      .eq("assignments.status", "approved")
      .order("slot_no");
    if (error) throw error;
    return NextResponse.json({ students: students || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "게시판을 불러오지 못했습니다." }, { status: 500 });
  }
}
