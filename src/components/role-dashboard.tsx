"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Clapperboard, LayoutDashboard, LifeBuoy, LogOut, MapPinned, ShieldCheck, UserRound } from "lucide-react";
import type { AppRole } from "@/lib/auth/roles";
import { getRoleDashboardPath } from "@/lib/auth/roles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { LoadingButton } from "@/components/ui/loading-button";
import { AccessNotice } from "@/components/ui/access-notice";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { clearOfflinePages } from "@/components/ui/service-worker";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useI18n } from "@/lib/i18n/provider";

/** Header + navigation shared by the resident and official pages. */
export function RoleDashboard({ role, userId, fullName, title, subtitle, children }: {
  role: Exclude<AppRole, "admin">;
  /** Shows the notification bell for residents when given. */
  userId?: string;
  fullName: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const home = getRoleDashboardPath(role) ?? "/";
  const roleLabel = role === "resident" ? t("role.resident") : t("role.official");

  async function signOut() {
    setSigningOut(true);
    setError("");
    try {
      clearOfflinePages();
      const { error: signOutError } = await createSupabaseBrowserClient().auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/login");
      router.refresh();
    } catch {
      setError(t("nav.signOutFailed"));
      setSigningOut(false);
    }
  }

  const firstName = fullName.trim().split(/\s+/)[0] ?? "";
  const heading = title ?? (firstName ? t("header.welcome", { name: firstName }) : t("header.welcomeAnon"));
  const description = subtitle ?? (role === "resident" ? t("header.residentIntro") : t("header.officialIntro"));

  return <div className="role-shell">
    <Suspense fallback={null}><AccessNotice /></Suspense>
    <header className="role-header">
      <Link href={home} className="brand-lockup role-brand">
        <span className="brand-badge"><ShieldCheck size={20} /></span>
        <span><strong>AlertBarangay</strong><small>{roleLabel.toUpperCase()}</small></span>
      </Link>
      <nav className="role-nav" aria-label="Main navigation">
        {role === "resident" ? <>
          <Link href={home} className={pathname === home ? "active" : undefined} aria-current={pathname === home ? "page" : undefined}><LayoutDashboard size={15} /><span>{t("nav.dashboard")}</span></Link>
          <Link href="/resident/community" className={pathname === "/resident/community" ? "active" : undefined} aria-current={pathname === "/resident/community" ? "page" : undefined}><Clapperboard size={15} /><span>{t("nav.community")}</span></Link>
          <Link href="/resident/map" className={pathname === "/resident/map" ? "active" : undefined} aria-current={pathname === "/resident/map" ? "page" : undefined}><MapPinned size={15} /><span>{t("nav.map")}</span></Link>
          <Link href="/resident/safety" className={pathname === "/resident/safety" ? "active" : undefined} aria-current={pathname === "/resident/safety" ? "page" : undefined}><LifeBuoy size={15} /><span>{t("nav.safety")}</span></Link>
        </> : <Link href={home} className={pathname === home ? "active" : undefined} aria-current={pathname === home ? "page" : undefined}><LayoutDashboard size={15} /><span>{t("nav.dashboard")}</span></Link>}
        <Link href="/account" className={pathname === "/account" ? "active" : undefined} aria-current={pathname === "/account" ? "page" : undefined}><UserRound size={15} /><span>{t("nav.account")}</span></Link>
        {role === "resident" && <LanguageSwitcher />}
        {role === "resident" && userId && <NotificationBell userId={userId} />}
        <LoadingButton type="button" onClick={() => void signOut()} loading={signingOut} loadingText={t("nav.signingOut")} aria-label={t("nav.signOut")}><LogOut size={15} /><span>{t("nav.signOut")}</span></LoadingButton>
      </nav>
    </header>
    <main className="role-main">
      <div className="page-wrap">
        {role === "resident" && <OfflineBanner />}
        {error && <div className="inline-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
        <div className="page-heading">
          <div>
            <div className="eyebrow">{roleLabel.toUpperCase()}</div>
            <h1>{heading}</h1>
            <p className="subtitle">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  </div>;
}
