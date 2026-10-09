// Family · relatives & authorized pickups, registration wizard (4.12), my packages (confirm price, pay, renew,
// upgrade, change activities, add-ons, pause/termination), checkout, invoices & credit, absence.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CalendarDays, Check, CircleCheck, CreditCard, Hourglass, Lock, Pencil, Plus, Receipt, ShieldCheck, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { family, TODAY } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { ElderlyCell, GroupBadge, ServiceTerms, SubBadge, TierBadge } from "../../components/domain";
import { Avatar, Badge, Button, Card, Chip, EmptyState, ErrorText, Field, IconCircle, KV, Loading, Modal, Note, SelectField, Table, TextArea, Toggle, cn } from "../../components/ui";
import { CYCLE_DESC, CYCLE_LABEL, CYCLES, DISEASE_GROUPS, GROUP_INFO, GROUP_LABEL, GROUPS, M3_OPTIONS, minTierFor, NOT_ACCEPTED, TIER_LABEL, TIERS, tierRank, weekdaysLabel } from "../../domain/catalog";
import { addDays, age, dm, dmy, hm, vnd, weekday } from "../../lib/format";
import type { Cycle, PaymentMethod, Service, TargetGroup, Tier } from "../../types/models";
import { INV_KIND, INV_STATUS } from "../manager/ManagerFinance";

// ------------------------------------------------------------------ relatives
export function RelativesPage() {
  const me = useMe();
  const { data, isLoading } = useQuery({ queryKey: ["f-relatives", me.id], queryFn: () => family.relatives(me) });
  return (
    <Page title="Người thân" sub="Một tài khoản quản lý nhiều cụ. Mỗi cụ có một người liên hệ chính (BR-02)." actions={<Button size="sm" icon={Plus} to="/family/relatives/new">Thêm người thân</Button>}>
      {isLoading ? <Loading /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {data?.map((r) => (
            <Card key={r.elderly.id}>
              <div className="flex items-start justify-between gap-2">
                <ElderlyCell e={r.elderly} size={44} sub={`${age(r.elderly.dateOfBirth)} tuổi · ${r.elderly.address}`} />
                <Button size="sm" variant="neutral" icon={Pencil} to={`/family/relatives/${r.elderly.id}`}>Sửa</Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">{r.elderly.targetGroup ? <GroupBadge group={r.elderly.targetGroup} /> : <Badge tone="gray">Khai: {GROUP_LABEL[r.elderly.declaredGroup]}</Badge>}<TierBadge tier={r.sub?.tier} /><SubBadge status={r.sub?.status} /></div>
              <div className="mt-2 text-[12px] text-muted">Người được phép đón: {r.pickups.map((p) => p.fullName).join(", ")}</div>
              {r.sub?.status === "PENDING_ASSESSMENT" && r.assessment?.status === "SCHEDULED" && <Note className="mt-2">Lịch đánh giá: {dmy(r.assessment.scheduledAt.slice(0, 10))} lúc {hm(r.assessment.scheduledAt)} tại phòng y tế.</Note>}
              {!r.sub && r.elderly.status !== "TERMINATED" && <Button className="mt-2" size="sm" to={`/family/register?e=${r.elderly.id}`}>Đăng ký gói</Button>}
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}

export function RelativeFormPage() {
  const me = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  const id = useParams().id ? Number(useParams().id) : undefined;
  const { data } = useQuery({ queryKey: ["f-rel", id], queryFn: () => family.relative(me, id!), enabled: !!id });
  const e = data?.elderly;
  const [f, setF] = useState<Record<string, string>>({});
  const [pk, setPk] = useState<{ id?: number; fullName: string; relationship: string; phone: string; idLast4: string; isPrimary: boolean } | null>(null);
  const v = (k: string, d = "") => f[k] ?? d;
  const save = useMutation({
    mutationFn: () => family.saveRelative(me, { id, fullName: v("fullName", e?.fullName), dateOfBirth: v("dob", e?.dateOfBirth), gender: v("gender", e?.gender ?? "Nữ") as "Nam", address: v("address", e?.address), phone: v("phone", e?.phone ?? ""), declaredGroup: v("group", e?.declaredGroup ?? "MOBILE") as TargetGroup, conditions: v("cond", e?.conditions.join(", ")).split(",").map((x) => x.trim()).filter(Boolean), allergies: v("all", e?.allergies.join(", ")).split(",").map((x) => x.trim()).filter(Boolean), diet: v("diet", e?.diet), hobbies: v("hob", e?.hobbies), careNote: v("note", e?.careNote) }),
    onSuccess: (nid) => { qc.invalidateQueries(); nav(id ? "/family/relatives" : `/family/register?e=${nid}`); },
  });
  const savePk = useMutation({ mutationFn: () => family.savePickup(me, { ...pk!, elderlyId: id! }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["f-rel", id] }); setPk(null); } });
  const rmPk = useMutation({ mutationFn: (pid: number) => family.removePickup(me, pid), onSuccess: () => qc.invalidateQueries({ queryKey: ["f-rel", id] }) });
  if (id && !e) return <Page title="Người thân"><Loading /></Page>;
  const locked = !!e?.targetGroup;
  return (
    <Page title={id ? `Hồ sơ · ${e?.fullName}` : "Thêm người thân"} back="/family/relatives">
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card title="Thông tin cụ">
          <form className="grid gap-2 sm:grid-cols-2" onSubmit={(ev) => { ev.preventDefault(); save.mutate(); }}>
            <Field label="Họ và tên" required defaultValue={e?.fullName} onChange={(ev) => setF({ ...f, fullName: ev.target.value })} />
            <Field label="Ngày sinh" type="date" required defaultValue={e?.dateOfBirth} onChange={(ev) => setF({ ...f, dob: ev.target.value })} />
            <SelectField label="Giới tính" defaultValue={e?.gender ?? "Nữ"} onChange={(ev) => setF({ ...f, gender: ev.target.value })}><option>Nữ</option><option>Nam</option></SelectField>
            <Field label="Số điện thoại cụ (nếu có)" defaultValue={e?.phone} onChange={(ev) => setF({ ...f, phone: ev.target.value })} />
            <Field label="Địa chỉ" className="sm:col-span-2" required defaultValue={e?.address} onChange={(ev) => setF({ ...f, address: ev.target.value })} />
            <SelectField label={locked ? "Đối tượng (đã đánh giá — khóa)" : "Tự khai mức độ"} className="sm:col-span-2" disabled={locked} defaultValue={e?.targetGroup ?? e?.declaredGroup ?? "MOBILE"} onChange={(ev) => setF({ ...f, group: ev.target.value })}>{GROUPS.map((g) => <option key={g} value={g}>{GROUP_LABEL[g]} — {GROUP_INFO[g].who}</option>)}</SelectField>
            <Field label="Bệnh nền (phẩy)" defaultValue={e?.conditions.join(", ")} onChange={(ev) => setF({ ...f, cond: ev.target.value })} />
            <Field label="Dị ứng (phẩy)" defaultValue={e?.allergies.join(", ")} onChange={(ev) => setF({ ...f, all: ev.target.value })} />
            <Field label="Chế độ ăn" defaultValue={e?.diet} onChange={(ev) => setF({ ...f, diet: ev.target.value })} />
            <Field label="Sở thích" defaultValue={e?.hobbies} onChange={(ev) => setF({ ...f, hob: ev.target.value })} />
            <TextArea label="Ghi chú cho trung tâm" className="sm:col-span-2" defaultValue={e?.careNote} onChange={(ev) => setF({ ...f, note: ev.target.value })} />
            <Note tone="red" className="sm:col-span-2">Trung tâm không nhận: {NOT_ACCEPTED.join("; ")}.</Note>
            <ErrorText error={save.error} />
            <Button type="submit" className="sm:col-span-2" loading={save.isPending}>{id ? "Lưu" : "Lưu & đăng ký gói"}</Button>
          </form>
        </Card>
        {id && (
          <Card title="Người được phép đón" actions={<Button size="sm" variant="outline" icon={Plus} onClick={() => setPk({ fullName: "", relationship: "", phone: "", idLast4: "", isPrimary: false })}>Thêm</Button>}>
            {data?.pickups.map((p) => (
              <div key={p.id} className="flex items-center gap-2 border-b border-line-soft py-2 last:border-0">
                <Avatar name={p.fullName} size={32} />
                <span className="flex-1 text-[12.5px]"><b className="text-navy">{p.fullName}</b>{p.isPrimary && <Badge tone="blue" className="ml-1">Liên hệ chính</Badge>}<span className="block text-subtle">{p.relationship} · {p.phone} · CCCD …{p.idLast4}</span></span>
                <button onClick={() => setPk({ ...p })} className="text-subtle hover:text-orange" aria-label="Sửa"><Pencil size={14} /></button>
                <button onClick={() => rmPk.mutate(p.id)} className="text-subtle hover:text-red-ink" aria-label="Xóa"><Trash2 size={14} /></button>
              </div>
            ))}
            <ErrorText error={rmPk.error} />
            <Note className="mt-2">Nhân viên chỉ giao cụ cho người trong danh sách, đối chiếu ảnh và 4 số cuối CCCD (BR-30).</Note>
          </Card>
        )}
      </div>
      <Modal open={!!pk} onClose={() => setPk(null)} title={pk?.id ? "Sửa người đón" : "Thêm người được phép đón"} footer={<><Button variant="neutral" onClick={() => setPk(null)}>Hủy</Button><Button loading={savePk.isPending} onClick={() => savePk.mutate()}>Lưu</Button></>}>
        {pk && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Họ tên" value={pk.fullName} onChange={(ev) => setPk({ ...pk, fullName: ev.target.value })} />
            <Field label="Quan hệ" value={pk.relationship} onChange={(ev) => setPk({ ...pk, relationship: ev.target.value })} />
            <Field label="Số điện thoại" value={pk.phone} onChange={(ev) => setPk({ ...pk, phone: ev.target.value })} />
            <Field label="4 số cuối CCCD" maxLength={4} value={pk.idLast4} onChange={(ev) => setPk({ ...pk, idLast4: ev.target.value })} />
            <Button variant="neutral" size="sm" className="sm:col-span-2">+ Tải ảnh chân dung</Button>
            <div className="sm:col-span-2"><Toggle checked={pk.isPrimary} onChange={(x) => setPk({ ...pk, isPrimary: x })} label="Người liên hệ chính" /></div>
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ registration wizard (4.12)
const STEPS = ["Chọn cụ", "Thời hạn", "Đối tượng", "Hạng & dịch vụ", "Tóm tắt"];
const dayOptions = () => Array.from({ length: 16 }, (_, i) => addDays(TODAY, i + 1)).filter((d) => new Date(d + "T00:00:00").getDay() !== 0);
export function RegisterWizard() {
  const me = useMe();
  const qc = useQueryClient();
  const [sp] = useSearchParams();
  const { data, isLoading } = useQuery({ queryKey: ["f-reg-opts", me.id], queryFn: () => family.registerOptions(me) });
  const [step, setStep] = useState(0);
  const [eid, setEid] = useState<number | undefined>(sp.get("e") ? Number(sp.get("e")) : undefined);
  const [cycle, setCycle] = useState<Cycle>("MONTH");
  const [weekdays, setWeekdays] = useState(M3_OPTIONS[0]);
  const [dayDates, setDayDates] = useState<string[]>([]);
  const [start, setStart] = useState("2026-10-12");
  const [group, setGroup] = useState<TargetGroup>("MOBILE");
  const [tier, setTier] = useState<Tier>("STANDARD");
  const [choices, setChoices] = useState<number[]>([]);
  const [addons, setAddons] = useState<Record<number, number>>({});
  const [ack, setAck] = useState(false);
  const [commit, setCommit] = useState(false);
  const nav = useNavigate();
  const submit = useMutation({ onSuccess: (r) => { qc.invalidateQueries(); if (r.invoiceId) nav(`/family/checkout/${r.invoiceId}`); }, mutationFn: () => family.register(me, { commit, elderlyId: eid!, cycle, group, tier, choiceIds: choices, addOns: Object.entries(addons).filter(([, q]) => q > 0).map(([k, q]) => ({ serviceId: Number(k), quantity: q })), startDate: start, weekdays: cycle === "M3" ? weekdays : undefined, dayDates: cycle === "DAY" ? dayDates : undefined }) });
  const wait = useMutation({ mutationFn: () => family.joinWaitlist(me, eid!, tier), onSuccess: () => qc.invalidateQueries() });
  if (isLoading || !data) return <Page title="Đăng ký gói"><Loading /></Page>;
  const el = data.elderly.find((x) => x.elderly.id === eid);
  const g = el?.elderly.targetGroup ?? group;
  const ent = data.entitlements.find((x) => x.tier === tier)!;
  const pkg = data.packages.find((p) => p.tier === tier && p.cycle === cycle);
  const cap = data.capacity.find((c) => c.tier === tier)!;
  const disease = DISEASE_GROUPS.includes(g);
  const svc = (k: Service["kind"]) => data.services.filter((s) => s.kind === k);
  const base = pkg ? (cycle === "DAY" ? pkg.basePrice * Math.max(1, dayDates.length) : pkg.basePrice) : 0;
  const monthlyOf = (x: TargetGroup) => data.surcharges.find((s) => s.group === x)?.monthly ?? 0;
  const surcharge = !monthlyOf(g) ? 0 : cycle === "DAY" ? Math.round(monthlyOf(g) / 26 / 1000) * 1000 * Math.max(1, dayDates.length) : monthlyOf(g) * (cycle === "Q" ? 3 : cycle === "Y" ? 12 : 1);
  const addonTotal = Object.entries(addons).reduce((s, [k, q]) => s + (data.services.find((x) => x.id === Number(k))?.addonPrice ?? 0) * q, 0);
  const canNext = [!!eid && !(el?.sub && ["PENDING_ASSESSMENT", "AWAITING_PAYMENT"].includes(el.sub.status)), cycle !== "DAY" || dayDates.length > 0, ack || !!el?.elderly.targetGroup, tierRank(tier) >= tierRank(minTierFor(g)) && choices.length <= ent.optionalMax, true][step];
  const fullErr = submit.error instanceof Error && submit.error.message.startsWith("FULL:");
  if (submit.isSuccess && !submit.data.invoiceId) {
    return (
      <Page title="Đăng ký gói">
        <Card className="mx-auto max-w-xl text-center">
          <div className="flex flex-col items-center gap-2 py-4">
            <IconCircle icon={CircleCheck} tone="green" size={72} />
            <div className="text-[18px] font-bold text-navy">Đã gửi đăng ký</div>
            {submit.data.assessed ? <p className="text-[13px] text-muted">Cụ đã được đánh giá trước đó, nhóm và phụ phí giữ như kỳ trước. Vui lòng xác nhận giá cuối và thanh toán.</p> : <p className="text-[13px] text-muted">Hệ thống đã đặt lịch đánh giá đầu vào với điều dưỡng (xem thông báo). Sau buổi đánh giá, Quản lý báo nhóm và phụ phí; bạn xác nhận giá cuối rồi thanh toán.</p>}
            <div className="mt-2 flex gap-2"><Button to="/family/packages">Gói của tôi</Button><Button variant="neutral" to="/family">Về trang chủ</Button></div>
          </div>
        </Card>
      </Page>
    );
  }
  return (
    <Page title="Đăng ký gói" sub="Thứ tự: Thời hạn → Đối tượng → Hạng và dịch vụ. Mỗi bước chỉ hiện lựa chọn phù hợp với bước trước.">
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => <span key={s} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold", i === step ? "bg-navy text-white" : i < step ? "bg-green-soft text-green-ink" : "bg-white text-subtle")}>{i < step ? <Check size={12} /> : <span>{i + 1}</span>}{s}</span>)}
      </div>
      {step === 0 && (
        <Card title="1. Chọn cụ">
          <div className="grid gap-2 md:grid-cols-2">
            {data.elderly.map((r) => {
              const busy = r.sub && ["PENDING_ASSESSMENT", "AWAITING_PAYMENT"].includes(r.sub.status);
              return (
                <button key={r.elderly.id} disabled={!!busy} onClick={() => { setEid(r.elderly.id); if (r.elderly.targetGroup) { setGroup(r.elderly.targetGroup); if (tierRank(tier) < tierRank(minTierFor(r.elderly.targetGroup))) setTier(minTierFor(r.elderly.targetGroup)); } }} className={cn("rounded-xl border p-3 text-left disabled:opacity-50", eid === r.elderly.id ? "border-[2px] border-orange bg-orange-soft" : "border-line")}>
                  <ElderlyCell e={r.elderly} />
                  <div className="mt-1.5 flex flex-wrap gap-1">{r.elderly.targetGroup ? <><GroupBadge group={r.elderly.targetGroup} /><Badge tone="gray">Đã đánh giá</Badge></> : <Badge tone="gray">Chưa đánh giá</Badge>}{r.sub && <SubBadge status={r.sub.status} />}</div>
                  {busy && <div className="mt-1 text-[11px] text-subtle">Đang có đăng ký chờ xử lý</div>}
                </button>
              );
            })}
            <Link to="/family/relatives/new" className="flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-input-line p-3 text-[13px] font-semibold text-orange"><Plus size={16} />Thêm người thân mới</Link>
          </div>
        </Card>
      )}
      {step === 1 && (
        <Card title="2. Thời hạn">
          <div className="grid gap-2 md:grid-cols-5">
            {CYCLES.map((c) => <button key={c} onClick={() => setCycle(c)} className={cn("rounded-xl border p-3 text-left", cycle === c ? "border-[2px] border-orange bg-orange-soft" : "border-line")}><div className="text-[13px] font-bold text-navy">{CYCLE_LABEL[c]}</div><div className="mt-0.5 text-[11.5px] text-muted">{CYCLE_DESC[c]}</div></button>)}
          </div>
          {cycle === "M3" && <div className="mt-3 flex items-center gap-2"><span className="text-[12px] text-subtle">Ngày cố định:</span>{M3_OPTIONS.map((w) => <Chip key={w.join()} active={weekdays.join() === w.join()} onClick={() => setWeekdays(w)}>{weekdaysLabel(w)}</Chip>)}</div>}
          {cycle === "DAY" ? (
            <div className="mt-3">
              <div className="mb-1 text-[12px] text-subtle">Chọn ngày (đặt trước, trả trước)</div>
              <div className="flex flex-wrap gap-1.5">{dayOptions().map((d) => <Chip key={d} active={dayDates.includes(d)} onClick={() => setDayDates(dayDates.includes(d) ? dayDates.filter((x) => x !== d) : [...dayDates, d])}>{weekday(d)} {dm(d)}</Chip>)}</div>
              <Note className="mt-2">Báo nghỉ trước 17h hôm trước: không mất tiền, tiền giữ thành số dư (BR-21). {data.credit > 0 && `Bạn đang có số dư ${vnd(data.credit)}.`}</Note>
            </div>
          ) : <Field className="mt-3 w-56" label="Ngày bắt đầu" type="date" value={start} onChange={(e) => setStart(e.target.value)} />}
          {cycle !== "DAY" && <Note className="mt-2">Gói tháng/quý/năm: nghỉ vẫn tính tiền; giá tháng cố định, ngày lễ được cộng bù.</Note>}
        </Card>
      )}
      {step === 2 && (
        <Card title="3. Đối tượng">
          {el?.elderly.targetGroup ? <Note className="mb-3"><Lock size={12} className="inline" /> Cụ đã được điều dưỡng đánh giá: nhóm <b>{GROUP_LABEL[el.elderly.targetGroup]}</b>. Ô này điền sẵn và khóa.</Note> : <Note className="mb-3">Gia đình tự khai. Điều dưỡng sẽ đánh giá tại trung tâm (Barthel + giấy tờ khám); Quản lý chốt nhóm.</Note>}
          <div className="grid gap-2 md:grid-cols-5">
            {GROUPS.map((x) => (
              <button key={x} disabled={!!el?.elderly.targetGroup} onClick={() => { setGroup(x); if (tierRank(tier) < tierRank(minTierFor(x))) setTier(minTierFor(x)); }} className={cn("rounded-xl border p-3 text-left disabled:cursor-not-allowed", g === x ? "border-[2px] border-orange bg-orange-soft" : "border-line", el?.elderly.targetGroup && g !== x && "opacity-40")}>
                <div className="text-[13px] font-bold text-navy">{GROUP_LABEL[x]}</div>
                <div className="mt-0.5 text-[11.5px] text-muted">{GROUP_INFO[x].who}</div>
                <div className="mt-1 text-[10.5px] text-subtle">{x === "MOBILE" ? "Không phụ phí" : `Phụ phí ${vnd(monthlyOf(x))}/tháng · từ Tiêu chuẩn`}</div>
              </button>
            ))}
          </div>
          {!el?.elderly.targetGroup && <label className="mt-3 flex items-start gap-2 text-[12.5px]"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />Cụ không thuộc diện không nhận: {NOT_ACCEPTED.join("; ")}.</label>}
        </Card>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <Card title="4a. Hạng">
            <div className="grid gap-2 md:grid-cols-3">
              {TIERS.map((t) => {
                const e = data.entitlements.find((x) => x.tier === t)!;
                const no = tierRank(t) < tierRank(minTierFor(g));
                const c = data.capacity.find((x) => x.tier === t)!;
                const p = data.packages.find((x) => x.tier === t && x.cycle === cycle);
                return (
                  <button key={t} disabled={no} onClick={() => { setTier(t); setChoices(choices.filter((id) => data.services.find((s) => s.id === id)?.quota[t] != null).slice(0, e.optionalMax)); }} className={cn("rounded-xl border p-3 text-left disabled:opacity-40", tier === t ? "border-[2px] border-orange bg-orange-soft" : "border-line")}>
                    <div className="flex items-center justify-between"><TierBadge tier={t} />{c.full && cycle !== "DAY" ? <Badge tone="red">Hết chỗ</Badge> : <Badge tone="green">Còn chỗ</Badge>}</div>
                    <div className="mt-1 text-[16px] font-bold text-orange">{p ? vnd(p.basePrice) : "—"}<span className="text-[11px] font-normal text-subtle">/{cycle === "DAY" ? "ngày" : cycle === "Q" ? "quý" : cycle === "Y" ? "năm" : "tháng"}</span></div>
                    <ul className="mt-1 space-y-0.5 text-[11.5px] text-muted"><li>Bữa: {e.meals}</li><li>Nghỉ trưa: {e.napRoom}{e.fixedBed ? ", giường cố định" : ""}</li><li>Đo chỉ số {e.vitalsPerDay} lần/ngày · 1 staff : {e.staffRatio} cụ</li><li>Ảnh: {e.photoPerDay ?? "không giới hạn"}/ngày · cảnh báo AI {e.aiAlertFamily === "ALL" ? "có" : "chỉ khẩn cấp"}</li></ul>
                    {no && <div className="mt-1 text-[11px] text-red-ink">Nhóm bệnh không mua được hạng Cơ bản (BR-11)</div>}
                  </button>
                );
              })}
            </div>
            {disease && <Note className="mt-3">Giá trên chưa gồm phụ phí nhóm {GROUP_LABEL[g]}: {vnd(monthlyOf(g))}/tháng (cố định, công bố trên web).</Note>}
          </Card>
          {disease && GROUP_INFO[g].care.length > 0 && <Card title={`Chăm sóc riêng nhóm ${GROUP_LABEL[g]}`}><ul className="grid gap-1 text-[12.5px] sm:grid-cols-2">{GROUP_INFO[g].care.map((c) => <li key={c} className="flex gap-1.5"><CircleCheck size={14} className="mt-0.5 text-green" />{c}</li>)}</ul></Card>}
          <Card title="4b. Có sẵn trong gói">
            <ul className="grid gap-1 text-[12.5px] sm:grid-cols-2">{svc("INCLUDED").filter((s) => s.quota[tier] !== null).map((s) => <li key={s.id} className="flex gap-1.5"><CircleCheck size={14} className="mt-0.5 shrink-0 text-green" />{s.name} <span className="text-subtle">· {s.quota[tier]}</span></li>)}</ul>
          </Card>
          <Card title="4c. Hoạt động tự chọn" actions={<Badge tone={choices.length > ent.optionalMax ? "red" : "blue"}>Đã chọn {choices.length}/{ent.optionalMax}</Badge>}>
            <div className="grid gap-2 sm:grid-cols-2">
              {svc("OPTIONAL").map((s) => {
                const avail = s.quota[tier] !== null && s.quota[tier] !== undefined;
                const on = choices.includes(s.id);
                const full = !on && choices.length >= ent.optionalMax;
                return (
                  <label key={s.id} className={cn("flex items-start gap-2 rounded-xl border p-2.5 text-[12.5px]", !avail ? "border-line-soft bg-canvas opacity-60" : on ? "border-orange bg-orange-soft" : "border-line")}>
                    {avail ? <input type="checkbox" checked={on} disabled={full} onChange={(e) => setChoices(e.target.checked ? [...choices, s.id] : choices.filter((x) => x !== s.id))} className="mt-0.5" /> : <Lock size={14} className="mt-0.5 text-subtle" />}
                    <span className="flex-1"><b className="text-navy">{s.name}</b>{s.needsNurseOk && disease && <Badge tone="orange" className="ml-1">⚠ cần điều dưỡng cho phép</Badge>}<span className="block text-[11px] text-muted">{s.description} · {s.durationMin} phút</span><span className="block text-[11px] text-subtle">{avail ? s.quota[tier] : `Có ở hạng ${TIER_LABEL[TIERS.find((t) => s.quota[t]) ?? "STANDARD"]} — nâng hạng để dùng`}</span></span>
                  </label>
                );
              })}
            </div>
            <Note className="mt-3">Chỉ tích có dùng hay không, không chọn khung giờ — giờ do trung tâm xếp. Bỏ tích không làm giảm giá. Đổi lựa chọn có hiệu lực từ tuần sau.</Note>
          </Card>
          <Card title="4d. Mua thêm (tính tiền riêng)">
            <div className="grid gap-2 sm:grid-cols-2">
              {svc("ADDON").filter((s) => s.quota[tier] !== null && !(cycle === "DAY" && s.addonUnit === "tháng")).map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-xl border border-line p-2.5 text-[12.5px]">
                  <span className="flex-1"><b className="text-navy">{s.name}</b><span className="block text-[11px] text-muted">{vnd(s.addonPrice ?? 0)}/{s.addonUnit}</span></span>
                  <input type="number" min={0} value={addons[s.id] ?? 0} onChange={(e) => setAddons({ ...addons, [s.id]: Number(e.target.value) })} className="h-8 w-16 rounded-lg border-[1.5px] border-input-line px-2 outline-none focus:border-orange" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      {step === 4 && el && (
        <Card title="5. Tóm tắt và giá" className="mx-auto max-w-2xl">
          <KV label="Cụ">{el.elderly.fullName}</KV>
          <KV label="Thời hạn">{CYCLE_LABEL[cycle]}{cycle === "M3" ? ` · ${weekdaysLabel(weekdays)}` : ""}{cycle === "DAY" ? ` · ${dayDates.sort().map(dm).join(", ")}` : ` · từ ${dmy(start)}`}</KV>
          <KV label="Đối tượng"><GroupBadge group={g} /> {el.elderly.targetGroup ? "(đã đánh giá)" : g === "MOBILE" ? "(tự khai, điều dưỡng kiểm tra sáng ngày đầu)" : "(tự khai, điều dưỡng kiểm tra sáng ngày đầu)"}</KV>
          <KV label="Hạng"><TierBadge tier={tier} /></KV>
          <KV label="Hoạt động">{choices.map((id) => data.services.find((s) => s.id === id)?.name).join(", ") || "—"}</KV>
          <div className="mt-3 rounded-xl bg-canvas p-3">
            <KV label="Giá gói" w={200}>{vnd(base)}</KV>
            <KV label={`Phụ phí nhóm ${GROUP_LABEL[g]}`} w={200}>{surcharge ? `${vnd(surcharge)}${cycle === "DAY" ? ` (${vnd(Math.round(monthlyOf(g) / 26 / 1000) * 1000)}/ngày)` : cycle === "Q" ? " (3 tháng)" : cycle === "Y" ? " (12 tháng)" : ""}` : "Không có"}</KV>
            <KV label="Dịch vụ mua thêm" w={200}>{vnd(addonTotal)}</KV>
            <KV label="Tổng thanh toán" w={200}><span className="text-[16px] text-orange">{vnd(base + surcharge + addonTotal)}</span></KV>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center gap-2 text-[13px] font-bold text-navy"><ShieldCheck size={16} className="text-orange" />Quy định dịch vụ</div>
            <ServiceTerms className="max-h-64 overflow-y-auto rounded-xl border border-line p-3" />
          </div>
          <label className={cn("mt-3 flex items-start gap-2 rounded-xl border-[1.5px] p-3 text-[12.5px]", commit ? "border-green bg-green-soft/40" : "border-orange bg-orange-soft")}>
            <input type="checkbox" checked={commit} onChange={(e) => setCommit(e.target.checked)} className="mt-0.5" />
            <span><b className="text-navy">Tôi đã đọc Quy định dịch vụ và cam kết thông tin khai là đúng sự thật.</b> Nếu khai sai là vi phạm hợp đồng và được xử lý theo mục 4 của Quy định (BR-79, BR-80).</span>
          </label>
          {!el.elderly.targetGroup && <Note tone="green" className="mt-2">Thanh toán ngay, không chờ duyệt. Gói hiệu lực từ {cycle === "DAY" ? dm([...dayDates].sort()[0] ?? start) : dmy(start)}. Sáng ngày đầu điều dưỡng kiểm tra chỉ số, Barthel và giấy tờ.</Note>}
          {cap.full && cycle !== "DAY" && <Note tone="red" className="mt-2">Hạng {TIER_LABEL[tier]} đang hết chỗ. Bạn có thể vào danh sách chờ: có chỗ trung tâm giữ 24 giờ để thanh toán. {data.entitlements.find((x) => x.tier === tier)?.waitlistPriority && "Hạng Cao cấp được xếp đầu danh sách chờ."}</Note>}
          {wait.isSuccess && <Note tone="green" className="mt-2">Đã vào danh sách chờ, vị trí {wait.data}.</Note>}
          <ErrorText error={fullErr ? null : submit.error ?? wait.error} />
        </Card>
      )}
      <div className="flex justify-between">
        <Button variant="neutral" disabled={step === 0} onClick={() => setStep(step - 1)}>Quay lại</Button>
        {step < 4 ? <Button disabled={!canNext} onClick={() => setStep(step + 1)}>Tiếp tục</Button> : cap.full && cycle !== "DAY" ? <Button icon={Hourglass} loading={wait.isPending} disabled={wait.isSuccess} onClick={() => wait.mutate()}>Vào danh sách chờ</Button> : <Button icon={CreditCard} disabled={!commit} loading={submit.isPending} onClick={() => submit.mutate()}>Thanh toán ngay</Button>}
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ my packages
export function MyPackagesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["f-pkgs", me.id], queryFn: () => family.packages(me) });
  const regOpts = useQuery({ queryKey: ["f-reg-opts", me.id], queryFn: () => family.registerOptions(me) });
  const [choose, setChoose] = useState<{ subId: number; tier: Tier; ids: number[] } | null>(null);
  const [addon, setAddon] = useState<{ subId: number; tier: Tier; serviceId?: number; qty: number } | null>(null);
  const [up, setUp] = useState<{ subId: number; from: Tier; to?: Tier } | null>(null);
  const [pause, setPause] = useState<{ subId: number; kind: "HOSPITAL" | "DEATH"; fromDate: string; toDate: string; document: string; note: string } | null>(null);
  const inv = () => qc.invalidateQueries();
  const confirm = useMutation({ mutationFn: (id: number) => family.confirmPrice(me, id), onSuccess: (iid) => { inv(); if (iid) nav(`/family/checkout/${iid}`); } });
  const renew = useMutation({ mutationFn: (id: number) => family.renew(me, id), onSuccess: (iid) => nav(`/family/checkout/${iid}`) });
  const change = useMutation({ mutationFn: () => family.changeChoices(me, choose!.subId, choose!.ids), onSuccess: () => { inv(); setChoose(null); } });
  const buy = useMutation({ mutationFn: () => family.buyAddOn(me, addon!.subId, addon!.serviceId!, addon!.qty), onSuccess: (iid) => nav(`/family/checkout/${iid}`) });
  const upgrade = useMutation({ mutationFn: () => family.upgrade(me, up!.subId, up!.to!), onSuccess: (r) => { inv(); if (!r.waitlisted) nav(`/family/checkout/${r.invoiceId}`); } });
  const sendPause = useMutation({ mutationFn: () => family.requestPause(me, { subId: pause!.subId, kind: pause!.kind, fromDate: pause!.fromDate, toDate: pause!.kind === "HOSPITAL" ? pause!.toDate : undefined, document: pause!.document, note: pause!.note }), onSuccess: () => { inv(); setPause(null); } });
  if (isLoading || !data) return <Page title="Gói của tôi"><Loading /></Page>;
  const svcs = regOpts.data?.services ?? [];
  const entOf = (t: Tier) => regOpts.data?.entitlements.find((e) => e.tier === t);
  return (
    <Page title="Gói của tôi" sub="Tính năng trên app bật/tắt theo quyền lợi của gói đang hiệu lực (BR-04)." actions={<><Badge tone="purple"><Wallet size={11} />Số dư {vnd(data.credit)}</Badge><Button size="sm" icon={Plus} to="/family/register">Đăng ký gói</Button></>}>
      {data.rows.length === 0 && <Card><EmptyState icon={Receipt} title="Chưa có gói nào" action={<Button to="/family/register">Đăng ký gói</Button>} /></Card>}
      {data.rows.map((r) => {
        const s = r.sub;
        return (
          <Card key={r.elderly.id} title={<ElderlyCell e={r.elderly} />} actions={<span className="flex flex-wrap gap-1">{s && <><TierBadge tier={s.tier} /><GroupBadge group={s.targetGroup} /><SubBadge status={s.status} /></>}</span>}>
            {!s ? <Button size="sm" to={`/family/register?e=${r.elderly.id}`}>Đăng ký gói</Button> : (
              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div className="space-y-3">
                  <div className="grid gap-x-6 sm:grid-cols-2">
                    <KV label="Gói">{CYCLE_LABEL[s.cycle]} · {TIER_LABEL[s.tier]}{s.weekdays ? ` · ${weekdaysLabel(s.weekdays)}` : ""}</KV>
                    <KV label="Thời hạn">{s.dayDates ? s.dayDates.map(dm).join(", ") : `${dmy(s.startDate)} – ${dmy(s.endDate)}`}</KV>
                    <KV label="Giá gói">{vnd(s.basePrice)}</KV>
                    <KV label="Phụ phí">{s.surchargeAmount ? `${vnd(s.surchargeAmount)} · ${s.surchargeNote ?? ""}` : s.status === "PENDING_ASSESSMENT" && DISEASE_GROUPS.includes(s.targetGroup) ? "Báo sau đánh giá" : "Không"}</KV>
                    {s.status === "ACTIVE" && s.cycle !== "DAY" && <KV label="Còn lại">{r.daysLeft} ngày {r.daysLeft <= 7 && <Badge tone="orange">Sắp hết hạn</Badge>}</KV>}
                    {r.bed && <KV label="Giường cố định">{r.bed.code}</KV>}
                  </div>
                  {s.status === "PENDING_ASSESSMENT" && <Note>{r.assessment?.status === "SCHEDULED" ? `Lịch đánh giá đầu vào: ${dmy(r.assessment.scheduledAt.slice(0, 10))} lúc ${hm(r.assessment.scheduledAt)} tại phòng y tế. Mang theo giấy ra viện / sổ khám nếu có.` : "Điều dưỡng đã đánh giá, chờ Quản lý chốt nhóm và phụ phí."}</Note>}
                  {s.status === "AWAITING_PAYMENT" && (
                    <div className="rounded-xl border-[1.5px] border-orange bg-orange-soft p-3">
                      <div className="text-[13px] font-bold text-navy">Kết quả đánh giá & giá cuối</div>
                      {r.assessment?.proposedGroup && <div className="text-[12.5px]">Điều dưỡng đánh giá: <GroupBadge group={r.assessment.proposedGroup} /> · Barthel {r.assessment.barthel}{r.elderly.declaredGroup !== s.targetGroup && <span className="text-amber-ink"> (gia đình khai {GROUP_LABEL[r.elderly.declaredGroup]})</span>}</div>}
                      {r.unpaid[0] && <table className="mt-2 w-full text-[12.5px]"><tbody>{r.unpaid[0].lines.map((l, i) => <tr key={i}><td className="py-0.5">{l.label}</td><td className="text-right">{vnd(l.amount)}</td></tr>)}<tr className="border-t border-orange-line font-bold"><td className="pt-1">Tổng</td><td className="pt-1 text-right text-orange">{vnd(r.unpaid[0].total)}</td></tr></tbody></table>}
                      <div className="mt-2 flex gap-2">
                        {!s.familyConfirmedAt ? <Button icon={ShieldCheck} loading={confirm.isPending} onClick={() => confirm.mutate(s.id)}>Xác nhận giá & thanh toán</Button> : r.unpaid[0] && <Button icon={CreditCard} to={`/family/checkout/${r.unpaid[0].id}`}>Thanh toán</Button>}
                        <Button variant="neutral" to="/family/chat">Hỏi thêm</Button>
                      </div>
                    </div>
                  )}
                  {r.assessment?.kind === "FIRST_DAY" && r.assessment.status === "SCHEDULED" && s.status === "ACTIVE" && <Note><ShieldCheck size={12} className="inline" /> Đăng ký online có cam kết. Sáng {dmy(s.startDate)} điều dưỡng kiểm tra chỉ số, thang Barthel và giấy tờ của cụ.</Note>}
                  {r.assessment?.kind === "FIRST_DAY" && r.assessment.status === "APPROVED" && !s.violation && <Note tone="green">Kiểm tra ngày đầu: thông tin khai đúng.</Note>}
                  {r.unpaid.filter((i) => i.kind === "VIOLATION").map((i) => <Note key={i.id} tone="red">Kết quả kiểm tra ngày đầu khác thông tin đã khai (vi phạm cam kết, BR-80): cụ thuộc nhóm <b>{GROUP_LABEL[s.targetGroup]}</b>. Vui lòng thanh toán <b>{vnd(i.total)}</b> trước {dmy(i.dueDate)}, quá hạn gói sẽ tạm ngưng. <Link to={`/family/checkout/${i.id}`} className="font-semibold">Thanh toán ngay</Link></Note>)}
                  {s.status === "SUSPENDED" && <Note tone="red">Gói hết hạn chưa đóng, cụ không check-in được (BR-23). {r.unpaid[0] && <Link to={`/family/checkout/${r.unpaid[0].id}`} className="font-semibold">Thanh toán {vnd(r.unpaid[0].total)}</Link>}</Note>}
                  {s.status === "PAUSED" && <Note>Bảo lưu tới {dmy(s.pausedUntil)}. Ngày kết thúc gói đã dời sang {dmy(s.endDate)}. Giường cố định vẫn được giữ.</Note>}
                  {s.status === "TERMINATED" && <Note>{s.violation === "NOT_ACCEPTED" ? "Trung tâm ngừng nhận cụ do thuộc diện không nhận (vi phạm cam kết). Đã tạo lệnh hoàn 95% qua cổng thanh toán." : "Hợp đồng đã chấm dứt."}</Note>}
                  <div>
                    <div className="mb-1 text-[12px] font-semibold text-navy">Hoạt động tự chọn ({r.choices.length}/{r.entitlement?.optionalMax})</div>
                    <div className="flex flex-wrap gap-1">{r.choices.map((c) => { const p = r.permissions.find((x) => x.serviceId === c.id); return <Badge key={c.id} tone={p && !p.allowed ? "red" : "blue"}>{c.name}{p && !p.allowed ? " · ĐD chưa cho phép" : ""}</Badge>; })}</div>
                    {r.addOns.length > 0 && <div className="mt-1 text-[12px] text-muted">Mua thêm: {r.addOns.map((a) => `${a.service?.name} × ${a.quantity}`).join(", ")}</div>}
                  </div>
                  {r.waitlist.map((w) => <Note key={w.id}><Hourglass size={12} className="inline" /> Đang chờ hạng {TIER_LABEL[w.tier]} · vị trí {w.pos}{w.status === "HOLDING" ? ` · trung tâm giữ chỗ tới ${hm(w.holdUntil)} ${dm(w.holdUntil?.slice(0, 10))}` : ""}</Note>)}
                  {r.pauses.filter((p) => p.status === "PENDING").map((p) => <Note key={p.id}>Đã gửi yêu cầu {p.kind === "HOSPITAL" ? "bảo lưu" : "chấm dứt"}, chờ Quản lý duyệt.</Note>)}
                </div>
                <div className="space-y-2">
                  {s.status === "ACTIVE" && (
                    <>
                      {s.cycle !== "DAY" && <Button block icon={CalendarDays} loading={renew.isPending} onClick={() => renew.mutate(s.id)}>Gia hạn kỳ sau</Button>}
                      {s.tier !== "PREMIUM" && <Button block variant="outline" icon={ArrowUpRight} onClick={() => setUp({ subId: s.id, from: s.tier })}>Nâng hạng</Button>}
                      <Button block variant="neutral" icon={Pencil} onClick={() => setChoose({ subId: s.id, tier: s.tier, ids: r.choices.map((c) => c.id) })}>Đổi hoạt động tự chọn</Button>
                      <Button block variant="neutral" icon={Plus} onClick={() => setAddon({ subId: s.id, tier: s.tier, qty: 1 })}>Mua thêm dịch vụ</Button>
                      <Button block variant="neutral" onClick={() => setPause({ subId: s.id, kind: "HOSPITAL", fromDate: TODAY, toDate: addDays(TODAY, 14), document: "", note: "" })}>Bảo lưu khi nhập viện</Button>
                      <button className="w-full text-center text-[11.5px] text-subtle underline" onClick={() => setPause({ subId: s.id, kind: "DEATH", fromDate: TODAY, toDate: "", document: "", note: "" })}>Báo cụ qua đời / chấm dứt hợp đồng</button>
                    </>
                  )}
                  <div className="rounded-xl bg-canvas p-2.5">
                    <div className="mb-1 text-[11.5px] font-semibold text-navy">Hóa đơn</div>
                    {r.invoices.map(({ invoice: i }) => <Link key={i.id} to={`/family/invoices/${i.id}`} className="flex items-center justify-between py-0.5 text-[11.5px] hover:text-orange"><span>{i.number} · {INV_KIND[i.kind]}</span><Badge tone={INV_STATUS[i.status][0]}>{vnd(i.total)}</Badge></Link>)}
                  </div>
                  <Note>Hạ hạng có hiệu lực từ kỳ sau: chọn hạng thấp hơn khi gia hạn. Tự dừng gói giữa chừng không hoàn tiền (BR-20).</Note>
                </div>
              </div>
            )}
          </Card>
        );
      })}
      <Modal open={!!choose} onClose={() => setChoose(null)} title="Đổi hoạt động tự chọn" width={560} footer={<><Button variant="neutral" onClick={() => setChoose(null)}>Hủy</Button><Button loading={change.isPending} onClick={() => change.mutate()}>Lưu · hiệu lực tuần sau</Button></>}>
        {choose && (
          <>
            <Badge tone="blue">Đã chọn {choose.ids.length}/{entOf(choose.tier)?.optionalMax}</Badge>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {svcs.filter((s) => s.kind === "OPTIONAL").map((s) => {
                const ok = s.quota[choose.tier] != null;
                const on = choose.ids.includes(s.id);
                return <label key={s.id} className={cn("flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[12px]", !ok ? "opacity-40" : on ? "border-orange bg-orange-soft" : "border-line")}>{ok ? <input type="checkbox" checked={on} disabled={!on && choose.ids.length >= (entOf(choose.tier)?.optionalMax ?? 0)} onChange={(e) => setChoose({ ...choose, ids: e.target.checked ? [...choose.ids, s.id] : choose.ids.filter((x) => x !== s.id) })} /> : <Lock size={12} />}{s.name}</label>;
              })}
            </div>
            <ErrorText error={change.error} />
            {change.isSuccess && <Note tone="green">Hiệu lực từ {dm(change.data)}.</Note>}
          </>
        )}
      </Modal>
      <Modal open={!!addon} onClose={() => setAddon(null)} title="Mua thêm dịch vụ" footer={<><Button variant="neutral" onClick={() => setAddon(null)}>Hủy</Button><Button disabled={!addon?.serviceId} loading={buy.isPending} onClick={() => buy.mutate()}>Tạo hóa đơn</Button></>}>
        {addon && (
          <div className="grid gap-2">
            <SelectField label="Dịch vụ" value={addon.serviceId ?? ""} onChange={(e) => setAddon({ ...addon, serviceId: Number(e.target.value) })}><option value="">Chọn…</option>{svcs.filter((s) => s.kind === "ADDON" && s.quota[addon.tier] !== null).map((s) => <option key={s.id} value={s.id}>{s.name} · {vnd(s.addonPrice ?? 0)}/{s.addonUnit}</option>)}</SelectField>
            <Field label="Số lượng" type="number" min={1} value={addon.qty} onChange={(e) => setAddon({ ...addon, qty: Number(e.target.value) })} />
            <ErrorText error={buy.error} />
          </div>
        )}
      </Modal>
      <Modal open={!!up} onClose={() => setUp(null)} title="Nâng hạng" footer={<><Button variant="neutral" onClick={() => setUp(null)}>Hủy</Button><Button disabled={!up?.to} loading={upgrade.isPending} onClick={() => upgrade.mutate()}>Tiếp tục</Button></>}>
        {up && (
          <div className="space-y-2">
            {TIERS.filter((t) => tierRank(t) > tierRank(up.from)).map((t) => { const c = data.capacity.find((x) => x.tier === t)!; return <button key={t} onClick={() => setUp({ ...up, to: t })} className={cn("flex w-full items-center justify-between rounded-xl border p-3 text-left", up.to === t ? "border-[2px] border-orange" : "border-line")}><TierBadge tier={t} />{c.full ? <Badge tone="red">Hết giường · vào danh sách chờ</Badge> : <Badge tone="green">Còn {c.free} chỗ</Badge>}</button>; })}
            <Note>Nâng hạng hiệu lực ngay, chỉ trả phần chênh lệch cho số ngày còn lại. Hạng cao đã hết giường: vào danh sách chờ, giữ hạng cũ tới khi có chỗ.</Note>
            {upgrade.data?.waitlisted && <Note tone="green">Đã vào danh sách chờ.</Note>}
            <ErrorText error={upgrade.error} />
          </div>
        )}
      </Modal>
      <Modal open={!!pause} onClose={() => setPause(null)} title={pause?.kind === "HOSPITAL" ? "Bảo lưu khi nhập viện" : "Báo cụ qua đời"} width={480} footer={<><Button variant="neutral" onClick={() => setPause(null)}>Hủy</Button><Button loading={sendPause.isPending} onClick={() => sendPause.mutate()}>Gửi Quản lý</Button></>}>
        {pause && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={pause.kind === "HOSPITAL" ? "Từ ngày" : "Ngày mất"} type="date" value={pause.fromDate} onChange={(e) => setPause({ ...pause, fromDate: e.target.value })} />
            {pause.kind === "HOSPITAL" && <Field label="Đến ngày (tối đa 30 ngày)" type="date" value={pause.toDate} onChange={(e) => setPause({ ...pause, toDate: e.target.value })} />}
            <Field label={pause.kind === "HOSPITAL" ? "Giấy nhập viện (tên file)" : "Giấy chứng tử (tên file)"} className="sm:col-span-2" value={pause.document} onChange={(e) => setPause({ ...pause, document: e.target.value })} placeholder="giay-nhap-vien.pdf" />
            <TextArea label="Ghi chú" className="sm:col-span-2" value={pause.note} onChange={(e) => setPause({ ...pause, note: e.target.value })} />
            <Note className="sm:col-span-2">{pause.kind === "HOSPITAL" ? "Quản lý duyệt: các ngày còn lại được dời sang sau. Quá 30 ngày phải gia hạn bảo lưu hoặc chấm dứt (BR-22)." : "Trung tâm xin chia buồn cùng gia đình. Phần chưa dùng của gói dài hạn sẽ được hoàn qua cổng thanh toán (5.9)."}</Note>
            <div className="sm:col-span-2"><ErrorText error={sendPause.error} /></div>
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ checkout (VNPay / MoMo simulation)
export function CheckoutPage() {
  const me = useMe();
  const qc = useQueryClient();
  const id = Number(useParams().id);
  const [method, setMethod] = useState<PaymentMethod>("VNPAY");
  const [useCredit, setUseCredit] = useState(true);
  const { data, isLoading } = useQuery({ queryKey: ["invoice", id], queryFn: () => family.invoices(me).then((x) => ({ row: x.rows.find((r) => r.invoice.id === id), balance: x.balance })) });
  const pay = useMutation({ mutationFn: (fail: boolean) => family.pay(me, id, method, useCredit, fail), onSuccess: () => qc.invalidateQueries() });
  if (isLoading || !data?.row) return <Page title="Thanh toán" back="/family/packages"><Loading /></Page>;
  const i = data.row.invoice;
  if (pay.data?.ok) {
    return (
      <Page title="Thanh toán" back="/family/packages">
        <Card className="mx-auto max-w-md text-center">
          <div className="flex flex-col items-center gap-2 py-4">
            <IconCircle icon={CircleCheck} tone="green" size={72} />
            <div className="text-[18px] font-bold text-navy">Thanh toán thành công</div>
            <div className="text-[12.5px] text-muted">{i.number} · {pay.data.payment.transactionCode}</div>
            <div className="text-[20px] font-bold text-orange">{vnd(pay.data.payment.amount)}</div>
            <p className="text-[12px] text-muted">Cổng thanh toán đã gửi callback. Gói tự chuyển hiệu lực theo kết quả.</p>
            <div className="mt-2 flex gap-2"><Button to="/family/packages">Gói của tôi</Button><Button variant="neutral" to={`/family/invoices/${i.id}`}>Xem hóa đơn</Button></div>
          </div>
        </Card>
      </Page>
    );
  }
  const credit = useCredit && i.status === "UNPAID" ? Math.min(i.total, data.balance) : 0;
  return (
    <Page title="Thanh toán" back="/family/packages">
      <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-[1fr_300px]">
        <Card title={`Hóa đơn ${i.number}`}>
          <KV label="Cụ">{data.row.elderly?.fullName}</KV>
          <KV label="Loại">{INV_KIND[i.kind]}</KV>
          <table className="mt-2 w-full text-[12.5px]"><tbody>
            {i.lines.map((l, k) => <tr key={k} className="border-b border-line-soft"><td className="py-1.5">{l.label}</td><td className="text-right">{vnd(l.amount)}</td></tr>)}
            {credit > 0 && <tr className="border-b border-line-soft text-green-ink"><td className="py-1.5">Trừ số dư gói ngày</td><td className="text-right">−{vnd(credit)}</td></tr>}
            <tr><td className="py-2 font-bold text-navy">Cần thanh toán</td><td className="text-right text-[17px] font-bold text-orange">{vnd(i.total - credit)}</td></tr>
          </tbody></table>
          {data.balance > 0 && <Toggle checked={useCredit} onChange={setUseCredit} label={`Dùng số dư ${vnd(data.balance)}`} sub="Từ các ngày gói ngày đã báo nghỉ đúng hạn" />}
        </Card>
        <Card title="Cổng thanh toán">
          <div className="space-y-2">
            {(["VNPAY", "MOMO"] as const).map((m) => <button key={m} onClick={() => setMethod(m)} className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left", method === m ? "border-[2px] border-orange bg-orange-soft" : "border-line")}><span className={cn("flex size-9 items-center justify-center rounded-lg text-[11px] font-bold text-white", m === "VNPAY" ? "bg-blue" : "bg-[#a50064]")}>{m === "VNPAY" ? "VNP" : "MoMo"}</span><span className="text-[13px] font-semibold">{m === "VNPAY" ? "VNPay (ATM, QR, thẻ)" : "Ví MoMo"}</span></button>)}
            <Note>Không thu tiền mặt, không đặt cọc (BR-19, BR-24).</Note>
            <Button block size="lg" icon={CreditCard} loading={pay.isPending && pay.variables === false} onClick={() => pay.mutate(false)}>Thanh toán {vnd(i.total - credit)}</Button>
            <button className="w-full text-center text-[11px] text-subtle underline" onClick={() => pay.mutate(true)}>Mô phỏng thanh toán thất bại</button>
            {pay.data && !pay.data.ok && <Note tone="red">Giao dịch thất bại. Bạn có thể thử lại hoặc đổi cổng.</Note>}
            <ErrorText error={pay.error} />
          </div>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ invoices & credit
export function FamilyInvoicesPage() {
  const me = useMe();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["f-inv", me.id], queryFn: () => family.invoices(me) });
  return (
    <Page title="Hóa đơn & số dư">
      {isLoading || !data ? <Loading /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card><div className="text-[11.5px] text-subtle">Số dư (gói ngày báo nghỉ đúng hạn)</div><div className="text-[22px] font-bold text-purple-ink">{vnd(data.balance)}</div></Card>
            <Card><div className="text-[11.5px] text-subtle">Chưa thanh toán</div><div className="text-[22px] font-bold text-amber-ink">{vnd(data.rows.filter((r) => r.invoice.status === "UNPAID").reduce((s, r) => s + r.invoice.total, 0))}</div></Card>
            <Card><div className="text-[11.5px] text-subtle">Đã thanh toán năm 2026</div><div className="text-[22px] font-bold text-green-ink">{vnd(data.rows.filter((r) => r.invoice.status === "PAID").reduce((s, r) => s + r.invoice.total, 0))}</div></Card>
          </div>
          <Card>
            <Table rows={data.rows} rowKey={(r) => r.invoice.id} onRowClick={(r) => nav(r.invoice.status === "UNPAID" ? `/family/checkout/${r.invoice.id}` : `/family/invoices/${r.invoice.id}`)} columns={[
              { key: "n", header: "Số HĐ", render: (r) => <b className="text-navy">{r.invoice.number}</b> },
              { key: "e", header: "Cụ", render: (r) => r.elderly?.fullName },
              { key: "k", header: "Loại", render: (r) => INV_KIND[r.invoice.kind] },
              { key: "d", header: "Ngày", render: (r) => dmy(r.invoice.issueDate) },
              { key: "t", header: "Tổng", render: (r) => vnd(r.invoice.total) },
              { key: "s", header: "", render: (r) => r.invoice.status === "UNPAID" ? <Button size="sm">Thanh toán</Button> : <Badge tone={INV_STATUS[r.invoice.status][0]}>{INV_STATUS[r.invoice.status][1]}</Badge> },
            ]} />
          </Card>
          {data.credits.length > 0 && (
            <Card title="Lịch sử số dư">
              {data.credits.map((c) => <KV key={c.id} label={dmy(c.createdAt.slice(0, 10))} w={90}>{vnd(c.amount)} · {c.reason} {c.usedInvoiceId ? <Badge tone="gray">Đã dùng</Badge> : <Badge tone="green">Còn</Badge>}</KV>)}
            </Card>
          )}
        </>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ absence (5.3, BR-21)
export function FamilyAbsencePage() {
  const me = useMe();
  const qc = useQueryClient();
  const { data: rel } = useQuery({ queryKey: ["f-relatives", me.id], queryFn: () => family.relatives(me) });
  const { data, isLoading } = useQuery({ queryKey: ["f-abs", me.id], queryFn: () => family.absences(me) });
  const act = (rel ?? []).filter((r) => r.sub?.status === "ACTIVE");
  const [f, setF] = useState({ elderlyId: 0, fromDate: addDays(TODAY, 1), toDate: addDays(TODAY, 1), reason: "Ốm", note: "" });
  const eid = f.elderlyId || act[0]?.elderly.id;
  const sub = act.find((r) => r.elderly.id === eid)?.sub;
  const send = useMutation({ mutationFn: () => family.reportAbsence(me, { ...f, elderlyId: eid! }), onSuccess: () => qc.invalidateQueries() });
  return (
    <Page title="Báo nghỉ">
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <Card title="Báo nghỉ mới">
          <div className="grid gap-2">
            <SelectField label="Cụ" value={eid ?? ""} onChange={(e) => setF({ ...f, elderlyId: Number(e.target.value) })}>{act.map((r) => <option key={r.elderly.id} value={r.elderly.id}>{r.elderly.fullName}</option>)}</SelectField>
            <div className="grid grid-cols-2 gap-2"><Field label="Từ ngày" type="date" value={f.fromDate} onChange={(e) => setF({ ...f, fromDate: e.target.value, toDate: e.target.value > f.toDate ? e.target.value : f.toDate })} /><Field label="Đến ngày" type="date" value={f.toDate} onChange={(e) => setF({ ...f, toDate: e.target.value })} /></div>
            <SelectField label="Lý do" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>{["Ốm", "Đi khám", "Việc gia đình", "Khác"].map((x) => <option key={x}>{x}</option>)}</SelectField>
            <TextArea label="Ghi chú" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
            {sub && (sub.cycle === "DAY" ? <Note tone="green">Gói ngày: báo trước 17h hôm trước thì không mất tiền, tiền ngày đó giữ thành số dư (BR-21).</Note> : <Note>Gói {CYCLE_LABEL[sub.cycle].toLowerCase()}: vẫn tính tiền. Báo nghỉ để trung tâm chuẩn bị nhân sự và suất ăn. Nhập viện nhiều ngày thì dùng Bảo lưu.</Note>)}
            {send.isSuccess && <Note tone="green">Đã gửi báo nghỉ.{send.data.credit ? ` Đã cộng số dư ${vnd(send.data.credit)}.` : ""}</Note>}
            <ErrorText error={send.error} />
            <Button icon={CalendarDays} disabled={!eid} loading={send.isPending} onClick={() => send.mutate()}>Gửi báo nghỉ</Button>
          </div>
        </Card>
        <Card title="Đã báo">
          {isLoading ? <Loading /> : (
            <Table rows={data ?? []} rowKey={(r) => r.absence.id} empty="Chưa có" columns={[
              { key: "e", header: "Cụ", render: (r) => r.elderly?.fullName },
              { key: "d", header: "Ngày", render: (r) => `${dm(r.absence.fromDate)}${r.absence.toDate !== r.absence.fromDate ? `–${dm(r.absence.toDate)}` : ""}` },
              { key: "r", header: "Lý do", render: (r) => r.absence.reason },
              { key: "c", header: "Số dư", render: (r) => r.absence.creditAmount ? <Badge tone="green">+{vnd(r.absence.creditAmount)}</Badge> : "—" },
              { key: "s", header: "", render: (r) => <Badge tone={r.absence.status === "PENDING" ? "orange" : r.absence.status === "APPROVED" ? "green" : "red"}>{({ PENDING: "Chờ ghi nhận", APPROVED: "Đã ghi nhận", REJECTED: "Từ chối" })[r.absence.status]}</Badge> },
            ]} />
          )}
        </Card>
      </div>
    </Page>
  );
}
