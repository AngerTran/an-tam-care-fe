// Staff · Lịch hôm nay theo hoạt động: bấm một hoạt động → danh sách cụ cần làm gì, lưu ý riêng, ghi nhận ngay.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CircleCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { staff, TODAY } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { ElderlyCell, GroupBadge } from "../../components/domain";
import { Badge, Button, Card, Chip, EmptyState, ErrorText, Loading, Modal, Note, TextArea, cn } from "../../components/ui";
import { dmy, weekday } from "../../lib/format";
import type { DailyTask, ElderlyMember } from "../../types/models";
import { EntryModal, taskKind, VitalsModal, type EntryKindUI } from "./StaffForms";

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const OWNER = { NURSE: "Điều dưỡng", CAREGIVER: "Hộ lý" } as const;

export function StaffSchedule() {
  const me = useMe();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"mine" | "all">("mine");
  const [cur, setCur] = useState<string>();
  const [entry, setEntry] = useState<{ kind: EntryKindUI; task: Pick<DailyTask, "id" | "title" | "time">; elderly: ElderlyMember }>();
  const [vitalsFor, setVitalsFor] = useState<ElderlyMember>();
  const [skip, setSkip] = useState<{ id: number; reason: string }>();
  const { data, isLoading } = useQuery({ queryKey: ["s-sched", me.id], queryFn: () => staff.schedule(me) });
  const setTask = useMutation({ mutationFn: ({ id, s, r }: { id: number; s: "DONE" | "SKIPPED"; r?: string }) => staff.setTask(me, id, s, r), onSuccess: () => { qc.invalidateQueries(); setSkip(undefined); } });
  if (isLoading || !data) return <Page title="Lịch hôm nay"><Loading /></Page>;
  const groups = data.groups.filter((g) => mode === "all" || g.owner === data.position);
  const sel = data.groups.find((g) => g.key === cur);
  const now = mins(data.now);
  const state = (g: (typeof groups)[number]) => {
    const left = g.items.filter((i) => i.task.status === "TODO" && i.attendance === "PRESENT").length;
    if (!g.items.some((i) => i.task.status === "TODO")) return ["green", "Xong"] as const;
    if (left && mins(g.time) < now - 30) return ["red", "Quá giờ"] as const;
    if (left && Math.abs(mins(g.time) - now) <= 30) return ["orange", "Đang tới giờ"] as const;
    return mins(g.time) > now ? (["gray", "Sắp tới"] as const) : (["blue", "Chờ cụ có mặt"] as const);
  };
  return (
    <Page title="Lịch hôm nay" sub={`${weekday(TODAY)} ${dmy(TODAY)} · các hoạt động của cụ bạn phụ trách. Bấm một hoạt động để xem từng cụ cần làm gì.`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip active={mode === "mine"} onClick={() => setMode("mine")}>Việc của tôi ({OWNER[data.position]})</Chip>
        <Chip active={mode === "all"} onClick={() => setMode("all")}>Tất cả hoạt động</Chip>
      </div>
      <Card>
        {groups.length === 0 ? <EmptyState icon={CalendarDays} title="Hôm nay không có hoạt động" /> : (
          <ul className="divide-y divide-line-soft">
            {groups.map((g) => {
              const [tone, label] = state(g);
              const done = g.items.filter((i) => i.task.status !== "TODO").length;
              const mine = g.owner === data.position;
              return (
                <li key={g.key}>
                  <button onClick={() => setCur(g.key)} className={cn("-mx-2 flex w-[calc(100%+1rem)] flex-wrap items-center gap-2 rounded-lg px-2 py-2.5 text-left transition hover:bg-orange-soft", !mine && "opacity-60")}>
                    <span className={cn("w-12 text-[12.5px] font-semibold", tone === "red" ? "text-red-ink" : "text-navy")}>{g.time}</span>
                    <span className="min-w-0 flex-1 text-[13px] font-semibold text-navy">{g.title} <Badge tone={g.owner === "NURSE" ? "teal" : "blue"} className="ml-1">{OWNER[g.owner]}</Badge></span>
                    <span className="text-[12px] text-muted">{g.items.length} cụ · ✓ {done}/{g.items.length}</span>
                    <Badge tone={tone}>{label}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal open={!!sel} onClose={() => setCur(undefined)} title={sel ? `${sel.time} · ${sel.title}` : ""} width={720}>
        {sel && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted"><Badge tone={sel.owner === "NURSE" ? "teal" : "blue"}>{OWNER[sel.owner]}</Badge>{sel.items.length} cụ · đã xong {sel.items.filter((i) => i.task.status !== "TODO").length}</div>
            {sel.owner !== data.position && <Note>Việc của {OWNER[sel.owner].toLowerCase()}: bạn chỉ xem, không ghi được (CL-03).</Note>}
            <ul className="divide-y divide-line-soft">
              {sel.items.map((i) => {
                const t = i.task;
                const can = sel.owner === data.position && i.attendance === "PRESENT" && t.status === "TODO";
                const k = taskKind(t);
                return (
                  <li key={t.id} className="grid gap-2 py-2.5 sm:grid-cols-[200px_1fr_auto] sm:items-center">
                    <ElderlyCell e={i.elderly} sub={<GroupBadge group={i.elderly.targetGroup} />} />
                    <div className="text-[12px]">
                      {i.blocked && <div className="mb-0.5 flex items-center gap-1 font-semibold text-red-ink"><TriangleAlert size={12} />{i.blocked}</div>}
                      {i.notes.length ? <ul className="space-y-0.5 text-muted">{i.notes.map((n) => <li key={n}>• {n}</li>)}</ul> : <span className="text-subtle">Không có lưu ý riêng</span>}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {t.status === "DONE" ? <Badge tone="green">Đã làm {t.doneAt} · {i.by?.fullName}</Badge>
                        : t.status === "SKIPPED" ? <Badge tone="orange">Bỏ qua: {t.skipReason}</Badge>
                        : i.attendance !== "PRESENT" ? <Badge tone="gray">{i.attendance === "LEFT" ? "Đã về" : "Chưa đến"}</Badge>
                        : !can ? <Badge tone="gray">Chưa làm</Badge>
                        : i.blocked ? <Button size="sm" variant="neutral" onClick={() => setSkip({ id: t.id, reason: i.blocked })}>Bỏ qua (không được phép)</Button>
                        : <>
                          {t.type === "VITALS" || t.type === "GLUCOSE" ? <Button size="sm" variant="ai" onClick={() => setVitalsFor(i.elderly)}>Đo</Button>
                            : t.type === "MEDICATION" ? <Button size="sm" variant="outline" to="/staff/meds">Cho uống thuốc</Button>
                            : t.type === "CHECKOUT" ? <Button size="sm" variant="outline" to="/staff/checkin">Check-out</Button>
                            : k ? <Button size="sm" onClick={() => setEntry({ kind: k, task: { id: t.id, title: t.title, time: t.time }, elderly: i.elderly })}>Ghi nhận</Button>
                            : <Button size="sm" variant="success" icon={CircleCheck} loading={setTask.isPending && setTask.variables?.id === t.id} onClick={() => setTask.mutate({ id: t.id, s: "DONE" })}>Đã làm</Button>}
                          <Button size="sm" variant="neutral" onClick={() => setSkip({ id: t.id, reason: "" })}>Bỏ qua</Button>
                        </>}
                    </div>
                  </li>
                );
              })}
            </ul>
            <ErrorText error={setTask.error} />
          </div>
        )}
      </Modal>

      {entry && <EntryModal key={entry.task.id} kind={entry.kind} task={entry.task} elderly={entry.elderly} activities={[entry.task.title]} onClose={() => setEntry(undefined)} />}
      <VitalsModal open={!!vitalsFor} onClose={() => setVitalsFor(undefined)} elderly={vitalsFor} thresholds={data.thresholds} diabetic={vitalsFor?.conditions.some((c) => c.includes("Tiểu đường"))} />
      <Modal open={!!skip} onClose={() => setSkip(undefined)} title="Bỏ qua việc" footer={<><Button variant="neutral" onClick={() => setSkip(undefined)}>Hủy</Button><Button disabled={!skip?.reason.trim()} loading={setTask.isPending} onClick={() => setTask.mutate({ id: skip!.id, s: "SKIPPED", r: skip!.reason })}>Bỏ qua</Button></>}>
        {skip && <>
          <TextArea label="Lý do (bắt buộc, CL-02)" value={skip.reason} onChange={(e) => setSkip({ ...skip, reason: e.target.value })} />
          <div className="mt-2 flex flex-wrap gap-1.5">{["Cụ mệt, xin nghỉ", "Cụ từ chối", "Thiết bị đang hỏng", "Đang ở phòng y tế"].map((r) => <Chip key={r} onClick={() => setSkip({ ...skip, reason: r })}>{r}</Chip>)}</div>
          <ErrorText error={setTask.error} />
        </>}
      </Modal>
    </Page>
  );
}
