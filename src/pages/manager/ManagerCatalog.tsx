// Manager · packages & schedule: price matrix + entitlements (4.1), target groups, service catalogue (4.2),
// weekly activities + AI menu (5.5), therapy & massage slots (4.9), holidays & announcements (BR-25).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CalendarPlus, CircleCheck, ListChecks, Megaphone, Pencil, Plus, Sparkles, Trash2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { manager, TODAY } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { GroupBadge, TierBadge } from "../../components/domain";
import { Badge, Button, Card, Chip, ErrorText, Field, KV, Loading, Modal, Note, SelectField, Table, Tabs, TextArea, Toggle, cn } from "../../components/ui";
import { CYCLE_DESC, CYCLE_LABEL, CYCLES, cycleUnit, GROUP_INFO, GROUP_LABEL, GROUPS, minTierFor, monthCycle, POSITION_LABEL, TIER_LABEL, TIERS, WEEKDAY_LABEL, weekdaysLabel } from "../../domain/catalog";
import { dm, dmy, hm, vnd, weekday } from "../../lib/format";
import type { ActivitySchedule, Cycle, CycleDef, GroupDef, Menu, Service, ServiceKind, TargetGroup, Tier, TierDef, TierEntitlement } from "../../types/models";

// ------------------------------------------------------------------ packages
const ENT_ROWS: [keyof TierEntitlement, string, "money" | "num" | "text" | "bool" | "nullnum"][] = [
  ["dailyPrice", "Giá tham khảo / ngày", "money"], ["staffRatio", "Số cụ trên mỗi staff (1:x)", "num"], ["meals", "Bữa trong ngày", "text"], ["menu", "Thực đơn", "text"],
  ["napRoom", "Phòng nghỉ trưa", "text"], ["fixedBed", "Giường cố định", "bool"], ["vitalsPerDay", "Đo HA, mạch, nhiệt độ (lần/ngày)", "num"], ["monthlyHealthReport", "Báo cáo sức khỏe tháng", "bool"],
  ["glucose", "Đo đường huyết (cụ tiểu đường)", "text"], ["weight", "Theo dõi cân nặng", "text"], ["optionalPool", "Số hoạt động tự chọn có trong hạng", "num"], ["optionalMax", "Được tích tối đa", "num"],
  ["photoPerDay", "Ảnh trên app / ngày (trống = không giới hạn)", "nullnum"], ["chat", "Nhắn tin với staff", "text"], ["waitlistPriority", "Ưu tiên đầu danh sách chờ", "bool"],
];
const TONES: TierDef["tone"][] = ["blue", "teal", "purple", "orange", "green", "red", "gray"];
const KIND_LABEL: Record<CycleDef["kind"], string> = { DAY: "Theo ngày (chọn từng ngày)", WEEKLY: "Theo buổi cố định trong tuần (tính theo tháng)", PERIOD: "Theo tháng (đi T2–T7)" };
const DOW = [1, 2, 3, 4, 5, 6];
const cycleMeta = (c: CycleDef) => [c.kind === "DAY" ? "Theo ngày" : c.kind === "WEEKLY" ? `${(c.weekdayOptions ?? []).map(weekdaysLabel).join(" hoặc ")}` : `${c.months} tháng`, c.discount ? `giảm ${Math.round(c.discount * 100)}%` : ""].filter(Boolean).join(" · ");

type TierForm = { id?: Tier; label: string; tone: TierDef["tone"]; highlight: boolean; hidden: boolean; copyFrom?: Tier; monthlyPrice: string };
type CycleForm = { id?: Cycle; label: string; desc: string; kind: CycleDef["kind"]; months: string; discount: string; weekdayOptions: number[][]; hidden: boolean; reprice: boolean; used: boolean };
type GroupForm = Omit<GroupDef, "id" | "rank" | "care" | "status" | "reassessMonths"> & { id?: TargetGroup; care: string; hidden: boolean; monthly: string; reassessMonths: string };
type DelTarget = { kind: "tier" | "cycle" | "group" | "perk"; id: string; label: string; blocker: string };

function ToneChips({ value, onChange }: { value: string; onChange: (t: TierDef["tone"]) => void }) {
  return (
    <div><div className="mb-1 text-[11.5px] font-semibold text-muted">Màu nhãn</div>
      <div className="flex flex-wrap gap-1.5">{TONES.map((t) => <button key={t} type="button" onClick={() => onChange(t)} className={cn("rounded-full p-0.5", value === t && "ring-2 ring-orange")}><Badge tone={t}>{t === "gray" ? "xám" : t}</Badge></button>)}</div>
    </div>
  );
}

export function PackagesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"price" | "ent" | "groups">("price");
  const [edit, setEdit] = useState<{ id: number; price: string; hidden: boolean }>();
  const [entEdit, setEntEdit] = useState<Tier>();
  const [ent, setEnt] = useState<Partial<TierEntitlement>>({});
  const [tf, setTf] = useState<TierForm>();
  const [cf, setCf] = useState<CycleForm>();
  const [gf, setGf] = useState<GroupForm>();
  const [pf, setPf] = useState<{ id?: number; label: string; values: Record<Tier, string> }>();
  const [del, setDel] = useState<DelTarget>();
  const { data, isLoading } = useQuery({ queryKey: ["m-pkgs"], queryFn: () => manager.packages() });
  const done = () => qc.invalidateQueries();
  const savePrice = useMutation({ mutationFn: () => manager.savePrice(me, edit!.id, Number(edit!.price), edit!.hidden ? "HIDDEN" : "ACTIVE"), onSuccess: () => { done(); setEdit(undefined); } });
  const saveEnt = useMutation({ mutationFn: () => manager.saveEntitlement(me, entEdit!, ent), onSuccess: () => { done(); setEntEdit(undefined); } });
  const saveTier = useMutation({ mutationFn: () => manager.saveTier(me, { id: tf!.id, label: tf!.label, tone: tf!.tone, highlight: tf!.highlight, status: tf!.hidden ? "HIDDEN" : "ACTIVE", copyFrom: tf!.copyFrom, monthlyPrice: tf!.id ? undefined : Number(tf!.monthlyPrice) }), onSuccess: () => { done(); setTf(undefined); } });
  const moveTier = useMutation({ mutationFn: (x: { id: Tier; dir: -1 | 1 }) => manager.moveTier(me, x.id, x.dir), onSuccess: done });
  const saveCycle = useMutation({ mutationFn: () => manager.saveCycle(me, { id: cf!.id, label: cf!.label, desc: cf!.desc, kind: cf!.kind, months: Number(cf!.months), discount: Number(cf!.discount) / 100, weekdayOptions: cf!.weekdayOptions, status: cf!.hidden ? "HIDDEN" : "ACTIVE", reprice: cf!.reprice }), onSuccess: () => { done(); setCf(undefined); } });
  const saveGroup = useMutation({ mutationFn: () => manager.saveGroup(me, { ...gf!, care: gf!.care.split("\n"), status: gf!.hidden ? "HIDDEN" : "ACTIVE", monthly: Number(gf!.monthly), reassessMonths: Number(gf!.reassessMonths) }), onSuccess: () => { done(); setGf(undefined); } });
  const savePerk = useMutation({ mutationFn: () => manager.savePerk(me, pf!), onSuccess: () => { done(); setPf(undefined); } });
  const remove = useMutation({
    mutationFn: (t: DelTarget) => (t.kind === "tier" ? manager.deleteTier(me, t.id) : t.kind === "cycle" ? manager.deleteCycle(me, t.id) : t.kind === "group" ? manager.deleteGroup(me, t.id) : manager.deletePerk(me, Number(t.id))),
    onSuccess: () => { done(); setDel(undefined); },
  });
  /** Already used → offer to stop selling instead of deleting. */
  const stop = useMutation({
    mutationFn: async (t: DelTarget) => {
      if (t.kind === "tier") { const x = data!.tiers.find((r) => r.def.id === t.id)!.def; return manager.saveTier(me, { ...x, status: "HIDDEN" }); }
      if (t.kind === "cycle") { const x = data!.cycles.find((r) => r.def.id === t.id)!.def; return manager.saveCycle(me, { ...x, status: "HIDDEN" }); }
      const x = data!.groups.find((r) => r.def.id === t.id)!;
      return manager.saveGroup(me, { ...x.def, status: "HIDDEN", monthly: x.monthly });
    },
    onSuccess: () => { done(); setDel(undefined); },
  });
  if (isLoading || !data) return <Page title="Gói & quyền lợi"><Loading /></Page>;
  const tiers = data.tiers;
  const cell = (tier: Tier, cycle: Cycle) => data.packages.find((p) => p.pkg.tier === tier && p.pkg.cycle === cycle);
  const monthPrice = (t: Tier) => cell(t, monthCycle())?.pkg.basePrice ?? 0;
  const openTier = (t?: (typeof tiers)[number]) => setTf(t ? { id: t.def.id, label: t.def.label, tone: t.def.tone, highlight: !!t.def.highlight, hidden: t.def.status === "HIDDEN", monthlyPrice: "" } : { label: "", tone: "orange", highlight: false, hidden: false, copyFrom: tiers[tiers.length - 1]?.def.id, monthlyPrice: String(monthPrice(tiers[tiers.length - 1]?.def.id)) });
  const openCycle = (c?: (typeof data.cycles)[number]) => setCf(c
    ? { id: c.def.id, label: c.def.label, desc: c.def.desc, kind: c.def.kind, months: String(c.def.months || 1), discount: String(Math.round(c.def.discount * 100)), weekdayOptions: c.def.weekdayOptions ?? [[1, 3, 5]], hidden: c.def.status === "HIDDEN", reprice: false, used: c.used > 0 }
    : { label: "", desc: "", kind: "PERIOD", months: "6", discount: "7", weekdayOptions: [[1, 3, 5]], hidden: false, reprice: false, used: false });
  const openGroup = (g?: (typeof data.groups)[number]) => setGf(g
    ? { ...g.def, care: g.def.care.join("\n"), hidden: g.def.status === "HIDDEN", monthly: String(g.monthly), reassessMonths: String(g.def.reassessMonths) }
    : { label: "", tone: "teal", who: "", care: "", watch: "", report: "", limits: "", owner: "Điều dưỡng", reassessMonths: "3", minTier: TIERS[1] ?? TIERS[0], disease: true, hidden: false, monthly: "500000" });
  const askDel = (kind: DelTarget["kind"], id: string, label: string, blocker = "") => { remove.reset(); stop.reset(); setDel({ kind, id, label, blocker }); };
  const off = <Badge tone="gray">Ngừng</Badge>;
  const cfMonths = cf?.kind === "PERIOD" ? Number(cf.months) : 1;
  const cfPreview = cf && !cf.id ? tiers.filter((t) => t.def.status === "ACTIVE").map((t) => [t.def.id, cf.kind === "DAY" ? data.entitlements.find((e) => e.tier === t.def.id)?.dailyPrice ?? 0 : Math.round((monthPrice(t.def.id) * (cf.kind === "WEEKLY" ? (cf.weekdayOptions[0]?.length ?? 3) / 6 : cfMonths) * (1 - Number(cf.discount) / 100)) / 1000) * 1000] as const) : [];
  return (
    <Page title="Gói & quyền lợi" sub="Gói = Thời hạn × Hạng, áp dụng theo Nhóm đối tượng. Quản lý thêm, sửa, ngừng bán hoặc xóa cả ba (mục 4.1). Đã có cụ dùng thì chỉ ngừng, không xóa.">
      <Tabs value={tab} onChange={setTab} items={[{ value: "price", label: `Bảng giá (${data.cycles.length} thời hạn × ${tiers.length} hạng)` }, { value: "ent", label: "Hạng & quyền lợi" }, { value: "groups", label: `Nhóm đối tượng (${data.groups.length})` }]} />
      {tab === "price" && (
        <>
          <Card title="Bảng giá" actions={<Button size="sm" icon={Plus} onClick={() => { saveCycle.reset(); openCycle(); }}>Thêm thời hạn</Button>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[12.5px]">
                <thead><tr className="border-b-[1.5px] border-line text-left"><th className="px-2 py-2 text-[10.5px] text-subtle uppercase">Thời hạn</th>{tiers.map((t) => <th key={t.def.id} className={cn("px-2 py-2", t.def.status === "HIDDEN" && "opacity-50")}><TierBadge tier={t.def.id} /> <span className="text-[11px] text-subtle">{data.capacity.find((c) => c.tier === t.def.id)?.held ?? 0}/{data.capacity.find((c) => c.tier === t.def.id)?.beds ?? 0} chỗ</span></th>)}</tr></thead>
                <tbody>
                  {data.cycles.map(({ def: c, used, blocker }) => (
                    <tr key={c.id} className="border-b border-line-soft align-top">
                      <td className="px-2 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span><b className="text-navy">{c.label}</b> {c.status === "HIDDEN" && off}<span className="block text-[11px] text-orange">{cycleMeta(c)}</span><span className="block max-w-60 text-[11px] text-subtle">{c.desc}</span></span>
                          <span className="flex shrink-0 gap-1">
                            <button aria-label={`Sửa ${c.label}`} title="Sửa" onClick={() => { saveCycle.reset(); openCycle(data.cycles.find((x) => x.def.id === c.id)); }} className="rounded-md p-1 text-faint hover:bg-canvas hover:text-orange"><Pencil size={13} /></button>
                            <button aria-label={`Xóa ${c.label}`} title={blocker || (c.id === monthCycle() ? "Giá tham chiếu, không xóa" : "Xóa")} onClick={() => askDel("cycle", c.id, c.label, blocker || (c.id === monthCycle() ? "là giá tham chiếu 1 tháng cho các thời hạn khác" : ""))} className="rounded-md p-1 text-faint hover:bg-red-soft/50 hover:text-red-ink"><Trash2 size={13} /></button>
                          </span>
                        </div>
                        {used > 0 && <span className="text-[10.5px] text-subtle">{used} đăng ký</span>}
                      </td>
                      {tiers.map((t) => {
                        const p = cell(t.def.id, c.id);
                        if (!p) return <td key={t.def.id} className="px-2 py-2.5 text-faint">—</td>;
                        const base = c.kind === "PERIOD" && c.months > 1 ? monthPrice(t.def.id) * c.months : 0;
                        const disc = base ? 1 - p.pkg.basePrice / base : 0;
                        return (
                          <td key={t.def.id} className="px-2 py-2.5">
                            <button onClick={() => { savePrice.reset(); setEdit({ id: p.pkg.id, price: String(p.pkg.basePrice), hidden: p.pkg.status === "HIDDEN" }); }} className={cn("group w-full rounded-lg border border-transparent px-2 py-1 text-left hover:border-orange", (p.pkg.status === "HIDDEN" || c.status === "HIDDEN" || t.def.status === "HIDDEN") && "opacity-50")}>
                              <span className="flex items-center gap-1 font-bold text-navy">{vnd(p.pkg.basePrice)}<Pencil size={11} className="text-faint group-hover:text-orange" /></span>
                              <span className="block text-[11px] text-subtle">/{cycleUnit(c.id)}{disc > 0.005 ? ` · giảm ${Math.round(disc * 100)}%` : ""}{p.pkg.status === "HIDDEN" ? " · ngừng bán" : ""}</span>
                              <span className="block text-[11px] text-subtle">{p.active} cụ đang dùng</span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title="Công thức giá (mục 4.4)">
            <div className="rounded-lg bg-canvas px-3 py-2 font-mono text-[12px] text-navy">Giá kỳ = Giá gốc (hạng × thời hạn) − giảm giá thời hạn + phụ phí cố định theo nhóm + dịch vụ lẻ</div>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12px] text-muted">
              <li>Thêm thời hạn: hệ thống gợi ý giá = giá {CYCLE_LABEL[monthCycle()]?.toLowerCase()} × số tháng × (1 − % giảm) cho mọi hạng, Quản lý sửa lại từng ô.</li>
              <li>Mỗi nhóm có hạng tối thiểu (BR-11). Web hiển thị giá chưa gồm phụ phí.</li>
              <li>Nâng hạng có hiệu lực ngay, trả chênh lệch cho số ngày còn lại. Hạ hạng có hiệu lực từ kỳ sau.</li>
              <li>Ngừng bán: ẩn khỏi trang đăng ký, cụ đang dùng không bị ảnh hưởng. Chỉ xóa được khi chưa có đăng ký nào.</li>
            </ul>
          </Card>
        </>
      )}
      {tab === "ent" && (
        <Card title="Hạng & quyền lợi" actions={<span className="flex gap-1.5"><Button size="sm" variant="outline" icon={Plus} onClick={() => { savePerk.reset(); setPf({ label: "", values: Object.fromEntries(tiers.map((t) => [t.def.id, ""])) }); }}>Thêm dòng quyền lợi</Button><Button size="sm" icon={Plus} onClick={() => { saveTier.reset(); openTier(); }}>Thêm hạng</Button></span>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[12.5px]">
              <thead>
                <tr className="border-b-[1.5px] border-line text-left">
                  <th className="px-2 py-2 text-[10.5px] text-subtle uppercase">Quyền lợi</th>
                  {tiers.map((t, i) => (
                    <th key={t.def.id} className={cn("px-2 py-2", t.def.status === "HIDDEN" && "opacity-60")}>
                      <div className="flex flex-wrap items-center gap-1"><TierBadge tier={t.def.id} />{t.def.highlight && <Badge tone="orange">Phổ biến</Badge>}{t.def.status === "HIDDEN" && off}</div>
                      <div className="mt-1 flex gap-0.5">
                        <button title="Hạng thấp hơn" aria-label="Chuyển sang trái" disabled={i === 0} onClick={() => moveTier.mutate({ id: t.def.id, dir: -1 })} className="rounded-md p-1 text-faint hover:bg-canvas hover:text-navy disabled:opacity-30"><ArrowLeft size={13} /></button>
                        <button title="Hạng cao hơn" aria-label="Chuyển sang phải" disabled={i === tiers.length - 1} onClick={() => moveTier.mutate({ id: t.def.id, dir: 1 })} className="rounded-md p-1 text-faint hover:bg-canvas hover:text-navy disabled:opacity-30"><ArrowRight size={13} /></button>
                        <button title="Sửa tên, màu, trạng thái" aria-label={`Sửa hạng ${t.def.label}`} onClick={() => { saveTier.reset(); openTier(t); }} className="rounded-md p-1 text-faint hover:bg-canvas hover:text-orange"><Pencil size={13} /></button>
                        <button title="Sửa quyền lợi" aria-label={`Sửa quyền lợi ${t.def.label}`} onClick={() => { saveEnt.reset(); setEntEdit(t.def.id); setEnt({ ...data.entitlements.find((e) => e.tier === t.def.id) }); }} className="rounded-md p-1 text-faint hover:bg-canvas hover:text-orange"><ListChecks size={13} /></button>
                        <button title={t.blocker || "Xóa hạng"} aria-label={`Xóa hạng ${t.def.label}`} onClick={() => askDel("tier", t.def.id, `hạng ${t.def.label}`, t.blocker)} className="rounded-md p-1 text-faint hover:bg-red-soft/50 hover:text-red-ink"><Trash2 size={13} /></button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line-soft"><td className="px-2 py-2 text-muted">Số chỗ (giường nghỉ trưa)</td>{tiers.map((t) => <td key={t.def.id} className="px-2 py-2 font-semibold">{data.capacity.find((c) => c.tier === t.def.id)?.beds ?? 0} <span className="font-normal text-subtle">· {t.active} cụ đang dùng</span></td>)}</tr>
                {ENT_ROWS.map(([k, label, type]) => (
                  <tr key={k} className="border-b border-line-soft">
                    <td className="px-2 py-2 text-muted">{label}</td>
                    {tiers.map((t) => {
                      const v = data.entitlements.find((e) => e.tier === t.def.id)?.[k];
                      return <td key={t.def.id} className="px-2 py-2 font-semibold text-ink">{v === undefined ? "—" : type === "money" ? vnd(v as number) : type === "bool" ? (v ? <CircleCheck size={15} className="text-green" /> : "—") : type === "nullnum" ? (v === null ? "Không giới hạn" : String(v)) : String(v)}</td>;
                    })}
                  </tr>
                ))}
                <tr className="border-b border-line-soft"><td className="px-2 py-2 text-muted">Cảnh báo sức khỏe AI tới gia đình</td>{tiers.map((t) => <td key={t.def.id} className="px-2 py-2 font-semibold">{data.entitlements.find((e) => e.tier === t.def.id)?.aiAlertFamily === "ALL" ? "Có" : "Chỉ khi khẩn cấp"}</td>)}</tr>
                {data.perks.map((pk) => (
                  <tr key={pk.id} className="border-b border-line-soft bg-orange-soft/30">
                    <td className="px-2 py-2 text-muted">
                      <span className="flex items-center gap-1">{pk.label}
                        <button aria-label={`Sửa ${pk.label}`} onClick={() => { savePerk.reset(); setPf({ id: pk.id, label: pk.label, values: { ...pk.values } }); }} className="rounded-md p-1 text-faint hover:text-orange"><Pencil size={12} /></button>
                        <button aria-label={`Xóa ${pk.label}`} onClick={() => askDel("perk", String(pk.id), `quyền lợi "${pk.label}"`)} className="rounded-md p-1 text-faint hover:text-red-ink"><Trash2 size={12} /></button>
                      </span>
                    </td>
                    {tiers.map((t) => <td key={t.def.id} className="px-2 py-2 font-semibold text-ink">{pk.values[t.def.id] || "—"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Note className="mt-3">Thứ tự cột = thứ tự hạng từ thấp đến cao (dùng cho nâng hạng và hạng tối thiểu của nhóm). Hệ thống bật/tắt tính năng theo quyền lợi của gói đang hiệu lực (BR-04). Hạng mới cần thêm giường ở Cơ sở vật chất → Giường nghỉ trưa thì mới có chỗ bán gói dài hạn.</Note>
        </Card>
      )}
      {tab === "groups" && (
        <>
          <div className="flex justify-end"><Button icon={Plus} onClick={() => { saveGroup.reset(); openGroup(); }}>Thêm nhóm</Button></div>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.groups.map((row) => {
              const i = row.def;
              return (
                <Card key={i.id} className={cn(i.status === "HIDDEN" && "opacity-70")} title={<span className="flex items-center gap-2"><GroupBadge group={i.id} />{i.status === "HIDDEN" && <Badge tone="gray">Ngừng nhận</Badge>}<span className="text-[12px] font-normal text-subtle">{row.count} cụ</span></span>}
                  actions={<span className="flex gap-1"><Button size="sm" variant="neutral" icon={Pencil} onClick={() => { saveGroup.reset(); openGroup(row); }}>Sửa</Button><Button size="sm" variant="danger" icon={Trash2} aria-label={`Xóa nhóm ${i.label}`} title={row.blocker || "Xóa nhóm"} onClick={() => askDel("group", i.id, `nhóm ${i.label}`, row.blocker)} /></span>}>
                  <KV label="Dành cho" w={110}>{i.who}</KV>
                  {i.care.length > 0 && <KV label="Chăm sóc riêng" w={110}>{i.care.join(" · ")}</KV>}
                  <KV label="Theo dõi" w={110}>{i.watch || "—"}</KV>
                  <KV label="Báo cáo GĐ" w={110}>{i.report || "—"}</KV>
                  <KV label="Hạn chế" w={110}>{i.limits}</KV>
                  <KV label="Phụ trách" w={110}>{i.owner || "—"}</KV>
                  <KV label="Đánh giá lại" w={110}>{i.reassessMonths === 1 ? "Mỗi tháng" : `${i.reassessMonths} tháng/lần`}</KV>
                  <KV label="Hạng tối thiểu" w={110}><TierBadge tier={i.minTier} /></KV>
                  <KV label="Phụ phí" w={110}>{row.monthly ? <b className="text-orange">{vnd(row.monthly)}/tháng</b> : "Không có"}{i.disease && <Badge tone="orange" className="ml-2">Nhóm bệnh · dịch vụ ⚠ cần điều dưỡng cho phép</Badge>}</KV>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ---- giá một ô */}
      <Modal open={!!edit} onClose={() => setEdit(undefined)} title="Sửa giá gói" footer={<><Button variant="neutral" onClick={() => setEdit(undefined)}>Hủy</Button><Button disabled={!(Number(edit?.price) > 0)} loading={savePrice.isPending} onClick={() => savePrice.mutate()}>Lưu</Button></>}>
        {edit && (
          <div className="space-y-3">
            <div className="text-[13px] font-semibold text-navy">{(() => { const p = data.packages.find((x) => x.pkg.id === edit.id)!.pkg; return `${CYCLE_LABEL[p.cycle]} · ${TIER_LABEL[p.tier]}`; })()}</div>
            <Field label="Giá gốc (đ)" type="number" min={0} step={10000} value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} error={Number(edit.price) > 0 ? undefined : "Giá phải lớn hơn 0"} />
            <Toggle checked={edit.hidden} onChange={(v) => setEdit({ ...edit, hidden: v })} label="Ngừng bán ô này" sub="Cụ đang dùng không bị ảnh hưởng" />
            <Note>Giá mới áp dụng cho đăng ký và gia hạn từ bây giờ. Đăng ký đã thanh toán giữ giá cũ.</Note>
            <ErrorText error={savePrice.error} />
          </div>
        )}
      </Modal>

      {/* ---- thời hạn */}
      <Modal open={!!cf} onClose={() => setCf(undefined)} title={cf?.id ? `Sửa thời hạn · ${CYCLE_LABEL[cf.id]}` : "Thêm thời hạn"} width={560} footer={<><Button variant="neutral" onClick={() => setCf(undefined)}>Hủy</Button><Button loading={saveCycle.isPending} onClick={() => saveCycle.mutate()}>{cf?.id ? "Lưu" : "Thêm"}</Button></>}>
        {cf && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tên thời hạn" required className="sm:col-span-2" placeholder="VD: Gói 6 tháng" value={cf.label} onChange={(e) => setCf({ ...cf, label: e.target.value })} />
            <TextArea label="Mô tả cho gia đình" className="sm:col-span-2" value={cf.desc} onChange={(e) => setCf({ ...cf, desc: e.target.value })} />
            <SelectField label="Cách tính" className="sm:col-span-2" disabled={cf.used || cf.id === monthCycle()} value={cf.kind} onChange={(e) => setCf({ ...cf, kind: e.target.value as CycleDef["kind"] })}>{(Object.keys(KIND_LABEL) as CycleDef["kind"][]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</SelectField>
            {cf.kind === "PERIOD" && <Field label="Số tháng mỗi kỳ (1–24)" type="number" min={1} max={24} disabled={cf.used || cf.id === monthCycle()} value={cf.months} onChange={(e) => setCf({ ...cf, months: e.target.value })} />}
            {cf.kind !== "DAY" && <Field label="Giảm giá (%)" type="number" min={0} max={50} value={cf.discount} onChange={(e) => setCf({ ...cf, discount: e.target.value })} />}
            {cf.kind === "WEEKLY" && (
              <div className="sm:col-span-2">
                <div className="mb-1 text-[11.5px] font-semibold text-muted">Bộ ngày cố định gia đình được chọn</div>
                {cf.weekdayOptions.map((w, i) => (
                  <div key={i} className="mb-1.5 flex flex-wrap items-center gap-1">
                    {DOW.map((dw) => <Chip key={dw} active={w.includes(dw)} onClick={() => setCf({ ...cf, weekdayOptions: cf.weekdayOptions.map((x, j) => (j === i ? (x.includes(dw) ? x.filter((y) => y !== dw) : [...x, dw].sort()) : x)) })}>{WEEKDAY_LABEL[dw]}</Chip>)}
                    {cf.weekdayOptions.length > 1 && <button aria-label="Bỏ bộ ngày" onClick={() => setCf({ ...cf, weekdayOptions: cf.weekdayOptions.filter((_, j) => j !== i) })} className="p-1 text-faint hover:text-red-ink"><X size={13} /></button>}
                  </div>
                ))}
                <Button size="sm" variant="neutral" icon={Plus} onClick={() => setCf({ ...cf, weekdayOptions: [...cf.weekdayOptions, [2, 4, 6]] })}>Thêm bộ ngày</Button>
              </div>
            )}
            <div className="sm:col-span-2"><Toggle checked={cf.hidden} onChange={(v) => setCf({ ...cf, hidden: v })} label="Ngừng bán" sub="Ẩn khỏi trang đăng ký, cụ đang dùng vẫn chạy bình thường" /></div>
            {cf.id && cf.id !== monthCycle() && cf.kind !== "DAY" && <div className="sm:col-span-2"><Toggle checked={cf.reprice} onChange={(v) => setCf({ ...cf, reprice: v })} label="Tính lại giá mọi hạng theo % giảm" sub={`Giá = giá ${CYCLE_LABEL[monthCycle()]?.toLowerCase()} × số tháng × (1 − % giảm). Tắt để giữ giá đang nhập tay.`} /></div>}
            {cf.used && <Note className="sm:col-span-2">Đã có cụ đăng ký thời hạn này: chỉ sửa được tên, mô tả, % giảm và trạng thái.</Note>}
            {cfPreview.length > 0 && <Note tone="green" className="sm:col-span-2">Giá gợi ý sẽ tạo: {cfPreview.map(([t, v]) => `${TIER_LABEL[t]} ${vnd(v)}`).join(" · ")}. Sửa từng ô sau ở bảng giá.</Note>}
            <div className="sm:col-span-2"><ErrorText error={saveCycle.error} /></div>
          </div>
        )}
      </Modal>

      {/* ---- hạng */}
      <Modal open={!!tf} onClose={() => setTf(undefined)} title={tf?.id ? `Sửa hạng · ${TIER_LABEL[tf.id]}` : "Thêm hạng"} width={520} footer={<><Button variant="neutral" onClick={() => setTf(undefined)}>Hủy</Button><Button loading={saveTier.isPending} onClick={() => saveTier.mutate()}>{tf?.id ? "Lưu" : "Thêm"}</Button></>}>
        {tf && (
          <div className="space-y-2.5">
            <Field label="Tên hạng" required placeholder="VD: Đặc biệt" value={tf.label} onChange={(e) => setTf({ ...tf, label: e.target.value })} />
            <ToneChips value={tf.tone} onChange={(tone) => setTf({ ...tf, tone })} />
            {!tf.id && (
              <div className="grid gap-2 sm:grid-cols-2">
                <SelectField label="Sao chép quyền lợi từ" value={tf.copyFrom} onChange={(e) => setTf({ ...tf, copyFrom: e.target.value, monthlyPrice: String(monthPrice(e.target.value)) })}>{tiers.map((t) => <option key={t.def.id} value={t.def.id}>{t.def.label}</option>)}</SelectField>
                <Field label={`Giá ${CYCLE_LABEL[monthCycle()]?.toLowerCase()} (đ)`} type="number" min={0} step={100000} value={tf.monthlyPrice} onChange={(e) => setTf({ ...tf, monthlyPrice: e.target.value })} error={Number(tf.monthlyPrice) > 0 ? undefined : "Nhập giá"} />
              </div>
            )}
            <Toggle checked={tf.highlight} onChange={(v) => setTf({ ...tf, highlight: v })} label="Gắn nhãn “Phổ biến” trên trang giới thiệu" sub="Chỉ một hạng được gắn" />
            <Toggle checked={tf.hidden} onChange={(v) => setTf({ ...tf, hidden: v })} label="Ngừng bán hạng này" sub="Cụ đang dùng không bị ảnh hưởng" />
            {!tf.id && <Note>Hạng mới đứng cao nhất (đổi thứ tự bằng mũi tên ở đầu cột). Hệ thống tạo giá cho mọi thời hạn theo tỷ lệ giá tháng so với hạng sao chép, chép quyền lợi và định mức dịch vụ. Nhớ thêm giường nghỉ trưa cho hạng mới.</Note>}
            <ErrorText error={saveTier.error} />
          </div>
        )}
      </Modal>

      {/* ---- quyền lợi chuẩn của một hạng */}
      <Modal open={!!entEdit} onClose={() => setEntEdit(undefined)} title={`Quyền lợi hạng ${entEdit ? TIER_LABEL[entEdit] : ""}`} width={560} footer={<><Button variant="neutral" onClick={() => setEntEdit(undefined)}>Hủy</Button><Button loading={saveEnt.isPending} onClick={() => saveEnt.mutate()}>Lưu</Button></>}>
        <div className="grid gap-2 sm:grid-cols-2">
          {ENT_ROWS.map(([k, label, type]) => type === "bool"
            ? <div key={k} className="sm:col-span-2"><Toggle checked={!!ent[k]} onChange={(v) => setEnt({ ...ent, [k]: v })} label={label} /></div>
            : <Field key={k} label={label} type={type === "text" ? "text" : "number"} min={type === "text" ? undefined : 0} value={ent[k] === null || ent[k] === undefined ? "" : String(ent[k])} onChange={(e) => setEnt({ ...ent, [k]: type === "text" ? e.target.value : type === "nullnum" && e.target.value === "" ? null : Number(e.target.value) })} />)}
          <SelectField label="Cảnh báo AI tới gia đình" value={ent.aiAlertFamily} onChange={(e) => setEnt({ ...ent, aiAlertFamily: e.target.value as "ALL" })}><option value="ALL">Có</option><option value="URGENT_ONLY">Chỉ khi khẩn cấp</option></SelectField>
          <div className="sm:col-span-2"><ErrorText error={saveEnt.error} /></div>
        </div>
      </Modal>

      {/* ---- dòng quyền lợi tự thêm */}
      <Modal open={!!pf} onClose={() => setPf(undefined)} title={pf?.id ? "Sửa dòng quyền lợi" : "Thêm dòng quyền lợi"} width={480} footer={<><Button variant="neutral" onClick={() => setPf(undefined)}>Hủy</Button><Button loading={savePerk.isPending} onClick={() => savePerk.mutate()}>Lưu</Button></>}>
        {pf && (
          <div className="space-y-2">
            <Field label="Tên quyền lợi" required placeholder="VD: Cắt tóc miễn phí" value={pf.label} onChange={(e) => setPf({ ...pf, label: e.target.value })} />
            {tiers.map((t) => <Field key={t.def.id} label={`Hạng ${t.def.label}`} placeholder="Để trống = không có" value={pf.values[t.def.id] ?? ""} onChange={(e) => setPf({ ...pf, values: { ...pf.values, [t.def.id]: e.target.value } })} />)}
            <ErrorText error={savePerk.error} />
          </div>
        )}
      </Modal>

      {/* ---- nhóm đối tượng */}
      <Modal open={!!gf} onClose={() => setGf(undefined)} title={gf?.id ? `Sửa nhóm · ${GROUP_LABEL[gf.id]}` : "Thêm nhóm đối tượng"} width={620} footer={<><Button variant="neutral" onClick={() => setGf(undefined)}>Hủy</Button><Button loading={saveGroup.isPending} onClick={() => saveGroup.mutate()}>{gf?.id ? "Lưu" : "Thêm"}</Button></>}>
        {gf && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tên nhóm" required className="sm:col-span-2" placeholder="VD: Parkinson nhẹ" value={gf.label} onChange={(e) => setGf({ ...gf, label: e.target.value })} />
            <div className="sm:col-span-2"><ToneChips value={gf.tone} onChange={(tone) => setGf({ ...gf, tone })} /></div>
            <TextArea label="Dành cho ai" required className="sm:col-span-2" value={gf.who} onChange={(e) => setGf({ ...gf, who: e.target.value })} />
            <TextArea label="Chăm sóc riêng (mỗi dòng một ý)" className="sm:col-span-2" value={gf.care} onChange={(e) => setGf({ ...gf, care: e.target.value })} />
            <Field label="Cần theo dõi" value={gf.watch} onChange={(e) => setGf({ ...gf, watch: e.target.value })} />
            <Field label="Báo cáo cho gia đình" value={gf.report} onChange={(e) => setGf({ ...gf, report: e.target.value })} />
            <Field label="Hạn chế" value={gf.limits} onChange={(e) => setGf({ ...gf, limits: e.target.value })} />
            <Field label="Phụ trách" value={gf.owner} onChange={(e) => setGf({ ...gf, owner: e.target.value })} />
            <SelectField label="Hạng tối thiểu (BR-11)" value={gf.minTier} onChange={(e) => setGf({ ...gf, minTier: e.target.value })}>{tiers.map((t) => <option key={t.def.id} value={t.def.id}>{t.def.label}{t.def.status === "HIDDEN" ? " (ngừng bán)" : ""}</option>)}</SelectField>
            <Field label="Đánh giá lại sau (tháng)" type="number" min={1} max={12} value={gf.reassessMonths} onChange={(e) => setGf({ ...gf, reassessMonths: e.target.value })} />
            <Field label="Phụ phí cố định (đ/tháng)" type="number" min={0} step={50000} value={gf.monthly} onChange={(e) => setGf({ ...gf, monthly: e.target.value })} error={Number(gf.monthly) >= 0 && Number(gf.monthly) % 1000 === 0 ? undefined : "Số tiền ≥ 0, tròn nghìn"} />
            <div className="self-end pb-1"><Toggle checked={gf.disease} onChange={(v) => setGf({ ...gf, disease: v })} label="Nhóm bệnh" sub="Dịch vụ ⚠ cần điều dưỡng cho phép" /></div>
            <div className="sm:col-span-2"><Toggle checked={gf.hidden} onChange={(v) => setGf({ ...gf, hidden: v })} label="Ngừng nhận nhóm này" sub="Ẩn khỏi trang đăng ký, cụ đang thuộc nhóm vẫn được chăm sóc" /></div>
            <Note className="sm:col-span-2">Phụ phí công bố trên web (BR-17): gói nhiều tháng tính × số tháng, gói ngày = mức tháng / 26 mỗi ngày. Áp dụng cho đăng ký và gia hạn từ bây giờ.</Note>
            <div className="sm:col-span-2"><ErrorText error={saveGroup.error} /></div>
          </div>
        )}
      </Modal>

      {/* ---- xóa / ngừng */}
      <Modal open={!!del} onClose={() => setDel(undefined)} title={del ? `Xóa ${del.label}?` : ""} footer={del && <><Button variant="neutral" onClick={() => setDel(undefined)}>Hủy</Button>{del.blocker && del.kind !== "perk" && !del.blocker.includes("tham chiếu") ? <Button loading={stop.isPending} onClick={() => stop.mutate(del)}>{del.kind === "group" ? "Ngừng nhận" : "Ngừng bán"}</Button> : !del.blocker && <Button variant="danger" icon={Trash2} loading={remove.isPending} onClick={() => remove.mutate(del)}>Xóa hẳn</Button>}</>}>
        {del && (del.blocker
          ? <Note tone="red">Không xóa được vì {del.blocker}. {!del.blocker.includes("tham chiếu") && `Bạn có thể ${del.kind === "group" ? "ngừng nhận" : "ngừng bán"}: ẩn khỏi trang đăng ký, dữ liệu và hóa đơn cũ vẫn giữ.`}</Note>
          : <Note tone="red">Xóa hẳn {del.label}. {del.kind === "tier" ? "Giá, quyền lợi và định mức dịch vụ của hạng này cũng bị xóa." : del.kind === "cycle" ? "Giá của thời hạn này ở mọi hạng cũng bị xóa." : ""} Không hoàn tác được.</Note>)}
        <ErrorText error={remove.error ?? stop.error} />
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ services
const KIND: Record<ServiceKind, string> = { INCLUDED: "Có sẵn trong mọi gói", OPTIONAL: "Tự chọn trong gói", ADDON: "Mua thêm" };
const empty: Omit<Service, "id"> = { name: "", kind: "OPTIONAL", description: "", equipmentIds: [], owner: "CAREGIVER", needsNurseOk: false, quota: {}, status: "ACTIVE" };
export function ServicesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [kind, setKind] = useState<ServiceKind | "PAUSED">("OPTIONAL");
  const [form, setForm] = useState<(Omit<Service, "id"> & { id?: number }) | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["m-svc"], queryFn: () => manager.services() });
  const rooms = useQuery({ queryKey: ["m-rooms-l"], queryFn: () => manager.rooms() });
  const eq = useQuery({ queryKey: ["m-eq-l"], queryFn: () => manager.equipmentList() });
  const save = useMutation({ mutationFn: () => manager.saveService(me, form!), onSuccess: () => { qc.invalidateQueries({ queryKey: ["m-svc"] }); setForm(null); } });
  const del = useMutation({ mutationFn: (id: number) => manager.deleteService(me, id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["m-svc"] }); setForm(null); } });
  const rows = (data ?? []).filter((r) => (kind === "PAUSED" ? r.service.status === "PAUSED" : r.service.kind === kind && r.service.status === "ACTIVE"));
  const set = <K extends keyof Service>(k: K, v: Service[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  return (
    <Page title="Danh mục dịch vụ" sub="Chỉ hoạt động nhẹ nhàng, an toàn cho người cao tuổi. ⚠ = nhóm bệnh cần điều dưỡng cho phép (BR-15).">
      <div className="flex flex-wrap items-center gap-1.5">
        {(["INCLUDED", "OPTIONAL", "ADDON"] as const).map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{KIND[k]} ({data?.filter((r) => r.service.kind === k && r.service.status === "ACTIVE").length ?? 0})</Chip>)}
        <Chip active={kind === "PAUSED"} onClick={() => setKind("PAUSED")}>Tạm ngừng</Chip>
        <Button className="ml-auto" icon={Plus} onClick={() => setForm({ ...empty, kind: kind === "PAUSED" ? "OPTIONAL" : kind })}>Thêm dịch vụ</Button>
      </div>
      {kind === "OPTIONAL" && <Note>Danh sách cứng 10 hoạt động thực tế (không tâm linh, không karaoke). Cơ bản có 8 hoạt động, tích tối đa 5; Tiêu chuẩn 10, tích 7; Cao cấp dùng cả 10. Gia đình chỉ tích có dùng hay không, giờ do Quản lý và staff xếp.</Note>}
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.service.id} onRowClick={(r) => setForm({ ...r.service })} columns={[
            { key: "n", header: "Dịch vụ", render: (r) => <span><b className="text-navy">{r.service.name}{r.service.needsNurseOk ? " ⚠" : ""}</b><span className="block max-w-72 text-[11px] text-subtle">{r.service.description}</span></span> },
            { key: "d", header: "Thời lượng", render: (r) => (r.service.durationMin ? `${r.service.durationMin} phút` : "—") },
            { key: "r", header: "Nơi · thiết bị", render: (r) => <span className="text-[11.5px]">{r.room?.name ?? "—"}<span className="block text-subtle">{r.equipment.map((e) => e.name).join(", ")}</span></span> },
            { key: "o", header: "Phụ trách", render: (r) => <Badge tone={r.service.owner === "NURSE" ? "teal" : "blue"}>{POSITION_LABEL[r.service.owner]}</Badge> },
            ...TIERS.map((t) => ({ key: t, header: TIER_LABEL[t], render: (r: (typeof rows)[number]) => <span className={cn("text-[11.5px]", r.service.quota[t] === null && "text-faint")}>{r.service.quota[t] ?? "—"}</span> })),
            { key: "p", header: "Giá lẻ", render: (r) => (r.service.addonPrice ? `${vnd(r.service.addonPrice)}/${r.service.addonUnit}` : "—") },
            { key: "u", header: "Cụ đang dùng", render: (r) => r.users },
          ]} />
        )}
      </Card>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Sửa dịch vụ" : "Thêm dịch vụ"} width={640} footer={<>{form?.id && <Button variant="danger" className="mr-auto" icon={Trash2} loading={del.isPending} onClick={() => del.mutate(form.id!)}>Xóa</Button>}<Button variant="neutral" onClick={() => setForm(null)}>Hủy</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Lưu</Button></>}>
        {form && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tên dịch vụ" value={form.name} onChange={(e) => set("name", e.target.value)} className="sm:col-span-2" />
            <SelectField label="Loại" value={form.kind} onChange={(e) => set("kind", e.target.value as ServiceKind)}>{(Object.keys(KIND) as ServiceKind[]).map((k) => <option key={k} value={k}>{KIND[k]}</option>)}</SelectField>
            <SelectField label="Trạng thái" value={form.status} onChange={(e) => set("status", e.target.value as "ACTIVE")}><option value="ACTIVE">Đang bán</option><option value="PAUSED">Tạm ngừng</option></SelectField>
            <TextArea label="Mô tả (cụ thể làm gì)" value={form.description} onChange={(e) => set("description", e.target.value)} className="sm:col-span-2" />
            <Field label="Thời lượng mỗi lượt (phút)" type="number" value={form.durationMin ?? ""} onChange={(e) => set("durationMin", Number(e.target.value) || undefined)} />
            <SelectField label="Phòng / khu" value={form.roomId ?? ""} onChange={(e) => set("roomId", Number(e.target.value) || undefined)}><option value="">—</option>{rooms.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</SelectField>
            <SelectField label="Người phụ trách" value={form.owner} onChange={(e) => set("owner", e.target.value as "NURSE")}><option value="CAREGIVER">Hộ lý</option><option value="NURSE">Điều dưỡng</option></SelectField>
            <div className="self-center"><Toggle checked={form.needsNurseOk} onChange={(v) => set("needsNurseOk", v)} label="⚠ Nhóm bệnh cần điều dưỡng cho phép" /></div>
            <div className="sm:col-span-2">
              <div className="mb-1 text-[11px] text-subtle">Thiết bị cần dùng (liên kết bảng thiết bị)</div>
              <div className="flex flex-wrap gap-1.5">{eq.data?.map((x) => <Chip key={x.id} active={form.equipmentIds.includes(x.id)} onClick={() => set("equipmentIds", form.equipmentIds.includes(x.id) ? form.equipmentIds.filter((i) => i !== x.id) : [...form.equipmentIds, x.id])}>{x.name}</Chip>)}</div>
            </div>
            {TIERS.map((t) => <Field key={t} label={`Số lượt · ${TIER_LABEL[t]} (trống = không có)`} value={form.quota[t] ?? ""} onChange={(e) => set("quota", { ...form.quota, [t]: e.target.value || null })} />)}
            {form.kind === "ADDON" && <><Field label="Giá mua lẻ (đ)" type="number" value={form.addonPrice ?? ""} onChange={(e) => set("addonPrice", Number(e.target.value))} /><Field label="Đơn vị (lần, buổi, tháng…)" value={form.addonUnit ?? ""} onChange={(e) => set("addonUnit", e.target.value)} /></>}
            <Field label="Lưu ý sức khỏe" value={form.healthNote ?? ""} onChange={(e) => set("healthNote", e.target.value)} className="sm:col-span-2" />
            <div className="sm:col-span-2"><ErrorText error={save.error ?? del.error} /></div>
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ schedule & AI menu
const WEEKS = { now: ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"], next: ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"] };
export function SchedulePage() {
  const me = useMe();
  const qc = useQueryClient();
  const [week, setWeek] = useState<"now" | "next">("now");
  const [day, setDay] = useState(TODAY);
  const [act, setAct] = useState<(Omit<ActivitySchedule, "id"> & { id?: number }) | null>(null);
  const [menu, setMenu] = useState<Omit<Menu, "id"> | null>(null);
  const dates = WEEKS[week];
  const { data, isLoading } = useQuery({ queryKey: ["m-sched", week], queryFn: () => manager.schedule(dates) });
  const staffQ = useQuery({ queryKey: ["m-staff-opts"], queryFn: () => manager.staffOptions() });
  const inv = () => qc.invalidateQueries({ queryKey: ["m-sched"] });
  const saveAct = useMutation({ mutationFn: () => manager.saveActivity(me, act!), onSuccess: () => { inv(); setAct(null); } });
  const delAct = useMutation({ mutationFn: (id: number) => manager.deleteActivity(me, id), onSuccess: () => { inv(); setAct(null); } });
  const saveMenu = useMutation({ mutationFn: () => manager.saveMenu(me, menu!), onSuccess: () => { inv(); setMenu(null); } });
  const suggest = useMutation({ mutationFn: () => manager.suggestMenus(me, dates), onSuccess: inv });
  const approve = useMutation({ mutationFn: () => manager.approveMenus(me, dates), onSuccess: inv });
  const curDay = dates.includes(day) ? day : dates[0];
  const items = (data?.items ?? []).filter((x) => x.date === curDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const menus = data?.menus ?? [];
  const pendingAi = menus.filter((m) => m.status === "AI_SUGGESTED").length;
  return (
    <Page title="Lịch hoạt động & thực đơn" sub="Lịch ngày mẫu theo mục 4.2E. Thực đơn do AI gợi ý theo bệnh nền và hạng, Quản lý duyệt mới có hiệu lực (BR-50).">
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={week === "now"} onClick={() => { setWeek("now"); setDay(TODAY); }}>Tuần này 05–10/10</Chip>
        <Chip active={week === "next"} onClick={() => { setWeek("next"); setDay(WEEKS.next[0]); }}>Tuần sau 12–17/10</Chip>
        <Button className="ml-auto" size="sm" icon={CalendarPlus} onClick={() => setAct({ date: curDay, startTime: "14:00", endTime: "15:00", title: "", roomId: 3, tiers: [...TIERS] })}>Thêm hoạt động</Button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto">{dates.map((d) => <button key={d} onClick={() => setDay(d)} className={cn("min-w-24 rounded-xl border px-3 py-2 text-center text-[12px]", d === curDay ? "border-orange bg-orange-soft font-semibold text-orange" : "border-line bg-white text-muted")}>{weekday(d)}<span className="block text-[15px] font-bold">{dm(d)}</span>{data?.holidays.some((h) => h.date === d) && <Badge tone="red">Nghỉ lễ</Badge>}</button>)}</div>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card title={`Lịch ${weekday(curDay)} ${dmy(curDay)}`}>
          {isLoading ? <Loading /> : (
            <ul className="divide-y divide-line-soft">
              {items.map((x) => (
                <li key={x.id} className="flex cursor-pointer items-start gap-3 py-2 hover:bg-canvas" onClick={() => setAct({ ...x })}>
                  <span className="w-24 shrink-0 text-[12px] font-semibold text-navy">{x.startTime}–{x.endTime}</span>
                  <span className="min-w-0 flex-1 text-[12.5px]">
                    <span className="block text-ink">{x.title}</span>
                    <span className="text-[11px] text-subtle">{x.room?.name}{x.staff ? ` · ${x.staff.fullName}` : ""}</span>
                  </span>
                  <span className="flex flex-wrap justify-end gap-1">{x.tiers.length < 3 && x.tiers.map((t) => <TierBadge key={t} tier={t} />)}{x.roomClosed && <Badge tone="red">Phòng tạm đóng</Badge>}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Thực đơn tuần" actions={week === "next" && <><Button size="sm" variant="ai" icon={Sparkles} loading={suggest.isPending} onClick={() => suggest.mutate()}>AI gợi ý lại</Button>{pendingAi > 0 && <Button size="sm" variant="success" icon={CircleCheck} loading={approve.isPending} onClick={() => approve.mutate()}>Duyệt cả tuần</Button>}</>}>
          {pendingAi > 0 && <Note className="mb-2">AI đã gợi ý {pendingAi} ngày. Thực đơn chỉ hiện cho gia đình và staff sau khi Quản lý duyệt.</Note>}
          <ul className="space-y-2">
            {dates.map((d) => {
              const m = menus.find((x) => x.date === d);
              return (
                <li key={d} className={cn("cursor-pointer rounded-lg border p-2 text-[12px] hover:border-orange", d === curDay ? "border-orange" : "border-line")} onClick={() => m && setMenu({ ...m })}>
                  <div className="flex items-center justify-between"><b className="text-navy">{weekday(d)} {dm(d)}</b>{m && <Badge tone={m.status === "APPROVED" ? "green" : "teal"}>{m.status === "APPROVED" ? "Đã duyệt" : "AI gợi ý"}</Badge>}</div>
                  {m ? <div className="mt-0.5 text-muted">Sáng: {m.breakfast} · Trưa: {m.lunch} · Xế: {m.snack}</div> : <span className="text-subtle">Chưa có</span>}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
      <Modal open={!!act} onClose={() => setAct(null)} title={act?.id ? "Sửa hoạt động" : "Thêm hoạt động"} width={520} footer={<>{act?.id && <Button variant="danger" className="mr-auto" icon={Trash2} onClick={() => delAct.mutate(act.id!)}>Xóa</Button>}<Button variant="neutral" onClick={() => setAct(null)}>Hủy</Button><Button loading={saveAct.isPending} onClick={() => saveAct.mutate()}>Lưu</Button></>}>
        {act && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tên hoạt động" value={act.title} onChange={(e) => setAct({ ...act, title: e.target.value })} className="sm:col-span-2" />
            <Field label="Ngày" type="date" value={act.date} onChange={(e) => setAct({ ...act, date: e.target.value })} />
            <SelectField label="Phòng" value={act.roomId} onChange={(e) => setAct({ ...act, roomId: Number(e.target.value) })}>{data?.rooms.map((r) => <option key={r.id} value={r.id} disabled={r.status === "CLOSED"}>{r.name}{r.status === "CLOSED" ? " (tạm đóng)" : ` · ${r.capacity} chỗ`}</option>)}</SelectField>
            <Field label="Bắt đầu" type="time" value={act.startTime} onChange={(e) => setAct({ ...act, startTime: e.target.value })} />
            <Field label="Kết thúc" type="time" value={act.endTime} onChange={(e) => setAct({ ...act, endTime: e.target.value })} />
            <SelectField label="Staff phụ trách" value={act.staffId ?? ""} onChange={(e) => setAct({ ...act, staffId: Number(e.target.value) || undefined })}><option value="">—</option>{staffQ.data?.map((s) => <option key={s.user.id} value={s.user.id}>{s.user.fullName} · {POSITION_LABEL[s.position]}</option>)}</SelectField>
            <div><div className="mb-1 text-[11px] text-subtle">Áp dụng cho hạng</div><div className="flex gap-1.5">{TIERS.map((t) => <Chip key={t} active={act.tiers.includes(t)} onClick={() => setAct({ ...act, tiers: act.tiers.includes(t) ? act.tiers.filter((x) => x !== t) : [...act.tiers, t] })}>{TIER_LABEL[t]}</Chip>)}</div></div>
            <div className="sm:col-span-2"><ErrorText error={saveAct.error} /></div>
            <Note className="sm:col-span-2">Hệ thống chặn xếp vào phòng tạm đóng (BR-73) và cảnh báo khi vượt sức chứa phòng.</Note>
          </div>
        )}
      </Modal>
      <Modal open={!!menu} onClose={() => setMenu(null)} title={`Thực đơn ${menu ? `${weekday(menu.date)} ${dm(menu.date)}` : ""}`} width={560} footer={<><Button variant="neutral" onClick={() => setMenu(null)}>Hủy</Button><Button variant="outline" onClick={() => { if (menu) { setMenu({ ...menu, status: "APPROVED" }); } }}>Đánh dấu duyệt</Button><Button loading={saveMenu.isPending} onClick={() => saveMenu.mutate()}>Lưu</Button></>}>
        {menu && (
          <div className="grid gap-2">
            <Field label="Bữa sáng (Tiêu chuẩn, Cao cấp)" value={menu.breakfast} onChange={(e) => setMenu({ ...menu, breakfast: e.target.value })} />
            <Field label="Bữa trưa" value={menu.lunch} onChange={(e) => setMenu({ ...menu, lunch: e.target.value })} />
            <Field label="Bữa xế" value={menu.snack} onChange={(e) => setMenu({ ...menu, snack: e.target.value })} />
            <Field label="Món thay · ít đường (tiểu đường)" value={menu.lowSugar} onChange={(e) => setMenu({ ...menu, lowSugar: e.target.value })} />
            <Field label="Món thay · ít muối (cao huyết áp)" value={menu.lowSalt} onChange={(e) => setMenu({ ...menu, lowSalt: e.target.value })} />
            <Field label="Món thay · mềm (sau tai biến, nuốt khó)" value={menu.soft} onChange={(e) => setMenu({ ...menu, soft: e.target.value })} />
            <KV label="Trạng thái">{menu.status === "APPROVED" ? <Badge tone="green">Đã duyệt</Badge> : <Badge tone="teal">AI gợi ý</Badge>}</KV>
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ therapy & massage slots (4.9)
export function TherapyPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [add, setAdd] = useState<{ slotId: number; cap: number } | null>(null);
  const [pick, setPick] = useState<number>();
  const [newSlot, setNewSlot] = useState<{ startTime: string; serviceId: number; roomId: number } | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["m-therapy"], queryFn: () => manager.therapy() });
  const inv = () => qc.invalidateQueries({ queryKey: ["m-therapy"] });
  const book = useMutation({ mutationFn: () => manager.book(me, add!.slotId, pick!, add!.cap), onSuccess: () => { inv(); setAdd(null); } });
  const unbook = useMutation({ mutationFn: ({ s, e }: { s: number; e: number }) => manager.unbook(me, s, e), onSuccess: inv });
  const mk = useMutation({ mutationFn: () => manager.addSlot(me, { date: TODAY, ...newSlot! }), onSuccess: () => { inv(); setNewSlot(null); } });
  if (isLoading || !data) return <Page title="Lịch VLTL & massage"><Loading /></Page>;
  const missing = data.demand.flatMap((d) => d.wants.filter((w) => !w.booked && w.allowed).map((w) => ({ e: d.elderly, w })));
  return (
    <Page title={`Lịch VLTL & massage · ${dmy(TODAY)}`} sub="Khung 30 phút. Số cụ tối đa trong khung = số chỗ phục vụ cùng lúc của thiết bị đang dùng được (BR-78). Gia đình không chọn giờ." actions={<Button size="sm" icon={Plus} onClick={() => setNewSlot({ startTime: "15:00", serviceId: 11, roomId: 4 })}>Thêm khung</Button>}>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <Table rows={data.slots} rowKey={(s) => s.slot.id} columns={[
            { key: "t", header: "Giờ", render: (s) => <b className="text-navy">{s.slot.startTime}</b> },
            { key: "s", header: "Dịch vụ", render: (s) => <span>{s.service.name}<span className="block text-[11px] text-subtle">{s.room?.name}</span></span> },
            { key: "c", header: "Chỗ", render: (s) => <Badge tone={s.people.length >= s.capacity ? "red" : "green"}>{s.people.length}/{s.capacity}</Badge> },
            { key: "p", header: "Cụ được xếp", render: (s) => <span className="flex flex-wrap gap-1">{s.people.map((p) => <span key={p.elderlyId} className="flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-[11.5px]">{p.elderly?.fullName}<Badge tone={p.status === "DONE" ? "green" : p.status === "MAKEUP" ? "purple" : p.status === "ABSENT" ? "gray" : "blue"}>{({ DONE: "Đã tập", PLANNED: "Đã xếp", ABSENT: "Vắng", MAKEUP: "Cần bù" })[p.status]}</Badge>{p.status === "PLANNED" && <button onClick={() => unbook.mutate({ s: s.slot.id, e: p.elderlyId })} aria-label="Bỏ"><X size={11} /></button>}</span>)}</span> },
            { key: "x", header: "", render: (s) => <Button size="sm" variant="outline" icon={UserPlus} disabled={s.people.length >= s.capacity} onClick={() => { setAdd({ slotId: s.slot.id, cap: s.capacity }); setPick(undefined); }}>Xếp</Button> },
          ]} />
          <ErrorText error={book.error} />
        </Card>
        <div className="space-y-4">
          <Card title="Chưa xếp hôm nay">
            {missing.length === 0 ? <div className="text-[12.5px] text-subtle">Đã xếp đủ</div> : missing.map(({ e, w }) => <div key={`${e.id}-${w.service.id}`} className="flex items-center justify-between py-1 text-[12px]"><span><b className="text-navy">{e.fullName}</b> · {w.service.name}</span><span className="text-subtle">{w.quota}</span></div>)}
            <Note className="mt-2">Hạng Tiêu chuẩn: VLTL 2 buổi/tuần, ghế massage 3 lượt/tuần; Cao cấp hằng ngày. Hệ thống gợi ý theo số lượt của từng cụ, Quản lý và staff được sửa.</Note>
          </Card>
          <Card title="Không được dùng (⚠ điều dưỡng chưa cho phép)">
            {data.demand.flatMap((d) => d.wants.filter((w) => !w.allowed).map((w) => <div key={`${d.elderly.id}${w.service.id}`} className="text-[12px]"><Badge tone="red">Không</Badge> {d.elderly.fullName} · {w.service.name}</div>))}
          </Card>
          <Card title="Bù quyền lợi do thiết bị hỏng (4.8)">
            {data.compensations.map((c) => <div key={c.id} className="text-[12px]"><b className="text-navy">{c.elderly?.fullName}</b> · {dm(c.date)}: {c.reason} → {c.form} {c.notified && <Badge tone="green">Đã báo GĐ</Badge>}</div>)}
          </Card>
        </div>
      </div>
      <Modal open={!!add} onClose={() => setAdd(null)} title="Xếp cụ vào khung" footer={<><Button variant="neutral" onClick={() => setAdd(null)}>Hủy</Button><Button disabled={!pick} loading={book.isPending} onClick={() => book.mutate()}>Xếp</Button></>}>
        <SelectField label="Cụ có mặt hôm nay" value={pick ?? ""} onChange={(e) => setPick(Number(e.target.value))}>
          <option value="">Chọn…</option>
          {data.demand.map((d) => <option key={d.elderly.id} value={d.elderly.id}>{d.elderly.fullName} · {TIER_LABEL[d.tier]}</option>)}
        </SelectField>
      </Modal>
      <Modal open={!!newSlot} onClose={() => setNewSlot(null)} title="Thêm khung 30 phút" footer={<><Button variant="neutral" onClick={() => setNewSlot(null)}>Hủy</Button><Button loading={mk.isPending} onClick={() => mk.mutate()}>Thêm</Button></>}>
        {newSlot && (
          <div className="grid gap-2">
            <Field label="Giờ bắt đầu" type="time" step={1800} value={newSlot.startTime} onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })} />
            <SelectField label="Dịch vụ" value={newSlot.serviceId} onChange={(e) => { const id = Number(e.target.value); setNewSlot({ ...newSlot, serviceId: id, roomId: id === 11 ? 4 : 11 }); }}><option value={11}>Vật lý trị liệu bằng máy</option><option value={12}>Ghế massage</option><option value={13}>Máy massage chân</option><option value={14}>Ngâm chân thảo dược</option></SelectField>
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ holidays & announcements
export function CalendarPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [h, setH] = useState({ date: "2026-12-24", name: "" });
  const [a, setA] = useState({ title: "", body: "", audience: "ALL", holidayIds: [] as number[] });
  const { data, isLoading } = useQuery({ queryKey: ["m-cal"], queryFn: () => manager.calendar() });
  const inv = () => qc.invalidateQueries({ queryKey: ["m-cal"] });
  const addH = useMutation({ mutationFn: () => manager.addHoliday(me, h.date, h.name), onSuccess: () => { inv(); setH({ ...h, name: "" }); } });
  const rmH = useMutation({ mutationFn: (id: number) => manager.removeHoliday(me, id), onSuccess: inv });
  const send = useMutation({ mutationFn: () => manager.sendAnnouncement(me, a), onSuccess: () => { inv(); setA({ title: "", body: "", audience: "ALL", holidayIds: [] }); } });
  return (
    <Page title="Ngày lễ & thông báo" sub="Quản lý nhập lịch nghỉ lễ, Tết và gửi thông báo. Ngày nghỉ không tính buổi; gói tháng được cộng bù (BR-25).">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Lịch nghỉ lễ">
          {isLoading ? <Loading /> : (
            <ul className="divide-y divide-line-soft">
              {data?.holidays.map((x) => (
                <li key={x.id} className="flex items-center gap-2 py-2 text-[12.5px]">
                  <span className="w-28 font-semibold text-navy">{weekday(x.date)} {dmy(x.date)}</span>
                  <span className="flex-1">{x.name}</span>
                  {x.announced ? <Badge tone="green">Đã báo</Badge> : <Badge tone="orange">Chưa báo</Badge>}
                  <button onClick={() => rmH.mutate(x.id)} className="text-subtle hover:text-red-ink" aria-label="Xóa"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr_auto]">
            <Field label="Ngày" type="date" value={h.date} onChange={(e) => setH({ ...h, date: e.target.value })} />
            <Field label="Tên ngày lễ" value={h.name} onChange={(e) => setH({ ...h, name: e.target.value })} />
            <Button className="self-center" icon={Plus} disabled={!h.name} loading={addH.isPending} onClick={() => addH.mutate()}>Thêm</Button>
          </div>
        </Card>
        <Card title="Gửi thông báo chung">
          <div className="grid gap-2">
            <Field label="Tiêu đề" value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} />
            <TextArea label="Nội dung" value={a.body} onChange={(e) => setA({ ...a, body: e.target.value })} />
            <SelectField label="Gửi tới" value={a.audience} onChange={(e) => setA({ ...a, audience: e.target.value })}>
              <option value="ALL">Tất cả gia đình</option>
              {TIERS.map((t) => <option key={t} value={t}>Hạng {TIER_LABEL[t]}</option>)}
              {GROUPS.map((g) => <option key={g} value={g}>Nhóm {GROUP_LABEL[g]}</option>)}
            </SelectField>
            <div><div className="mb-1 text-[11px] text-subtle">Kèm ngày lễ (đánh dấu đã báo)</div><div className="flex flex-wrap gap-1.5">{data?.holidays.filter((x) => !x.announced).map((x) => <Chip key={x.id} active={a.holidayIds.includes(x.id)} onClick={() => setA({ ...a, holidayIds: a.holidayIds.includes(x.id) ? a.holidayIds.filter((i) => i !== x.id) : [...a.holidayIds, x.id] })}>{dm(x.date)} {x.name}</Chip>)}</div></div>
            {send.isSuccess && <Note tone="green">Đã gửi tới {send.data} gia đình.</Note>}
            <Button icon={Megaphone} disabled={!a.title || !a.body} loading={send.isPending} onClick={() => send.mutate()}>Gửi thông báo</Button>
          </div>
        </Card>
      </div>
      <Card title="Thông báo đã gửi">
        <Table rows={data?.announcements ?? []} rowKey={(x) => x.id} columns={[
          { key: "t", header: "Lúc", render: (x) => `${dmy(x.sentAt.slice(0, 10))} ${hm(x.sentAt)}` },
          { key: "n", header: "Tiêu đề", render: (x) => <span><b className="text-navy">{x.title}</b><span className="block text-[11.5px] text-muted">{x.body}</span></span> },
          { key: "a", header: "Gửi tới", render: (x) => x.audience === "ALL" ? "Tất cả" : (TIER_LABEL as Record<string, string>)[x.audience] ?? (GROUP_LABEL as Record<string, string>)[x.audience] },
        ]} />
      </Card>
    </Page>
  );
}
