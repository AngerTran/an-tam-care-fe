// Manager · facilities (4.5–4.8, 5.10): overview, rooms, nap beds, equipment, damage reports, inventory checks.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BedDouble, CircleCheck, ClipboardCheck, FileSpreadsheet, Lock, Pencil, Plus, Shuffle, Wrench } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { manager } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { Progress, Stat, TierBadge } from "../../components/domain";
import { Badge, Button, Card, Chip, ErrorText, Field, KV, Loading, Modal, Note, Photo, SelectField, Table, TextArea, cn } from "../../components/ui";
import { entitlementFixedBed, EQUIP_CAT, TIER_LABEL, TIERS, ZONE_LABEL } from "../../domain/catalog";
import { dm, dmy, hm } from "../../lib/format";
import type { Equipment, NapBed, Room, Tier, Zone } from "../../types/models";

export function FacilitiesOverview() {
  const { data, isLoading } = useQuery({ queryKey: ["m-fac"], queryFn: () => manager.facilities() });
  if (isLoading || !data) return <Page title="Cơ sở vật chất"><Loading /></Page>;
  return (
    <Page title="Cơ sở vật chất" sub="Số lượng do Quản lý nhập tay. Hệ thống tự cập nhật số dùng được, so sánh với nhu cầu và cảnh báo khi thiếu hoặc hỏng (4.5).">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Phòng / khu" value={data.rooms} />
        <Stat label="Thiết bị dùng được" value={`${data.equipmentUsable}/${data.equipmentTotal}`} tone="green" />
        <Stat label="Giường xếp hôm nay" value={data.bedsToday} />
        <Stat label="Báo hỏng chưa xong" value={data.openDamage.length} tone="orange" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Chỗ còn trống theo hạng" actions={<Link to="/manager/facilities/beds" className="text-[11.5px] font-semibold text-orange">Sơ đồ giường</Link>}>
          {data.capacity.map((c) => (
            <div key={c.tier} className="mb-2.5">
              <div className="flex items-center justify-between text-[12.5px]"><TierBadge tier={c.tier} /><span>{c.free > 0 ? <Badge tone="green">Còn {c.free} chỗ</Badge> : <Badge tone="red">Hết chỗ · chặn bán (BR-71)</Badge>}</span></div>
              <div className="mt-1 flex items-center gap-2"><Progress value={(c.held / Math.max(1, c.beds)) * 100} tone={c.full ? "red" : "green"} /><span className="text-[11px] whitespace-nowrap text-subtle">{c.held}/{c.beds}</span></div>
            </div>
          ))}
          <KV label="Khu kiểm soát ra vào" w={150}>{data.secure.used}/{data.secure.capacity} cụ sa sút trí tuệ</KV>
        </Card>
        <Card title="Cảnh báo" actions={<Link to="/manager/facilities/equipment" className="text-[11.5px] font-semibold text-orange">Thiết bị</Link>}>
          {data.lowEquip.map((e) => <div key={e.id} className="py-1 text-[12.5px]"><Badge tone="red">Dưới định mức</Badge> {e.name} · dùng được {e.total - e.broken - e.repairing}/{e.total}, tối thiểu {e.minStock}</div>)}
          {data.closedRooms.map((r) => <div key={r.id} className="py-1 text-[12.5px]"><Badge tone="orange">Tạm đóng</Badge> {r.name} · {r.closedReason}</div>)}
          {!data.lowEquip.length && !data.closedRooms.length && <div className="text-[12.5px] text-subtle">Không có</div>}
        </Card>
        <Card title="Báo hỏng chưa xử lý" actions={<Link to="/manager/facilities/damage" className="text-[11.5px] font-semibold text-orange">Xử lý</Link>}>
          {data.openDamage.map(({ report: r, equipment, room, reporter }) => <div key={r.id} className="border-b border-line-soft py-1.5 text-[12.5px] last:border-0"><b className="text-navy">{equipment?.name ?? room?.name}</b> × {r.quantity} · {r.description}<span className="block text-[11px] text-subtle">{reporter?.fullName} · {dm(r.reportedAt.slice(0, 10))} · {r.status === "NEW" ? "Mới" : "Đang sửa"}</span></div>)}
        </Card>
        <Card title="Bù quyền lợi (4.8)">
          {data.compensations.map((c) => <div key={c.id} className="text-[12.5px]"><b className="text-navy">{c.elderly?.fullName}</b> · {dm(c.date)} · {c.reason} → {c.form}</div>)}
          <Note className="mt-2">Phòng Cao cấp đóng mà còn phòng tương đương: chuyển tạm, không bù. Không còn: xếp phòng 4–6 người, bù 1 buổi dịch vụ lẻ/ngày. Máy VLTL hỏng: bù buổi tuần sau.</Note>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ rooms
const ZONES = Object.keys(ZONE_LABEL) as Zone[];
export function RoomsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [form, setForm] = useState<(Omit<Room, "id"> & { id?: number }) | null>(null);
  const [zone, setZone] = useState<Zone | "ALL">("ALL");
  const { data, isLoading } = useQuery({ queryKey: ["m-rooms-l"], queryFn: () => manager.rooms() });
  const save = useMutation({ mutationFn: () => manager.saveRoom(me, form!), onSuccess: () => { qc.invalidateQueries(); setForm(null); } });
  const rows = (data ?? []).filter((r) => zone === "ALL" || r.zone === zone);
  return (
    <Page title="Khu và phòng" sub="Ảnh và mô tả ở đây hiện trên trang giới thiệu cho khách (4.11)." actions={<Button size="sm" icon={Plus} onClick={() => setForm({ name: "", zone: "COMMON", floor: "Tầng trệt", area: 20, capacity: 10, tiers: [...TIERS], status: "ACTIVE", description: "", tone: "blue" })}>Thêm phòng</Button>}>
      <div className="flex flex-wrap gap-1.5"><Chip active={zone === "ALL"} onClick={() => setZone("ALL")}>Tất cả</Chip>{ZONES.map((z) => <Chip key={z} active={zone === z} onClick={() => setZone(z)}>{ZONE_LABEL[z]}</Chip>)}</div>
      {isLoading ? <Loading /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.id} className={cn(r.status === "CLOSED" && "ring-2 ring-orange-line")}>
              <Photo tone={r.tone} caption={ZONE_LABEL[r.zone]} />
              <div className="mt-2 flex items-start justify-between gap-2">
                <div><div className="text-[13.5px] font-bold text-navy">{r.name}</div><div className="text-[11.5px] text-subtle">{r.floor} · {r.area} m² · sức chứa {r.capacity}</div></div>
                <Button size="sm" variant="neutral" icon={Pencil} onClick={() => setForm({ ...r })}>Sửa</Button>
              </div>
              <p className="mt-1 text-[12px] text-muted">{r.description}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">{r.tiers.length === 3 ? <Badge tone="gray">Mọi hạng</Badge> : r.tiers.map((t) => <TierBadge key={t} tier={t} />)}{r.status === "CLOSED" ? <Badge tone="orange">Tạm đóng</Badge> : <Badge tone="green">Hoạt động</Badge>}</div>
              {r.closedReason && <Note className="mt-2">{r.closedReason}</Note>}
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Sửa phòng" : "Thêm phòng"} width={560} footer={<><Button variant="neutral" onClick={() => setForm(null)}>Hủy</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Lưu</Button></>}>
        {form && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tên phòng" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <SelectField label="Loại khu" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value as Zone })}>{ZONES.map((z) => <option key={z} value={z}>{ZONE_LABEL[z]}</option>)}</SelectField>
            <Field label="Tầng / vị trí" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            <Field label="Diện tích (m²)" type="number" value={form.area} onChange={(e) => setForm({ ...form, area: Number(e.target.value) })} />
            <Field label="Sức chứa" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
            <SelectField label="Trạng thái" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "ACTIVE" })}><option value="ACTIVE">Hoạt động</option><option value="CLOSED">Tạm đóng</option></SelectField>
            {form.status === "CLOSED" && <Field label="Lý do tạm đóng" className="sm:col-span-2" value={form.closedReason ?? ""} onChange={(e) => setForm({ ...form, closedReason: e.target.value })} />}
            <div className="sm:col-span-2"><div className="mb-1 text-[11px] text-subtle">Hạng được dùng</div><div className="flex gap-1.5">{TIERS.map((t) => <Chip key={t} active={form.tiers.includes(t)} onClick={() => setForm({ ...form, tiers: form.tiers.includes(t) ? form.tiers.filter((x) => x !== t) : [...form.tiers, t] })}>{TIER_LABEL[t]}</Chip>)}</div></div>
            <TextArea label="Mô tả cho trang giới thiệu" className="sm:col-span-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Button variant="neutral" size="sm" className="sm:col-span-2">+ Tải ảnh khu (room_photos)</Button>
            {form.status === "CLOSED" && <Note className="sm:col-span-2">Tạm đóng: hệ thống báo các lịch hoạt động và giường bị ảnh hưởng; cụ Cao cấp được chuyển tạm sang phòng tương đương (BR-73).</Note>}
            <div className="sm:col-span-2"><ErrorText error={save.error} /></div>
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ nap beds
export function BedsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [form, setForm] = useState<(Omit<NapBed, "id"> & { id?: number }) | null>(null);
  const [assign, setAssign] = useState<number>();
  const [pick, setPick] = useState<number>();
  const { data, isLoading } = useQuery({ queryKey: ["m-beds"], queryFn: () => manager.beds() });
  const inv = () => qc.invalidateQueries({ queryKey: ["m-beds"] });
  const save = useMutation({ mutationFn: () => manager.saveBed(me, form!), onSuccess: () => { inv(); setForm(null); } });
  const auto = useMutation({ mutationFn: () => manager.autoAssignBeds(me), onSuccess: inv });
  const today = useMutation({ mutationFn: () => manager.assignBedToday(me, assign!, pick!), onSuccess: () => { inv(); setAssign(undefined); } });
  if (isLoading || !data) return <Page title="Giường nghỉ trưa"><Loading /></Page>;
  return (
    <Page title="Giường nghỉ trưa" sub="Chỗ chia cứng theo hạng = số giường của hạng (BR-74). Cao cấp có giường cố định, giữ trống cả khi cụ báo nghỉ (BR-76). Hạng khác xếp theo ngày." actions={<><Button size="sm" variant="outline" icon={Shuffle} loading={auto.isPending} onClick={() => auto.mutate()}>Tự xếp giường hôm nay</Button><Button size="sm" icon={Plus} onClick={() => setForm({ roomId: data.rooms[0].id, code: "", tier: "BASIC", status: "ACTIVE" })}>Thêm giường</Button></>}>
      <div className="flex flex-wrap gap-3 text-[11.5px]"><span className="flex items-center gap-1"><span className="size-3 rounded bg-white ring-1 ring-line" />Trống</span><span className="flex items-center gap-1"><span className="size-3 rounded bg-purple-soft" />Cố định (Cao cấp)</span><span className="flex items-center gap-1"><span className="size-3 rounded bg-blue-soft" />Xếp hôm nay</span><span className="flex items-center gap-1"><span className="size-3 rounded bg-red-soft" />Hỏng</span></div>
      {data.unassigned.length > 0 && <Note>Chưa xếp giường hôm nay: {data.unassigned.map((e) => e.fullName).join(", ")}</Note>}
      <div className="grid gap-4 lg:grid-cols-2">
        {data.rooms.map((r) => (
          <Card key={r.id} title={<span className="flex items-center gap-2">{r.name}{r.status === "CLOSED" && <Badge tone="orange">Tạm đóng</Badge>}</span>} actions={<span className="flex gap-1">{r.tiers.map((t) => <TierBadge key={t} tier={t} />)}</span>}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {data.beds.filter((b) => b.bed.roomId === r.id).map(({ bed, fixed, today: tdy }) => (
                <button key={bed.id} onClick={() => bed.fixedElderlyId ? setForm({ ...bed }) : (setAssign(bed.id), setPick(undefined))} className={cn("rounded-lg border p-2 text-left text-[11.5px]", bed.status === "BROKEN" ? "border-red-line bg-red-soft" : fixed ? "border-purple-soft bg-purple-soft/60" : tdy ? "border-blue-soft bg-blue-soft" : "border-line bg-white", r.status === "CLOSED" && "opacity-50")}>
                  <span className="flex items-center gap-1 font-bold text-navy"><BedDouble size={12} />{bed.code}</span>
                  <span className="block truncate text-muted">{bed.status === "BROKEN" ? "Hỏng" : fixed ? fixed.fullName : tdy ? tdy.fullName : "Trống"}</span>
                  {fixed && <span className="text-[10px] text-purple-ink">{fixed.status === "PAUSED" ? "Cố định · đang bảo lưu" : "Cố định"}</span>}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <Modal open={!!assign} onClose={() => setAssign(undefined)} title="Xếp giường hôm nay" footer={<><Button variant="neutral" onClick={() => setAssign(undefined)}>Hủy</Button><Button disabled={!pick} loading={today.isPending} onClick={() => today.mutate()}>Xếp</Button></>}>
        <SelectField label="Cụ có mặt hôm nay" value={pick ?? ""} onChange={(e) => setPick(Number(e.target.value))}><option value="">Chọn…</option>{[...data.unassigned, ...data.beds.filter((b) => b.today).map((b) => b.today!)].map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}</SelectField>
        <Button className="mt-3" size="sm" variant="neutral" icon={Pencil} onClick={() => { const b = data.beds.find((x) => x.bed.id === assign)!.bed; setAssign(undefined); setForm({ ...b }); }}>Sửa thông tin giường</Button>
      </Modal>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? `Giường ${form.code}` : "Thêm giường"} footer={<><Button variant="neutral" onClick={() => setForm(null)}>Hủy</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Lưu</Button></>}>
        {form && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Mã giường" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <SelectField label="Phòng" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: Number(e.target.value) })}>{data.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</SelectField>
            <SelectField label="Hạng" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as Tier })}>{TIERS.map((t) => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}</SelectField>
            <SelectField label="Trạng thái" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "ACTIVE" })}><option value="ACTIVE">Dùng được</option><option value="BROKEN">Hỏng</option></SelectField>
            {entitlementFixedBed(form.tier) && <SelectField label={`Gán cố định cho cụ ${TIER_LABEL[form.tier]}`} className="sm:col-span-2" value={form.fixedElderlyId ?? ""} onChange={(e) => setForm({ ...form, fixedElderlyId: Number(e.target.value) || undefined })}><option value="">— Không —</option>{data.premium.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}</SelectField>}
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ equipment
export function EquipmentPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [form, setForm] = useState<(Omit<Equipment, "id" | "broken" | "repairing"> & { id?: number }) | null>(null);
  const [cat, setCat] = useState<Equipment["category"] | "ALL" | "LOW">("ALL");
  const [imp, setImp] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["m-equip"], queryFn: () => manager.equipment() });
  const rooms = useQuery({ queryKey: ["m-rooms-l"], queryFn: () => manager.rooms() });
  const save = useMutation({ mutationFn: () => manager.saveEquipment(me, form!), onSuccess: () => { qc.invalidateQueries(); setForm(null); } });
  const doImport = useMutation({ mutationFn: () => manager.importEquipment(me, [{ name: "Máy đo nhiệt độ hồng ngoại", category: "MEDICAL", roomId: 2, total: 3, minStock: 2 }, { name: "Gậy 4 chân", category: "SAFETY", roomId: 1, total: 4, minStock: 2 }]), onSuccess: () => { qc.invalidateQueries(); setImp(false); } });
  const rows = (data ?? []).filter((r) => cat === "ALL" || (cat === "LOW" ? r.below : r.equipment.category === cat));
  return (
    <Page title="Thiết bị" sub="Số dùng được = tổng − đang hỏng − đang sửa. Tổng số chỉ Quản lý nhập hoặc sửa (BR-70)." actions={<><Button size="sm" variant="outline" icon={FileSpreadsheet} onClick={() => setImp(true)}>Nhập từ Excel</Button><Button size="sm" icon={Plus} onClick={() => setForm({ name: "", category: "MEDICAL", roomId: 2, total: 1, minStock: 1, concurrent: 1, note: "" })}>Thêm thiết bị</Button></>}>
      <div className="flex flex-wrap gap-1.5"><Chip active={cat === "ALL"} onClick={() => setCat("ALL")}>Tất cả</Chip>{(Object.keys(EQUIP_CAT) as Equipment["category"][]).map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{EQUIP_CAT[c]}</Chip>)}<Chip active={cat === "LOW"} onClick={() => setCat("LOW")}>Dưới định mức ({data?.filter((r) => r.below).length ?? 0})</Chip></div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.equipment.id} onRowClick={(r) => setForm({ ...r.equipment })} columns={[
            { key: "n", header: "Thiết bị", render: (r) => <span><b className="text-navy">{r.equipment.name}</b><span className="block text-[11px] text-subtle">{r.equipment.note}</span></span> },
            { key: "c", header: "Nhóm", render: (r) => EQUIP_CAT[r.equipment.category] },
            { key: "r", header: "Phòng", render: (r) => r.room?.name },
            { key: "t", header: "Tổng", render: (r) => r.equipment.total },
            { key: "b", header: "Hỏng", render: (r) => r.equipment.broken || "—" },
            { key: "s", header: "Đang sửa", render: (r) => r.equipment.repairing || "—" },
            { key: "u", header: "Dùng được", render: (r) => <Badge tone={r.below ? "red" : "green"}>{r.usable}</Badge> },
            { key: "m", header: "Định mức", render: (r) => r.equipment.minStock },
            { key: "cc", header: "Phục vụ cùng lúc", render: (r) => r.equipment.concurrent },
            { key: "w", header: "", render: (r) => r.below ? <Badge tone="red">Dưới định mức</Badge> : r.reports ? <Badge tone="orange">{r.reports} báo hỏng</Badge> : null },
          ]} />
        )}
      </Card>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Sửa thiết bị" : "Thêm thiết bị"} width={540} footer={<><Button variant="neutral" onClick={() => setForm(null)}>Hủy</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Lưu</Button></>}>
        {form && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tên thiết bị" className="sm:col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <SelectField label="Nhóm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as "MEDICAL" })}>{(Object.keys(EQUIP_CAT) as Equipment["category"][]).map((c) => <option key={c} value={c}>{EQUIP_CAT[c]}</option>)}</SelectField>
            <SelectField label="Phòng đặt" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: Number(e.target.value) })}>{rooms.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</SelectField>
            <Field label="Tổng số lượng" type="number" value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} />
            <Field label="Định mức tối thiểu" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
            <Field label="Số chỗ phục vụ cùng lúc (xếp khung VLTL)" type="number" value={form.concurrent} onChange={(e) => setForm({ ...form, concurrent: Number(e.target.value) })} />
            <Field label="Ghi chú" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        )}
      </Modal>
      <Modal open={imp} onClose={() => setImp(false)} title="Nhập thiết bị từ Excel" footer={<><Button variant="neutral" onClick={() => setImp(false)}>Hủy</Button><Button loading={doImport.isPending} onClick={() => doImport.mutate()}>Nhập 2 dòng</Button></>}>
        <Note>Mẫu file: Tên · Nhóm · Phòng · Tổng · Định mức. Bản demo đọc sẵn 2 dòng: "Máy đo nhiệt độ hồng ngoại" (3) và "Gậy 4 chân" (4).</Note>
        <div className="mt-3 rounded-xl border-[1.5px] border-dashed border-input-line p-6 text-center text-[12.5px] text-subtle">thiet-bi-thang-10.xlsx</div>
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ damage reports
export function DamagePage() {
  const me = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState<"OPEN" | "ALL">("OPEN");
  const { data, isLoading } = useQuery({ queryKey: ["m-damage"], queryFn: () => manager.damage() });
  const set = useMutation({ mutationFn: ({ id, s }: { id: number; s: "REPAIRING" | "FIXED" | "DISPOSED" }) => manager.setDamageStatus(me, id, s), onSuccess: () => qc.invalidateQueries() });
  const rows = (data ?? []).filter((r) => f === "ALL" || r.report.status === "NEW" || r.report.status === "REPAIRING");
  return (
    <Page title="Báo hỏng" sub="Staff báo trên app, hệ thống trừ ngay khỏi số dùng được. Quản lý chọn: đang sửa / đã sửa xong (cộng lại) / thanh lý (giảm tổng) — mục 5.10.">
      <div className="flex gap-1.5"><Chip active={f === "OPEN"} onClick={() => setF("OPEN")}>Chưa xong</Chip><Chip active={f === "ALL"} onClick={() => setF("ALL")}>Tất cả</Chip></div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.report.id} columns={[
            { key: "t", header: "Lúc", render: (r) => `${dmy(r.report.reportedAt.slice(0, 10))} ${hm(r.report.reportedAt)}` },
            { key: "w", header: "Thiết bị / phòng", render: (r) => <b className="text-navy">{r.equipment?.name ?? r.room?.name}</b> },
            { key: "q", header: "SL", render: (r) => r.report.quantity },
            { key: "d", header: "Mô tả", render: (r) => <span className="text-[12px]">{r.report.description}</span> },
            { key: "b", header: "Người báo", render: (r) => r.reporter?.fullName },
            { key: "s", header: "Trạng thái", render: (r) => <Badge tone={r.report.status === "NEW" ? "red" : r.report.status === "REPAIRING" ? "orange" : r.report.status === "FIXED" ? "green" : "gray"}>{({ NEW: "Mới", REPAIRING: "Đang sửa", FIXED: "Đã sửa xong", DISPOSED: "Thanh lý" })[r.report.status]}</Badge> },
            { key: "x", header: "", render: (r) => (r.report.status === "NEW" || r.report.status === "REPAIRING") && (
              <span className="flex flex-wrap gap-1">
                {r.report.status === "NEW" && <Button size="sm" variant="outline" icon={Wrench} onClick={() => set.mutate({ id: r.report.id, s: "REPAIRING" })}>Đang sửa</Button>}
                <Button size="sm" variant="success" icon={CircleCheck} onClick={() => set.mutate({ id: r.report.id, s: "FIXED" })}>Sửa xong</Button>
                {r.equipment && <Button size="sm" variant="danger" onClick={() => set.mutate({ id: r.report.id, s: "DISPOSED" })}>Thanh lý</Button>}
              </span>
            ) },
          ]} />
        )}
      </Card>
      <Note>Phòng có sự cố: chuyển phòng sang Tạm đóng ở mục Khu và phòng. Sửa xong báo hỏng của phòng thì phòng tự mở lại.</Note>
    </Page>
  );
}

// ------------------------------------------------------------------ inventory
export function InventoryPage() {
  const me = useMe();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["m-inv"], queryFn: () => manager.inventory() });
  const create = useMutation({ mutationFn: () => manager.createInventory(me, "Kiểm kê đột xuất 10/2026"), onSuccess: (id) => nav(`/manager/facilities/inventory/${id}`) });
  return (
    <Page title="Kiểm kê" sub="Quản lý tự chọn kiểm kê theo tuần hoặc tháng: đếm thực tế, hệ thống so chênh lệch, ghi lý do, chốt phiếu. Số liệu đưa vào báo cáo gửi Admin." actions={<Button size="sm" icon={ClipboardCheck} loading={create.isPending} onClick={() => create.mutate()}>Tạo phiếu kiểm kê</Button>}>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={data ?? []} rowKey={(c) => c.id} onRowClick={(c) => nav(`/manager/facilities/inventory/${c.id}`)} columns={[
            { key: "t", header: "Phiếu", render: (c) => <b className="text-navy">{c.title}</b> },
            { key: "d", header: "Tạo lúc", render: (c) => `${dmy(c.createdAt.slice(0, 10))} ${hm(c.createdAt)}` },
            { key: "n", header: "Đã đếm", render: (c) => `${c.items.filter((i) => i.counted !== undefined).length}/${c.items.length}` },
            { key: "x", header: "Chênh lệch", render: (c) => { const n = c.items.filter((i) => i.counted !== undefined && i.counted !== i.system).length; return n ? <Badge tone="orange">{n} dòng</Badge> : "—"; } },
            { key: "s", header: "Trạng thái", render: (c) => c.status === "CLOSED" ? <Badge tone="green">Đã chốt {dm(c.closedAt?.slice(0, 10))}</Badge> : <Badge tone="blue">Đang đếm</Badge> },
          ]} />
        )}
      </Card>
    </Page>
  );
}

export function InventoryDetailPage() {
  const me = useMe();
  const qc = useQueryClient();
  const id = Number(useParams().id);
  const { data, isLoading } = useQuery({ queryKey: ["m-inv", id], queryFn: () => manager.inventoryCheck(id) });
  const [edits, setEdits] = useState<Record<number, { counted?: number; reason?: string }>>({});
  const save = useMutation({ mutationFn: (close: boolean) => manager.saveInventory(me, id, Object.entries(edits).map(([k, v]) => ({ equipmentId: Number(k), ...v })), close), onSuccess: () => { qc.invalidateQueries(); setEdits({}); } });
  if (isLoading || !data) return <Page title="Phiếu kiểm kê" back="/manager/facilities/inventory"><Loading /></Page>;
  const closed = data.check.status === "CLOSED";
  const val = (eid: number, k: "counted" | "reason") => (edits[eid]?.[k] ?? data.items.find((i) => i.equipmentId === eid)?.[k]);
  return (
    <Page title={data.check.title} back="/manager/facilities/inventory" actions={!closed && <><Button size="sm" variant="neutral" loading={save.isPending} onClick={() => save.mutate(false)}>Lưu nháp</Button><Button size="sm" variant="success" icon={Lock} loading={save.isPending} onClick={() => save.mutate(true)}>Chốt phiếu</Button></>}>
      <ErrorText error={save.error} />
      <Card>
        <Table rows={data.items} rowKey={(i) => i.equipmentId} columns={[
          { key: "n", header: "Thiết bị", render: (i) => <span><b className="text-navy">{i.equipment.name}</b><span className="block text-[11px] text-subtle">{EQUIP_CAT[i.equipment.category]}</span></span> },
          { key: "s", header: "Trên hệ thống", render: (i) => i.system },
          { key: "c", header: "Đếm thực tế", render: (i) => closed ? i.counted : <input type="number" min={0} value={val(i.equipmentId, "counted") ?? ""} onChange={(e) => setEdits({ ...edits, [i.equipmentId]: { ...edits[i.equipmentId], counted: e.target.value === "" ? undefined : Number(e.target.value) } })} className="h-8 w-20 rounded-lg border-[1.5px] border-input-line px-2 outline-none focus:border-orange" /> },
          { key: "d", header: "Chênh lệch", render: (i) => { const c = val(i.equipmentId, "counted") as number | undefined; if (c === undefined) return "—"; const d = c - i.system; return d === 0 ? <Badge tone="green">Khớp</Badge> : <Badge tone={d < 0 ? "red" : "orange"}>{d > 0 ? `+${d}` : d}</Badge>; } },
          { key: "r", header: "Lý do", render: (i) => closed ? <span className="text-[12px]">{i.reason ?? ""}</span> : <input value={(val(i.equipmentId, "reason") as string) ?? ""} onChange={(e) => setEdits({ ...edits, [i.equipmentId]: { ...edits[i.equipmentId], reason: e.target.value } })} placeholder="Bắt buộc nếu chênh lệch" className="h-8 w-full min-w-48 rounded-lg border-[1.5px] border-input-line px-2 text-[12px] outline-none focus:border-orange" /> },
        ]} />
      </Card>
      <Note>Chốt phiếu: tổng số lượng cập nhật theo số đếm thực tế; dòng chênh lệch phải có lý do.</Note>
    </Page>
  );
}
