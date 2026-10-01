import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CalendarPlus, CircleCheck, MessageCircle, Phone, Plus, RefreshCw, Settings2, TriangleAlert, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { manager, TODAY } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { Avatar, Badge, Button, Card, Chip, EmptyState, ErrorText, Field, Kpi, KV, Loading, Note, Photo, SelectField, Table, TextArea, Toggle, cn } from "../../components/ui";
import { addDays, dm, dmy, weekday } from "../../lib/format";
import { attBadge } from "./ManagerCore";

const weekOf = (start: string, n = 6) => Array.from({ length: n }, (_, i) => addDays(start, i));
export const CUR_WEEK = "2026-09-28";
export const NEXT_WEEK = "2026-10-05";

// ------------------------------------------------------------------ CM-05 attendance
export function AttendancePage() {
  const me = useMe();
  const { data, isLoading } = useQuery({ queryKey: ["m-att"], queryFn: () => manager.attendance(me) });
  const rows = data ?? [];
  const count = (s: string) => rows.filter((r) => r.a?.status === s).length;
  return (
    <Page title={`Điểm danh · ${dmy(TODAY)}`}>
      <div className="flex flex-wrap gap-3">
        <Kpi label="Có mặt" value={count("PRESENT")} sub="đang ở trung tâm" color="green" />
        <Kpi label="Chưa đến" value={count("EXPECTED")} sub="dự kiến hôm nay" color="orange" />
        <Kpi label="Đã về" value={count("LEFT")} sub="đã check-out" />
        <Kpi label="Báo nghỉ" value={count("ABSENT")} sub={<Link to="/manager/absences" className="text-orange">Xem yêu cầu báo nghỉ</Link>} color="gray" />
      </div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.elderly.id} columns={[
            { key: "n", header: "Họ tên", render: (r) => <Link to={`/manager/members/${r.elderly.id}`} className="flex items-center gap-2 hover:text-orange"><Avatar name={r.elderly.fullName} size={26} />{r.elderly.fullName}</Link> },
            { key: "i", header: "Giờ đến", render: (r) => r.a?.checkIn ?? "—" },
            { key: "o", header: "Giờ về", render: (r) => r.a?.checkOut ?? "—" },
            { key: "s", header: "Nhân viên phụ trách", render: (r) => r.staff?.fullName ?? "—" },
            { key: "t", header: "Trạng thái", render: (r) => { const [t, l] = attBadge(r.a); return r.a?.status === "ABSENT" ? <Link to="/manager/absences"><Badge tone="purple">Báo nghỉ</Badge></Link> : <Badge tone={t}>{l}</Badge>; } },
          ]} />
        )}
      </Card>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-21 absences
export function AbsencesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [sel, setSel] = useState<number>();
  const [refund, setRefund] = useState(true);
  const { data, isLoading } = useQuery({ queryKey: ["m-absences"], queryFn: () => manager.absences(me) });
  const rows = (data ?? []).filter((r) => r.absence.status === f);
  const cur = rows.find((r) => r.absence.id === sel) ?? rows[0];
  const review = useMutation({ mutationFn: (approve: boolean) => manager.reviewAbsence(me, cur!.absence.id, approve, refund && cur!.refund > 0), onSuccess: () => qc.invalidateQueries() });
  return (
    <Page title="Báo nghỉ từ gia đình" back="/manager/attendance">
      <div className="flex gap-1.5">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => <Chip key={s} active={f === s} onClick={() => setF(s)}>{{ PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối" }[s]} ({data?.filter((r) => r.absence.status === s).length ?? 0})</Chip>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          {isLoading ? <Loading /> : (
            <Table rows={rows} rowKey={(r) => r.absence.id} onRowClick={(r) => setSel(r.absence.id)} columns={[
              { key: "n", header: "Người cao tuổi", render: (r) => <span className={cn("flex items-center gap-2", cur?.absence.id === r.absence.id && "font-semibold text-orange")}><Avatar name={r.elderly.fullName} size={24} />{r.elderly.fullName}</span> },
              { key: "d", header: "Ngày nghỉ", render: (r) => r.absence.fromDate === r.absence.toDate ? dm(r.absence.fromDate) : `${dm(r.absence.fromDate)} – ${dm(r.absence.toDate)}` },
              { key: "r", header: "Lý do", render: (r) => r.absence.reason },
              { key: "s", header: "Trạng thái", render: (r) => <Badge tone={{ PENDING: "orange", APPROVED: "green", REJECTED: "red" }[r.absence.status] as "orange"}>{{ PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối" }[r.absence.status]}</Badge> },
            ]} />
          )}
        </Card>
        {cur && (
          <Card title="Chi tiết yêu cầu" className="h-fit">
            <KV label="Người gửi" w={95}>{cur.requester?.fullName}</KV>
            <KV label="Người cao tuổi" w={95}>{cur.elderly.fullName}</KV>
            <KV label="Ngày nghỉ" w={95}>{dmy(cur.absence.fromDate)} – {dmy(cur.absence.toDate)} ({cur.days} ngày)</KV>
            <KV label="Lý do" w={95}>{cur.absence.note || cur.absence.reason}</KV>
            {cur.pkg && <div className="mt-2 border-t border-line-soft pt-2 text-[12px] font-semibold text-navy">Theo chính sách gói {cur.pkg.name}</div>}
            <KV label="Hoàn phí" w={95}>{cur.refund ? `250.000đ × ${cur.days} ngày = ${cur.refund.toLocaleString("vi-VN")}đ` : "Gói theo ngày: không thu phí ngày nghỉ"}</KV>
            {cur.absence.status === "PENDING" && (
              <>
                {cur.refund > 0 && <div className="mt-2"><Toggle checked={refund} onChange={setRefund} label="Tạo yêu cầu hoàn tiền" sub="Chuyển sang Thanh toán & hoàn tiền" /></div>}
                <div className="mt-3 flex gap-2">
                  <Button variant="success" icon={CircleCheck} loading={review.isPending} onClick={() => review.mutate(true)}>Duyệt</Button>
                  <Button variant="danger" onClick={() => review.mutate(false)}>Từ chối</Button>
                </div>
              </>
            )}
          </Card>
        )}
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-06 schedule & menu
export function SchedulePage() {
  const me = useMe();
  const dates = weekOf(CUR_WEEK);
  const [day, setDay] = useState(TODAY);
  const { data, isLoading } = useQuery({ queryKey: ["m-schedule", CUR_WEEK], queryFn: () => manager.schedule(me, dates) });
  const times = [...new Set((data?.items ?? []).map((i) => i.startTime))].sort();
  const menu = data?.menus.find((m) => m.date === day);
  const tone = (t: string) => (t < "10:00" ? "bg-green-soft text-green-ink" : t < "12:00" ? "bg-amber-soft text-amber-ink" : "bg-[#dbe5f5] text-blue");
  return (
    <Page title={`Lịch hoạt động & thực đơn · Tuần ${dm(dates[0])} – ${dm(dates[5])}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Chip active>Tuần</Chip>
        <Button className="ml-auto" icon={Plus} to="/manager/schedule/new">Thêm hoạt động</Button>
        <Button variant="outline" icon={CalendarPlus} to={`/manager/schedule/new?menu=${day}`}>Sửa thực đơn</Button>
      </div>
      <Card>
        {isLoading ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[11.5px]">
              <thead>
                <tr><th className="w-14" />{dates.map((d) => <th key={d} className={cn("px-1 py-2 text-[10.5px] font-semibold uppercase", d === day ? "text-orange" : "text-subtle")}><button onClick={() => setDay(d)}>{weekday(d)} {dm(d)}</button></th>)}</tr>
              </thead>
              <tbody>
                {times.map((t) => (
                  <tr key={t}>
                    <td className="py-1 text-[10.5px] text-subtle">{t}</td>
                    {dates.map((d) => {
                      const it = data!.items.filter((i) => i.date === d && i.startTime === t);
                      return <td key={d} className="p-1">{it.map((i) => <div key={i.id} className={cn("rounded-lg px-2 py-1 text-center font-semibold", tone(t))} title={`${i.location} · ${i.staff?.fullName ?? ""}`}>{i.service.name}</div>)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title={`Thực đơn · ${weekday(day)} ${dm(day)}`} actions={<span className="text-[11px] text-subtle">Ghi chú ăn kiêng gắn với hồ sơ từng người</span>}>
        {menu ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {([["Bữa sáng", menu.breakfast], ["Bữa trưa", menu.lunch], ["Bữa xế", menu.snack]] as const).map(([l, v]) => <div key={l} className="rounded-xl bg-canvas p-3"><div className="text-[12.5px] font-bold text-navy">{l}</div><div className="text-[12px] text-muted">{v}</div></div>)}
          </div>
        ) : <div className="text-[12.5px] text-subtle">Chưa có thực đơn. <Link className="text-orange" to={`/manager/schedule/new?menu=${day}`}>Thêm thực đơn</Link></div>}
        {menu?.note && <Note className="mt-3">{menu.note}</Note>}
      </Card>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-18 add activity + menu
export function ScheduleFormPage() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const menuDate = sp.get("menu") ?? "2026-10-08";
  const services = useQuery({ queryKey: ["m-services"], queryFn: () => manager.services(me) });
  const staffQ = useQuery({ queryKey: ["m-staff"], queryFn: () => manager.staff(me) });
  const sched = useQuery({ queryKey: ["m-schedule-menu", menuDate], queryFn: () => manager.schedule(me, [menuDate]) });
  const [a, setA] = useState({ serviceId: 2, date: "2026-10-08", startTime: "10:00", endTime: "11:00", location: "Phòng sinh hoạt", staffId: 7, repeat: "WEEKLY" });
  const existing = sched.data?.menus[0];
  const [m, setM] = useState<Record<string, string>>({});
  const mv = (k: "breakfast" | "lunch" | "snack" | "dinner" | "note") => m[k] ?? existing?.[k] ?? "";
  const act = useMutation({ mutationFn: () => manager.createSchedule(me, { serviceId: a.serviceId, date: a.date, startTime: a.startTime, endTime: a.endTime, location: a.location, staffId: a.staffId, repeatWeeks: a.repeat === "WEEKLY" ? 4 : 1 }), onSuccess: () => { qc.invalidateQueries(); nav("/manager/schedule"); } });
  const menu = useMutation({ mutationFn: () => manager.saveMenu(me, { date: menuDate, breakfast: mv("breakfast"), lunch: mv("lunch"), snack: mv("snack"), dinner: mv("dinner"), note: mv("note") }), onSuccess: () => { qc.invalidateQueries(); nav("/manager/schedule"); } });
  const pkgList = useQuery({ queryKey: ["m-packages"], queryFn: () => manager.packages(me) });
  return (
    <Page title="Thêm hoạt động & thực đơn" back="/manager/schedule">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card title="Hoạt động">
          <div className="grid gap-2 sm:grid-cols-3">
            <SelectField label="Dịch vụ / hoạt động" className="sm:col-span-3" value={a.serviceId} onChange={(e) => setA({ ...a, serviceId: Number(e.target.value) })}>
              {services.data?.filter((s) => s.service.type === "ACTIVITY" && s.service.status === "ACTIVE").map((s) => <option key={s.service.id} value={s.service.id}>{s.service.name}</option>)}
            </SelectField>
            <Field label="Ngày" type="date" value={a.date} onChange={(e) => setA({ ...a, date: e.target.value })} />
            <Field label="Bắt đầu" type="time" value={a.startTime} onChange={(e) => setA({ ...a, startTime: e.target.value })} />
            <Field label="Kết thúc" type="time" value={a.endTime} onChange={(e) => setA({ ...a, endTime: e.target.value })} />
            <Field label="Địa điểm" className="sm:col-span-2" value={a.location} onChange={(e) => setA({ ...a, location: e.target.value })} />
            <SelectField label="Nhân viên phụ trách" value={a.staffId} onChange={(e) => setA({ ...a, staffId: Number(e.target.value) })}>
              {staffQ.data?.map((s) => <option key={s.user.id} value={s.user.id}>{s.user.fullName}</option>)}
            </SelectField>
          </div>
          <div className="mt-3 text-[12px] font-semibold text-navy">Lặp lại</div>
          <div className="mt-1.5 flex gap-1.5">{([["ONCE", "Không"], ["WEEKLY", "Hằng tuần (4 tuần)"]] as const).map(([v, l]) => <Chip key={v} active={a.repeat === v} onClick={() => setA({ ...a, repeat: v })}>{l}</Chip>)}</div>
          <div className="mt-3 text-[12px] font-semibold text-navy">Có trong gói</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{pkgList.data?.map((p) => <Badge key={p.pkg.id} tone={p.services.some((s) => s.id === a.serviceId) ? "green" : "gray"}>{p.pkg.name}</Badge>)}</div>
          <ErrorText error={act.error} />
          <div className="mt-4 flex gap-2"><Button icon={CircleCheck} loading={act.isPending} onClick={() => act.mutate()}>Lưu hoạt động</Button><Button variant="neutral" onClick={() => nav(-1)}>Huỷ</Button></div>
        </Card>
        <Card title={`Thực đơn · ${dmy(menuDate)}`} className="h-fit">
          <div className="space-y-2">
            {([["breakfast", "Bữa sáng"], ["lunch", "Bữa trưa"], ["snack", "Bữa xế"], ["dinner", "Bữa tối"], ["note", "Ghi chú"]] as const).map(([k, l]) => <Field key={k} label={l} value={mv(k)} placeholder={k === "dinner" ? "Chưa có" : ""} onChange={(e) => setM({ ...m, [k]: e.target.value })} />)}
            <Note>Gia đình thấy lịch và thực đơn ngay sau khi lưu.</Note>
            <Button loading={menu.isPending} onClick={() => menu.mutate()}>Lưu thực đơn</Button>
          </div>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-07 care logs needing attention
export function CareLogsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState<"NEW" | "IN_PROGRESS" | "RESOLVED">("NEW");
  const [sel, setSel] = useState<number>();
  const [noteText, setNote] = useState<string>();
  const { data, isLoading } = useQuery({ queryKey: ["m-carelogs"], queryFn: () => manager.careLogs(me) });
  const rows = (data ?? []).filter((r) => r.log.issueStatus === f);
  const cur = rows.find((r) => r.log.id === sel) ?? rows[0];
  const upd = useMutation({ mutationFn: (s: "IN_PROGRESS" | "RESOLVED") => manager.updateIssue(me, cur!.log.id, s, noteText ?? cur!.log.managerNote ?? ""), onSuccess: () => { setNote(undefined); qc.invalidateQueries(); } });
  return (
    <Page title="Nhật ký chăm sóc · mục cần lưu ý">
      <div className="flex gap-1.5">
        {(["NEW", "IN_PROGRESS", "RESOLVED"] as const).map((s) => <Chip key={s} active={f === s} onClick={() => setF(s)}>{{ NEW: "Cần xử lý", IN_PROGRESS: "Đang theo dõi", RESOLVED: "Đã xử lý" }[s]} ({data?.filter((r) => r.log.issueStatus === s).length ?? 0})</Chip>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <Card>
          {isLoading ? <Loading /> : rows.length === 0 ? <EmptyState icon={CircleCheck} title="Không có mục nào cần xử lý" desc="Nhật ký có lưu ý do nhân viên đánh dấu sẽ hiện ở đây." /> : (
            <Table rows={rows} rowKey={(r) => r.log.id} onRowClick={(r) => { setSel(r.log.id); setNote(undefined); }} columns={[
              { key: "n", header: "Người cao tuổi", render: (r) => <span className={cn("flex items-center gap-2", cur?.log.id === r.log.id && "font-semibold text-orange")}><Avatar name={r.elderly.fullName} size={24} />{r.elderly.fullName}</span> },
              { key: "d", header: "Ngày", render: (r) => dm(r.log.date) },
              { key: "i", header: "Lưu ý", render: (r) => r.log.issueNote },
              { key: "s", header: "Nhân viên", render: (r) => r.staff?.fullName },
              { key: "t", header: "Mức độ", render: (r) => <Badge tone={r.log.issueSeverity === "HIGH" ? "red" : "orange"}>{r.log.issueSeverity === "HIGH" ? "Cao" : "Thấp"}</Badge> },
            ]} />
          )}
        </Card>
        {cur && (
          <Card title={`${cur.elderly.fullName} · ${dm(cur.log.date)}`} className="h-fit">
            {cur.photos.length > 0 && <div className="mb-2 grid grid-cols-3 gap-1.5">{cur.photos.map((p) => <Photo key={p.id} tone={p.tone} />)}</div>}
            <KV label="Huyết áp" w={80}>{cur.log.bloodPressure ?? "—"}</KV>
            <div className="mt-1 rounded-[10px] border-[1.5px] border-input-line px-3 py-2 text-[12.5px]"><div className="text-[10px] text-subtle">Ghi chú của nhân viên</div>{cur.log.note}</div>
            <TextArea className="mt-2" label="Hướng xử lý của quản lý" value={noteText ?? cur.log.managerNote ?? ""} onChange={(e) => setNote(e.target.value)} />
            <div className="mt-3 flex flex-col gap-2">
              <Button icon={Phone} to={`/manager/messages?to=${cur.elderly.familyUserId}`}>Liên hệ gia đình</Button>
              {cur.log.issueStatus === "NEW" && <Button variant="outline" loading={upd.isPending} onClick={() => upd.mutate("IN_PROGRESS")}>Đánh dấu đang theo dõi</Button>}
              {cur.log.issueStatus !== "RESOLVED" && <Button variant="neutral" loading={upd.isPending} onClick={() => upd.mutate("RESOLVED")}>Đánh dấu đã xử lý</Button>}
            </div>
          </Card>
        )}
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-08 AI shift roster
export function ShiftsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const dates = weekOf(NEXT_WEEK);
  const { data, isLoading } = useQuery({ queryKey: ["m-shifts", NEXT_WEEK], queryFn: () => manager.shiftWeek(me, dates) });
  const gen = useMutation({ mutationFn: () => manager.generateAi(me, dates), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-shifts"] }) });
  const all = useMutation({ mutationFn: () => manager.approveAll(me, dates), onSuccess: () => qc.invalidateQueries() });
  const stats = useMemo(() => {
    if (!data) return null;
    const short = data.shifts.filter((s) => data.suggestions.filter((x) => x.shiftId === s.id && x.status !== "REJECTED" && !x.conflict).length < s.requiredStaff);
    return { pending: data.suggestions.filter((s) => s.status === "PENDING").length, approved: data.suggestions.filter((s) => s.status === "APPROVED").length, conflicts: data.suggestions.filter((s) => s.conflict && s.status === "PENDING").length, short };
  }, [data]);
  return (
    <Page title={`Xếp ca · Tuần ${dm(dates[0])} – ${dm(dates[5])}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="teal"><Bot size={12} /> AI đã gợi ý {data?.suggestions.length ?? 0} ca</Badge>
        <span className="text-[12px] text-muted">dựa trên dự báo có mặt, lịch rảnh và nhu cầu chăm sóc</span>
        <Button className="ml-auto" variant="outline" icon={Settings2} to="/manager/shifts/setup">Thiết lập ca</Button>
        <Button variant="ai" icon={RefreshCw} loading={gen.isPending} onClick={() => gen.mutate()}>Gợi ý lại</Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
        <Card>
          {isLoading || !data ? <Loading /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[11.5px]">
                <thead><tr><th className="px-2 py-2 text-left text-[10.5px] font-semibold text-subtle uppercase">Nhân viên</th>{dates.map((d) => <th key={d} className="px-1 py-2 text-[10.5px] font-semibold text-subtle uppercase">{weekday(d)} {dm(d)}</th>)}</tr></thead>
                <tbody>
                  {data.staff.map((s) => (
                    <tr key={s.id} className="border-t border-line-soft">
                      <td className="px-2 py-2"><span className="flex items-center gap-2"><Avatar name={s.fullName} size={24} />{s.fullName}</span></td>
                      {dates.map((d) => {
                        const items = data.suggestions.filter((x) => x.staffId === s.id && data.shifts.find((sh) => sh.id === x.shiftId)?.date === d && x.status !== "REJECTED");
                        return (
                          <td key={d} className="p-1 text-center">
                            {items.length === 0 ? <span className="text-faint">—</span> : items.map((x) => {
                              const sh = data.shifts.find((y) => y.id === x.shiftId)!;
                              return (
                                <button key={x.id} onClick={() => nav(`/manager/shifts/${sh.id}`)} title={x.reason} className={cn("w-full rounded-lg px-1.5 py-1 font-semibold", x.conflict ? "border-[1.5px] border-[#e05a5a] bg-[#fdeaea] text-red-ink" : x.status === "APPROVED" ? "bg-[#dbe5f5] text-blue" : "border-[1.5px] border-dashed border-teal bg-[#e6f6f5] text-teal-ink")}>
                                  {sh.label}{x.conflict && " ⚠"}
                                </button>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-md border-[1.5px] border-dashed border-teal bg-[#e6f6f5] px-2 py-0.5 font-semibold text-teal-ink">AI đề xuất</span>
                <span className="rounded-md bg-[#dbe5f5] px-2 py-0.5 font-semibold text-blue">Đã duyệt</span>
                <span className="rounded-md border-[1.5px] border-[#e05a5a] bg-[#fdeaea] px-2 py-0.5 font-semibold text-red-ink">Xung đột</span>
              </div>
            </div>
          )}
        </Card>
        <Card title="Tóm tắt đề xuất" className="h-fit">
          {stats && (
            <ul className="space-y-1 text-[12px] text-muted">
              <li>• {stats.pending} ca chờ duyệt · {stats.approved} ca đã duyệt</li>
              <li>• {stats.conflicts} xung đột cần chỉnh</li>
              <li>• {stats.short.length ? `Thiếu người ${stats.short.length} ca (vd. ${stats.short[0].label.toLowerCase()} ${weekday(stats.short[0].date)})` : "Đủ người cho mọi ca"}</li>
              <li>• Không ai quá 5 ca/tuần</li>
            </ul>
          )}
          <Note className="mt-3">AI chỉ gợi ý. Quản lý duyệt thì ca mới có hiệu lực và được gửi cho nhân viên.</Note>
          <Button className="mt-3" variant="success" icon={CircleCheck} block loading={all.isPending} onClick={() => all.mutate()}>Duyệt & gửi nhân viên</Button>
          <p className="mt-2 text-[11px] text-subtle">Ca xung đột không được duyệt tự động — bấm vào ô để xem chi tiết.</p>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-19 shift setup
export function ShiftSetupPage() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const dates = weekOf(NEXT_WEEK);
  const { data } = useQuery({ queryKey: ["m-shifts", NEXT_WEEK], queryFn: () => manager.shiftWeek(me, dates) });
  const setReq = useMutation({ mutationFn: ({ id, n }: { id: number; n: number }) => manager.setRequired(me, id, n), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-shifts"] }) });
  const gen = useMutation({ mutationFn: () => manager.generateAi(me, dates), onSuccess: () => { qc.invalidateQueries(); nav("/manager/shifts"); } });
  const labels = ["Sáng", "Chiều", "Cả ngày"] as const;
  return (
    <Page title={`Thiết lập ca · Tuần ${dm(dates[0])} – ${dm(dates[5])}`} back="/manager/shifts">
      <Card title="Ca làm & số nhân viên cần">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[12px]">
            <thead><tr className="text-[10.5px] text-subtle uppercase"><th className="py-2 text-left">Ca</th><th className="text-left">Giờ</th>{dates.map((d) => <th key={d}>{weekday(d)}</th>)}</tr></thead>
            <tbody>
              {labels.map((l) => {
                const row = data?.shifts.filter((s) => s.label === l) ?? [];
                return (
                  <tr key={l} className="border-t border-line-soft">
                    <td className="py-2 font-semibold">Ca {l.toLowerCase()}</td>
                    <td>{row[0] ? `${row[0].startTime}–${row[0].endTime}` : ""}</td>
                    {dates.map((d) => {
                      const s = row.find((x) => x.date === d);
                      return <td key={d} className="px-1 text-center">{s && <input type="number" min={0} max={6} defaultValue={s.requiredStaff} onBlur={(e) => setReq.mutate({ id: s.id, n: Number(e.target.value) })} className="h-8 w-14 rounded-lg border-[1.5px] border-input-line text-center outline-none focus:border-orange" aria-label={`Số nhân viên ca ${l} ${d}`} />}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card title="Đầu vào cho AI">
          <KV label="Dự báo có mặt" w={150}>T2 22 · T3 21 · T4 23 · T5 22 · T6 24 · T7 15</KV>
          <KV label="Nhân viên sẵn sàng" w={150}>{data?.staff.length ?? 0} người đang làm</KV>
          <KV label="Tỷ lệ yêu cầu" w={150}>1 nhân viên / 5 người cao tuổi</KV>
          <KV label="Giới hạn" w={150}>Tối đa 5 ca / người / tuần</KV>
        </Card>
        <Card title="Tạo gợi ý" className="h-fit">
          <p className="text-[12px] text-muted">AI đề xuất phân công dựa trên thông số bên trái. Quản lý xem lại và duyệt trước khi gửi nhân viên.</p>
          <Button className="mt-3" variant="ai" icon={Bot} block loading={gen.isPending} onClick={() => gen.mutate()}>Tạo gợi ý bằng AI</Button>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-20 AI suggestion detail
export function ShiftDetailPage() {
  const me = useMe();
  const qc = useQueryClient();
  const shiftId = Number(useParams().shiftId);
  const dates = weekOf(NEXT_WEEK);
  const { data, isLoading } = useQuery({ queryKey: ["m-shifts", NEXT_WEEK], queryFn: () => manager.shiftWeek(me, dates) });
  const [noteText, setNote] = useState("");
  const review = useMutation({ mutationFn: ({ id, s }: { id: number; s: "APPROVED" | "REJECTED" | "PENDING" }) => manager.reviewSuggestion(me, id, s, noteText || undefined), onSuccess: () => qc.invalidateQueries() });
  if (isLoading || !data) return <Page title="Gợi ý AI" back="/manager/shifts"><Loading /></Page>;
  const sh = data.shifts.find((s) => s.id === shiftId);
  if (!sh) return <Page title="Gợi ý AI" back="/manager/shifts"><ErrorText error="Không tìm thấy ca" /></Page>;
  const sugg = data.suggestions.filter((s) => s.shiftId === shiftId);
  const approved = sugg.filter((s) => s.status === "APPROVED").length;
  return (
    <Page title={`Gợi ý AI · Ca ${sh.label.toLowerCase()} ${weekday(sh.date)} ${dm(sh.date)}`} back="/manager/shifts">
      <Card>
        <div className="flex flex-wrap items-center gap-8">
          {([["Giờ", `${sh.startTime} – ${sh.endTime}`], ["Cần", `${sh.requiredStaff} nhân viên`], ["Đã duyệt", `${approved} / ${sh.requiredStaff}`]] as const).map(([l, v]) => <div key={l}><div className="text-[10.5px] text-subtle">{l}</div><div className="text-[14px] font-bold text-navy">{v}</div></div>)}
          <Badge tone="teal">AI tạo lúc 06/10 08:00</Badge>
        </div>
      </Card>
      <Card title="Đề xuất phân công">
        <Table rows={sugg} rowKey={(s) => s.id} empty="Chưa có đề xuất — bấm Gợi ý lại" columns={[
          { key: "n", header: "Nhân viên", render: (s) => { const u = data.staff.find((x) => x.id === s.staffId); return <span className="flex items-center gap-2"><Avatar name={u?.fullName ?? "?"} size={24} />{u?.fullName}</span>; } },
          { key: "r", header: "Lý do AI đưa ra", render: (s) => <span className={cn(s.conflict && "text-red-ink")}>{s.conflict && <TriangleAlert size={12} className="mr-1 inline" />}{s.reason}</span> },
          { key: "s", header: "Trạng thái", render: (s) => s.status === "APPROVED" ? <Badge tone="green">Đã duyệt</Badge> : s.status === "REJECTED" ? <Badge tone="gray">Từ chối</Badge> : s.conflict ? <Badge tone="red">Xung đột</Badge> : <Badge tone="orange">Chờ duyệt</Badge> },
          { key: "a", header: "Thao tác", render: (s) => s.status === "PENDING" ? <span className="flex gap-1.5"><Button size="sm" variant="success" onClick={() => review.mutate({ id: s.id, s: "APPROVED" })}>Duyệt</Button><Button size="sm" variant="danger" onClick={() => review.mutate({ id: s.id, s: "REJECTED" })}>Từ chối</Button></span> : <Button size="sm" variant="neutral" icon={Undo2} onClick={() => review.mutate({ id: s.id, s: "PENDING" })}>Bỏ {s.status === "APPROVED" ? "duyệt" : "từ chối"}</Button> },
        ]} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card title="Ghi chú của quản lý"><TextArea value={noteText} onChange={(e) => setNote(e.target.value)} placeholder="Vd: Ưu tiên Châu ca chiều; cần thêm 1 hộ lý ca sáng T6." /></Card>
        <Card className="h-fit">
          <Note>AI chỉ gợi ý. Ca chỉ có hiệu lực khi quản lý duyệt.</Note>
          <div className="mt-3 flex gap-2">
            <Button variant="success" icon={CircleCheck} onClick={() => sugg.filter((s) => s.status === "PENDING" && !s.conflict).forEach((s) => review.mutate({ id: s.id, s: "APPROVED" }))}>Duyệt tất cả</Button>
            <Button variant="neutral" icon={RefreshCw} to="/manager/shifts/setup">Gợi ý lại</Button>
          </div>
          <Button className="mt-2" variant="outline" size="sm" icon={MessageCircle} to="/manager/messages">Nhắn nhân viên</Button>
        </Card>
      </div>
    </Page>
  );
}
