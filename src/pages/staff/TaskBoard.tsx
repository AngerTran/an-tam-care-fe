// Màn "Việc hôm nay": xem theo việc thay vì theo cụ — bấm 1 việc (vd. 11:00 Ăn trưa) để thấy các cụ cần làm,
// ai đã xong, và ghi / bỏ qua ngay tại đây mà không phải mở từng màn care log.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ClipboardList, ExternalLink, Pill } from "lucide-react";
import { useMemo, useState } from "react";
import { lookups, NOW, staff, useLiveRefresh } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { ElderlyCell, GroupBadge } from "../../components/domain";
import { Badge, Button, Card, Chip, EmptyState, ErrorText, Loading, Modal, TextArea, cn } from "../../components/ui";
import { POSITION_LABEL } from "../../domain/catalog";
import type { DailyTask, ElderlyMember, Thresholds } from "../../types/models";
import { EntryModal, taskKind, VitalsModal, type EntryKindUI } from "./StaffForms";

type Row = { task: DailyTask & { by?: { fullName: string } }; elderly: ElderlyMember; present: boolean; dayOpen: boolean; thresholds: Thresholds };
type Group = { key: string; time: string; title: string; owner: DailyTask["owner"]; rows: Row[] };

const ACTIVITIES = ["Dưỡng sinh, khởi động khớp", "Thư giãn tự do"];
const isOverdue = (g: Group) => g.time < NOW && g.rows.some((r) => r.task.status === "TODO");

export function TaskBoard() {
  const me = useMe();
  const qc = useQueryClient();
  const position = lookups.myPosition(me);
  const [mineOnly, setMineOnly] = useState(true);
  const [openOnly, setOpenOnly] = useState(false);
  const [lateOnly, setLateOnly] = useState(false);
  const [cur, setCur] = useState<string>();
  const [entry, setEntry] = useState<{ kind: EntryKindUI; row: Row }>();
  const [vitalsFor, setVitalsFor] = useState<Row>();
  const [skip, setSkip] = useState<Row>();
  const [reason, setReason] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["s-task-board", me.id], queryFn: () => staff.taskBoard(me) as Promise<Row[]> });
  useLiveRefresh(me.id);
  const skipTask = useMutation({
    mutationFn: () => staff.setTask(me, skip!.task.id, "SKIPPED", reason),
    onSuccess: () => { qc.invalidateQueries(); setSkip(undefined); setReason(""); },
  });

  // gom theo giờ + tên việc: "11:00 Ăn trưa" của mọi cụ thành 1 dòng
  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const r of data ?? []) {
      if (r.task.type === "CHECKOUT" || (mineOnly && r.task.owner !== position)) continue;
      const key = `${r.task.time} ${r.task.title}`;
      if (!map.has(key)) map.set(key, { key, time: r.task.time, title: r.task.title, owner: r.task.owner, rows: [] });
      map.get(key)!.rows.push(r);
    }
    return [...map.values()]
      .filter((g) => (!openOnly || g.rows.some((r) => r.task.status === "TODO")) && (!lateOnly || isOverdue(g)))
      .sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
  }, [data, mineOnly, openOnly, lateOnly, position]);
  // mặc định chọn việc chưa xong gần nhất
  const sel = groups.find((g) => g.key === cur) ?? groups.find((g) => g.rows.some((r) => r.task.status === "TODO")) ?? groups[0];

  return (
    <Page title="Việc hôm nay" sub="Bấm 1 việc để xem các cụ cần làm. Ghi hoặc bỏ qua ngay tại đây, không cần mở từng cụ.">
      <div className="flex flex-wrap gap-1.5">
        <Chip active={mineOnly} onClick={() => setMineOnly(true)}>Của tôi{position ? ` (${POSITION_LABEL[position].toLowerCase()})` : ""}</Chip>
        <Chip active={!mineOnly} onClick={() => setMineOnly(false)}>Tất cả</Chip>
        <span className="mx-1 w-px bg-line" />
        <Chip active={openOnly} onClick={() => setOpenOnly(!openOnly)}>Chưa xong</Chip>
        <Chip active={lateOnly} onClick={() => setLateOnly(!lateOnly)}>Quá giờ</Chip>
      </div>
      {isLoading ? <Loading /> : error ? <ErrorText error={error} /> : !groups.length ? (
        <Card><EmptyState icon={ClipboardList} title="Không có việc nào" desc="Chỉ cụ đã có mặt hôm nay mới có việc. Thử bỏ bớt bộ lọc." /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Card title={`${groups.length} việc`}>
            <ul className="-mx-2 space-y-0.5">
              {groups.map((g) => {
                const done = g.rows.filter((r) => r.task.status !== "TODO").length;
                const late = isOverdue(g);
                return (
                  <li key={g.key}>
                    <button onClick={() => setCur(g.key)} className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition", sel?.key === g.key ? "bg-orange-soft" : "hover:bg-canvas")}>
                      <b className={cn("w-11 shrink-0", late ? "text-orange" : "text-navy")}>{g.time}</b>
                      <span className="min-w-0 flex-1 truncate">{g.title}</span>
                      {!mineOnly && <Badge tone="gray">{g.owner === "NURSE" ? "ĐD" : "HL"}</Badge>}
                      <Badge tone={done === g.rows.length ? "green" : late ? "orange" : "blue"}>{done}/{g.rows.length}</Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
          {sel && (
            <Card title={<span>{sel.time} · {sel.title} <span className="text-[12px] font-normal text-subtle">· {sel.owner === "NURSE" ? "điều dưỡng" : "hộ lý"} làm</span></span>}>
              <ul className="divide-y divide-line-soft">
                {sel.rows.map((r) => <TaskRow key={r.task.id} row={r} mine={r.task.owner === position} onEntry={(kind) => setEntry({ kind, row: r })} onVitals={() => setVitalsFor(r)} onSkip={() => { setSkip(r); setReason(""); }} />)}
              </ul>
            </Card>
          )}
        </div>
      )}
      {entry && <EntryModal kind={entry.kind} elderly={entry.row.elderly} activities={ACTIVITIES} task={entry.row.task} onClose={() => setEntry(undefined)} />}
      <VitalsModal open={!!vitalsFor} onClose={() => setVitalsFor(undefined)} elderly={vitalsFor?.elderly} thresholds={vitalsFor?.thresholds ?? lookups.settings().thresholds} />
      <Modal open={!!skip} onClose={() => setSkip(undefined)} title={skip ? `Bỏ qua · ${skip.task.title} · ${skip.elderly.fullName}` : ""}
        footer={<><Button variant="neutral" onClick={() => setSkip(undefined)}>Hủy</Button><Button disabled={!reason.trim()} loading={skipTask.isPending} onClick={() => skipTask.mutate()}>Lưu</Button></>}>
        <TextArea label="Lý do (bắt buộc, CL-02)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <ErrorText error={skipTask.error} />
      </Modal>
    </Page>
  );
}

/** 1 cụ trong việc đang chọn: trạng thái + nút ghi phù hợp với loại việc. */
function TaskRow({ row, mine, onEntry, onVitals, onSkip }: { row: Row; mine: boolean; onEntry: (k: EntryKindUI) => void; onVitals: () => void; onSkip: () => void }) {
  const t = row.task;
  const canAct = mine && t.status === "TODO" && row.present && row.dayOpen;
  const kind = taskKind(t);
  const careLog = `/staff/elderly/${row.elderly.id}${t.entryKind ? `#blk-${t.entryKind}` : ""}`;
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1"><ElderlyCell e={row.elderly} sub={<GroupBadge group={row.elderly.targetGroup} />} /></div>
      <div className="text-[12px]">
        {t.status === "DONE" ? <Badge tone="green">Xong {t.doneAt ?? ""}{t.by ? ` · ${t.by.fullName}` : ""}</Badge>
          : t.status === "SKIPPED" ? <Badge tone="orange">Bỏ qua: {t.skipReason}</Badge>
          : !row.dayOpen ? <Badge tone="gray">Care log đã chốt</Badge>
          : !row.present ? <Badge tone="gray">Cụ đã về</Badge>
          : <Badge tone={t.time < NOW ? "orange" : "blue"}>{t.time < NOW ? "Quá giờ" : "Chưa làm"}</Badge>}
      </div>
      <div className="flex flex-wrap gap-1">
        {canAct && kind && <Button size="sm" onClick={() => onEntry(kind)}>Ghi</Button>}
        {canAct && (t.type === "VITALS" || t.type === "GLUCOSE") && <Button size="sm" variant="ai" icon={Activity} onClick={onVitals}>Đo</Button>}
        {canAct && t.type === "MEDICATION" && <Button size="sm" variant="outline" icon={Pill} to="/staff/meds">Cho uống</Button>}
        {canAct && t.type === "CARE" && <Button size="sm" variant="outline" icon={ExternalLink} to={careLog}>Ghi ở care log</Button>}
        {canAct && <Button size="sm" variant="neutral" onClick={onSkip}>Bỏ qua</Button>}
        {!canAct && <Button size="sm" variant="neutral" icon={ExternalLink} to={careLog}>Care log</Button>}
      </div>
    </li>
  );
}
