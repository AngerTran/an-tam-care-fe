// Staff · shifts + availability + leave (5.4), damage reports (5.10), personal belongings (4.10).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Package, Plus, Send, Undo2, Wrench } from "lucide-react";
import { useState } from "react";
import { staff } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { ElderlyCell } from "../../components/domain";
import { Badge, Button, Card, Chip, ErrorText, Field, Loading, Modal, Note, Photo, SelectField, Table, Tabs, TextArea, cn } from "../../components/ui";
import { EQUIP_CAT } from "../../domain/catalog";
import { dm, dmy, hm, weekday } from "../../lib/format";
import type { Shift } from "../../types/models";

const NOW_W = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"];
const NEXT = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"];
const SLOTS: Shift["label"][] = ["Sáng", "Chiều", "Trực chờ đón"];

export function StaffShifts() {
  const me = useMe();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"mine" | "avail" | "leave">("mine");
  const [week, setWeek] = useState<"now" | "next">("now");
  const [av, setAv] = useState<Record<string, Shift["label"][]>>();
  const [req, setReq] = useState<{ kind: "LEAVE" | "SWAP"; shiftId?: number; reason: string; replacementId?: number } | null>(null);
  const dates = week === "now" ? NOW_W : NEXT;
  const { data, isLoading } = useQuery({ queryKey: ["s-shifts", me.id, week], queryFn: () => staff.shifts(me, [...NOW_W, ...NEXT]) });
  const saveAv = useMutation({ mutationFn: () => staff.saveAvailability(me, NEXT.map((date) => ({ date, slots: cur(date) }))), onSuccess: () => { qc.invalidateQueries({ queryKey: ["s-shifts"] }); setAv(undefined); } });
  const send = useMutation({ mutationFn: () => staff.requestLeave(me, { kind: req!.kind, shiftId: req!.shiftId!, reason: req!.reason, replacementId: req!.replacementId }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["s-shifts"] }); setReq(null); setTab("leave"); } });
  const cur = (date: string) => av?.[date] ?? data?.availability.find((a) => a.date === date)?.slots ?? [];
  return (
    <Page title="Lịch ca & xin nghỉ" sub="Staff đăng ký lịch rảnh theo tuần; Quản lý dùng AI gợi ý rồi duyệt. Xin nghỉ hoặc đổi ca cần Quản lý duyệt.">
      <Tabs value={tab} onChange={setTab} items={[{ value: "mine", label: "Ca của tôi" }, { value: "avail", label: "Đăng ký lịch rảnh tuần sau" }, { value: "leave", label: `Yêu cầu nghỉ / đổi ca (${data?.leaves.length ?? 0})` }]} />
      {isLoading || !data ? <Loading /> : (
        <>
          {tab === "mine" && (
            <>
              <div className="flex gap-1.5"><Chip active={week === "now"} onClick={() => setWeek("now")}>Tuần này</Chip><Chip active={week === "next"} onClick={() => setWeek("next")}>Tuần sau</Chip><Button className="ml-auto" size="sm" variant="outline" icon={Plus} onClick={() => setReq({ kind: "LEAVE", reason: "" })}>Xin nghỉ / đổi ca</Button></div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {dates.map((d) => {
                  const mine = data.mine.filter((s) => s.date === d);
                  return (
                    <Card key={d} className={cn(d === "2026-10-09" && "ring-2 ring-orange")}>
                      <div className="text-[11px] font-semibold text-subtle">{weekday(d)} {dm(d)}</div>
                      {mine.length === 0 ? <div className="mt-2 text-[12px] text-faint">Nghỉ</div> : mine.map((s) => <div key={s.id} className="mt-2 rounded-lg bg-teal-soft px-2 py-1.5 text-[12px] text-teal-ink"><b>{s.label}</b><span className="block text-[11px]">{s.startTime}–{s.endTime}</span>{s.note && <span className="block text-[10.5px] text-muted">{s.note}</span>}</div>)}
                    </Card>
                  );
                })}
              </div>
              {week === "next" && data.mine.filter((s) => NEXT.includes(s.date)).length === 0 && <Note>Lịch tuần sau chưa được Quản lý duyệt.</Note>}
            </>
          )}
          {tab === "avail" && (
            <Card>
              <table className="w-full text-[12.5px]">
                <thead><tr><th className="w-32" />{NEXT.map((d) => <th key={d} className="py-2 text-[11px] text-subtle">{weekday(d)} {dm(d)}</th>)}</tr></thead>
                <tbody>
                  {SLOTS.map((s) => (
                    <tr key={s} className="border-t border-line-soft">
                      <td className="py-2 font-semibold text-navy">{s}</td>
                      {NEXT.map((d) => {
                        const on = cur(d).includes(s);
                        return <td key={d} className="py-2 text-center"><button onClick={() => setAv({ ...(av ?? {}), [d]: on ? cur(d).filter((x) => x !== s) : [...cur(d), s] })} className={cn("h-8 w-full max-w-24 rounded-lg text-[11px] font-semibold", on ? "bg-green text-white" : "bg-canvas text-subtle")}>{on ? "Rảnh" : "Bận"}</button></td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button className="mt-3" icon={Send} disabled={!av} loading={saveAv.isPending} onClick={() => saveAv.mutate()}>Gửi lịch rảnh</Button>
            </Card>
          )}
          {tab === "leave" && (
            <Card actions={<Button size="sm" icon={Plus} onClick={() => setReq({ kind: "LEAVE", reason: "" })}>Yêu cầu mới</Button>}>
              <Table rows={data.leaves} rowKey={(l) => l.id} empty="Chưa có yêu cầu" columns={[
                { key: "k", header: "Loại", render: (l) => <Badge tone={l.kind === "LEAVE" ? "purple" : "teal"}>{l.kind === "LEAVE" ? "Xin nghỉ" : "Đổi ca"}</Badge> },
                { key: "s", header: "Ca", render: (l) => l.shift ? `${l.shift.label} ${weekday(l.shift.date)} ${dm(l.shift.date)}` : "—" },
                { key: "r", header: "Lý do", render: (l) => l.reason },
                { key: "p", header: "Người thay", render: (l) => l.replacement?.fullName ?? "—" },
                { key: "st", header: "Trạng thái", render: (l) => <Badge tone={l.status === "PENDING" ? "orange" : l.status === "APPROVED" ? "green" : "red"}>{({ PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối" })[l.status]}</Badge> },
              ]} />
            </Card>
          )}
        </>
      )}
      <Modal open={!!req} onClose={() => setReq(null)} title="Xin nghỉ / đổi ca" footer={<><Button variant="neutral" onClick={() => setReq(null)}>Hủy</Button><Button icon={CalendarClock} disabled={!req?.shiftId || !req.reason} loading={send.isPending} onClick={() => send.mutate()}>Gửi Quản lý</Button></>}>
        {req && data && (
          <div className="grid gap-2">
            <div className="flex gap-1.5"><Chip active={req.kind === "LEAVE"} onClick={() => setReq({ ...req, kind: "LEAVE" })}>Xin nghỉ</Chip><Chip active={req.kind === "SWAP"} onClick={() => setReq({ ...req, kind: "SWAP" })}>Đổi ca</Chip></div>
            <SelectField label="Ca" value={req.shiftId ?? ""} onChange={(e) => setReq({ ...req, shiftId: Number(e.target.value) })}><option value="">Chọn ca của bạn…</option>{data.mine.filter((s) => s.date > "2026-10-09").map((s) => <option key={s.id} value={s.id}>{s.label} {weekday(s.date)} {dm(s.date)}</option>)}{data.allShifts.filter((s) => NEXT.includes(s.date)).map((s) => <option key={`n${s.id}`} value={s.id}>{s.label} {weekday(s.date)} {dm(s.date)} (tuần sau)</option>)}</SelectField>
            <TextArea label="Lý do" value={req.reason} onChange={(e) => setReq({ ...req, reason: e.target.value })} />
            <SelectField label="Người thay (cùng chức vụ, đang rảnh)" value={req.replacementId ?? ""} onChange={(e) => setReq({ ...req, replacementId: Number(e.target.value) || undefined })}><option value="">— Để Quản lý chọn —</option>{data.colleagues.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}</SelectField>
            <ErrorText error={send.error} />
          </div>
        )}
      </Modal>
    </Page>
  );
}

export function StaffDamage() {
  const me = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState<{ type: "EQ" | "ROOM"; equipmentId?: number; roomId?: number; quantity: number; description: string }>({ type: "EQ", quantity: 1, description: "" });
  const opts = useQuery({ queryKey: ["s-fac-opts"], queryFn: () => staff.facilityOptions() });
  const mine = useQuery({ queryKey: ["s-damage", me.id], queryFn: () => staff.myReports(me) });
  const send = useMutation({ mutationFn: () => staff.reportDamage(me, { equipmentId: f.type === "EQ" ? f.equipmentId : undefined, roomId: f.type === "ROOM" ? f.roomId : undefined, quantity: f.quantity, description: f.description }), onSuccess: () => { qc.invalidateQueries(); setF({ type: "EQ", quantity: 1, description: "" }); } });
  const eq = opts.data?.equipment.find((e) => e.id === f.equipmentId);
  return (
    <Page title="Báo hỏng thiết bị" sub="Hệ thống trừ ngay khỏi số dùng được; dưới định mức thì cảnh báo Quản lý (5.10).">
      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card title={<span className="flex items-center gap-2"><Wrench size={16} />Báo hỏng mới</span>}>
          <div className="grid gap-2">
            <div className="flex gap-1.5"><Chip active={f.type === "EQ"} onClick={() => setF({ ...f, type: "EQ" })}>Thiết bị</Chip><Chip active={f.type === "ROOM"} onClick={() => setF({ ...f, type: "ROOM" })}>Phòng có sự cố</Chip></div>
            {f.type === "EQ" ? (
              <SelectField label="Thiết bị" value={f.equipmentId ?? ""} onChange={(e) => setF({ ...f, equipmentId: Number(e.target.value) })}><option value="">Chọn…</option>{opts.data?.equipment.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.room?.name} · dùng được {e.usable}/{e.total}</option>)}</SelectField>
            ) : (
              <SelectField label="Phòng" value={f.roomId ?? ""} onChange={(e) => setF({ ...f, roomId: Number(e.target.value) })}><option value="">Chọn…</option>{opts.data?.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</SelectField>
            )}
            {f.type === "EQ" && <Field label={`Số lượng hỏng${eq ? ` (tối đa ${eq.usable})` : ""}`} type="number" min={1} value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} />}
            <TextArea label="Mô tả" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            <Button variant="neutral" size="sm">+ Chụp ảnh</Button>
            <ErrorText error={send.error} />
            {send.isSuccess && <Note tone="green">Đã gửi báo hỏng cho Quản lý.</Note>}
            <Button icon={Send} disabled={!f.description || (f.type === "EQ" ? !f.equipmentId : !f.roomId)} loading={send.isPending} onClick={() => send.mutate()}>Gửi báo hỏng</Button>
          </div>
        </Card>
        <Card title="Tôi đã báo">
          <Table rows={mine.data ?? []} rowKey={(r) => r.report.id} empty="Chưa có" columns={[
            { key: "t", header: "Lúc", render: (r) => `${dm(r.report.reportedAt.slice(0, 10))} ${hm(r.report.reportedAt)}` },
            { key: "w", header: "Thiết bị / phòng", render: (r) => <span>{r.equipment?.name ?? r.room?.name}{r.equipment && <span className="block text-[11px] text-subtle">{EQUIP_CAT[r.equipment.category]}</span>}</span> },
            { key: "d", header: "Mô tả", render: (r) => <span className="text-[12px]">{r.report.description}</span> },
            { key: "s", header: "Trạng thái", render: (r) => <Badge tone={r.report.status === "NEW" ? "red" : r.report.status === "REPAIRING" ? "orange" : "green"}>{({ NEW: "Mới", REPAIRING: "Đang sửa", FIXED: "Đã sửa", DISPOSED: "Thanh lý" })[r.report.status]}</Badge> },
          ]} />
        </Card>
      </div>
    </Page>
  );
}

export function StaffBelongings() {
  const me = useMe();
  const qc = useQueryClient();
  const [add, setAdd] = useState<{ elderlyId?: number; item: string } | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["s-bel", me.id], queryFn: () => staff.belongings(me) });
  const mine = staff.myElderly(me).filter((e) => e.status === "ACTIVE");
  const save = useMutation({ mutationFn: () => staff.addBelonging(me, add!.elderlyId!, add!.item), onSuccess: () => { qc.invalidateQueries(); setAdd(null); } });
  const ret = useMutation({ mutationFn: (id: number) => staff.returnBelonging(me, id), onSuccess: () => qc.invalidateQueries() });
  return (
    <Page title="Đồ cá nhân gửi lại" sub="Ghi nhận khi nhận và khi trả, có ảnh (xe lăn riêng, máy trợ thính, thuốc, quần áo thay). Gia đình xem trên app." actions={<Button size="sm" icon={Plus} onClick={() => setAdd({ elderlyId: mine[0]?.id, item: "" })}>Nhận đồ</Button>}>
      {isLoading ? <Loading /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data?.map(({ item, elderly, receiver, returner }) => (
            <Card key={item.id}>
              <Photo tone={item.tone} />
              <div className="mt-2 text-[13px] font-semibold text-navy">{item.item}</div>
              {elderly && <div className="mt-1"><ElderlyCell e={elderly} size={22} /></div>}
              <div className="mt-1 text-[11px] text-subtle">Nhận {dmy(item.receivedAt.slice(0, 10))} {hm(item.receivedAt)} · {receiver?.fullName}</div>
              {item.returnedAt ? <Badge tone="green">Đã trả {dm(item.returnedAt.slice(0, 10))} · {returner?.fullName}</Badge> : <Button className="mt-2" size="sm" variant="outline" icon={Undo2} loading={ret.isPending && ret.variables === item.id} onClick={() => ret.mutate(item.id)}>Đã trả gia đình</Button>}
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!add} onClose={() => setAdd(null)} title="Nhận đồ gửi" footer={<><Button variant="neutral" onClick={() => setAdd(null)}>Hủy</Button><Button icon={Package} disabled={!add?.item || !add.elderlyId} loading={save.isPending} onClick={() => save.mutate()}>Lưu</Button></>}>
        {add && (
          <div className="grid gap-2">
            <SelectField label="Cụ" value={add.elderlyId ?? ""} onChange={(e) => setAdd({ ...add, elderlyId: Number(e.target.value) })}>{mine.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}</SelectField>
            <Field label="Đồ gửi" value={add.item} onChange={(e) => setAdd({ ...add, item: e.target.value })} placeholder="VD: Máy trợ thính, áo khoác" />
            <Button variant="neutral" size="sm">+ Chụp ảnh</Button>
            <ErrorText error={save.error} />
          </div>
        )}
      </Modal>
    </Page>
  );
}
