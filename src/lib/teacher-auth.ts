import { cookies } from "next/headers";
import { teacherCookieName, verifyTeacherSession } from "./security";

export async function teacherAuthorized() {
  const store = await cookies();
  return verifyTeacherSession(store.get(teacherCookieName)?.value);
}
