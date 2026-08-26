"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import type { AssignmentType, BoardStudent, PublicAssignment } from "@/lib/types";

const questions = [
  ["방학에 자유 시간이 생기면 어디에서 보내는 것이 더 좋아요?","새로운 곳에 가서 시간을 보내는 것이 좋아요.","집이나 익숙한 곳에서 시간을 보내는 것이 좋아요."],
  ["하루 동안 활동한다면 어떤 방식이 더 좋아요?","여러 가지 활동을 골고루 해 보는 것이 좋아요.","한 가지 활동을 오래 해 보는 것이 좋아요."],
  ["방학 동안 할 일은 언제 정하는 편이에요?","시작하기 전에 미리 정해 두는 편이에요.","그날의 기분에 따라 정하는 편이에요."],
  ["재미있는 활동을 할 때 누구와 하는 것이 더 좋아요?","혼자 내 방식대로 하는 것이 좋아요.","친구나 가족과 함께 하는 것이 좋아요."],
  ["기억에 남는 일을 표현할 때 어떤 방법이 더 편해요?","글이나 사진으로 남기는 것이 편해요.","그림이나 만들기로 표현하는 것이 편해요."],
  ["쉬는 날에는 어떤 시간이 더 좋아요?","몸을 움직이며 신나게 보내는 시간이 좋아요.","조용히 쉬면서 편안하게 보내는 시간이 좋아요."]
];
const typeLabel: Record<AssignmentType,string>={writing:"✍️ 글쓰기",report:"📄 캔바 보고서",drawing:"🎨 그림"};
type Identity={id:string;nickname:string;emoji:string;editToken:string};
type Screen="nickname"|"quiz"|"board"|"write"|"draw"|"review"|"done"|"detail";

export default function StudentPage(){
  const [screen,setScreen]=useState<Screen>("nickname");
  const [nickname,setNickname]=useState("");
  const [answers,setAnswers]=useState<number[]>([]);
  const [identity,setIdentity]=useState<Identity|null>(null);
  const [students,setStudents]=useState<BoardStudent[]>([]);
  const [type,setType]=useState<AssignmentType|null>(null);
  const [title,setTitle]=useState("");
  const [content,setContent]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [drawingBlob,setDrawingBlob]=useState<Blob|null>(null);
  const [drawingPreview,setDrawingPreview]=useState("");
  const [attempts,setAttempts]=useState(0);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [detail,setDetail]=useState<{student:BoardStudent;assignment:PublicAssignment}|null>(null);

  useEffect(()=>{const raw=localStorage.getItem("summer-student");if(raw){try{const saved=JSON.parse(raw) as Identity;setIdentity(saved);setNickname(saved.nickname);setScreen("board");}catch{localStorage.removeItem("summer-student");}}},[]);
  useEffect(()=>{if(screen==="board")void loadBoard();},[screen]);

  async function loadBoard(){const res=await fetch("/api/board",{cache:"no-store"});const json=await res.json();if(res.ok)setStudents(json.students||[]);else setMessage(json.error);}
  function chooseAnswer(value:number){const next=[...answers,value];setAnswers(next);if(next.length===6)void register(next);}
  async function register(values:number[]){setBusy(true);setMessage("");const res=await fetch("/api/students",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({nickname,quizCode:values.join("")})});const json=await res.json();setBusy(false);if(!res.ok){setMessage(json.error);setAnswers([]);setScreen("nickname");return;}const saved={...json.student,editToken:json.editToken};localStorage.setItem("summer-student",JSON.stringify(saved));setIdentity(saved);setScreen("board");}
  function startTask(){setType(null);setTitle("");setContent("");setFile(null);setDrawingBlob(null);setDrawingPreview("");setAttempts(0);setMessage("");setScreen("write");}
  function review(){if(!type){setMessage("과제 형식을 선택해 주세요.");return;}if(!title.trim()){setMessage("내가 한 방학 과제 제목을 적어 주세요.");return;}if(type==="writing"&&!content.trim()){setMessage("내가 한 활동을 적어 주세요.");return;}if(type==="writing"&&content.length<50&&attempts<2){setAttempts(attempts+1);setMessage("구체적으로 기록해 보세요. 세 번째에는 작성한 내용 그대로 제출할 수 있어요.");return;}if(type==="report"&&(!file||file.type!=="application/pdf")){setMessage("캔바에서 내려받은 PDF 파일을 선택해 주세요.");return;}if(type==="drawing"&&!drawingBlob){setMessage("그림판에서 그림을 완성해 주세요.");return;}setMessage("");setScreen("review");}
  async function uploadMaterial(){if(!identity||type==="writing")return {filePath:null,fileName:null};const material=type==="report"?file:drawingBlob;if(!material)throw new Error("제출 자료가 없습니다.");const name=type==="report"?(file?.name||"report.pdf"):"drawing.png";const sign=await fetch("/api/uploads/sign",{method:"POST",headers:{"content-type":"application/json","x-student-id":identity.id,"x-student-token":identity.editToken},body:JSON.stringify({mime:material.type,size:material.size})});const signed=await sign.json();if(!sign.ok)throw new Error(signed.error);const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new Error("Supabase 공개 환경변수가 없습니다.");const client=createClient(url,key);const {error}=await client.storage.from("assignments").uploadToSignedUrl(signed.path,signed.token,material,{contentType:material.type});if(error)throw error;return {filePath:signed.path,fileName:name};}
  async function submit(){if(!identity||!type)return;setBusy(true);setMessage("");try{const material=await uploadMaterial();const res=await fetch("/api/assignments",{method:"POST",headers:{"content-type":"application/json","x-student-id":identity.id,"x-student-token":identity.editToken},body:JSON.stringify({assignmentType:type,title,content,shortTextAttempts:attempts,...material})});const json=await res.json();if(!res.ok)throw new Error(json.error);setScreen("done");}catch(error){setMessage(error instanceof Error?error.message:"제출하지 못했습니다.");}finally{setBusy(false);}}
  function openDetail(student:BoardStudent,assignment:PublicAssignment){setDetail({student,assignment});setScreen("detail");}
  const slots=Array.from({length:20},(_,i)=>students.find(s=>s.slot_no===i+1)||null);

  return <main className="app-shell">
    <header className="app-head"><div><span className="eyebrow">나의 방학 생활 이야기</span><h1>{screen==="board"?"우리 반 여름방학 게시판":screen==="write"?"과제 작성":screen==="draw"?"내 작품 그리기":screen==="review"?"제출 전 확인":screen==="detail"?"친구의 공개 과제":"나의 방학 생활 이야기"}</h1></div>{identity&&<div className="identity">{identity.nickname} {identity.emoji}</div>}</header>
    {message&&<p className="alert" role="alert">{message}</p>}

    {screen==="nickname"&&<section className="panel"><h2>닉네임을 입력해 주세요.</h2><p className="muted">작성한 내용은 이 기기에서 자동으로 이어집니다.</p><div className="privacy"><strong>개인정보를 입력하지 마세요.</strong> 실명, 학교명, 전화번호, 집 주소는 쓰지 않습니다.</div><label>닉네임<input value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={12} placeholder="예: 해결탐정"/></label><div className="right"><button className="primary" disabled={!nickname.trim()} onClick={()=>{setAnswers([]);setScreen("quiz");}}>활동 시작하기</button></div></section>}

    {screen==="quiz"&&<section className="panel"><p className="muted">방학생활 질문 {answers.length+1} / 6</p><h2>{questions[answers.length][0]}</h2><div className="choice-list">{questions[answers.length].slice(1).map((x,i)=><button key={x} disabled={busy} onClick={()=>chooseAnswer(i)}>{x}</button>)}</div></section>}

    {screen==="board"&&<section className="panel"><p className="muted">선생님이 승인한 과제만 친구들에게 보여요.</p><div className="student-grid">{slots.map((s,i)=><article className={s?.id===identity?.id?"student-card mine":"student-card"} key={i}>{s?<><h3>{s.nickname} {s.emoji}</h3><p className="muted">공개 과제 {s.assignments.length}개</p><div className="task-links">{s.assignments.map(a=><button key={a.id} onClick={()=>openDetail(s,a)}>{typeLabel[a.assignment_type].split(" ")[0]} {a.title}</button>)}{!s.assignments.length&&<span className="muted">아직 공개된 과제가 없어요.</span>}</div></>:<><h3>빈 자리</h3><p className="muted">아직 참여하지 않았어요.</p></>}</article>)}</div><div className="right"><button className="primary" onClick={startTask}>＋ 새 과제 작성</button></div></section>}

    {screen==="write"&&<section className="panel"><p className="muted">이번에 제출할 과제 형식을 하나 선택하세요. 다른 형식은 새 과제로 다시 제출할 수 있어요.</p><div className="type-grid"><button className={type==="writing"?"selected":""} onClick={()=>{setType("writing");setFile(null);}}>✍️<span>글쓰기</span></button><button className={type==="report"?"selected":""} onClick={()=>{setType("report");setDrawingBlob(null);}}>📄<span>캔바로 보고서 만들어 올리기</span></button><button className={type==="drawing"?"selected":""} onClick={()=>{setType("drawing");setFile(null);}}>🎨<span>그림 그리기</span></button></div>{type&&<div className="form-stack"><label>내가 한 방학 과제<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="예: 계곡에 다녀왔어요"/></label>{type==="writing"&&<label>내가 한 활동<textarea rows={8} value={content} onChange={e=>setContent(e.target.value)} placeholder="무엇을 했는지 구체적으로 기록해 보세요."/><small>{content.length}자 · 50글자 이상 권장 (띄어쓰기 포함)</small></label>}{type==="report"&&<label>캔바 보고서 PDF<input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/><small>캔바에서 ‘PDF 표준’으로 내려받은 20MB 이하 파일</small></label>}{type==="drawing"&&<div><button className="primary" onClick={()=>setScreen("draw")}>🎨 그림판 열기</button>{drawingBlob&&<p className="ok">✓ 그림이 준비되었습니다.</p>}</div>}</div>}<div className="actions"><button onClick={()=>setScreen("board")}>게시판으로 돌아가기</button><button className="primary" onClick={review}>제출 전 확인</button></div></section>}

    {screen==="draw"&&<DrawingPad onCancel={()=>setScreen("write")} onFinish={(blob,url)=>{setDrawingBlob(blob);setDrawingPreview(url);setScreen("write");}}/>}

    {screen==="review"&&type&&<section className="panel"><span className="status">{typeLabel[type]}</span><h2>{title}</h2>{type==="writing"&&<p className="story">{content}</p>}{type==="report"&&<p>제출 자료: <strong>{file?.name}</strong></p>}{type==="drawing"&&drawingPreview&&<img className="work-preview" src={drawingPreview} alt="내가 그린 그림"/>}<div className="actions"><button onClick={()=>setScreen("write")}>과제 수정</button><button className="primary" disabled={busy} onClick={submit}>{busy?"제출 중…":"과제 제출하기"}</button></div></section>}

    {screen==="done"&&<section className="panel"><h2>과제를 제출했어요.</h2><p>선생님이 확인하면 우리 반 게시판에 공개됩니다.</p><div className="actions"><button onClick={()=>setScreen("board")}>게시판으로 가기</button><button className="primary" onClick={startTask}>과제 하나 더 작성하기</button></div></section>}

    {screen==="detail"&&detail&&<section className="panel"><span className="status">{typeLabel[detail.assignment.assignment_type]}</span><h2>{detail.assignment.title}</h2><p className="muted">{detail.student.nickname} {detail.student.emoji}의 공개 과제</p>{detail.assignment.assignment_type==="writing"?<p className="story">{detail.assignment.content}</p>:<a className="button-link primary" href={"/api/files/view?path="+encodeURIComponent(detail.assignment.file_path||"")} target="_blank" rel="noreferrer">{detail.assignment.assignment_type==="drawing"?"그림 크게 보기":"캔바 보고서 열기"}</a>}<div className="right"><button onClick={()=>setScreen("board")}>게시판으로 돌아가기</button></div></section>}
    <footer><a href="/teacher">교사용 화면</a></footer>
  </main>;
}

function DrawingPad({onCancel,onFinish}:{onCancel:()=>void;onFinish:(blob:Blob,url:string)=>void}){
  const canvasRef=useRef<HTMLCanvasElement>(null);const [color,setColor]=useState("#111111");const [size,setSize]=useState(10);const [tool,setTool]=useState("pencil");const [custom,setCustom]=useState<string[]>([]);const [picker,setPicker]=useState(false);const [newColor,setNewColor]=useState("#785adc");const drawing=useRef(false);const last=useRef({x:0,y:0});
  const colors=["#ef3340","#ffca0a","#1674ea","#f8f8f4","#161616","#ef7eae","#ff8b35","#62b963","#7651d7","#754a2e","#53c7d8","#a9d25a",...custom];
  useEffect(()=>{const c=canvasRef.current;if(!c)return;const ctx=c.getContext("2d");if(ctx){ctx.fillStyle="#fffdf8";ctx.fillRect(0,0,c.width,c.height);}},[]);
  function point(e:React.PointerEvent<HTMLCanvasElement>){const c=canvasRef.current!;const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height};}
  function stamp(x:number,y:number){const ctx=canvasRef.current?.getContext("2d");if(!ctx)return;ctx.save();ctx.fillStyle=color;ctx.font=(size*4)+"px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(tool==="star"?"★":tool==="flower"?"✿":tool==="heart"?"♥":"●",x,y);ctx.restore();}
  function move(e:React.PointerEvent<HTMLCanvasElement>){if(!drawing.current||["star","flower","heart","circle"].includes(tool))return;const c=canvasRef.current!,ctx=c.getContext("2d")!,p=point(e);ctx.save();ctx.strokeStyle=tool==="eraser"?"#fffdf8":color;ctx.globalAlpha=tool==="watercolor"?.18:tool==="crayon"?.65:1;ctx.lineWidth=size*(tool==="brush"?2:1);ctx.lineCap="round";ctx.beginPath();ctx.moveTo(last.current.x,last.current.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.restore();last.current=p;}
  function clear(){const c=canvasRef.current!,ctx=c.getContext("2d")!;ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#fffdf8";ctx.fillRect(0,0,c.width,c.height);}
  function finish(){const c=canvasRef.current!;c.toBlob(blob=>{if(blob)onFinish(blob,c.toDataURL("image/png"));},"image/png");}
  return <section className="draw-screen"><div className="panel"><h2>내 작품 그리기</h2><p className="muted">수채화는 같은 곳을 덧칠할수록 진해집니다.</p><div className="palette">{colors.map((c,i)=><button key={c+i} aria-label="색 선택" className={color===c?"color selected-color":"color"} style={{background:c}} onClick={()=>setColor(c)}/>)}<button onClick={()=>setPicker(!picker)}>＋ 색 추가</button></div>{picker&&<div className="color-pop"><label>색상표에서 클릭<input type="color" value={newColor} onChange={e=>setNewColor(e.target.value)}/></label><button className="primary" disabled={custom.length>=6} onClick={()=>{setCustom([...custom,newColor]);setColor(newColor);setPicker(false);}}>팔레트에 추가</button><small>새 색은 최대 6개까지 추가할 수 있어요.</small></div>}<label>크기 {size}<input type="range" min={2} max={38} value={size} onChange={e=>setSize(Number(e.target.value))}/></label><div className="tools">{[["pencil","✏️ 연필"],["brush","🖌️ 붓"],["crayon","🖍️ 크레파스"],["watercolor","💧 수채화"],["star","⭐ 별"],["flower","🌸 꽃"],["heart","💗 하트"],["circle","🔴 원"],["eraser","🧽 지우개"]].map(([v,l])=><button className={tool===v?"selected":""} key={v} onClick={()=>setTool(v)}>{l}</button>)}</div></div><div className="canvas-panel"><canvas ref={canvasRef} width={1200} height={720} onPointerDown={e=>{drawing.current=true;last.current=point(e);e.currentTarget.setPointerCapture(e.pointerId);if(["star","flower","heart","circle"].includes(tool))stamp(last.current.x,last.current.y);}} onPointerMove={move} onPointerUp={()=>drawing.current=false}/><div className="actions"><button onClick={onCancel}>그림 취소</button><button onClick={clear}>현재 그림 지우기</button><button className="primary" onClick={finish}>그림 완성</button></div></div></section>;
}
