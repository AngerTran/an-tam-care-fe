import { zodResolver } from "@hookform/resolvers/zod";
import { Heart, House, KeyRound, Mail } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { auth } from "../../api";
import { resetDb } from "../../mock/db";
import { HOME, useAuth } from "../../auth/AuthContext";
import { Button, ErrorText, Field, IconCircle, Tabs } from "../../components/ui";
import { GROUPS, TIERS } from "../../domain/catalog";

function Split({ children, family }: { children: ReactNode; family?: boolean }) {
  return (
    <div className="flex min-h-full">
      <aside className={`hidden flex-1 flex-col justify-center gap-4 p-14 text-white lg:flex ${family ? "bg-gradient-to-br from-orange to-[#f9b48d]" : "bg-gradient-to-br from-navy to-blue"}`}>
        <Heart size={44} className={family ? "text-white" : "text-orange"} strokeWidth={2.2} />
        <div className="text-[32px] leading-tight font-bold">{family ? "An Tâm Care cho gia đình" : "An Tâm Care"}</div>
        <p className="max-w-md text-[15px] leading-relaxed text-white/85">
          {family ? "Một tài khoản, nhiều người thân. Đăng ký gói, thanh toán online, xem care log, ảnh và chỉ số sức khỏe của cụ mỗi ngày." : "Trung tâm chăm sóc ban ngày (bán trú) cho người cao tuổi · 7h–16h30, Thứ 2 – Thứ 7."}
        </p>
        {!family && (
          <ul className="space-y-1 text-[13px] text-white/75">
            <li>• {TIERS.length} hạng gói · {GROUPS.length} nhóm đối tượng · thanh toán VNPay/MoMo</li>
            <li>• Care log theo thời gian thực cho gia đình</li>
            <li>• AI gợi ý xếp ca, thực đơn, cảnh báo sức khỏe — người duyệt quyết định</li>
          </ul>
        )}
      </aside>
      <main className="relative flex flex-1 items-center justify-center bg-white p-6 pt-16">
        <Link to="/" className="absolute top-5 left-6 flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-input-line px-3 py-1.5 text-[12.5px] font-semibold text-navy transition hover:border-orange hover:text-orange">
          <House size={15} /> Trang chủ
        </Link>
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}

const loginSchema = z.object({ email: z.string().email("Email không hợp lệ"), password: z.string().min(1, "Nhập mật khẩu") });
const DEMO = [
  ["Quản lý trung tâm", "mai.tran@antamcare.vn"], ["Điều dưỡng", "hanh.le@antamcare.vn"], ["Hộ lý", "bao.pham@antamcare.vn"], ["Gia đình", "lan.nguyen@gmail.com"], ["Admin (chủ DN)", "admin@antamcare.vn"],
] as const;

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [err, setErr] = useState<unknown>(null);
  const { register, handleSubmit, setValue, formState } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  const submit = handleSubmit(async (v) => {
    setErr(null);
    try {
      const u = await login(v.email, v.password);
      nav(loc.state?.from && loc.state.from.startsWith(HOME[u.role]) ? loc.state.from : HOME[u.role], { replace: true });
    } catch (e) {
      setErr(e);
    }
  });
  return (
    <Split>
      <h1 className="text-[24px] font-bold text-navy">Đăng nhập</h1>
      <p className="mb-5 text-[12.5px] text-muted">Dành cho Admin, Quản lý trung tâm, Nhân viên và Gia đình</p>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Email" type="email" autoComplete="username" {...register("email")} error={formState.errors.email?.message} />
        <Field label="Mật khẩu" type="password" autoComplete="current-password" {...register("password")} error={formState.errors.password?.message} />
        <div className="flex justify-end">
          <Link to="/quen-mat-khau" className="text-[12px] font-semibold text-orange">Quên mật khẩu?</Link>
        </div>
        <ErrorText error={err} />
        <Button type="submit" size="lg" block loading={formState.isSubmitting}>Đăng nhập</Button>
      </form>
      <div className="mt-4 text-center text-[12.5px] text-muted">
        Gia đình chưa có tài khoản? <Link to="/dang-ky" className="font-semibold text-orange">Đăng ký</Link> · <Link to="/" className="font-semibold text-blue">Xem gói & giá</Link>
      </div>
      <div className="mt-6 rounded-xl bg-canvas p-3">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-subtle">
          <span>Tài khoản demo (mật khẩu: demo1234)</span>
          <button type="button" className="text-orange hover:underline" onClick={() => { resetDb(); location.reload(); }}>Khôi phục dữ liệu demo</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DEMO.map(([label, email]) => (
            <button key={email} type="button" className="rounded-full bg-white px-3 py-1 text-[11.5px] font-semibold text-blue shadow-sm hover:text-orange" onClick={() => { setValue("email", email); setValue("password", "demo1234"); }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </Split>
  );
}

const regSchema = z
  .object({ fullName: z.string().min(2, "Nhập họ tên"), email: z.string().email("Email không hợp lệ"), phone: z.string().regex(/^[0-9 ]{9,13}$/, "Số điện thoại không hợp lệ"), password: z.string().min(8, "Tối thiểu 8 ký tự").regex(/[a-zA-Z]/, "Cần có chữ").regex(/\d/, "Cần có số"), confirm: z.string(), agree: z.boolean().refine((v) => v, "Cần đồng ý điều khoản") })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Mật khẩu nhập lại không khớp" });

export function RegisterPage() {
  const nav = useNavigate();
  const [err, setErr] = useState<unknown>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof regSchema>>({ resolver: zodResolver(regSchema), defaultValues: { agree: false } });
  const submit = handleSubmit(async ({ confirm: _c, agree: _a, ...v }) => {
    setErr(null);
    try {
      const u = await auth.registerFamily(v);
      nav(`/xac-thuc?uid=${u.id}&email=${encodeURIComponent(u.email)}`);
    } catch (e) {
      setErr(e);
    }
  });
  const e = formState.errors;
  return (
    <Split family>
      <Tabs value="register" onChange={(v) => v === "login" && nav("/login")} items={[{ value: "login", label: "Đăng nhập" }, { value: "register", label: "Đăng ký" }]} />
      <h1 className="mt-5 text-[22px] font-bold text-navy">Tạo tài khoản gia đình</h1>
      <p className="mb-4 text-[12.5px] text-muted">Một tài khoản quản lý nhiều người thân</p>
      <form onSubmit={submit} className="space-y-2.5">
        <Field label="Họ và tên" {...register("fullName")} error={e.fullName?.message} />
        <Field label="Email" type="email" {...register("email")} error={e.email?.message} />
        <Field label="Số điện thoại" {...register("phone")} error={e.phone?.message} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Mật khẩu" type="password" {...register("password")} error={e.password?.message} />
          <Field label="Nhập lại mật khẩu" type="password" {...register("confirm")} error={e.confirm?.message} />
        </div>
        <label className="flex items-start gap-2 text-[12px] text-muted">
          <input type="checkbox" className="mt-0.5 accent-orange" {...register("agree")} /> Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật
        </label>
        {e.agree && <div className="text-[11px] text-red-ink">{e.agree.message}</div>}
        <ErrorText error={err} />
        <Button type="submit" size="lg" block loading={formState.isSubmitting}>Tạo tài khoản gia đình</Button>
      </form>
    </Split>
  );
}

function Otp({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="numeric"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      placeholder="••••••"
      aria-label="Mã OTP 6 số"
      className="h-14 w-full rounded-xl border-[1.5px] border-input-line text-center text-[24px] font-bold tracking-[0.6em] text-navy outline-none focus:border-orange"
    />
  );
}

export function VerifyEmailPage() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { login } = useAuth();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const uid = Number(sp.get("uid"));
  const email = sp.get("email") ?? "";
  const go = async () => {
    setErr(null);
    setBusy(true);
    try {
      const u = await auth.verifyEmail(uid, code);
      await login(u.email, u.password);
      nav("/family?welcome=1", { replace: true });
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex min-h-full items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-7 text-center shadow-sm">
        <IconCircle icon={Mail} tone="orange" size={72} />
        <h1 className="mt-3 text-[20px] font-bold text-navy">Xác thực email</h1>
        <p className="mb-4 text-[12.5px] text-muted">Nhập mã gồm 6 số vừa gửi tới {email}. (Demo: nhập 6 số bất kỳ)</p>
        <Otp value={code} onChange={setCode} />
        <div className="mt-2 text-[11px] text-subtle">Gửi lại mã sau 00:42</div>
        <div className="mt-3"><ErrorText error={err} /></div>
        <Button size="lg" block className="mt-4" disabled={code.length < 6} loading={busy} onClick={go}>Xác nhận & tiếp tục</Button>
        <Link to="/dang-ky" className="mt-3 inline-block text-[12px] font-semibold text-orange">Đổi email đăng ký</Link>
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setErr(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex min-h-full items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-[460px] space-y-3 rounded-2xl bg-white p-7 text-center shadow-sm">
        <IconCircle icon={KeyRound} tone="orange" size={60} />
        <h1 className="text-[19px] font-bold text-navy">Đặt lại mật khẩu</h1>
        <p className="text-[12px] text-subtle">Dành cho mọi vai trò</p>
        <div className="text-left">
          <Field label="Email đăng nhập" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={step === 2} />
        </div>
        {step === 1 ? (
          <Button size="lg" block loading={busy} onClick={() => run(async () => { await auth.requestReset(email); setStep(2); })}>Gửi mã đặt lại</Button>
        ) : (
          <>
            <Otp value={code} onChange={setCode} />
            <div className="text-[11px] text-subtle">Mã đã gửi tới email · gửi lại sau 00:45</div>
            <div className="grid grid-cols-2 gap-2 text-left">
              <Field label="Mật khẩu mới" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
              <Field label="Nhập lại" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
            <Button size="lg" block loading={busy} onClick={() => run(async () => {
              if (pw.length < 8 || !/\d/.test(pw) || !/[a-zA-Z]/.test(pw)) throw new Error("Mật khẩu tối thiểu 8 ký tự, gồm chữ và số");
              if (pw !== pw2) throw new Error("Mật khẩu nhập lại không khớp");
              await auth.resetPassword(email, code, pw);
              nav("/login");
            })}>Đặt lại mật khẩu</Button>
          </>
        )}
        <ErrorText error={err} />
        <Link to="/login" className="inline-block text-[12px] font-semibold text-orange">Quay lại đăng nhập</Link>
      </div>
    </div>
  );
}
