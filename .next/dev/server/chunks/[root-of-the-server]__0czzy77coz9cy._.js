module.exports = [
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/next/dist/build/adapter/setup-node-env.external.js [external] (next/dist/build/adapter/setup-node-env.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/build/adapter/setup-node-env.external.js", () => require("next/dist/build/adapter/setup-node-env.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/memory-cache.external.js [external] (next/dist/server/lib/incremental-cache/memory-cache.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/memory-cache.external.js", () => require("next/dist/server/lib/incremental-cache/memory-cache.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/shared-cache-controls.external.js [external] (next/dist/server/lib/incremental-cache/shared-cache-controls.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/shared-cache-controls.external.js", () => require("next/dist/server/lib/incremental-cache/shared-cache-controls.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/tags-manifest.external.js [external] (next/dist/server/lib/incremental-cache/tags-manifest.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/tags-manifest.external.js", () => require("next/dist/server/lib/incremental-cache/tags-manifest.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/router-utils/instrumentation-globals.external.js [external] (next/dist/server/lib/router-utils/instrumentation-globals.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/lib/router-utils/instrumentation-globals.external.js", () => require("next/dist/server/lib/router-utils/instrumentation-globals.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[externals]/node:path [external] (node:path, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:path", () => require("node:path"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[project]/src/lib/auth/resolve-app-role.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RoleResolutionError",
    ()=>RoleResolutionError,
    "appRoleErrorMessage",
    ()=>appRoleErrorMessage,
    "resolveAppRole",
    ()=>resolveAppRole
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$roles$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth/roles.ts [middleware] (ecmascript)");
;
class RoleResolutionError extends Error {
    constructor(){
        super("The profile role could not be loaded.");
        this.name = "RoleResolutionError";
    }
}
async function resolveAppRole(supabase, userId, accessToken) {
    // Always check Auth ban status so disabled accounts are refused even while
    // their access token is still valid.
    void accessToken;
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.banned_until && new Date(user.banned_until).getTime() > Date.now()) {
        return {
            ok: false,
            reason: "inactive"
        };
    }
    let profile;
    try {
        const result = await supabase.from("profiles").select("id, role").eq("id", userId).maybeSingle();
        if (result.error) throw new RoleResolutionError();
        profile = result.data;
    } catch  {
        throw new RoleResolutionError();
    }
    if (!profile) return {
        ok: false,
        reason: "missing"
    };
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$roles$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["isAppRole"])(profile.role)) return {
        ok: false,
        reason: "unrecognized"
    };
    const role = profile.role;
    const destination = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$roles$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["getRoleDashboardPath"])(role);
    return destination ? {
        ok: true,
        role,
        destination
    } : {
        ok: false,
        reason: "unrecognized"
    };
}
function appRoleErrorMessage(reason) {
    if (reason === "inactive") return "Your account is inactive. Contact an administrator.";
    if (reason === "missing") return "Your account has no role profile. Contact an administrator.";
    return "Your account has an unrecognized role. Contact an administrator.";
}
}),
"[project]/src/lib/auth/roles.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getRequiredRole",
    ()=>getRequiredRole,
    "getRoleDashboardPath",
    ()=>getRoleDashboardPath,
    "isAppRole",
    ()=>isAppRole,
    "roleDashboardPaths",
    ()=>roleDashboardPaths
]);
const roleDashboardPaths = {
    resident: "/resident",
    official: "/dashboard",
    admin: "/admin"
};
function isAppRole(role) {
    return role === "resident" || role === "official" || role === "admin";
}
function getRoleDashboardPath(role) {
    return isAppRole(role) ? roleDashboardPaths[role] : null;
}
function getRequiredRole(pathname) {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "official";
    if (pathname === "/resident" || pathname.startsWith("/resident/")) return "resident";
    return null;
}
}),
"[project]/src/proxy.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "proxy",
    ()=>proxy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$roles$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth/roles.ts [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$resolve$2d$app$2d$role$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth/resolve-app-role.ts [middleware] (ecmascript)");
;
;
;
;
const safeMethods = new Set([
    "GET",
    "HEAD",
    "OPTIONS"
]);
// Blocks cross-site form posts or scripts from calling our API with the
// visitor's session cookie (CSRF). Browsers always send Origin on these.
function isCrossSiteWrite(request) {
    if (safeMethods.has(request.method) || !request.nextUrl.pathname.startsWith("/api/")) return false;
    const origin = request.headers.get("origin");
    if (!origin) return true;
    try {
        return new URL(origin).host !== (request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
    } catch  {
        return true;
    }
}
async function proxy(request) {
    if (isCrossSiteWrite(request)) {
        return Response.json({
            error: "Cross-site request blocked."
        }, {
            status: 403
        });
    }
    let response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next({
        request
    });
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://lemnfqjyrhirjnfukfrm.supabase.co"), ("TURBOPACK compile-time value", "sb_publishable_s9PHsSIXxAQP26QUwTDrZw_qrxe-bpc"), {
        cookies: {
            getAll: ()=>request.cookies.getAll(),
            setAll (cookiesToSet) {
                cookiesToSet.forEach(({ name, value })=>request.cookies.set(name, value));
                response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next({
                    request
                });
                cookiesToSet.forEach(({ name, value, options })=>response.cookies.set(name, value, options));
            }
        }
    });
    const { data: { user } } = await supabase.auth.getUser();
    const pathname = request.nextUrl.pathname;
    const requiredRole = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$roles$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["getRequiredRole"])(pathname);
    const isEntryRoute = pathname === "/" || pathname === "/login";
    const redirectTo = (path)=>{
        const redirectResponse = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(path, request.url));
        response.cookies.getAll().forEach((cookie)=>redirectResponse.cookies.set(cookie));
        return redirectResponse;
    };
    const { data: maintenanceSettings, error: maintenanceReadError } = await supabase.from("system_settings").select("maintenance_mode").eq("id", 1).maybeSingle();
    if (maintenanceReadError) console.error("[maintenance] status lookup failed", maintenanceReadError.message);
    const maintenanceMode = maintenanceSettings?.maintenance_mode === true;
    if (!maintenanceMode && pathname === "/maintenance") return redirectTo("/");
    if (maintenanceMode) {
        const authRoute = pathname === "/login" || pathname === "/auth" || pathname.startsWith("/auth/") || pathname === "/api/auth" || pathname.startsWith("/api/auth/");
        if (authRoute || pathname === "/maintenance") return response;
        const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
        const isAdminApi = pathname === "/api/admin" || pathname.startsWith("/api/admin/");
        const isApi = pathname === "/api" || pathname.startsWith("/api/");
        let isActiveAdmin = false;
        if (user && (isAdminPage || isAdminApi)) {
            const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
            if (error) console.error("[maintenance] admin profile lookup failed", {
                userId: user.id,
                message: error.message
            });
            isActiveAdmin = profile?.role === "admin" && profile.is_active !== false;
        }
        if (isActiveAdmin) return response;
        if (isApi) return Response.json({
            error: "AlertBarangay is currently undergoing maintenance. Please try again shortly."
        }, {
            status: 503,
            headers: {
                "Retry-After": "120",
                "Cache-Control": "no-store"
            }
        });
        if (isAdminPage && !user) return redirectTo("/login");
        return redirectTo("/maintenance");
    }
    if (!user) {
        if (requiredRole) return redirectTo("/login");
        return response;
    }
    if (!requiredRole && !isEntryRoute) return response;
    let resolution;
    try {
        resolution = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2f$resolve$2d$app$2d$role$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["resolveAppRole"])(supabase, user.id);
    } catch  {
        if (requiredRole) return redirectTo("/login");
        return response;
    }
    if (!resolution.ok) {
        if (requiredRole) return redirectTo("/login");
        return response;
    }
    if (isEntryRoute) return redirectTo(resolution.destination);
    if (requiredRole && resolution.role !== requiredRole) return redirectTo(resolution.destination);
    return response;
}
const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
    ]
};
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0czzy77coz9cy._.js.map