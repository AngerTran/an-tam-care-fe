// HTTP client cho BE ASP.NET (D:\BE). Bật khi có VITE_API_URL trong .env.local; không có thì FE chạy mock.
// - Gắn access token (JWT) vào mọi request, hết hạn thì tự gọi /auth/refresh một lần rồi gọi lại.
// - BE trả { success, message, data, errors }: lỗi thì ném Error(message) để ErrorText hiển thị đúng câu của BE.

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
export const API_LIVE = !!BASE;

const TOKENS = "atc-api-tokens";
type Tokens = { accessToken: string; refreshToken: string; expiresAt: string };
type Envelope<T> = { success: boolean; message: string; data: T; errors?: Record<string, string[]> | null };

export const tokenStore = {
  get(): Tokens | null {
    try { return JSON.parse(localStorage.getItem(TOKENS) ?? "null") as Tokens | null; } catch { return null; }
  },
  set(t: Tokens | null) {
    try { if (t) localStorage.setItem(TOKENS, JSON.stringify(t)); else localStorage.removeItem(TOKENS); } catch { /* ignore */ }
  },
};

/** Gọi khi refresh token cũng hết hạn: AuthContext đăng ký để đưa về màn đăng nhập. */
let onSessionExpired: () => void = () => {};
export const setSessionExpiredHandler = (fn: () => void) => { onSessionExpired = fn; };

let refreshing: Promise<boolean> | null = null;
async function refresh(): Promise<boolean> {
  const t = tokenStore.get();
  if (!t?.refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: t.refreshToken }) });
      const body = (await res.json()) as Envelope<Tokens>;
      if (!res.ok || !body.success) return false;
      tokenStore.set({ accessToken: body.data.accessToken, refreshToken: body.data.refreshToken, expiresAt: body.data.expiresAt });
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => { refreshing = null; }, 0);
    }
  })();
  return refreshing;
}

export async function api<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown, retry = true): Promise<T> {
  if (!BASE) throw new Error("Chưa cấu hình VITE_API_URL");
  const token = tokenStore.get()?.accessToken;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Không kết nối được máy chủ. Kiểm tra BE đang chạy.");
  }
  if (res.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await refresh()) return api<T>(method, path, body, false);
    tokenStore.set(null);
    onSessionExpired();
  }
  const env = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !env?.success) throw new Error(env?.message ?? `Lỗi ${res.status}`);
  return env.data;
}

/** Giờ nghiệp vụ theo Asia/Ho_Chi_Minh — khớp IClock của BE. */
export const vnToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
export const vnNow = () => new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
