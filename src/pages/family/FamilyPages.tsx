import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarX, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Landmark, MapPin, Phone, Plus, RefreshCw, Undo2, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { family, inbox, TODAY } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { Avatar, Badge, Button, Card, Chip, EmptyState, ErrorText, Field, IconCircle, KV, Loading, Modal, Note, Photo, SelectField, Table, TextArea, Toggle, cn } from "../../components/ui";
import { addDays, age, dm, dmy, hm, vnd, weekday } from "../../lib/format";
import type { PaymentMethod, ServiceType } from "../../types/models";
import { attBadge, regBadge } from "../manager/ManagerCore";
import { CUR_WEEK } from "../manager/ManagerOps";

const title = (g: string) => (g === "Nữ" ? "Bà" : "Ông");
const TYPE_LABEL: Record<ServiceType, string> = { ACTIVITY: "Hoạt động", MEAL: "Bữa ăn", SERVICE: "Dịch vụ chăm sóc" };

function useRelatives() {
  const me = useMe();
  return useQuery({ queryKey: ["f-relatives"], queryFn: () => family.relatives(me) });
}

// ------------------------------------------------------------------ FW-02 home
export function FamilyHome() {
  const me = useMe();
  const rel = useRelatives();
  const [sel, setSel] = useState<number>();
  const list = rel.data ?? [];
  const cur = list.find((r) => r.elderly.id === sel) ?? list.find((r) => r.elderly.centerId) ?? list[0];
  const log = useQuery({ queryKey: ["f-log", cur?.elderly.id, TODAY], queryFn: () => family.careLog(me, cur!.elderly.id, TODAY), enabled: !!cur?.elderly.centerId });
  const sched = useQuery({ queryKey: ["f-sched", cur?.elderly.id, TODAY], queryFn: () => family.schedule(me, cur!.elderly.id, [TODAY]), enabled: !!cur?.elderly.centerId });
  const notes = useQuery({ queryKey: ["notifications", me.id], queryFn: () => inbox.notifications(me) });
  if (rel.isLoading) return <Page title="Trang chủ"><Loading /></Page>;
  if (!list.length) return (
    <Page title={`Xin chào, ${me.fullName.split(" ").slice(-2).join(" ")}`}>
      <Card><EmptyState icon={Users} title="Chưa có người thân nào" desc="Thêm hồ sơ người cao tuổi để chọn trung tâm, đăng ký gói và theo dõi mỗi ngày." action={<Button icon={Plus} to="/family/relatives/new">Thêm người thân</Button>} /></Card>
    </Page>
  );
  const [tone, label] = attBadge(cur?.a);
  const now = "10:30";
  return (
    <Page title={`Xin chào, ${me.fullName.split(" ").slice(-2).join(" ")}`}>
      <div className="flex flex-wrap items-center gap-2">
        {list.map((r) => <Chip key={r.elderly.id} active={r.elderly.id === cur?.elderly.id} onClick={() => setSel(r.elderly.id)}>{title(r.elderly.gender)} {r.elderly.fullName}</Chip>)}
        <Button className="ml-auto" size="sm" variant="outline" icon={Plus} to="/family/relatives/new">Thêm người thân</Button>
      </div>
      {cur && !cur.elderly.centerId ? (
        <Card><EmptyState icon={Building2} title={`${cur.elderly.fullName} chưa tham gia trung tâm`} desc={cur.reg ? "Đăng ký đang chờ trung tâm duyệt." : "Chọn trung tâm và gói dịch vụ để bắt đầu."} action={<Button to="/family/centers">Tìm trung tâm</Button>} /></Card>
      ) : cur && (
        <>
          <div className="rounded-xl bg-gradient-to-br from-navy to-blue p-4 text-white">
            <div className="flex items-center gap-3">
              <CircleCheck size={28} className={tone === "green" ? "text-[#7ee2a8]" : "text-white/70"} />
              <div>
                <div className="text-[15px] font-bold">{title(cur.elderly.gender)} {cur.elderly.fullName.split(" ").pop()} {cur.a?.status === "PRESENT" ? "đang ở trung tâm" : label.toLowerCase()}</div>
                <div className="text-[11.5px] text-[#c9d4ec]">{cur.a?.checkIn ? `Đến lúc ${cur.a.checkIn}` : "Chưa check-in"}{cur.a?.checkOut ? ` · về lúc ${cur.a.checkOut}` : ""} · Nhân viên phụ trách: {cur.staff?.fullName ?? "—"} · Gói {cur.pkg?.name} đến {dm(cur.reg?.endDate)}</div>
              </div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Lịch hôm nay">
              {sched.data?.items.map((i) => <div key={i.id} className="flex items-center gap-2 py-1.5 text-[12.5px]"><span className="w-11 text-subtle">{i.startTime}</span><span className="flex-1">{i.service.name}</span><Badge tone={i.endTime <= now ? "green" : i.startTime <= now ? "orange" : "blue"}>{i.endTime <= now ? "Xong" : i.startTime <= now ? "Đang diễn ra" : "Sắp tới"}</Badge></div>)}
              <div className="mt-2 border-t border-line-soft pt-2 text-[12.5px]"><b className="text-navy">Bữa trưa</b><div className="text-muted">{sched.data?.menus[0]?.lunch}</div></div>
            </Card>
            <Card title="Nhật ký mới nhất" actions={<Button size="sm" variant="outline" to={`/family/care-log?e=${cur.elderly.id}`}>Xem</Button>}>
              {log.data ? (
                <>
                  <div className="text-[13px] font-bold text-navy">Tình trạng: {{ GOOD: "Tốt", NORMAL: "Bình thường", TIRED: "Mệt" }[log.data.log.generalCondition]}</div>
                  <div className="text-[12px] text-muted">Ăn trưa {log.data.log.lunch ?? "—"} · {log.data.services.filter((s) => s.status === "DONE").length} hoạt động · {log.data.photos.length} ảnh</div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">{log.data.photos.slice(0, 3).map((p) => <Photo key={p.id} tone={p.tone} />)}</div>
                </>
              ) : <div className="text-[12.5px] text-subtle">Nhân viên chưa cập nhật nhật ký hôm nay.</div>}
            </Card>
            <Card title="Thông báo" actions={<Link to="/family/notifications" className="text-[11.5px] font-semibold text-orange">Tất cả</Link>}>
              <ul className="space-y-1.5 text-[12px] text-muted">{notes.data?.slice(0, 5).map((n) => <li key={n.id} className={cn(!n.isRead && "font-semibold text-ink")}>• {n.title}</li>)}</ul>
            </Card>
          </div>
        </>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ FW-03 relatives + absence
export function RelativesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const rel = useRelatives();
  const [sel, setSel] = useState<number>();
  const [absent, setAbsent] = useState(false);
  const [ab, setAb] = useState({ fromDate: addDays(TODAY, 4), toDate: addDays(TODAY, 5), reason: "Ốm", note: "" });
  const list = rel.data ?? [];
  const cur = list.find((r) => r.elderly.id === sel) ?? list[0];
  const send = useMutation({ mutationFn: () => family.absence(me, { elderlyId: cur!.elderly.id, ...ab }), onSuccess: () => { setAbsent(false); qc.invalidateQueries(); } });
  return (
    <Page title={`Người thân của tôi (${list.length})`}>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <Button block icon={Plus} to="/family/relatives/new">Thêm người thân</Button>
          <div className="mt-3 space-y-2">
            {list.map((r) => (
              <button key={r.elderly.id} onClick={() => setSel(r.elderly.id)} className={cn("flex w-full items-center gap-2.5 rounded-[10px] border px-3 py-2 text-left", cur?.elderly.id === r.elderly.id ? "border-[2px] border-orange" : "border-line")}>
                <Avatar name={r.elderly.fullName} size={32} />
                <span><span className="block text-[12.5px] font-semibold text-navy">{title(r.elderly.gender)} {r.elderly.fullName}</span><span className="text-[11px] text-subtle">{age(r.elderly.dateOfBirth)} tuổi · {r.center?.name.replace("Day-Care ", "") ?? "chưa chọn gói"}</span></span>
              </button>
            ))}
          </div>
        </Card>
        {cur && (
          <Card title={`${title(cur.elderly.gender)} ${cur.elderly.fullName}`} actions={<><Badge tone={cur.reg ? regBadge[cur.reg.status][0] : "orange"}>{cur.reg ? regBadge[cur.reg.status][1] : "Chưa đăng ký"}</Badge><Button size="sm" variant="outline" to={`/family/relatives/${cur.elderly.id}`}>Sửa hồ sơ</Button></>}>
            <div className="grid gap-x-6 sm:grid-cols-2">
              <KV label="Ngày sinh" w={110}>{dmy(cur.elderly.dateOfBirth)} · {cur.elderly.gender}</KV>
              <KV label="Địa chỉ" w={110}>{cur.elderly.address}</KV>
              <KV label="Khẩn cấp" w={110}>{cur.elderly.emergencyContactName} · {cur.elderly.emergencyContactRelationship}</KV>
              <KV label="SĐT khẩn cấp" w={110}>{cur.elderly.emergencyContactPhone}</KV>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">{cur.elderly.healthTags.map((t) => <Badge key={t} tone="red">{t}</Badge>)}</div>
            <p className="mt-1.5 text-[12px] text-muted">{cur.elderly.careNote}</p>
            <div className="mt-3 rounded-xl bg-canvas p-3">
              <div className="text-[11px] text-subtle">Gói hiện tại</div>
              {cur.pkg ? <div className="flex flex-wrap items-center gap-2"><b className="text-navy">{cur.pkg.name} · {cur.center?.name}</b><span className="text-[12px] text-muted">{dmy(cur.reg?.startDate)} – {dmy(cur.reg?.endDate)}</span><Button size="sm" to={`/family/package/${cur.pkg.id}`}>Xem gói</Button></div> : <Button size="sm" to="/family/centers">Tìm trung tâm & chọn gói</Button>}
            </div>
            {cur.elderly.centerId && <Button className="mt-3" variant="outline" icon={CalendarX} onClick={() => setAbsent(true)}>Báo nghỉ</Button>}
          </Card>
        )}
      </div>
      <Modal open={absent} onClose={() => setAbsent(false)} title="Báo nghỉ" footer={<><Button variant="neutral" onClick={() => setAbsent(false)}>Huỷ</Button><Button loading={send.isPending} onClick={() => send.mutate()}>Gửi báo nghỉ</Button></>}>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2"><Field label="Từ ngày" type="date" value={ab.fromDate} onChange={(e) => setAb({ ...ab, fromDate: e.target.value })} /><Field label="Đến ngày" type="date" value={ab.toDate} onChange={(e) => setAb({ ...ab, toDate: e.target.value })} /></div>
          <div className="flex flex-wrap gap-1.5">{["Ốm", "Việc gia đình", "Đi khám", "Khác"].map((r) => <Chip key={r} active={ab.reason === r} onClick={() => setAb({ ...ab, reason: r })}>{r}</Chip>)}</div>
          <TextArea label="Ghi chú" value={ab.note} onChange={(e) => setAb({ ...ab, note: e.target.value })} />
          <Note>Trung tâm sẽ xác nhận. Giảm phí hoặc hoàn tiền do Quản lý trung tâm quyết định theo chính sách gói.</Note>
        </div>
      </Modal>
    </Page>
  );
}

export function RelativeFormPage() {
  const me = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  const id = useParams().id ? Number(useParams().id) : undefined;
  const rel = useRelatives();
  const e = rel.data?.find((r) => r.elderly.id === id)?.elderly;
  const [f, setF] = useState<Record<string, string>>({});
  const v = (k: string, d = "") => f[k] ?? d;
  const set = (k: string) => (ev: { target: { value: string } }) => setF({ ...f, [k]: ev.target.value });
  const save = useMutation({
    mutationFn: () => family.saveRelative(me, { id, fullName: v("n", e?.fullName), dateOfBirth: v("d", e?.dateOfBirth), gender: v("g", e?.gender ?? "Nữ") as "Nữ", phone: v("p", e?.phone ?? ""), address: v("a", e?.address), emergencyContactName: v("cn", e?.emergencyContactName), emergencyContactPhone: v("cp", e?.emergencyContactPhone ?? me.phone), emergencyContactRelationship: v("cr", e?.emergencyContactRelationship), careNote: v("note", e?.careNote), healthTags: v("tags", e?.healthTags.join(", ")) }),
    onSuccess: () => { qc.invalidateQueries(); nav(id ? "/family/relatives" : "/family/centers"); },
  });
  if (id && rel.isLoading) return <Page title="Hồ sơ"><Loading /></Page>;
  return (
    <Page title={id ? `Sửa hồ sơ · ${e?.fullName}` : "Thêm người thân"} back="/family/relatives">
      <Card className="max-w-3xl">
        <form className="space-y-2" onSubmit={(ev) => { ev.preventDefault(); save.mutate(); }}>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Họ và tên" className="sm:col-span-3" required defaultValue={e?.fullName} onChange={set("n")} />
            <Field label="Ngày sinh" type="date" required defaultValue={e?.dateOfBirth} onChange={set("d")} />
            <SelectField label="Giới tính" defaultValue={e?.gender ?? "Nữ"} onChange={set("g")}><option>Nữ</option><option>Nam</option></SelectField>
            <Field label="Số điện thoại (nếu có)" defaultValue={e?.phone} onChange={set("p")} />
            <Field label="Địa chỉ" className="sm:col-span-3" required defaultValue={e?.address} onChange={set("a")} />
            <Field label="Bệnh lý / dị ứng (phân cách dấu phẩy)" className="sm:col-span-3" defaultValue={e?.healthTags.join(", ")} onChange={set("tags")} />
          </div>
          <TextArea label="Ghi chú chăm sóc" defaultValue={e?.careNote} onChange={set("note")} />
          <div className="pt-1 text-[12.5px] font-semibold text-navy">Liên hệ khẩn cấp</div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Họ tên" required defaultValue={e?.emergencyContactName} onChange={set("cn")} />
            <Field label="Quan hệ" required defaultValue={e?.emergencyContactRelationship} onChange={set("cr")} />
            <Field label="Số điện thoại" required defaultValue={e?.emergencyContactPhone ?? me.phone} onChange={set("cp")} />
          </div>
          <ErrorText error={save.error} />
          <div className="flex gap-2 pt-2"><Button type="submit" loading={save.isPending}>{id ? "Lưu hồ sơ" : "Tiếp tục · chọn trung tâm"}</Button><Button type="button" variant="neutral" onClick={() => nav(-1)}>Huỷ</Button></div>
        </form>
      </Card>
    </Page>
  );
}

// ------------------------------------------------------------------ FW-04 find centre
export function FindCentersPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["f-centers", q], queryFn: () => family.centers(q) });
  return (
    <Page title="Tìm trung tâm">
      <Field label="Tìm theo tên trung tâm hoặc quận / huyện" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Vd: Q.7, Bình An…" />
      {isLoading ? <Loading /> : (
        <div className="space-y-3">
          {data?.map((c) => (
            <Card key={c.center.id}>
              <div className="flex flex-wrap items-center gap-3">
                <IconCircle icon={Building2} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-navy">{c.center.name}</div>
                  <div className="flex items-center gap-1 text-[12px] text-muted"><MapPin size={12} />{c.center.address} · <Phone size={12} />{c.center.phone}</div>
                  <div className="mt-1 flex flex-wrap gap-1">{c.highlights.map((h) => <Badge key={h}>{h}</Badge>)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold text-orange">{c.packages} gói · từ {vnd(c.from?.price ?? 0)}/{c.from?.billingPeriod === "DAILY" ? "ngày" : "tháng"}</div>
                  <Button className="mt-1.5" size="sm" to={`/family/centers/${c.center.id}`}>Xem các gói ›</Button>
                </div>
              </div>
            </Card>
          ))}
          {data?.length === 0 && <Card><EmptyState icon={Building2} title="Không tìm thấy trung tâm" /></Card>}
        </div>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ FW-05 centre + packages
export function CenterPackagesPage() {
  const id = Number(useParams().id);
  const { data, isLoading } = useQuery({ queryKey: ["f-center", id], queryFn: () => family.center(id) });
  if (isLoading || !data) return <Page title="Trung tâm" back="/family/centers"><Loading /></Page>;
  return (
    <Page title={data.center.name} back="/family/centers">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <IconCircle icon={Building2} size={56} />
          <div className="flex-1"><div className="text-[15px] font-bold text-navy">{data.center.name}</div><div className="text-[12px] text-muted">{data.center.address} · {data.center.phone} · {data.center.email}</div>{data.settings?.openingHours && <div className="text-[12px] text-muted">Giờ hoạt động: {data.settings.openingHours}</div>}</div>
          <Badge tone="green">Đang hoạt động</Badge>
        </div>
      </Card>
      <div className="text-[13px] font-bold text-navy">Chọn gói dịch vụ</div>
      <div className="grid gap-4 md:grid-cols-3">
        {data.packages.map(({ pkg, services }) => {
          const hot = services.length === Math.max(...data.packages.map((p) => p.services.length));
          return (
            <Card key={pkg.id} className={cn("flex flex-col", hot && "ring-2 ring-orange")} bodyClass="flex flex-1 flex-col">
              <div className="flex items-center justify-between"><div className="text-[14px] font-bold text-navy">{pkg.name}</div>{hot && <Badge tone="orange">Nhiều dịch vụ nhất</Badge>}</div>
              <div className="mt-1"><span className="text-[20px] font-bold text-orange">{vnd(pkg.price)}</span> <span className="text-[11px] text-subtle">/ {pkg.billingPeriod === "DAILY" ? "ngày" : "tháng"}</span></div>
              <div className="text-[11px] text-subtle">{services.length} dịch vụ & hoạt động</div>
              <ul className="mt-2 flex-1 space-y-1 text-[12px] text-muted">{services.slice(0, 5).map((s) => <li key={s.id}>✓ {s.name}</li>)}</ul>
              <Button className="mt-3" block variant={hot ? "primary" : "outline"} to={`/family/package/${pkg.id}`}>Xem chi tiết gói</Button>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ FW-06 package detail + register
export function PackageDetailPage() {
  const me = useMe();
  const nav = useNavigate();
  const id = Number(useParams().id);
  const { data, isLoading } = useQuery({ queryKey: ["f-pkg", id], queryFn: () => family.packageDetail(id) });
  const rel = useRelatives();
  const [eid, setEid] = useState<number>();
  const [start, setStart] = useState("2026-11-01");
  const [months, setMonths] = useState(1);
  const reg = useMutation({ mutationFn: () => family.register(me, { elderlyId: eid ?? rel.data![0].elderly.id, packageId: id, startDate: start, months }), onSuccess: (invoiceId) => nav(`/family/checkout/${invoiceId}`) });
  if (isLoading || !data) return <Page title="Chi tiết gói"><Loading /></Page>;
  const { pkg } = data;
  return (
    <Page title={`${data.center.name.replace("Day-Care ", "")} › ${pkg.name}`} back={`/family/centers/${data.center.id}`}>
      <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
        <div className="space-y-4">
          <div className="rounded-xl bg-gradient-to-br from-navy to-blue p-5 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="text-[20px] font-bold">{pkg.name}</div><div className="mt-1 max-w-lg text-[12px] text-[#c9d4ec]">{pkg.description}</div></div>
              <div className="text-right"><div className="text-[24px] font-bold text-[#ffd2b5]">{vnd(pkg.price)}</div><div className="text-[11px] text-[#c9d4ec]">thanh toán theo {pkg.billingPeriod === "DAILY" ? "ngày" : "tháng"}</div></div>
            </div>
          </div>
          <Card title={`Gói bao gồm ${data.services.length} dịch vụ & hoạt động`}>
            <div className="grid gap-4 sm:grid-cols-3">
              {(["ACTIVITY", "MEAL", "SERVICE"] as const).map((t) => (
                <div key={t}><div className="text-[12.5px] font-bold text-navy">{TYPE_LABEL[t]} ({data.services.filter((s) => s.type === t).length})</div><ul className="mt-1.5 space-y-1 text-[12px] text-muted">{data.services.filter((s) => s.type === t).map((s) => <li key={s.id} title={s.description}>✓ {s.name}</li>)}</ul></div>
              ))}
            </div>
            <div className="mt-4 border-t border-line-soft pt-3 text-[12.5px] font-bold text-navy">Lịch hoạt động mẫu trong tuần</div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {data.week.map((w) => <div key={w.date} className="rounded-lg bg-canvas p-2 text-center"><div className="text-[10.5px] text-subtle">{weekday(w.date)}</div>{w.items.map((s, i) => <div key={i} className={cn("text-[11px]", data.services.some((x) => x.id === s.id) ? "text-ink" : "text-faint line-through")}>{s.name}</div>)}</div>)}
            </div>
            <div className="mt-1.5 text-[11px] text-subtle">Lịch cụ thể do trung tâm cập nhật hằng tuần. Hoạt động gạch ngang không có trong gói này.</div>
          </Card>
        </div>
        <Card title="Đăng ký gói này" className="h-fit">
          {rel.data?.length ? (
            <div className="space-y-2">
              <SelectField label="Người thân" value={eid ?? rel.data[0].elderly.id} onChange={(e) => setEid(Number(e.target.value))}>{rel.data.map((r) => <option key={r.elderly.id} value={r.elderly.id}>{title(r.elderly.gender)} {r.elderly.fullName}</option>)}</SelectField>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Bắt đầu" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                <SelectField label={pkg.billingPeriod === "DAILY" ? "Số ngày" : "Thời hạn"} value={months} onChange={(e) => setMonths(Number(e.target.value))}>{[1, 2, 3, 6].map((n) => <option key={n} value={n}>{n} {pkg.billingPeriod === "DAILY" ? "ngày" : "tháng"}</option>)}</SelectField>
              </div>
              <KV label="Tạm tính" w={70}><span className="text-orange">{vnd(pkg.price * months)}</span></KV>
              <div className="text-[11px] text-subtle">Phí đăng ký và giảm giá (nếu có) hiện ở bước thanh toán.</div>
              <ErrorText error={reg.error} />
              <Button block loading={reg.isPending} onClick={() => reg.mutate()}>Đăng ký & thanh toán</Button>
              <Button block variant="neutral" to={`/family/centers/${data.center.id}`}>So sánh với gói khác</Button>
            </div>
          ) : <Button block icon={Plus} to="/family/relatives/new">Thêm người thân trước</Button>}
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ FW-07 checkout (+ FW-15 failure)
export function CheckoutPage() {
  const me = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  const id = Number(useParams().id);
  const { data, isLoading, error } = useQuery({ queryKey: ["invoice", id], queryFn: () => family.invoice(me, id) });
  const [method, setMethod] = useState<PaymentMethod>("VNPAY");
  const [simulateFail, setFail] = useState(false);
  const [failed, setFailed] = useState(false);
  const pay = useMutation({ mutationFn: () => family.pay(me, id, method, simulateFail), onSuccess: (r) => { qc.invalidateQueries(); if (r.ok) nav(`/family/packages?paid=${id}`); else setFailed(true); } });
  if (isLoading) return <Page title="Thanh toán"><Loading /></Page>;
  if (!data) return <Page title="Thanh toán"><ErrorText error={error} /></Page>;
  const inv = data.invoice;
  if (failed) return (
    <Page title="Kết quả thanh toán">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-7 text-center shadow-sm">
        <IconCircle icon={CircleAlert} tone="red" size={72} />
        <div className="mt-3 text-[19px] font-bold text-navy">Thanh toán không thành công</div>
        <p className="mt-1 text-[12.5px] text-muted">{method === "VNPAY" ? "VNPay" : "MoMo"} báo giao dịch bị huỷ hoặc hết thời gian. Bạn chưa bị trừ tiền.</p>
        <div className="mt-3 rounded-xl bg-canvas p-3 text-left"><KV label="Số tiền" w={90}>{vnd(inv.total)}</KV><KV label="Mã hoá đơn" w={90}>{inv.number}</KV><KV label="Lý do" w={90}>Người dùng huỷ giao dịch (mã 24)</KV></div>
        <div className="mt-4 flex justify-center gap-2">
          <Button icon={RefreshCw} onClick={() => { setFailed(false); setFail(false); }}>Thử lại</Button>
          <Button variant="neutral" icon={Wallet} onClick={() => { setFailed(false); setFail(false); setMethod(method === "VNPAY" ? "MOMO" : "VNPAY"); }}>Đổi sang {method === "VNPAY" ? "MoMo" : "VNPay"}</Button>
        </div>
        <Link to="/family/packages" className="mt-3 inline-block text-[12px] font-semibold text-orange">Về Gói của tôi</Link>
      </div>
    </Page>
  );
  if (inv.status === "PAID") return <Page title="Thanh toán"><Note tone="green">Hoá đơn {inv.number} đã được thanh toán. <Link className="font-semibold" to={`/family/invoices/${inv.id}`}>Xem hoá đơn</Link></Note></Page>;
  return (
    <Page title="Thanh toán">
      <div className="flex flex-wrap gap-1.5"><Badge tone="green">✓ 1. Chọn gói</Badge><Badge tone="orange">2. Xác nhận & thanh toán</Badge><Badge>3. Hoá đơn</Badge></div>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Card title="Thông tin đăng ký">
            <KV label="Người thân">{data.elderly.fullName}</KV>
            <KV label="Trung tâm">{data.center?.name}</KV>
            <KV label="Gói"><Link className="text-blue hover:underline" to={`/family/package/${data.pkg.id}`}>{data.pkg.name}</Link></KV>
            <KV label="Thời gian">{dmy(data.reg.startDate)} – {dmy(data.reg.endDate)}</KV>
          </Card>
          <Card title="Phương thức thanh toán">
            <div className="grid gap-2 sm:grid-cols-2">
              {([["VNPAY", "VNPay", Landmark], ["MOMO", "Ví MoMo", Wallet]] as const).map(([v, l, I]) => (
                <button key={v} onClick={() => setMethod(v)} className={cn("flex items-center gap-2 rounded-xl border px-4 py-3 text-left font-bold", method === v ? "border-[2px] border-orange" : "border-line")}><I size={18} className="text-blue" />{l}<span className={cn("ml-auto size-3.5 rounded-full border-2", method === v ? "border-orange bg-orange" : "border-[#c9d0df]")} /></button>
              ))}
            </div>
            <div className="mt-2 text-[11.5px] text-subtle">Tiền được chuyển vào tài khoản của {data.center?.name}.</div>
            <div className="mt-3 rounded-lg bg-canvas p-2"><Toggle checked={simulateFail} onChange={setFail} label="Demo: giả lập giao dịch thất bại" sub="Chỉ dùng để trình diễn luồng lỗi" /></div>
          </Card>
        </div>
        <Card title="Hoá đơn tạm tính" className="h-fit">
          <KV label="Tạm tính" w={110}>{vnd(inv.subtotal)}</KV>
          <KV label="Giảm giá" w={110}>{vnd(inv.discount)}</KV>
          <KV label="Phí đăng ký" w={110}>{vnd(inv.additionalCharge)}</KV>
          <div className="mt-2 flex items-center justify-between border-t border-line-soft pt-2"><b>Tổng cộng</b><span className="text-[20px] font-bold text-orange">{vnd(inv.total)}</span></div>
          <Button className="mt-4" size="lg" block loading={pay.isPending} onClick={() => pay.mutate()}>Thanh toán {vnd(inv.total)}</Button>
          <div className="mt-1.5 text-center text-[11px] text-subtle">{pay.isPending ? `Đang chuyển sang cổng ${method === "VNPAY" ? "VNPay" : "MoMo"}…` : `Bạn sẽ được chuyển sang cổng ${method === "VNPAY" ? "VNPay" : "MoMo"}`}</div>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ FW-08 my packages, invoices, refund
export function MyPackagesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const regs = useQuery({ queryKey: ["f-regs"], queryFn: () => family.registrations(me) });
  const invs = useQuery({ queryKey: ["f-invs"], queryFn: () => family.invoices(me) });
  const refundFor = Number(sp.get("refund")) || undefined;
  const target = invs.data?.find((i) => i.payment?.id === refundFor);
  const [amount, setAmount] = useState("250000");
  const [reason, setReason] = useState("");
  const req = useMutation({ mutationFn: () => family.requestRefund(me, refundFor!, Number(amount), reason), onSuccess: () => { setSp({}); qc.invalidateQueries(); } });
  return (
    <Page title="Gói của tôi & hoá đơn">
      {sp.get("paid") && <Note tone="green">Thanh toán thành công! Trung tâm sẽ duyệt đăng ký và thông báo cho bạn. <Link className="font-semibold" to={`/family/invoices/${sp.get("paid")}`}>Xem hoá đơn điện tử</Link></Note>}
      {req.isSuccess && <Note tone="green">Đã gửi yêu cầu hoàn tiền tới Quản lý trung tâm.</Note>}
      <Card title="Gói đã đăng ký">
        {regs.isLoading ? <Loading /> : (
          <Table rows={regs.data ?? []} rowKey={(r) => r.reg.id} columns={[
            { key: "e", header: "Người thân", render: (r) => <span className="flex items-center gap-2"><Avatar name={r.elderly.fullName} size={24} />{r.elderly.fullName}</span> },
            { key: "p", header: "Gói", render: (r) => r.pkg.name },
            { key: "c", header: "Trung tâm", render: (r) => r.center?.name.replace("Day-Care ", "") },
            { key: "t", header: "Thời gian", render: (r) => `${dm(r.reg.startDate)} – ${dmy(r.reg.endDate)}` },
            { key: "s", header: "Trạng thái", render: (r) => <Badge tone={regBadge[r.reg.status][0]}>{regBadge[r.reg.status][1]}</Badge> },
            { key: "a", header: "", render: (r) => <span className="flex gap-1.5"><Button size="sm" variant="outline" to={`/family/package/${r.pkg.id}`}>Xem gói</Button>{r.reg.status === "ACTIVE" && <Button size="sm" to={`/family/package/${r.pkg.id}`}>Gia hạn / đổi gói</Button>}</span> },
          ]} />
        )}
      </Card>
      <Card title="Hoá đơn & thanh toán">
        {invs.isLoading ? <Loading /> : (
          <Table rows={invs.data ?? []} rowKey={(i) => i.invoice.id} columns={[
            { key: "n", header: "Số hoá đơn", render: (i) => <Link className="text-blue hover:underline" to={`/family/invoices/${i.invoice.id}`}>{i.invoice.number}</Link> },
            { key: "d", header: "Ngày", render: (i) => dmy(i.invoice.issueDate) },
            { key: "t", header: "Tổng tiền", render: (i) => vnd(i.invoice.total) },
            { key: "m", header: "Phương thức", render: (i) => (i.payment ? (i.payment.method === "VNPAY" ? "VNPay" : "MoMo") : "—") },
            { key: "s", header: "Trạng thái", render: (i) => i.refunds.some((r) => r.status === "APPROVED") ? <Badge>Đã hoàn {vnd(i.refunds.filter((r) => r.status === "APPROVED").reduce((s, r) => s + r.amount, 0))}</Badge> : i.refunds.some((r) => r.status === "REQUESTED") ? <Badge tone="orange">Chờ hoàn tiền</Badge> : <Badge tone={i.invoice.status === "PAID" ? "green" : "orange"}>{i.invoice.status === "PAID" ? "Đã thanh toán" : "Chưa thanh toán"}</Badge> },
            { key: "a", header: "", render: (i) => i.invoice.status === "UNPAID" ? <Button size="sm" to={`/family/checkout/${i.invoice.id}`}>Thanh toán</Button> : <span className="flex gap-1.5"><Button size="sm" variant="outline" to={`/family/invoices/${i.invoice.id}`}>Chi tiết</Button>{i.payment && !i.refunds.some((r) => r.status === "REQUESTED") && <Button size="sm" variant="danger" icon={Undo2} onClick={() => setSp({ refund: String(i.payment!.id) })}>Hoàn tiền</Button>}</span> },
          ]} />
        )}
        <Note className="mt-3">Yêu cầu hoàn tiền được gửi tới Quản lý trung tâm xem xét; tiền hoàn về ví gốc qua cổng thanh toán.</Note>
      </Card>
      <Modal open={!!refundFor && !!target} onClose={() => setSp({})} title="Yêu cầu hoàn tiền" footer={<><Button variant="neutral" onClick={() => setSp({})}>Huỷ</Button><Button loading={req.isPending} disabled={!reason} onClick={() => req.mutate()}>Gửi yêu cầu</Button></>}>
        {target && (
          <div className="space-y-2">
            <Field label="Giao dịch cần hoàn" value={`${target.invoice.number} · ${vnd(target.payment!.amount)}`} readOnly />
            <Field label="Số tiền đề nghị (VNĐ)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <TextArea label="Lý do" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Vd: Bà nghỉ ốm 2 ngày, đề nghị hoàn phí theo ngày." />
            <Note>Yêu cầu được gửi tới Quản lý trung tâm. Nếu được duyệt, tiền hoàn về ví gốc qua cổng thanh toán.</Note>
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ FW-09 care log
export function FamilyCareLogPage() {
  const me = useMe();
  const [sp, setSp] = useSearchParams();
  const rel = useRelatives();
  const enrolled = (rel.data ?? []).filter((r) => r.elderly.centerId);
  const eid = Number(sp.get("e")) || enrolled[0]?.elderly.id;
  const [date, setDate] = useState(TODAY);
  const { data, isLoading } = useQuery({ queryKey: ["f-log", eid, date], queryFn: () => family.careLog(me, eid!, date), enabled: !!eid });
  const e = enrolled.find((r) => r.elderly.id === eid)?.elderly;
  return (
    <Page title={`Nhật ký chăm sóc${e ? ` · ${title(e.gender)} ${e.fullName}` : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        {enrolled.map((r) => <Chip key={r.elderly.id} active={r.elderly.id === eid} onClick={() => setSp({ e: String(r.elderly.id) })}>{r.elderly.fullName}</Chip>)}
        <span className="ml-auto flex items-center gap-1">
          <button className="rounded-full bg-white p-1.5 shadow-sm" onClick={() => setDate(addDays(date, -1))} aria-label="Ngày trước"><ChevronLeft size={16} /></button>
          <Chip active>{weekday(date)} {dmy(date)}</Chip>
          <button className="rounded-full bg-white p-1.5 shadow-sm disabled:opacity-40" disabled={date >= TODAY} onClick={() => setDate(addDays(date, 1))} aria-label="Ngày sau"><ChevronRight size={16} /></button>
        </span>
      </div>
      {isLoading ? <Loading /> : !data ? <Card><EmptyState icon={CalendarX} title="Chưa có nhật ký ngày này" desc="Nhân viên ghi nhật ký trong ngày người thân có mặt tại trung tâm." /></Card> : (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <Card>
              <div className="text-[14px] font-bold text-navy">Tình trạng chung: {{ GOOD: "Tốt", NORMAL: "Bình thường", TIRED: "Mệt" }[data.log.generalCondition]}</div>
              <div className="text-[12px] text-muted">Huyết áp {data.log.bloodPressure ?? "—"} · Nhiệt độ {data.log.temperature ?? "—"} · Ăn trưa {data.log.lunch ?? "—"}</div>
            </Card>
            <Card title="Dịch vụ / hoạt động đã thực hiện">
              {data.services.length === 0 ? <div className="text-[12px] text-subtle">Không có ghi nhận</div> : data.services.map((s) => <div key={s.serviceId} className="flex items-center justify-between py-1.5 text-[12.5px]"><span>{s.service.name}</span><Badge tone={s.status === "DONE" ? "green" : "gray"}>{s.status === "DONE" ? "Hoàn thành" : "Chưa tham gia"}</Badge></div>)}
            </Card>
            <Card><div className="text-[11px] text-subtle">Ghi chú của nhân viên · {data.staff?.fullName}</div><p className="mt-1 text-[12.5px]">{data.log.note}</p></Card>
          </div>
          <Card title={`Ảnh trong ngày (${data.photos.length})`} className="h-fit"><div className="grid grid-cols-2 gap-2">{data.photos.map((p) => <Photo key={p.id} tone={p.tone} caption={p.caption} />)}</div></Card>
        </div>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ FW-10 schedule & menu
export function FamilySchedulePage() {
  const me = useMe();
  const rel = useRelatives();
  const enrolled = (rel.data ?? []).filter((r) => r.elderly.centerId);
  const [eid, setEid] = useState<number>();
  const id = eid ?? enrolled[0]?.elderly.id;
  const dates = Array.from({ length: 6 }, (_, i) => addDays(CUR_WEEK, i));
  const [day, setDay] = useState(TODAY);
  const { data } = useQuery({ queryKey: ["f-week", id], queryFn: () => family.schedule(me, id!, dates), enabled: !!id });
  useEffect(() => { if (!eid && enrolled[0]) setEid(enrolled[0].elderly.id); }, [eid, enrolled]);
  const times = [...new Set((data?.items ?? []).map((i) => i.startTime))].sort();
  const menu = data?.menus.find((m) => m.date === day);
  return (
    <Page title={`Lịch hoạt động & thực đơn`}>
      <div className="flex flex-wrap items-center gap-2">
        {enrolled.map((r) => <Chip key={r.elderly.id} active={r.elderly.id === id} onClick={() => setEid(r.elderly.id)}>{r.elderly.fullName}</Chip>)}
        <span className="ml-auto flex gap-1.5"><Badge tone="green">✓ Có trong gói</Badge><Badge>Ngoài gói</Badge></span>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[11.5px]">
            <thead><tr><th className="w-14" />{dates.map((d) => <th key={d} className="px-1 py-2 text-[10.5px] font-semibold uppercase"><button className={d === day ? "text-orange" : "text-subtle"} onClick={() => setDay(d)}>{weekday(d)} {dm(d)}</button></th>)}</tr></thead>
            <tbody>
              {times.map((t) => (
                <tr key={t}><td className="py-1 text-[10.5px] text-subtle">{t}</td>{dates.map((d) => <td key={d} className="p-1">{data?.items.filter((i) => i.date === d && i.startTime === t).map((i) => <div key={i.id} className={cn("rounded-lg px-2 py-1 text-center font-semibold", i.inPackage ? "bg-green-soft text-green-ink" : "bg-[#dbe5f5] text-blue")}>{i.service.name}</div>)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title={`Thực đơn · ${weekday(day)} ${dm(day)}`}>
        {menu ? <div className="grid gap-2 sm:grid-cols-3">{([["Sáng", menu.breakfast], ["Trưa", menu.lunch], ["Xế", menu.snack]] as const).map(([l, v]) => <div key={l} className="rounded-xl bg-canvas p-3"><div className="text-[12.5px] font-bold text-navy">{l}</div><div className="text-[12px] text-muted">{v}</div></div>)}</div> : <div className="text-[12px] text-subtle">Chưa có thực đơn</div>}
        {data?.elderly.healthTags.length ? <Note className="mt-3">Hồ sơ của {data.elderly.fullName} ghi: {data.elderly.healthTags.join(", ")}. Trung tâm điều chỉnh món ăn theo hồ sơ.</Note> : null}
      </Card>
    </Page>
  );
}

// ------------------------------------------------------------------ FW-12 account (profile + notification prefs)
export function FamilyAccountExtras() {
  const [prefs, setPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("atc-noti-prefs") ?? "") as Record<string, boolean>;
    } catch {
      return { att: true, log: true, pay: true, msg: false, renew: true } as Record<string, boolean>;
    }
  });
  const set = (k: string, v: boolean) => {
    const n = { ...prefs, [k]: v };
    setPrefs(n);
    try { localStorage.setItem("atc-noti-prefs", JSON.stringify(n)); } catch { /* ignore */ }
  };
  return (
    <Card title="Thông báo">
      <div className="space-y-2.5">
        {([["att", "Đến / về trung tâm"], ["log", "Nhật ký chăm sóc"], ["pay", "Thanh toán & hoá đơn"], ["msg", "Tin nhắn mới"], ["renew", "Nhắc gia hạn gói"]] as const).map(([k, l]) => <Toggle key={k} checked={prefs[k] ?? true} onChange={(v) => set(k, v)} label={l} />)}
      </div>
    </Card>
  );
}
