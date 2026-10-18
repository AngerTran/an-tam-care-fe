// Lịch sử care log của 1 cụ: staff xem lại từng ngày (cả ngày đã chốt) — chỉ đọc.
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, Clock, Pill } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { staff, TODAY } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { ElderlyCell, GroupBadge, Timeline } from "../../components/domain";
import { Badge, Card, ErrorText, KV, Loading, SelectField } from "../../components/ui";
import { dmy, hm, weekday } from "../../lib/format";

const DOSE: Record<string, [string, "green" | "orange" | "gray"]> = { GIVEN: ["Đã uống", "green"], REFUSED: ["Từ chối", "orange"], MISSING: ["Chưa có thuốc", "orange"], PENDING: ["Chưa ghi", "gray"] };

export function CareLogHistory() {
  const me = useMe();
  const id = Number(useParams().id);
  const [date, setDate] = useState(TODAY);
  const { data, isLoading, error } = useQuery({ queryKey: ["s-history", id, date], queryFn: () => staff.daySummary(me, id, date) });
  const back = `/staff/elderly/${id}`;
  if (isLoading) return <Page title="Lịch sử care log" back={back}><Loading /></Page>;
  if (!data) return <Page title="Lịch sử care log" back={back}><ErrorText error={error} /></Page>;
  const tasks = data.tasks ?? [];
  const done = tasks.filter((t) => t.status !== "TODO").length;
  return (
    <Page
      title="Lịch sử care log" back={back} sub="Xem lại từng ngày, kể cả mục nội bộ. Care log đã chốt chỉ Quản lý được sửa (CL-06)."
      actions={<SelectField label="Ngày" value={date} onChange={(e) => setDate(e.target.value)} className="w-48">{data.dates.map((d) => <option key={d} value={d}>{weekday(d)} {dmy(d)}{d === TODAY ? " · hôm nay" : ""}</option>)}</SelectField>}
    >
      <Card>
        <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
          <ElderlyCell e={data.elderly} size={40} />
          <GroupBadge group={data.elderly.targetGroup} />
          <span className="flex items-center gap-1 text-muted"><Clock size={13} />Đến <b className="text-navy">{data.a?.checkIn ?? "—"}</b> · Về <b className="text-navy">{data.a?.checkOut ?? "—"}</b></span>
          <span className="ml-auto flex flex-wrap gap-1">
            {!data.day ? <Badge tone="gray">Không có care log</Badge> : data.day.status === "CLOSED" ? <Badge tone="green">Đã chốt {data.day.closedAt ? hm(data.day.closedAt) : ""}</Badge> : <Badge tone="orange">Đang mở</Badge>}
            {data.day?.medicalDoneAt && <Badge tone="teal">Xong phần y tế ✓</Badge>}
          </span>
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[300px_1fr_320px]">
        <Card title={`Việc trong ngày · ${done}/${tasks.length}`}>
          {tasks.length === 0 ? <div className="text-[12.5px] text-subtle">Không có việc</div> : (
            <ul className="space-y-1.5 text-[12.5px]">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <b className="w-11 shrink-0 text-navy">{t.time}</b>
                  <span className="flex-1">{t.title}{t.status === "SKIPPED" && <span className="block text-[11px] text-amber-ink">Bỏ qua: {t.skipReason}</span>}{t.by && <span className="block text-[11px] text-subtle">{t.by.fullName}</span>}</span>
                  {t.status === "DONE" ? <CircleCheck size={15} className="text-green-ink" /> : t.status === "SKIPPED" ? <Badge tone="orange">Bỏ qua</Badge> : <Badge tone="gray">Chưa làm</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`Dòng thời gian · ${data.entries.length} mục`}>
          <Timeline entries={data.entries} showStaff />
        </Card>
        <div className="space-y-4">
          <Card title="Chỉ số">
            {data.vitals.length === 0 ? <div className="text-[12.5px] text-subtle">Không đo</div> : data.vitals.map((m) => (
              <KV key={m.id} label={hm(m.at)} w={50}>{[m.sys && `HA ${m.sys}/${m.dia}`, m.pulse && `mạch ${m.pulse}`, m.temp && `${m.temp}°C`, m.spo2 && `SpO₂ ${m.spo2}%`, m.glucose && `ĐH ${m.glucose}`].filter(Boolean).join(" · ")}</KV>
            ))}
          </Card>
          <Card title={<span className="flex items-center gap-2"><Pill size={15} className="text-orange" />Thuốc</span>}>
            {data.doses.length === 0 ? <div className="text-[12.5px] text-subtle">Không có thuốc gửi kèm</div> : data.doses.map((d) => (
              <KV key={d.id} label={d.time} w={50}>{d.plan?.name} · <Badge tone={DOSE[d.status][1]}>{DOSE[d.status][0]}{d.at ? ` ${d.at}` : ""}</Badge>{d.reason && <span className="block text-[11px] text-subtle">{d.reason}</span>}</KV>
            ))}
          </Card>
        </div>
      </div>
    </Page>
  );
}
