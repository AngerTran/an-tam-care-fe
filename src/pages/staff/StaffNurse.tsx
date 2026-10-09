// Staff · nurse screens: S7 vitals, S8 medication, S9 incidents, S10 alerts, intake assessment + ⚠ permissions.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, CircleCheck, Plus, Stethoscope, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { lookups, staff, TODAY } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { ElderlyCell, GroupBadge, SubBadge, TierBadge } from "../../components/domain";
import { Badge, Button, Card, Chip, EmptyState, ErrorText, Field, KV, Loading, Modal, Note, SelectField, Table, TextArea, cn } from "../../components/ui";
import { CYCLE_LABEL, GROUP_INFO, GROUP_LABEL, GROUPS, minTierFor, NOT_ACCEPTED, TIER_LABEL } from "../../domain/catalog";
import { dm, dmy, hm } from "../../lib/format";
import type { TargetGroup } from "../../types/models";
import { INC_TYPE, LEVEL, SEVERITY, SOURCE } from "../manager/ManagerOps";
import { IncidentModal, VitalsModal } from "./StaffForms";

// ------------------------------------------------------------------ S7
export function StaffVitals() {
  const me = useMe();
  const [cur, setCur] = useState<number>();
  const { data, isLoading } = useQuery({ queryKey: ["s-vitals", me.id], queryFn: () => staff.vitalsBoard(me) });
  const th = lookups.settings().thresholds;
  const sel = data?.find((r) => r.elderly.id === cur);
  return (
    <Page title="Đo chỉ số" sub={`Ngưỡng mặc định: HA ${th.sysMin}–${th.sysMax}/${th.diaMax} · SpO₂ ≥ ${th.spo2Min}% · ĐH ≤ ${th.glucoseMax}. Vượt ngưỡng tự tạo cảnh báo.`}>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={data ?? []} rowKey={(r) => r.elderly.id} empty="Chưa có cụ nào check-in" columns={[
            { key: "e", header: "Cụ", render: (r) => <ElderlyCell e={r.elderly} sub={<span className="flex gap-1"><TierBadge tier={r.sub.tier} /><GroupBadge group={r.elderly.targetGroup} /></span>} /> },
            { key: "n", header: "Hôm nay", render: (r) => <Badge tone={r.due ? "orange" : "green"}>{r.todays.length}/{r.per} lần</Badge> },
            { key: "l", header: "Lần đo gần nhất", render: (r) => r.latest ? <span className="text-[12px]">HA <b className={cn(r.latest.sys! > th.sysMax && "text-red-ink")}>{r.latest.sys}/{r.latest.dia}</b> · mạch {r.latest.pulse}{r.latest.spo2 ? ` · SpO₂ ${r.latest.spo2}%` : ""}<span className="block text-[11px] text-subtle">{dm(r.latest.at.slice(0, 10))} {hm(r.latest.at)}</span></span> : "—" },
            { key: "x", header: "Lưu ý", render: (r) => <span className="flex flex-wrap gap-1">{r.diabetic && <Badge tone="orange">Đo đường huyết</Badge>}{r.elderly.targetGroup === "STROKE" && <Badge tone="red">HA 3 lần/ngày + checklist tái phát</Badge>}</span> },
            { key: "b", header: "", render: (r) => <Button size="sm" variant="ai" icon={Activity} onClick={() => setCur(r.elderly.id)}>Đo</Button> },
          ]} />
        )}
      </Card>
      <VitalsModal open={!!sel} onClose={() => setCur(undefined)} elderly={sel?.elderly} thresholds={th} diabetic={sel?.diabetic} />
    </Page>
  );
}

// ------------------------------------------------------------------ S8
export function DoseButtons({ doseId }: { doseId: number }) {
  const me = useMe();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"REFUSED" | "MISSING">();
  const [reason, setReason] = useState("");
  const give = useMutation({ mutationFn: (s: "GIVEN" | "REFUSED" | "MISSING") => staff.giveDose(me, doseId, s, reason), onSuccess: () => { qc.invalidateQueries(); setMode(undefined); } });
  return (
    <>
      <span className="flex flex-wrap gap-1">
        <Button size="sm" variant="success" loading={give.isPending && !mode} onClick={() => give.mutate("GIVEN")}>Đã uống</Button>
        <Button size="sm" variant="neutral" onClick={() => setMode("REFUSED")}>Từ chối</Button>
        <Button size="sm" variant="neutral" onClick={() => setMode("MISSING")}>Chưa có thuốc</Button>
      </span>
      <Modal open={!!mode} onClose={() => setMode(undefined)} title={mode === "REFUSED" ? "Cụ từ chối thuốc" : "Chưa có thuốc"} footer={<><Button variant="neutral" onClick={() => setMode(undefined)}>Hủy</Button><Button loading={give.isPending} onClick={() => give.mutate(mode!)}>Lưu</Button></>}>
        <TextArea label="Lý do" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Note className="mt-2">{mode === "REFUSED" ? "Từ chối 2 lần liền sẽ tạo cảnh báo (CL-07)." : "Hệ thống báo gia đình gửi thuốc."}</Note>
        <ErrorText error={give.error} />
      </Modal>
    </>
  );
}
export function StaffMeds() {
  const me = useMe();
  const [f, setF] = useState<"DUE" | "DONE" | "ALL">("DUE");
  const { data, isLoading } = useQuery({ queryKey: ["s-meds", me.id], queryFn: () => staff.meds(me) });
  const rows = (data ?? []).filter((r) => f === "ALL" || (f === "DUE" ? r.dose.status === "PENDING" : r.dose.status !== "PENDING"));
  return (
    <Page title="Thuốc đến hạn" sub="Theo danh sách gia đình khai. Quá 30 phút chưa ghi nhận sẽ tạo cảnh báo (CL-07).">
      <div className="flex gap-1.5">{([["DUE", `Đến hạn / quá hạn (${data?.filter((r) => r.dose.status === "PENDING").length ?? 0})`], ["DONE", "Đã xong"], ["ALL", "Tất cả"]] as const).map(([v, l]) => <Chip key={v} active={f === v} onClick={() => setF(v)}>{l}</Chip>)}</div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.dose.id} empty="Không có liều nào" columns={[
            { key: "t", header: "Giờ", render: (r) => <Badge tone={r.overdue ? "red" : r.dose.status === "PENDING" ? "blue" : "gray"}>{r.dose.time}{r.overdue ? " · quá giờ" : ""}</Badge> },
            { key: "e", header: "Cụ", render: (r) => <ElderlyCell e={r.elderly} /> },
            { key: "m", header: "Thuốc", render: (r) => <span><b className="text-navy">{r.plan.name}</b> · {r.plan.dose}<span className="block text-[11px] text-subtle">{r.plan.note}</span></span> },
            { key: "p", header: "Ảnh vỉ", render: () => <span className="block h-8 w-12 rounded bg-gradient-to-br from-[#e6dcf5] to-[#c7b5ea]" /> },
            { key: "s", header: "", render: (r) => r.dose.status === "PENDING" ? (r.present ? <DoseButtons doseId={r.dose.id} /> : <Badge tone="gray">Cụ chưa có mặt</Badge>) : <Badge tone={r.dose.status === "GIVEN" ? "green" : "orange"}>{({ GIVEN: "Đã uống", REFUSED: "Từ chối", MISSING: "Chưa có thuốc", PENDING: "" })[r.dose.status]} {r.dose.at}{r.dose.reason ? ` · ${r.dose.reason}` : ""}</Badge> },
          ]} />
        )}
      </Card>
    </Page>
  );
}

// ------------------------------------------------------------------ S9
export function StaffIncidents() {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["s-inc", me.id], queryFn: () => staff.incidents(me) });
  const mine = staff.myElderly(me).filter((e) => e.status === "ACTIVE");
  return (
    <Page title="Sự cố" sub={lookups.position(me.id) === "NURSE" ? "Điều dưỡng ghi sự cố, xử lý, chuyển viện (CL-03)" : "Hộ lý báo nhanh, điều dưỡng ghi chi tiết"} actions={<Button size="sm" variant="danger" icon={Plus} onClick={() => setOpen(true)}>Báo sự cố</Button>}>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={data ?? []} rowKey={(r) => r.incident.id} empty="Chưa có sự cố" columns={[
            { key: "t", header: "Lúc", render: (r) => `${dmy(r.incident.at.slice(0, 10))} ${hm(r.incident.at)}` },
            { key: "e", header: "Cụ", render: (r) => r.elderly?.fullName },
            { key: "k", header: "Loại", render: (r) => INC_TYPE[r.incident.type] },
            { key: "s", header: "Mức", render: (r) => <Badge tone={SEVERITY[r.incident.severity][0]}>{SEVERITY[r.incident.severity][1]}</Badge> },
            { key: "d", header: "Mô tả · xử lý", render: (r) => <span className="text-[12px]">{r.incident.description}<span className="block text-muted">{r.incident.action}</span></span> },
            { key: "tr", header: "Chuyển viện", render: (r) => r.incident.transfer ? `${r.incident.transfer.hospital} ${r.incident.transfer.time}` : "—" },
            { key: "st", header: "", render: (r) => r.incident.status === "OPEN" ? <Badge tone="orange">Đang mở</Badge> : <Badge tone="green">Đã xử lý</Badge> },
          ]} />
        )}
      </Card>
      {open && <IncidentModal open onClose={() => setOpen(false)} elderlyOptions={mine} />}
    </Page>
  );
}

// ------------------------------------------------------------------ S10
export function StaffAlerts() {
  const me = useMe();
  const qc = useQueryClient();
  const [cur, setCur] = useState<number>();
  const [result, setResult] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["s-alerts", me.id], queryFn: () => staff.alerts(me) });
  const handle = useMutation({ mutationFn: (s: "IN_PROGRESS" | "CLOSED") => staff.handleAlert(me, cur!, s, result), onSuccess: () => { qc.invalidateQueries(); setCur(undefined); } });
  const sel = data?.find((r) => r.alert.id === cur);
  return (
    <Page title="Cảnh báo" sub="Theo nguồn: vượt ngưỡng, AI phát hiện xu hướng, quy tắc. Nhận xử lý → ghi kết quả → đóng.">
      <Card>
        {isLoading ? <Loading /> : (
          <ul className="divide-y divide-line-soft">
            {data?.map(({ alert: a, elderly, handler }) => (
              <li key={a.id} className="flex flex-wrap items-start gap-3 py-2.5">
                <Badge tone={LEVEL[a.level][0]}>{LEVEL[a.level][1]}</Badge>
                <div className="min-w-0 flex-1 text-[12.5px]">
                  <div className="font-semibold text-navy">{elderly.fullName} · {a.title}</div>
                  <div className="text-muted">{a.detail}</div>
                  <div className="text-[11px] text-subtle">{dm(a.at.slice(0, 10))} {hm(a.at)} · {SOURCE[a.source]}{handler ? ` · ${handler.fullName}` : ""}{a.result ? ` · KQ: ${a.result}` : ""}</div>
                </div>
                {a.status === "CLOSED" ? <Badge tone="green">Đã đóng</Badge> : <Button size="sm" variant={a.status === "NEW" ? "primary" : "outline"} onClick={() => { setCur(a.id); setResult(a.result ?? ""); }}>{a.status === "NEW" ? "Nhận xử lý" : "Cập nhật"}</Button>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Modal open={!!sel} onClose={() => setCur(undefined)} title={sel ? `${sel.alert.title} · ${sel.elderly.fullName}` : ""} footer={<><Button variant="neutral" loading={handle.isPending} onClick={() => handle.mutate("IN_PROGRESS")}>Đang xử lý</Button><Button variant="success" icon={CircleCheck} loading={handle.isPending} onClick={() => handle.mutate("CLOSED")}>Đóng cảnh báo</Button></>}>
        <TextArea label="Kết quả xử lý" value={result} onChange={(e) => setResult(e.target.value)} />
        {sel?.alert.source === "AI" && <Note className="mt-2">AI chỉ phát hiện xu hướng, không chẩn đoán. Quyết định thuộc về điều dưỡng.</Note>}
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ intake assessment (BR-10, BR-15)
export function StaffAssessments() {
  const me = useMe();
  const qc = useQueryClient();
  const [cur, setCur] = useState<number>();
  const [f, setF] = useState({ barthel: "", group: "MOBILE" as TargetGroup, baseline: "", docs: "", note: "", notAccepted: false });
  const [perm, setPerm] = useState<Record<number, { allowed: boolean; reason: string }>>({});
  const { data, isLoading } = useQuery({ queryKey: ["s-assess", me.id], queryFn: () => staff.assessments(me) });
  const submit = useMutation({ mutationFn: () => staff.submitAssessment(me, cur!, { barthel: Number(f.barthel), group: f.group, baseline: f.baseline, docs: f.docs, note: f.note, notAccepted: f.notAccepted, permissions: Object.entries(perm).map(([k, v]) => ({ serviceId: Number(k), ...v })) }), onSuccess: () => { qc.invalidateQueries(); setCur(undefined); } });
  const sel = data?.find((r) => r.assessment.id === cur);
  const b = Number(f.barthel);
  const band = !f.barthel ? "" : b >= 91 ? "Phụ thuộc nhẹ / tự lập" : b >= 61 ? "Phụ thuộc vừa" : b >= 21 ? "Phụ thuộc nặng" : "Phụ thuộc hoàn toàn — không nhận (BR-18)";
  const open = (id: number) => {
    const r = data!.find((x) => x.assessment.id === id)!;
    setCur(id);
    setF({ barthel: r.assessment.barthel ? String(r.assessment.barthel) : "", group: r.assessment.proposedGroup ?? r.elderly.declaredGroup, baseline: r.assessment.baseline ?? "", docs: r.assessment.diagnosisDocs ?? "", note: r.assessment.nurseNote ?? "", notAccepted: !!r.assessment.notAccepted });
    setPerm(Object.fromEntries(r.permissions.map((p) => [p.serviceId, { allowed: p.allowed, reason: p.reason }])));
  };
  return (
    <Page title="Đánh giá đầu vào" sub="Chỉ điều dưỡng đánh giá (BR-10). Chấm Barthel + giấy tờ khám để đề xuất nhóm; Quản lý chốt nhóm và phụ phí.">
      <Card>
        {isLoading ? <Loading /> : !data?.length ? <EmptyState icon={Stethoscope} title="Không có lịch đánh giá" /> : (
          <Table rows={data} rowKey={(r) => r.assessment.id} onRowClick={(r) => open(r.assessment.id)} columns={[
            { key: "d", header: "Lịch", render: (r) => <b className={cn(r.assessment.scheduledAt.startsWith(TODAY) && "text-orange")}>{dmy(r.assessment.scheduledAt.slice(0, 10))} {hm(r.assessment.scheduledAt)}</b> },
            { key: "k", header: "Loại", render: (r) => r.assessment.kind === "FIRST_DAY" ? <Badge tone="orange">Kiểm tra ngày đầu</Badge> : r.assessment.kind === "INITIAL" ? "Đầu vào" : "Định kỳ" },
            { key: "e", header: "Cụ", render: (r) => <ElderlyCell e={r.elderly} /> },
            { key: "g", header: "Gia đình khai", render: (r) => <GroupBadge group={r.elderly.declaredGroup} /> },
            { key: "p", header: "Gói chọn", render: (r) => r.sub ? `${CYCLE_LABEL[r.sub.cycle]} · ${TIER_LABEL[r.sub.tier]}` : "—" },
            { key: "s", header: "Trạng thái", render: (r) => <Badge tone={r.assessment.status === "SCHEDULED" ? "blue" : r.assessment.status === "DONE" ? "orange" : "green"}>{(r.assessment.kind === "FIRST_DAY" ? { SCHEDULED: "Chờ kiểm tra", DONE: "Vi phạm · chờ Quản lý xử lý", APPROVED: "Khai đúng" } : { SCHEDULED: "Chờ đánh giá", DONE: "Chờ Quản lý duyệt", APPROVED: "Đã duyệt" })[r.assessment.status]}</Badge> },
          ]} />
        )}
      </Card>
      <Modal open={!!sel} onClose={() => setCur(undefined)} title={sel ? `Đánh giá · ${sel.elderly.fullName}` : ""} width={680} footer={sel?.assessment.status === "SCHEDULED" || sel?.assessment.status === "DONE" ? <><Button variant="neutral" onClick={() => setCur(undefined)}>Hủy</Button><Button loading={submit.isPending} onClick={() => submit.mutate()}>Gửi kết quả cho Quản lý</Button></> : undefined}>
        {sel && (
          <div className="space-y-3">
            <div className="grid gap-x-6 rounded-xl bg-canvas p-3 text-[12px] sm:grid-cols-2">
              <KV label="Bệnh nền khai" w={100}>{sel.elderly.conditions.join(", ") || "Không"}</KV>
              <KV label="Gia đình khai" w={100}>{GROUP_LABEL[sel.elderly.declaredGroup]}</KV>
              <KV label="Gói chọn" w={100}>{sel.sub ? `${CYCLE_LABEL[sel.sub.cycle]} · ${TIER_LABEL[sel.sub.tier]}` : "—"} {sel.sub && <SubBadge status={sel.sub.status} />}</KV>
              <KV label="Hoạt động tích" w={100}>{sel.choices.map((c) => c.name).join(", ")}</KV>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Điểm Barthel (0–100)" type="number" min={0} max={100} value={f.barthel} onChange={(e) => { const v = e.target.value; setF({ ...f, barthel: v, notAccepted: sel.assessment.kind === "FIRST_DAY" && Number(v) > 0 && Number(v) < 20 ? true : f.notAccepted }); }} error={b > 0 && b < 20 ? "Không nhận" : undefined} />
              <div className="self-center text-[12px] text-muted">{band}</div>
              <SelectField label="Đề xuất nhóm chính (BR-16)" value={f.group} onChange={(e) => setF({ ...f, group: e.target.value as TargetGroup })}>{GROUPS.map((g) => <option key={g} value={g}>{GROUP_LABEL[g]} (từ hạng {TIER_LABEL[minTierFor(g)]})</option>)}</SelectField>
              <Field label="Chỉ số nền (HA, cân nặng, …)" value={f.baseline} onChange={(e) => setF({ ...f, baseline: e.target.value })} />
              <Field label="Giấy tờ (giấy ra viện, sổ khám)" className="sm:col-span-2" value={f.docs} onChange={(e) => setF({ ...f, docs: e.target.value })} />
              <TextArea label="Nhận xét" className="sm:col-span-2" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
            </div>
            {sel.assessment.kind === "FIRST_DAY" && <Note>Gia đình đăng ký online, đã tích cam kết khai đúng và đã thanh toán (BR-79). Kết quả khớp khai báo thì duyệt luôn; khác khai báo thì chuyển Quản lý xử lý vi phạm (BR-80).</Note>}
            {sel.assessment.kind === "FIRST_DAY" && (
              <label className={cn("flex items-start gap-2 rounded-xl border-[1.5px] p-2.5 text-[12.5px]", f.notAccepted ? "border-red-line bg-red-soft/40" : "border-line")}>
                <input type="checkbox" checked={f.notAccepted} onChange={(e) => setF({ ...f, notAccepted: e.target.checked })} className="mt-0.5" />
                <span><b className="text-red-ink">Cụ thuộc diện không nhận</b> (liệt giường, sa sút trí tuệ nặng, cần chăm sóc tích cực). Trung tâm ngừng nhận và hoàn 95% tổng tiền đã đóng.</span>
              </label>
            )}
            {sel.assessment.kind === "FIRST_DAY" && !f.notAccepted && f.group !== sel.elderly.declaredGroup && <Note tone="red">Khác khai báo ({GROUP_LABEL[sel.elderly.declaredGroup]} → {GROUP_LABEL[f.group]}): vi phạm cam kết. Gia đình trả phụ phí nhóm và chênh lệch nâng hạng cho số ngày còn lại trong 3 ngày.</Note>}
            {sel.assessment.kind !== "FIRST_DAY" && f.group !== sel.elderly.declaredGroup && <Note tone="orange">Khác với gia đình khai. Áp phụ phí cố định của nhóm; nếu đang chọn Cơ bản mà thuộc nhóm bệnh thì buộc nâng lên Tiêu chuẩn.</Note>}
            {GROUP_INFO[f.group].limits !== "—" && <Note>Hạn chế nhóm {GROUP_LABEL[f.group]}: {GROUP_INFO[f.group].limits}</Note>}
            <div>
              <div className="mb-1 text-[12px] font-semibold text-navy">Cho phép dịch vụ ⚠ (BR-15)</div>
              {sel.choices.filter((c) => c.needsNurseOk).length === 0 ? <div className="text-[12px] text-subtle">Không có dịch vụ ⚠ trong lựa chọn</div> : sel.choices.filter((c) => c.needsNurseOk).map((c) => (
                <div key={c.id} className="mb-1.5 grid items-center gap-2 sm:grid-cols-[180px_auto_1fr]">
                  <span className="text-[12px]">{c.name}<span className="block text-[10.5px] text-subtle">{c.healthNote}</span></span>
                  <span className="flex gap-1"><Chip active={perm[c.id]?.allowed === true} onClick={() => setPerm({ ...perm, [c.id]: { allowed: true, reason: perm[c.id]?.reason ?? "" } })}>Cho phép</Chip><Chip active={perm[c.id]?.allowed === false} onClick={() => setPerm({ ...perm, [c.id]: { allowed: false, reason: perm[c.id]?.reason ?? "" } })}>Không</Chip></span>
                  <input value={perm[c.id]?.reason ?? ""} onChange={(e) => setPerm({ ...perm, [c.id]: { allowed: perm[c.id]?.allowed ?? true, reason: e.target.value } })} placeholder="Lý do" className="h-8 rounded-lg border-[1.5px] border-input-line px-2 text-[12px] outline-none focus:border-orange" />
                </div>
              ))}
            </div>
            <Note tone="red"><TriangleAlert size={12} className="inline" /> Không nhận: {NOT_ACCEPTED.join("; ")}.</Note>
            <ErrorText error={submit.error} />
          </div>
        )}
      </Modal>
    </Page>
  );
}
