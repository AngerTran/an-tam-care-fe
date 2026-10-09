// Mock API entry point. Replace the modules with real HTTP calls once the backend exists.
export { TODAY, NOW, lookups, capacity, currentSub, activeSub, honor, pkgName, entitlement, usable } from "./core";
export { auth, inbox, publicSite, chatbot } from "./shared";
export { manager } from "./manager";
export { staff } from "./staff";
export { family } from "./family";
export { admin } from "./admin";
