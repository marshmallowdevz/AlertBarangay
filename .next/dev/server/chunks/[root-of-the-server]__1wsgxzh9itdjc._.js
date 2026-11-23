module.exports = [
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

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
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

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
"[project]/src/app/api/admin/users/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/admin.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/http.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/guard.ts [app-route] (ecmascript)");
;
;
;
const roles = [
    "admin",
    "official",
    "resident"
];
async function GET(request) {
    const access = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireAdmin"])();
    if (!access.ok) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])("Administrator access required.", access.status);
    try {
        const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createSupabaseAdminClient"])();
        const allUsers = [];
        for(let page = 1;; page += 1){
            const { data, error } = await admin.auth.admin.listUsers({
                page,
                perPage: 1000
            });
            if (error) throw error;
            allUsers.push(...data.users);
            if (data.users.length < 1000) break;
        }
        const { data: profiles, error: profileError } = await admin.from("profiles").select("id, full_name, role, position, department, is_active, created_at");
        if (profileError) throw profileError;
        const profileById = new Map((profiles ?? []).map((profile)=>[
                profile.id,
                profile
            ]));
        let users = allUsers.map((user)=>{
            const profile = profileById.get(user.id);
            return {
                id: user.id,
                email: user.email ?? "",
                full_name: profile?.full_name || user.user_metadata?.full_name || "",
                role: profile?.role ?? "resident",
                position: profile?.position ?? null,
                department: profile?.department ?? null,
                is_active: profile?.is_active ?? false,
                created_at: profile?.created_at ?? user.created_at,
                last_sign_in_at: user.last_sign_in_at ?? null
            };
        });
        const params = new URL(request.url).searchParams;
        const query = params.get("q")?.trim().toLocaleLowerCase();
        const role = params.get("role");
        const status = params.get("status");
        if (query) users = users.filter((user)=>`${user.email} ${user.full_name}`.toLocaleLowerCase().includes(query));
        if (role && roles.includes(role)) users = users.filter((user)=>user.role === role);
        if (status === "active") users = users.filter((user)=>user.is_active);
        if (status === "disabled") users = users.filter((user)=>!user.is_active);
        return Response.json({
            users,
            metrics: {
                total: allUsers.length,
                admins: allUsers.filter((user)=>profileById.get(user.id)?.role === "admin").length,
                officials: allUsers.filter((user)=>profileById.get(user.id)?.role === "official").length,
                residents: allUsers.filter((user)=>![
                        "admin",
                        "official"
                    ].includes(profileById.get(user.id)?.role ?? "resident")).length,
                active: allUsers.filter((user)=>profileById.get(user.id)?.is_active === true).length,
                disabled: allUsers.filter((user)=>profileById.get(user.id)?.is_active !== true).length
            }
        }, {
            headers: {
                "Cache-Control": "no-store"
            }
        });
    } catch (error) {
        console.error("Admin user listing failed", error);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])("Unable to load user accounts.", 500);
    }
}
async function POST(request) {
    const access = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$guard$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireAdmin"])();
    if (!access.ok) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])("Administrator access required.", access.status);
    let createdUserId;
    try {
        const body = await request.json();
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";
        const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
        const role = body.role;
        if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || !full_name || !roles.includes(role)) {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])("Enter a valid email, full name, role, and temporary password of at least 12 characters.", 400);
        }
        const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createSupabaseAdminClient"])();
        const { data, error } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                role
            }
        });
        if (error) throw error;
        createdUserId = data.user.id;
        const { error: profileError } = await admin.from("profiles").upsert({
            id: createdUserId,
            full_name,
            role,
            position: typeof body.position === "string" ? body.position.trim() || null : null,
            department: typeof body.department === "string" ? body.department.trim() || null : null,
            is_active: true
        });
        if (profileError) throw profileError;
        const { error: auditError } = await admin.from("audit_logs").insert({
            actor_id: access.actor.id,
            target_user_id: createdUserId,
            action: "user.create",
            details: {
                email,
                role
            }
        });
        if (auditError) throw auditError;
        return Response.json({
            id: createdUserId
        }, {
            status: 201
        });
    } catch (error) {
        console.error("Admin user creation failed", error);
        if (createdUserId) {
            const admin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$admin$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createSupabaseAdminClient"])();
            await admin.auth.admin.deleteUser(createdUserId);
            const { error: auditError } = await admin.from("audit_logs").insert({
                actor_id: access.actor.id,
                target_user_id: createdUserId,
                action: "user.create_failed",
                details: {
                    reason: error instanceof Error ? error.message : "unknown"
                }
            });
            if (auditError) console.error("Could not record failed account creation", auditError);
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$http$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])("Unable to create account. Confirm the email is unused and try again.", 400);
    }
}
}),
"[project]/src/lib/http.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "jsonError",
    ()=>jsonError
]);
function jsonError(message, status) {
    return Response.json({
        error: message
    }, {
        status
    });
}
}),
"[project]/src/lib/supabase/admin.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createSupabaseAdminClient",
    ()=>createSupabaseAdminClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
;
function createSupabaseAdminClient() {
    const url = ("TURBOPACK compile-time value", "https://lemnfqjyrhirjnfukfrm.supabase.co");
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
        throw new Error("Supabase server configuration is missing.");
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
}),
"[project]/src/lib/supabase/guard.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "requireAdmin",
    ()=>requireAdmin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-route] (ecmascript)");
;
;
async function requireAdmin() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createSupabaseServerClient"])();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return {
        ok: false,
        status: 401
    };
    const { data: profile, error } = await supabase.from("profiles").select("id, role, is_active").eq("id", user.id).single();
    if (error || !profile || !profile.is_active || profile.role !== "admin") {
        return {
            ok: false,
            status: 403
        };
    }
    return {
        ok: true,
        actor: user,
        supabase
    };
}
}),
"[project]/src/lib/supabase/server.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createSupabaseServerClient",
    ()=>createSupabaseServerClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
;
;
;
async function createSupabaseServerClient() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://lemnfqjyrhirjnfukfrm.supabase.co"), ("TURBOPACK compile-time value", "sb_publishable_s9PHsSIXxAQP26QUwTDrZw_qrxe-bpc"), {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // Server Components cannot write cookies; proxy.ts refreshes sessions.
                }
            }
        }
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1wsgxzh9itdjc._.js.map