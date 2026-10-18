// API entry point. Mặc định chạy mock; khi có VITE_API_URL (.env.local) thì đăng nhập + care log
// của Staff/Family gọi BE ASP.NET thật (remote.ts), các hàm còn lại vẫn là mock.
import { family as mockFamily } from "./family";
import { API_LIVE } from "./http";
import { remoteAuth, remoteFamily, remoteInbox, remoteStaff } from "./remote";
import { auth as mockAuth, chatbot, inbox as mockInbox, publicSite } from "./shared";
import { staff as mockStaff } from "./staff";

export { TODAY, NOW, lookups, capacity, currentSub, activeSub, honor, pkgName, entitlement, usable } from "./core";
export { manager } from "./manager";
export { admin } from "./admin";
export { publicSite, chatbot };
export { API_LIVE, setSessionExpiredHandler } from "./http";
export { remoteLogout, useLiveRefresh } from "./remote";

export const auth: typeof mockAuth = API_LIVE ? { ...mockAuth, ...remoteAuth } : mockAuth;
export const inbox: typeof mockInbox = API_LIVE ? { ...mockInbox, ...remoteInbox } : mockInbox;
export const staff: typeof mockStaff = API_LIVE ? { ...mockStaff, ...remoteStaff } : mockStaff;
export const family: typeof mockFamily = API_LIVE ? { ...mockFamily, ...remoteFamily } : mockFamily;
