// Manager · staff (staff_profiles: NURSE / CAREGIVER) and AI shift planning with availability & leave (5.4).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Lock, Plus, Sparkles, TriangleAlert, Unlock, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { manager } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { PositionBadge, SearchBox } from "../../components/domain";
import { Avatar, Badge, Button, Card, Chip, ErrorText, Field, Loading, Modal, Note, SelectField, Table, Tabs, cn } from "../../components/ui";
import { GROUP_LABEL, POSITION_LABEL } from "../../domain/catalog";
import { dm, dmy, weekday } from "../../lib/format";
import type { Position, Shift } from "../../types/models";

export function StaffPage() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<Position | "ALL">("ALL");
  const { data, isLoading } = useQuery({ queryKey: ["m-staff"], queryFn: () => manager.staff() });
  const lock = useMutation({ mutationFn: ({ id, s }: { id: number; s: "LOCKED" | "ACTIVE" }) => manager.setStaffStatus(me, id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-staff"] }) });
  const rows = (data ?? []).filter((r) => (pos === "ALL" || r.profile?.position === pos) && (!q || r.user.fullName.toLowerCase().includes(q.toLowerCase())));
  return (
    <Page title="Nhân viên" sub="Hai chức vụ: điều dưỡng (chỉ số, thuốc, sự cố, đánh giá đầu vào) và hộ lý (ăn uống, vệ sinh, hoạt động, ảnh). Không có chức vụ trưởng ca.">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Tìm nhân viên…" />
        {([["ALL", "Tất cả"], ["NURSE", "Điều dưỡng"], ["CAREGIVER", "Hộ lý"]] as const).map(([v, l]) => <Chip key={v} active={pos === v} onClick={() => setPos(v)}>{l}</Chip>)}
        <Button className="ml-auto" icon={UserPlus} to="/manager/staff/new">Thêm nhân viên</Button>
      </div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.user.id} onRowClick={(r) => nav(`/manager/staff/${r.user.id}`)} columns={[
            { key: "n", header: "Nhân viên", render: (r) => <span className="flex items-center gap-2"><Avatar name={r.user.fullName} size={28} tone="teal" /><span><b className="text-navy">{r.user.fullName}</b><span className="block text-[11px] text-subtle">{r.user.email}</span></span></span> },
            { key: "p", header: "Chức vụ", render: (r) => <PositionBadge position={r.profile?.position} /> },
            { key: "c", header: "Chứng chỉ", render: (r) => <span className="text-[11.5px]">{r.profile?.certificate}</span> },
            { key: "j", header: "Vào làm", render: (r) => dmy(r.profile?.joinedAt) },
            { key: "a", header: "Cụ phụ trách", render: (r) => <span className="text-[11.5px]">{r.assigned.length} · {r.assigned.slice(0, 3).map((e) => e.fullName.split(" ").pop()).join(", ")}</span> },
            { key: "s", header: "Ca tuần này", render: (r) => r.shiftsWeek },
            { key: "st", header: "Tài khoản", render: (r) => <Badge tone={r.user.status === "ACTIVE" ? "green" : r.user.status === "INVITED" ? "orange" : "red"}>{({ ACTIVE: "Hoạt động", INVITED: "Đã mời", LOCKED: "Đã khóa" })[r.user.status]}</Badge> },
            { key: "x", header: "", render: (r) => <Button size="sm" variant={r.user.status === "LOCKED" ? "outline" : "danger"} icon={r.user.status === "LOCKED" ? Unlock : Lock} onClick={(ev) => { ev.stopPropagation(); lock.mutate({ id: r.user.id, s: r.user.status === "LOCKED" ? "ACTIVE" : "LOCKED" }); }}>{r.user.status === "LOCKED" ? "Mở" : "Khóa"}</Button> },
          ]} />
        )}
      </Card>
    </Page>
  );
}

export function StaffFormPage() {
  const me = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  const id = useParams().id ? Number(useParams().id) : undefined;
  const { data } = useQuery({ queryKey: ["m-staff"], queryFn: () => manager.staff() });
  const members = useQuery({ queryKey: ["m-members"], queryFn: () => manager.members() });
  const cur = data?.find((r) => r.user.id === id);
  const [f, setF] = useState<{ fullName?: string; email?: string; phone?: string; position?: Position; certificate?: string; joinedAt?: string; elderlyIds?: number[] }>({});
  const v = { fullName: f.fullName ?? cur?.user.fullName ?? "", email: f.email ?? cur?.user.email ?? "", phone: f.phone ?? cur?.user.phone ?? "", position: f.position ?? cur?.profile?.position ?? "CAREGIVER", certificate: f.certificate ?? cur?.profile?.certificate ?? "", joinedAt: f.joinedAt ?? cur?.profile?.joinedAt ?? "2026-10-12", elderlyIds: f.elderlyIds ?? cur?.assigned.map((e) => e.id) ?? [] };
  const save = useMutation({ mutationFn: () => manager.saveStaff(me, { id, ...v }), onSuccess: () => { qc.invalidateQueries(); nav("/manager/staff"); } });
  if (id && !cur) return <Page title="Nhân viên"><Loading /></Page>;
  const active = (members.data ?? []).filter((r) => ["ACTIVE", "PAUSED"].includes(r.elderly.status));
  return (
    <Page title={id ? `Sửa · ${cur?.user.fullName}` : "Thêm nhân viên"} back="/manager/staff">
      <form className="grid gap-4 lg:grid-cols-[1fr_380px]" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <Card title="Hồ sơ nhân viên (staff_profiles)">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Họ và tên" required value={v.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
            <SelectField label="Chức vụ" value={v.position} onChange={(e) => setF({ ...f, position: e.target.value as Position, elderlyIds: [] })}><option value="NURSE">Điều dưỡng</option><option value="CAREGIVER">Hộ lý</option></SelectField>
            <Field label="Email (đăng nhập)" type="email" required value={v.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <Field label="Số điện thoại" value={v.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <Field label="Chứng chỉ" value={v.certificate} onChange={(e) => setF({ ...f, certificate: e.target.value })} />
            <Field label="Ngày vào làm" type="date" value={v.joinedAt} onChange={(e) => setF({ ...f, joinedAt: e.target.value })} />
          </div>
          <Note className="mt-3">{v.position === "NURSE" ? "Điều dưỡng: đo chỉ số, cho uống thuốc, ghi sự cố và chuyển viện, đánh giá đầu vào, cho phép dịch vụ ⚠." : "Hộ lý: check-in/out, ghi ăn uống, vệ sinh, hoạt động, nghỉ trưa, tâm trạng, ảnh; hộ lý phụ trách chính chốt care log."} {!id && "Tài khoản mới nhận email mời, mật khẩu tạm demo1234."}</Note>
          <ErrorText error={save.error} />
          <Button type="submit" className="mt-3" loading={save.isPending}>Lưu</Button>
        </Card>
        <Card title={`Cụ phụ trách (${v.elderlyIds.length})`} className="h-fit">
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {active.map((r) => {
              const owner = v.position === "NURSE" ? r.nurse : r.caregiver;
              return (
                <label key={r.elderly.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] hover:bg-canvas">
                  <input type="checkbox" checked={v.elderlyIds.includes(r.elderly.id)} onChange={(e) => setF({ ...f, elderlyIds: e.target.checked ? [...v.elderlyIds, r.elderly.id] : v.elderlyIds.filter((x) => x !== r.elderly.id) })} />
                  <span className="flex-1">{r.elderly.fullName}<span className="block text-[11px] text-subtle">{r.elderly.targetGroup ? GROUP_LABEL[r.elderly.targetGroup] : ""}{owner && owner.id !== id ? ` · đang: ${owner.fullName}` : ""}</span></span>
                </label>
              );
            })}
          </div>
        </Card>
      </form>
    </Page>
  );
}

// ------------------------------------------------------------------ shifts
const NEXT = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"];
const NOW_W = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"];
const LABELS: Shift["label"][] = ["Sáng", "Chiều", "Trực chờ đón"];
export function ShiftsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") ?? "plan";
  const [week, setWeek] = useState<"next" | "now">("next");
  const [addTo, setAddTo] = useState<Shift>();
  const [pick, setPick] = useState<number>();
  const dates = week === "next" ? NEXT : NOW_W;
  const { data, isLoading } = useQuery({ queryKey: ["m-shifts", week], queryFn: () => manager.shiftWeek(dates) });
  const inv = () => qc.invalidateQueries({ queryKey: ["m-shifts"] });
  const gen = useMutation({ mutationFn: () => manager.generateShifts(me, dates), onSuccess: inv });
  const review = useMutation({ mutationFn: ({ id, s }: { id: number; s: "APPROVED" | "REJECTED" | "SUGGESTED" }) => manager.reviewAssignment(me, id, s), onSuccess: inv });
  const all = useMutation({ mutationFn: () => manager.approveAllShifts(me, dates), onSuccess: inv });
  const manual = useMutation({ mutationFn: () => manager.assignManual(me, addTo!.id, pick!), onSuccess: () => { inv(); setAddTo(undefined); } });
  const leave = useMutation({ mutationFn: ({ id, ok }: { id: number; ok: boolean }) => manager.reviewLeave(me, id, ok), onSuccess: inv });
  const note = useMutation({ mutationFn: ({ id, n }: { id: number; n: string }) => manager.setShiftNote(me, id, n), onSuccess: inv });
  const pending = data?.assignments.filter((a) => a.status === "SUGGESTED").length ?? 0;
  const conflicts = data?.assignments.filter((a) => a.status === "SUGGESTED" && a.conflict).length ?? 0;
  const name = (id: number) => data?.staff.find((s) => s.user.id === id);
  return (
    <Page title="Xếp ca (AI gợi ý)" sub="AI dùng lịch rảnh, chức vụ, số cụ dự kiến (trừ cụ báo nghỉ) và tỷ lệ staff theo hạng để đề xuất. Quản lý sửa rồi duyệt (BR-50).">
      <Tabs value={tab} onChange={(v) => setSp({ tab: v })} items={[{ value: "plan", label: "Lịch ca tuần" }, { value: "avail", label: "Lịch rảnh nhân viên" }, { value: "leave", label: `Xin nghỉ / đổi ca (${data?.leaves.filter((l) => l.status === "PENDING").length ?? 0})` }]} />
      {tab === "plan" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={week === "next"} onClick={() => setWeek("next")}>Tuần sau 12–17/10</Chip>
            <Chip active={week === "now"} onClick={() => setWeek("now")}>Tuần này 05–10/10</Chip>
            {week === "next" && <>
              <Button className="ml-auto" size="sm" variant="ai" icon={Sparkles} loading={gen.isPending} onClick={() => gen.mutate()}>AI gợi ý lại</Button>
              <Button size="sm" variant="success" icon={CircleCheck} disabled={!pending} loading={all.isPending} onClick={() => all.mutate()}>Duyệt {pending - conflicts} gợi ý không xung đột</Button>
            </>}
          </div>
          {conflicts > 0 && <Note tone="red">{conflicts} gợi ý có xung đột (trùng yêu cầu nghỉ/đổi ca). Xem và chọn người thay.</Note>}
          <Card>
            {isLoading || !data ? <Loading /> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-[12px]">
                  <thead>
                    <tr><th className="w-28" />{dates.map((d) => <th key={d} className="px-1.5 py-2 text-center text-[11px] text-subtle">{weekday(d)} {dm(d)}<span className="block font-normal">~{data.expected.find((x) => x.date === d)?.count} cụ</span></th>)}</tr>
                  </thead>
                  <tbody>
                    {LABELS.map((label) => (
                      <tr key={label} className="border-t border-line-soft align-top">
                        <td className="py-2 pr-2 font-semibold text-navy">{label}<span className="block text-[10.5px] font-normal text-subtle">{label === "Sáng" ? "07:00–12:00" : label === "Chiều" ? "12:00–16:30" : "16:30–19:30"}</span></td>
                        {dates.map((d) => {
                          const sh = data.shifts.find((s) => s.date === d && s.label === label);
                          if (!sh) return <td key={d} />;
                          const as = data.assignments.filter((a) => a.shiftId === sh.id && a.status !== "REJECTED");
                          const nurses = as.filter((a) => name(a.staffId)?.position === "NURSE").length;
                          const cgs = as.filter((a) => name(a.staffId)?.position === "CAREGIVER").length;
                          const short = nurses < sh.needNurse || cgs < sh.needCaregiver;
                          return (
                            <td key={d} className={cn("p-1.5", short && "bg-red-soft/30")}>
                              <div className="space-y-1">
                                {as.map((a) => {
                                  const s = name(a.staffId);
                                  return (
                                    <div key={a.id} className={cn("rounded-lg border px-1.5 py-1", a.conflict ? "border-red-line bg-red-soft/40" : a.status === "APPROVED" ? "border-green-soft bg-green-soft/40" : "border-line bg-surface")} title={a.reason}>
                                      <div className="flex items-center gap-1"><span className="flex-1 truncate font-semibold text-navy">{s?.user.fullName.split(" ").slice(-2).join(" ")}</span>{a.conflict && <TriangleAlert size={11} className="text-red-ink" />}</div>
                                      <div className="flex items-center gap-1 text-[10px] text-subtle">{s ? POSITION_LABEL[s.position] : ""}{a.source === "AI" && a.status === "SUGGESTED" && <Badge tone="teal">AI</Badge>}</div>
                                      {a.status === "SUGGESTED" && <div className="mt-0.5 flex gap-1"><button className="text-[10px] font-semibold text-green-ink" onClick={() => review.mutate({ id: a.id, s: "APPROVED" })}>Duyệt</button><button className="text-[10px] font-semibold text-red-ink" onClick={() => review.mutate({ id: a.id, s: "REJECTED" })}>Bỏ</button></div>}
                                      {a.status === "APPROVED" && week === "next" && <button className="text-[10px] text-subtle" onClick={() => review.mutate({ id: a.id, s: "SUGGESTED" })}>Hoàn tác</button>}
                                    </div>
                                  );
                                })}
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className={cn(short ? "font-semibold text-red-ink" : "text-subtle")}>ĐD {nurses}/{sh.needNurse} · HL {cgs}/{sh.needCaregiver}</span>
                                  <button onClick={() => { setAddTo(sh); setPick(undefined); }} className="text-orange" aria-label="Thêm"><Plus size={12} /></button>
                                </div>
                                <input defaultValue={sh.note} onBlur={(e) => e.target.value !== (sh.note ?? "") && note.mutate({ id: sh.id, n: e.target.value })} placeholder="Ghi chú ca…" className="w-full rounded border border-line-soft px-1 py-0.5 text-[10px] outline-none focus:border-orange" />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Note>Ghi chú ca (shift.note) thay cho chức vụ trưởng ca. Ca "Trực chờ đón" 16:30–19:30 cần 1 hộ lý trực sảnh.</Note>
        </>
      )}
      {tab === "avail" && (
        <Card title="Lịch rảnh tuần 12–17/10 (staff đăng ký trên app)">
          {!data ? <Loading /> : (
            <Table rows={data.staff} rowKey={(s) => s.user.id} columns={[
              { key: "n", header: "Nhân viên", render: (s) => <span><b className="text-navy">{s.user.fullName}</b><span className="block"><PositionBadge position={s.position} /></span></span> },
              ...NEXT.map((d) => ({ key: d, header: `${weekday(d)} ${dm(d)}`, render: (s: (typeof data.staff)[number]) => {
                const a = data.availability.find((x) => x.staffId === s.user.id && x.date === d);
                return <span className="flex flex-col gap-0.5">{a?.slots.length ? a.slots.map((x) => <Badge key={x} tone={x === "Sáng" ? "blue" : x === "Chiều" ? "teal" : "purple"}>{x}</Badge>) : <Badge tone="gray">Bận</Badge>}</span>;
              } })),
            ]} />
          )}
        </Card>
      )}
      {tab === "leave" && (
        <Card>
          <Table rows={data?.leaves ?? []} rowKey={(l) => l.id} columns={[
            { key: "n", header: "Nhân viên", render: (l) => l.staff?.fullName },
            { key: "k", header: "Loại", render: (l) => <Badge tone={l.kind === "LEAVE" ? "purple" : "teal"}>{l.kind === "LEAVE" ? "Xin nghỉ" : "Đổi ca"}</Badge> },
            { key: "s", header: "Ca", render: (l) => l.shift ? `${l.shift.label} ${weekday(l.shift.date)} ${dm(l.shift.date)}` : "—" },
            { key: "r", header: "Lý do", render: (l) => l.reason },
            { key: "p", header: "Người thay", render: (l) => l.replacement?.fullName ?? "—" },
            { key: "st", header: "Trạng thái", render: (l) => <Badge tone={l.status === "PENDING" ? "orange" : l.status === "APPROVED" ? "green" : "red"}>{({ PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối" })[l.status]}</Badge> },
            { key: "x", header: "", render: (l) => l.status === "PENDING" && <span className="flex gap-1"><Button size="sm" variant="success" onClick={() => leave.mutate({ id: l.id, ok: true })}>Duyệt</Button><Button size="sm" variant="danger" icon={X} onClick={() => leave.mutate({ id: l.id, ok: false })}>Từ chối</Button></span> },
          ]} />
        </Card>
      )}
      <Modal open={!!addTo} onClose={() => setAddTo(undefined)} title={addTo ? `Thêm người · ca ${addTo.label} ${dm(addTo.date)}` : ""} footer={<><Button variant="neutral" onClick={() => setAddTo(undefined)}>Hủy</Button><Button disabled={!pick} loading={manual.isPending} onClick={() => manual.mutate()}>Thêm</Button></>}>
        <SelectField label="Nhân viên rảnh ca này" value={pick ?? ""} onChange={(e) => setPick(Number(e.target.value))}>
          <option value="">Chọn…</option>
          {data?.staff.map((s) => {
            const free = data.availability.find((a) => a.staffId === s.user.id && a.date === addTo?.date)?.slots.includes(addTo!.label);
            return <option key={s.user.id} value={s.user.id}>{s.user.fullName} · {POSITION_LABEL[s.position]}{week === "next" && !free ? " (không đăng ký rảnh)" : ""}</option>;
          })}
        </SelectField>
        <ErrorText error={manual.error} />
      </Modal>
    </Page>
  );
}
