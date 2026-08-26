import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/student-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const student = await requireStudent(request.headers.get("x-student-id"), request.headers.get("x-student-token"));
  if (!student) return NextResponse.json({ error: "학생 확인이 필요합니다." }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("assignments").select("*").eq("student_id", student.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignments: data || [] });
}

export async function POST(request: Request) {
  try {
    const student = await requireStudent(request.headers.get("x-student-id"), request.headers.get("x-student-token"));
    if (!student) return NextResponse.json({ error: "학생 확인이 필요합니다." }, { status: 401 });
    const body = await request.json();
    const type = String(body.assignmentType || "");
    const title = String(body.title || "").trim().slice(0, 80);
    const content = String(body.content || "");
    const attempts = Math.min(3, Math.max(0, Number(body.shortTextAttempts || 0)));
    if (!title || !["writing","report","drawing"].includes(type)) return NextResponse.json({ error: "과제 형식과 제목을 확인해 주세요." }, { status: 400 });
    if (type === "writing" && !content.trim()) return NextResponse.json({ error: "내가 한 활동을 적어 주세요." }, { status: 400 });
    if (type !== "writing" && !body.filePath) return NextResponse.json({ error: "제출할 자료가 필요합니다." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("assignments").insert({
      student_id: student.id, assignment_type: type, title, content: type === "writing" ? content : null,
      file_path: body.filePath || null, file_name: body.fileName || null, short_text_attempts: attempts, status: "submitted"
    }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ assignment: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "과제를 제출하지 못했습니다." }, { status: 500 });
  }
}
