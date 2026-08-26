import { NextResponse } from "next/server";
import { createTeacherSession, passwordMatches, teacherCookieName } from "@/lib/security";

export async function POST(request: Request) {
  const body = await request.json();
  if (!passwordMatches(String(body.password || ""))) return NextResponse.json({ error: "교사 비밀번호가 맞지 않습니다." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(teacherCookieName, createTeacherSession(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 12 * 60 * 60 });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(teacherCookieName, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
