import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "파일 경로가 없습니다." }, { status: 400 });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from("assignments").createSignedUrl(path, 300);
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
