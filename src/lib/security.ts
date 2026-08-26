import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const teacherCookieName = "summer_teacher";

export function randomToken() { return randomBytes(32).toString("hex"); }
export function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }

function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export function passwordMatches(value: string) {
  const expected = process.env.TEACHER_PASSWORD || "";
  return Boolean(expected) && safeEqual(value, expected);
}

export function createTeacherSession() {
  const expires = Date.now() + 12 * 60 * 60 * 1000;
  const payload = String(expires);
  const secret = process.env.SESSION_SECRET || "";
  if (!secret) throw new Error("SESSION_SECRET is missing.");
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return payload + "." + signature;
}

export function verifyTeacherSession(value?: string) {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || Number(payload) < Date.now()) return false;
  const secret = process.env.SESSION_SECRET || "";
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  return safeEqual(signature, expected);
}

export function createStudentToken(studentId: string) {
  const expires = Date.now() + 180 * 24 * 60 * 60 * 1000;
  const payload = studentId + "." + expires;
  const secret = process.env.SESSION_SECRET || "";
  if (!secret) throw new Error("SESSION_SECRET is missing.");
  return payload + "." + createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyStudentToken(studentId: string, value: string) {
  const [id, expires, signature] = value.split(".");
  if (id !== studentId || !expires || !signature || Number(expires) < Date.now()) return false;
  const secret = process.env.SESSION_SECRET || "";
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(id + "." + expires).digest("hex");
  return safeEqual(signature, expected);
}
