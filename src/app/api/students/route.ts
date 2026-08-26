import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createStudentToken } from "@/lib/security";

const emojiGroups = [
  ["🌻","🌼","🌸","🌷"], ["🌱","🌿","🍀","🌳"], ["😊","🥰","🤗","😄"], ["☁️","🌙","⭐","🌈"],
  ["🐇","🐰","🐹","🐣"], ["🦉","🦊","🐧","🐨"], ["🦦","🐿️","🐶","🐱"], ["🐳","🐬","🦄","🦋"]
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nickname = String(body.nickname || "").trim().slice(0, 12);
    const quizCode = String(body.quizCode || "");
    if (!nickname || !/^[01]{6}$/.test(quizCode)) return NextResponse.json({ error: "닉네임과 질문 응답을 확인해 주세요." }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const { data: existing } = await supabase.from("students").select("id").ilike("nickname", nickname).maybeSingle();
    if (existing) return NextResponse.json({ error: "이미 사용 중인 닉네임입니다." }, { status: 409 });
    const { data: used } = await supabase.from("students").select("slot_no,emoji");
    if ((used || []).length >= 20) return NextResponse.json({ error: "학급 참여 인원이 모두 찼습니다." }, { status: 409 });
    const usedSlots = new Set((used || []).map(x => x.slot_no));
    const usedEmoji = new Set((used || []).map(x => x.emoji));
    const slot = Array.from({ length: 20 }, (_, i) => i + 1).find(x => !usedSlots.has(x));
    const group = parseInt(quizCode, 2) % 8;
    const allEmoji = emojiGroups.flat();
    const emoji = emojiGroups[group].find(x => !usedEmoji.has(x)) || allEmoji.find(x => !usedEmoji.has(x));
    if (!slot || !emoji) return NextResponse.json({ error: "학생 자리를 배정하지 못했습니다." }, { status: 409 });
    const { data, error } = await supabase.from("students").insert({ slot_no: slot, nickname, emoji, quiz_code: quizCode }).select("id,slot_no,nickname,emoji").single();
    if (error) throw error;
    return NextResponse.json({ student: data, editToken: createStudentToken(data.id) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "학생 정보를 저장하지 못했습니다." }, { status: 500 });
  }
}
