import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/student-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const allowed = new Set(["image/png","image/jpeg","image/webp","application/pdf"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const student = await requireStudent(request.headers.get("x-student-id"), request.headers.get("x-student-token"));
    if (!student) return NextResponse.json({ error: "학생 확인이 필요합니다." }, { status: 401 });
    const mime = String(body.mime || "");
    const size = Number(body.size || 0);
    if (!allowed.has(mime) || size <= 0 || size > 20 * 1024 * 1024) return NextResponse.json({ error: "PNG·JPG·WEBP·PDF 파일만 20MB까지 올릴 수 있습니다." }, { status: 400 });
    const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1].replace("jpeg", "jpg");
    const path = student.id + "/" + crypto.randomUUID() + "." + ext;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from("assignments").createSignedUploadUrl(path);
    if (error) throw error;
    return NextResponse.json({ path, token: data.token });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "업로드 준비에 실패했습니다." }, { status: 500 });
  }
}
