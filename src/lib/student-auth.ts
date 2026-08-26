import { getSupabaseAdmin } from "./supabase-admin";
import { verifyStudentToken } from "./security";

export async function requireStudent(studentId: string | null, token: string | null) {
  if (!studentId || !token || !verifyStudentToken(studentId, token)) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("students")
    .select("id,slot_no,nickname,emoji")
    .eq("id", studentId)
    .maybeSingle();
  return data;
}
