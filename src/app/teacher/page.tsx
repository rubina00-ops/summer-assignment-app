"use client";

import { useEffect, useMemo, useState } from "react";
import type { AssignmentStatus, AssignmentType } from "@/lib/types";

type TeacherAssignment = {
  id: string;
  assignment_type: AssignmentType;
  title: string;
  content: string | null;
  file_path: string | null;
  file_name: string | null;
  status: AssignmentStatus;
  revision_message: string | null;
  created_at: string;
  students: { nickname: string; emoji: string; slot_no: number } | null;
};

const typeLabel: Record<AssignmentType, string> = {
  writing: "글쓰기",
  report: "Canva PDF",
  drawing: "사진/그림",
};

const typeIcon: Record<AssignmentType, string> = {
  writing: "✍️",
  report: "📄",
  drawing: "🎨",
};

const statusMeta: Record<AssignmentStatus, { label: string; detail: string; className: string }> = {
  submitted: { label: "미승인", detail: "검토 대기", className: "status-pending" },
  revision_requested: { label: "반려", detail: "검토 필요", className: "status-revision" },
  approved: { label: "승인", detail: "학생 게시판 공개", className: "status-approved" },
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );

function studentName(assignment: TeacherAssignment) {
  if (!assignment.students) return "학생 정보 없음";
  return `${assignment.students.nickname} ${assignment.students.emoji}`;
}

function fileButtonLabel(assignment: TeacherAssignment) {
  if (assignment.assignment_type === "report") return "Canva PDF 첨부파일 확인";
  if (assignment.assignment_type === "drawing") return "사진·그림 첨부파일 확인";
  return "첨부파일 확인";
}

function attachmentUrl(assignment: TeacherAssignment) {
  return `/api/files/view?path=${encodeURIComponent(assignment.file_path || "")}`;
}

export default function TeacherPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [items, setItems] = useState<TeacherAssignment[]>([]);
  const [selected, setSelected] = useState<TeacherAssignment | null>(null);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState("");
  const [mode, setMode] = useState<"list" | "detail" | "revision" | "delete" | "reset">("list");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(
    () => ({
      total: items.length,
      submitted: items.filter((x) => x.status === "submitted").length,
      revision: items.filter((x) => x.status === "revision_requested").length,
      approved: items.filter((x) => x.status === "approved").length,
    }),
    [items],
  );

  async function load() {
    const res = await fetch("/api/teacher/assignments", { cache: "no-store" });
    if (res.status === 401) {
      setLoggedIn(false);
      return;
    }

    const json = await res.json();
    if (res.ok) {
      setLoggedIn(true);
      setItems(json.assignments || []);
    } else {
      setMessage(json.error);
    }
  }

  async function login() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/teacher/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setMessage(json.error);
      return;
    }

    setPassword("");
    setLoggedIn(true);
    await load();
  }

  async function updateStatus(status: AssignmentStatus, revisionMessage = "") {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/teacher/assignments/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, revisionMessage }),
    });
    const json = await res.json();
    setBusy(false);

    if (!res.ok) {
      setMessage(json.error);
      return;
    }

    setMessage(
      status === "approved"
        ? "승인되었습니다. 학생 게시판에 공개됩니다."
        : status === "revision_requested"
          ? "반려/검토 필요 상태로 표시했습니다."
          : "미승인 상태로 되돌렸습니다.",
    );
    setRevision("");
    setMode("detail");
    await load();
    setSelected({ ...selected, ...json.assignment });
  }

  async function remove() {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/teacher/assignments/${selected.id}`, { method: "DELETE" });
    setBusy(false);

    if (!res.ok) {
      const json = await res.json();
      setMessage(json.error);
      return;
    }

    setSelected(null);
    setMode("list");
    setMessage("과제를 삭제했습니다.");
    await load();
  }

  async function reset() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/teacher/reset", { method: "POST" });
    setBusy(false);

    if (!res.ok) {
      const json = await res.json();
      setMessage(json.error);
      return;
    }

    setItems([]);
    setMode("list");
    setMessage("학급 데이터가 초기화되었습니다.");
  }

  if (!loggedIn) {
    return (
      <main className="app-shell">
        <header className="app-head">
          <div>
            <span className="eyebrow">교사용 화면</span>
            <h1>나의 방학 생활 이야기</h1>
          </div>
        </header>
        {message && <p className="alert">{message}</p>}
        <section className="panel narrow">
          <h2>교사 로그인</h2>
          <p className="muted">Vercel에 등록한 교사 비밀번호를 입력하세요.</p>
          <label>
            교사 비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void login();
              }}
            />
          </label>
          <div className="right">
            <a className="button-link" href="/">
              학생 화면
            </a>
            <button className="primary" disabled={busy || !password} onClick={login}>
              로그인
            </button>
          </div>
        </section>
      </main>
    );
  }

  const submitted = items.filter((x) => x.status === "submitted");
  const revisionRequested = items.filter((x) => x.status === "revision_requested");
  const approved = items.filter((x) => x.status === "approved");

  if (mode !== "list" && selected) {
    const status = statusMeta[selected.status];

    return (
      <main className="app-shell">
        <header className="app-head">
          <div>
            <span className="eyebrow">교사용 화면</span>
            <h1>과제 상세 확인</h1>
          </div>
        </header>
        {message && <p className="alert">{message}</p>}
        <section className="panel">
          <div className="badge-row">
            <span className={`status ${status.className}`}>
              {status.label} · {status.detail}
            </span>
            <span className="status">
              {typeIcon[selected.assignment_type]} {typeLabel[selected.assignment_type]}
            </span>
          </div>

          <h2>{selected.title}</h2>
          <p className="muted">
            {studentName(selected)} · {formatDate(selected.created_at)}
          </p>

          <div className="teacher-detail-grid">
            <div>
              <strong>학생 닉네임과 이모티콘</strong>
              <p>{studentName(selected)}</p>
            </div>
            <div>
              <strong>과제 형식</strong>
              <p>
                {typeIcon[selected.assignment_type]} {typeLabel[selected.assignment_type]}
              </p>
            </div>
            <div>
              <strong>상태</strong>
              <p>
                {status.label} · {status.detail}
              </p>
            </div>
          </div>

          <section className="teacher-work">
            <h3>작성 내용</h3>
            {selected.assignment_type === "writing" ? (
              <p className="story">{selected.content || "작성 내용이 없습니다."}</p>
            ) : (
              <>
                <p className="muted">
                  {selected.content || "이 과제는 첨부파일로 제출되었습니다."}
                </p>
                {selected.file_path ? (
                  <a
                    className="button-link primary"
                    href={attachmentUrl(selected)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {fileButtonLabel(selected)}
                  </a>
                ) : (
                  <p className="alert">첨부파일 경로가 없습니다.</p>
                )}
                {selected.file_name && <p className="muted">파일명: {selected.file_name}</p>}
              </>
            )}
          </section>

          {selected.revision_message && (
            <div className="privacy">
              <strong>반려/검토 필요 안내</strong>
              <br />
              {selected.revision_message}
            </div>
          )}

          {mode === "revision" && (
            <label>
              학생에게 보일 반려/검토 필요 안내
              <textarea
                rows={4}
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                placeholder="어떤 내용을 고치거나 보완하면 좋을지 적어 주세요."
              />
            </label>
          )}

          {mode === "delete" && (
            <div className="privacy">
              <strong>이 과제를 삭제할까요?</strong>
              <br />
              삭제한 과제와 파일은 복구할 수 없습니다.
            </div>
          )}

          <div className="actions">
            <button
              onClick={() => {
                setMode("list");
                setSelected(null);
                setMessage("");
              }}
            >
              목록으로
            </button>
            {mode === "detail" && (
              <>
                <button onClick={() => setMode("delete")}>삭제</button>
                <button
                  onClick={() => {
                    setRevision(selected.revision_message || "");
                    setMode("revision");
                  }}
                >
                  반려/검토 필요
                </button>
                {selected.status === "approved" ? (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => updateStatus("submitted")}
                  >
                    승인 취소
                  </button>
                ) : (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => updateStatus("approved")}
                  >
                    승인하기
                  </button>
                )}
              </>
            )}
            {mode === "revision" && (
              <>
                <button onClick={() => setMode("detail")}>취소</button>
                <button
                  className="primary"
                  disabled={busy || !revision.trim()}
                  onClick={() => updateStatus("revision_requested", revision)}
                >
                  반려 상태로 저장
                </button>
              </>
            )}
            {mode === "delete" && (
              <>
                <button onClick={() => setMode("detail")}>취소</button>
                <button className="primary" disabled={busy} onClick={remove}>
                  삭제 확인
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-head">
        <div>
          <span className="eyebrow">교사용 화면</span>
          <h1>과제 관리</h1>
          <p className="muted">미승인·승인·반려 상태의 과제를 모두 확인합니다.</p>
        </div>
        <a className="button-link" href="/">
          학생 게시판
        </a>
      </header>
      {message && <p className="alert">{message}</p>}
      <div className="summary-row">
        <span className="status">전체 {counts.total}개</span>
        <span className="status status-pending">미승인 {counts.submitted}개</span>
        <span className="status status-revision">반려/검토 필요 {counts.revision}개</span>
        <span className="status status-approved">승인 {counts.approved}개</span>
      </div>

      <section>
        <div className="list-head">
          <h2>미승인 과제</h2>
          <span className="muted">새로 제출되어 검토가 필요합니다.</span>
        </div>
        <AssignmentList
          items={submitted}
          open={(x) => {
            setSelected(x);
            setMode("detail");
            setMessage("");
          }}
        />
      </section>

      <section>
        <div className="list-head">
          <h2>반려/검토 필요 과제</h2>
          <span className="muted">교사가 보완 안내를 남긴 과제입니다.</span>
        </div>
        <AssignmentList
          items={revisionRequested}
          open={(x) => {
            setSelected(x);
            setMode("detail");
            setMessage("");
          }}
        />
      </section>

      <section>
        <div className="list-head">
          <h2>승인된 과제</h2>
          <span className="muted">학생 게시판에 공개됩니다.</span>
        </div>
        <AssignmentList
          items={approved}
          open={(x) => {
            setSelected(x);
            setMode("detail");
            setMessage("");
          }}
        />
      </section>

      <section className="danger-zone">
        <h2>학급 데이터 초기화</h2>
        <p className="muted">학생과 모든 과제를 삭제합니다. 교사만 실행할 수 있습니다.</p>
        {mode !== "reset" ? (
          <button onClick={() => setMode("reset")}>학급 데이터 초기화</button>
        ) : (
          <div className="actions">
            <button onClick={() => setMode("list")}>취소</button>
            <button className="primary" disabled={busy} onClick={reset}>
              전체 초기화 확인
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function AssignmentList({
  items,
  open,
}: {
  items: TeacherAssignment[];
  open: (x: TeacherAssignment) => void;
}) {
  if (!items.length) {
    return (
      <div className="panel">
        <p className="muted">표시할 과제가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="assignment-list">
      {items.map((x) => {
        const status = statusMeta[x.status];
        return (
          <article className="panel assignment-row" key={x.id}>
            <div>
              <div className="badge-row">
                <span className={`status ${status.className}`}>
                  {status.label} · {status.detail}
                </span>
                <span className="status">
                  {typeIcon[x.assignment_type]} {typeLabel[x.assignment_type]}
                </span>
              </div>
              <h3>{x.title}</h3>
              <p className="muted">
                {studentName(x)} · {formatDate(x.created_at)}
              </p>
              {x.file_name && <p className="muted">첨부: {x.file_name}</p>}
            </div>
            <button onClick={() => open(x)}>과제 확인</button>
          </article>
        );
      })}
    </div>
  );
}
