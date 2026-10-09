// Staff entry forms: S5 one care-log entry, S7 vitals (nurse), S9 incident report.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { staff, TODAY } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Badge, Button, Chip, ErrorText, Field, Modal, Note, SelectField, TextArea, Toggle, cn } from "../../components/ui";
import { MEAL_AMOUNTS, MOODS, PARTICIPATION } from "../../domain/catalog";
import type { CareLogEntry, DailyTask, ElderlyMember, Incident, Thresholds } from "../../types/models";

export type EntryKindUI = "MEAL" | "HYGIENE" | "ACTIVITY" | "NAP" | "MOOD" | "PHOTO" | "NOTE";
export const ENTRY_LABEL: Record<EntryKindUI, string> = { MEAL: "Ăn uống", HYGIENE: "Vệ sinh", ACTIVITY: "Hoạt động", NAP: "Nghỉ trưa", MOOD: "Tâm trạng", PHOTO: "Ảnh", NOTE: "Lưu ý / bất thường" };
const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

const MEAL_OF: Record<string, string> = { "Ăn sáng": "Bữa sáng", "Ăn trưa": "Bữa trưa", "Ăn xế": "Bữa xế" };
/** Daily task → which S5 form opens when the staff clicks the task row. */
export const taskKind = (t: Pick<DailyTask, "type">): EntryKindUI | undefined => (t.type === "MEAL" ? "MEAL" : t.type === "ACTIVITY" ? "ACTIVITY" : t.type === "NAP" ? "NAP" : t.type === "HYGIENE" ? "HYGIENE" : undefined);

export function EntryModal({ kind, elderly, activities, photoInfo, task, onClose }: { kind?: EntryKindUI; elderly: ElderlyMember; activities: string[]; photoInfo?: string; task?: Pick<DailyTask, "id" | "title" | "time">; onClose: () => void }) {
  const me = useMe();
  const qc = useQueryClient();
  const [meal, setMeal] = useState(task && MEAL_OF[task.title] ? MEAL_OF[task.title] : "Bữa trưa");
  const [amount, setAmount] = useState<string>("Hết");
  const [water, setWater] = useState("1");
  const [quick, setQuick] = useState<string[]>([]);
  const [hyg, setHyg] = useState("Đi vệ sinh");
  const [act, setAct] = useState(kind === "ACTIVITY" && task ? task.title : activities[0] ?? "Thể dục trên ghế");
  const actOptions = task && kind === "ACTIVITY" && !activities.includes(task.title) ? [task.title, ...activities] : activities;
  const [part, setPart] = useState<string>("Có tham gia");
  const [mins, setMins] = useState("20");
  const [sleep, setSleep] = useState("12:05");
  const [wake, setWake] = useState("13:20");
  const [good, setGood] = useState(true);
  const [mood, setMood] = useState<string>("Vui");
  const [beh, setBeh] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [tone, setTone] = useState<"blue" | "orange" | "green">("blue");
  const [important, setImportant] = useState(kind === "NOTE");
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const build = (): { kind: CareLogEntry["kind"]; title: string; detail: string; important?: boolean; tone?: "blue" | "orange" | "green" } => {
    switch (kind) {
      case "MEAL": return { kind: "MEAL", title: meal, detail: `Ăn ${amount} · ${water} cốc nước${quick.length ? ` · ${quick.join(", ")}` : ""}${text ? ` · ${text}` : ""}`, important: quick.includes("sặc") };
      case "HYGIENE": return { kind: "HYGIENE", title: "Vệ sinh", detail: `${hyg}${text ? ` · bất thường: ${text}` : ""}`, important: !!text };
      case "ACTIVITY": return { kind: "ACTIVITY", title: act, detail: `${part} · ${mins} phút${text ? ` · ${text}` : ""}` };
      case "NAP": return { kind: "NAP", title: "Nghỉ trưa", detail: `${sleep}–${wake} · ${good ? "ngủ ngon" : "ngủ không ngon"}${text ? ` · ${text}` : ""}` };
      case "MOOD": return { kind: "MOOD", title: "Tâm trạng", detail: `${mood}${beh.length ? ` — hành vi: ${beh.join(", ")}` : ""}${text ? ` · ${text}` : ""}`, important: ["Lo âu", "Kích động"].includes(mood) || beh.length > 0 };
      case "PHOTO": return { kind: "PHOTO", title: "Ảnh mới", detail: text || "Ảnh trong ngày", tone };
      default: return { kind: "NOTE", title: "Lưu ý", detail: text, important };
    }
  };
  const save = useMutation({ mutationFn: async () => { await staff.addEntry(me, elderly.id, build()); if (task) await staff.setTask(me, task.id, "DONE"); }, onSuccess: () => { qc.invalidateQueries(); onClose(); } });
  return (
    <Modal open={!!kind} onClose={onClose} title={kind ? `${ENTRY_LABEL[kind]} · ${elderly.fullName}${task ? ` · việc ${task.time}` : ""}` : ""} width={480} footer={<><Button variant="neutral" onClick={onClose}>Hủy</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Lưu · {now()}</Button></>}>
      <div className="space-y-2.5">
        {kind === "MEAL" && <>
          <div className="flex gap-1.5">{["Bữa sáng", "Bữa trưa", "Bữa xế"].map((m) => <Chip key={m} active={meal === m} onClick={() => setMeal(m)}>{m}</Chip>)}</div>
          <div><div className="mb-1 text-[11px] text-subtle">Lượng ăn</div><div className="flex flex-wrap gap-1.5">{MEAL_AMOUNTS.map((m) => <Chip key={m} active={amount === m} onClick={() => setAmount(m)}>{m}</Chip>)}</div></div>
          <Field label="Số cốc nước" type="number" value={water} onChange={(e) => setWater(e.target.value)} />
          <div className="flex flex-wrap gap-1.5">{["ho", "sặc", "chán ăn", "cần đút"].map((q) => <Chip key={q} active={quick.includes(q)} onClick={() => toggle(quick, setQuick, q)}>{q}</Chip>)}</div>
          {elderly.targetGroup === "STROKE" && <Note>Nhóm sau tai biến: thức ăn mềm, có người hỗ trợ khi ăn để phòng sặc.</Note>}
        </>}
        {kind === "HYGIENE" && <div className="flex flex-wrap gap-1.5">{["Đi vệ sinh", "Thay quần", "Thay tã", "Rửa tay, lau mặt"].map((h) => <Chip key={h} active={hyg === h} onClick={() => setHyg(h)}>{h}</Chip>)}</div>}
        {kind === "ACTIVITY" && <>
          <SelectField label="Hoạt động trong lịch (CL-10)" value={act} onChange={(e) => setAct(e.target.value)}>{actOptions.map((a) => <option key={a}>{a}</option>)}</SelectField>
          <div className="flex flex-wrap gap-1.5">{PARTICIPATION.map((p) => <Chip key={p} active={part === p} onClick={() => setPart(p)}>{p}</Chip>)}</div>
          <Field label="Thời lượng (phút)" type="number" value={mins} onChange={(e) => setMins(e.target.value)} />
        </>}
        {kind === "NAP" && <div className="grid grid-cols-2 gap-2"><Field label="Giờ ngủ" type="time" value={sleep} onChange={(e) => setSleep(e.target.value)} /><Field label="Giờ dậy" type="time" value={wake} onChange={(e) => setWake(e.target.value)} /><div className="col-span-2"><Toggle checked={good} onChange={setGood} label="Ngủ ngon" /></div></div>}
        {kind === "MOOD" && <>
          <div className="flex flex-wrap gap-1.5">{MOODS.map((m) => <Chip key={m} active={mood === m} onClick={() => setMood(m)}>{m}</Chip>)}</div>
          {elderly.targetGroup === "DEMENTIA" && <div><div className="mb-1 text-[11px] text-subtle">Hành vi (nhóm sa sút trí tuệ)</div><div className="flex flex-wrap gap-1.5">{["Hỏi lặp lại", "Tìm đường về", "Đi lang thang", "Lo âu", "Kích động"].map((b) => <Chip key={b} active={beh.includes(b)} onClick={() => toggle(beh, setBeh, b)}>{b}</Chip>)}</div></div>}
          {mood === "Kích động" && <Note tone="red">Kích động sẽ tạo cảnh báo cho điều dưỡng và Quản lý (CL-07).</Note>}
        </>}
        {kind === "PHOTO" && <>
          <div className="flex gap-2">{(["blue", "orange", "green"] as const).map((t) => <button key={t} onClick={() => setTone(t)} className={cn("h-16 flex-1 rounded-lg bg-gradient-to-br", t === "blue" ? "from-[#cfe0f5] to-[#9db8e0]" : t === "orange" ? "from-[#fde1cc] to-[#f7b182]" : "from-[#d3efdf] to-[#8ed2ae]", tone === t && "ring-2 ring-orange")} />)}</div>
          {photoInfo && <Badge tone="blue">{photoInfo}</Badge>}
        </>}
        {(kind !== "PHOTO") && <TextArea label={kind === "NOTE" ? "Chuyện khác thường trong ngày" : "Ghi chú thêm (không bắt buộc)"} value={text} onChange={(e) => setText(e.target.value)} />}
        {kind === "PHOTO" && <Field label="Chú thích ảnh" value={text} onChange={(e) => setText(e.target.value)} />}
        {kind === "NOTE" && <Toggle checked={important} onChange={setImportant} label="Đánh dấu bất thường" sub="Gia đình luôn nhận thông báo bất thường" />}
        <ErrorText error={save.error} />
      </div>
    </Modal>
  );
}

const STROKE_SIGNS = ["Méo miệng", "Yếu tay / chân một bên tăng", "Nói khó hơn", "Nuốt khó hơn"];
export function VitalsModal({ elderly, open, onClose, thresholds, diabetic }: { elderly?: ElderlyMember; open: boolean; onClose: () => void; thresholds: Thresholds; diabetic?: boolean }) {
  const me = useMe();
  const qc = useQueryClient();
  const [m, setM] = useState<Record<string, string>>({});
  const [signs, setSigns] = useState<string[]>([]);
  const n = (k: string) => (m[k] ? Number(m[k]) : undefined);
  const save = useMutation({
    mutationFn: () => staff.recordVitals(me, elderly!.id, { sys: n("sys"), dia: n("dia"), pulse: n("pulse"), temp: n("temp"), spo2: n("spo2"), glucose: n("glucose"), weight: n("weight"), strokeChecklistOk: elderly?.targetGroup === "STROKE" ? signs.length === 0 : undefined }),
    onSuccess: () => { qc.invalidateQueries(); setM({}); setSigns([]); onClose(); },
  });
  const bad = (k: string) => {
    const v = n(k);
    if (v === undefined) return false;
    return (k === "sys" && (v > thresholds.sysMax || v < thresholds.sysMin)) || (k === "dia" && v > thresholds.diaMax) || (k === "pulse" && (v < thresholds.pulseMin || v > thresholds.pulseMax)) || (k === "temp" && v > thresholds.tempMax) || (k === "spo2" && v < thresholds.spo2Min) || (k === "glucose" && v > thresholds.glucoseMax);
  };
  const F = (k: string, label: string, hint: string, step = 1) => <Field label={`${label} · ${hint}`} type="number" step={step} value={m[k] ?? ""} onChange={(e) => setM({ ...m, [k]: e.target.value })} error={bad(k) ? "Vượt ngưỡng — sẽ tạo cảnh báo" : undefined} />;
  return (
    <Modal open={open && !!elderly} onClose={onClose} title={`Đo chỉ số · ${elderly?.fullName ?? ""}`} width={520} footer={<><Button variant="neutral" onClick={onClose}>Hủy</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Lưu chỉ số</Button></>}>
      <div className="grid gap-2 sm:grid-cols-2">
        {F("sys", "HA tâm thu", `ngưỡng ${thresholds.sysMin}–${thresholds.sysMax}`)}
        {F("dia", "HA tâm trương", `≤ ${thresholds.diaMax}`)}
        {F("pulse", "Mạch", `${thresholds.pulseMin}–${thresholds.pulseMax}`)}
        {F("temp", "Nhiệt độ °C", `≤ ${thresholds.tempMax}`, 0.1)}
        {F("spo2", "SpO₂ %", `≥ ${thresholds.spo2Min}`)}
        {diabetic && F("glucose", "Đường huyết mmol/L", `≤ ${thresholds.glucoseMax}`, 0.1)}
        {F("weight", "Cân nặng kg", "tùy chọn", 0.5)}
      </div>
      {elderly?.targetGroup === "STROKE" && (
        <div className="mt-3 rounded-xl bg-red-soft/40 p-3">
          <div className="mb-1 text-[12px] font-semibold text-red-ink">Checklist dấu hiệu tái phát (nhóm sau tai biến)</div>
          <div className="flex flex-wrap gap-1.5">{STROKE_SIGNS.map((s) => <Chip key={s} active={signs.includes(s)} onClick={() => setSigns(signs.includes(s) ? signs.filter((x) => x !== s) : [...signs, s])}>{s}</Chip>)}</div>
          {signs.length > 0 && <Note tone="red" className="mt-2">Có dấu hiệu: tạo cảnh báo KHẨN CẤP, gửi gia đình ngay, cân nhắc chuyển viện.</Note>}
        </div>
      )}
      <ErrorText error={save.error} />
    </Modal>
  );
}

export function IncidentModal({ open, onClose, elderlyOptions, defaultElderly }: { open: boolean; onClose: () => void; elderlyOptions: ElderlyMember[]; defaultElderly?: number }) {
  const me = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState({ elderlyId: defaultElderly ?? elderlyOptions[0]?.id ?? 0, type: "FALL" as Incident["type"], severity: "LOW" as Incident["severity"], time: now(), description: "", action: "", familyNotified: true, transfer: false, hospital: "BV Nhân dân 115", ttime: now(), escort: me.fullName });
  const save = useMutation({
    mutationFn: () => staff.reportIncident(me, { elderlyId: f.elderlyId, type: f.type, severity: f.severity, time: f.time, description: f.description, action: f.action, familyNotified: f.familyNotified, transfer: f.transfer ? { hospital: f.hospital, time: f.ttime, escort: f.escort } : undefined }),
    onSuccess: () => { qc.invalidateQueries(); onClose(); },
  });
  return (
    <Modal open={open} onClose={onClose} title={`Báo sự cố · ${TODAY.slice(8)}/${TODAY.slice(5, 7)}`} width={560} footer={<><Button variant="neutral" onClick={onClose}>Hủy</Button><Button variant="danger" loading={save.isPending} onClick={() => save.mutate()}>Gửi báo sự cố</Button></>}>
      <div className="grid gap-2 sm:grid-cols-2">
        <SelectField label="Cụ" value={f.elderlyId} onChange={(e) => setF({ ...f, elderlyId: Number(e.target.value) })}>{elderlyOptions.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}</SelectField>
        <Field label="Giờ" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
        <SelectField label="Loại" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Incident["type"] })}>{([["FALL", "Té ngã"], ["HEALTH", "Sức khỏe"], ["BEHAVIOR", "Hành vi"], ["LATE_PICKUP", "Đón trễ"], ["FACILITY", "Cơ sở vật chất"], ["OTHER", "Khác"]] as const).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</SelectField>
        <SelectField label="Mức độ" value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value as Incident["severity"] })}><option value="LOW">Nhẹ</option><option value="MEDIUM">Vừa</option><option value="HIGH">Nặng</option></SelectField>
        <TextArea label="Mô tả" className="sm:col-span-2" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <TextArea label="Cách xử lý" className="sm:col-span-2" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} />
        <div className="sm:col-span-2"><Toggle checked={f.familyNotified} onChange={(v) => setF({ ...f, familyNotified: v })} label="Đã báo gia đình" /></div>
        <div className="sm:col-span-2"><Toggle checked={f.transfer} onChange={(v) => setF({ ...f, transfer: v, severity: v ? "HIGH" : f.severity })} label="Chuyển viện" sub="Ghi bệnh viện, giờ chuyển, người đi kèm" /></div>
        {f.transfer && <><Field label="Bệnh viện" value={f.hospital} onChange={(e) => setF({ ...f, hospital: e.target.value })} /><Field label="Giờ chuyển" type="time" value={f.ttime} onChange={(e) => setF({ ...f, ttime: e.target.value })} /><Field label="Người đi kèm" className="sm:col-span-2" value={f.escort} onChange={(e) => setF({ ...f, escort: e.target.value })} /></>}
        <Button variant="neutral" size="sm" className="sm:col-span-2">+ Thêm ảnh</Button>
        <div className="sm:col-span-2"><ErrorText error={save.error} /></div>
      </div>
    </Modal>
  );
}
