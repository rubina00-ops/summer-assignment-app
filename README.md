# 나의 방학 생활 이야기

학생이 글·캔바 PDF·그림 과제를 제출하고, 교사가 승인한 과제만 4×5 학급 게시판에 공개하는 Next.js 앱입니다.

## 화면

- `/` 학생 화면
- `/teacher` 교사 화면

## 환경변수

`.env.example`을 기준으로 Vercel 환경변수를 등록합니다.

- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_SECRET_KEY`: 서버 전용 Secret key. 브라우저·GitHub에 노출 금지
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: 파일 서명 업로드용 Publishable key
- `TEACHER_PASSWORD`: 교사 화면 로그인 비밀번호
- `SESSION_SECRET`: 교사·학생 세션 서명용 긴 무작위 문자열

## 실행

```bash
npm install
npm run dev
```

## 검증

```bash
npm run lint
npm run build
```
