"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Flame, HeartPulse, Phone, ShieldAlert, Waves, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import styles from "./resident-safety.module.css";

const hotline = "0918-921-0000";
const safetyTips = [
  { title: "Fire", tip: "Get out, stay out, and call the hotline. Never use elevators during a fire.", icon: Flame },
  { title: "Flood", tip: "Move to higher ground, switch off the main power, and avoid walking through floodwater.", icon: Waves },
  { title: "Electrical hazards", tip: "Stay away from fallen wires and report them right away. Never touch wet electrical devices.", icon: Zap },
  { title: "Road accidents", tip: "Turn on hazard lights, keep the area safe, and report the exact location.", icon: ShieldAlert },
  { title: "Earthquake", tip: "Drop, cover, and hold on. Move to an open area after shaking stops.", icon: HeartPulse },
];
const contacts = [
  { name: "Philippine Red Cross Cebu", number: "0915-583-9829", tel: "tel:+639155839829" },
  { name: "Fire Station (Labangon)", number: "(032) 261-0911", tel: "tel:+63322610911" },
  { name: "Police Station (Labangon)", number: "0998 598 6292", tel: "tel:+639985986292" },
  { name: "Rescue Unit", number: hotline, tel: "tel:+639189210000" },
  { name: "Cebu City Hall", number: "(032) 411-0100", tel: "tel:+63324110100" },
  { name: "Visayan Electric", number: "(032) 230-8326", tel: "tel:+63322308326" },
  { name: "CCDRRMO Mambaling", number: "(032) 262-1424", tel: "tel:+63322621424" },
  { name: "MCWD", number: "(032) 254-8434", tel: "tel:+63322548434" },
];

export function ResidentSafety() {
  const { t } = useI18n();
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");

  async function copyNumber(number: string, name: string) {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(number);
      setCopied(name);
      window.setTimeout(() => setCopied((current) => current === name ? "" : current), 1800);
    } catch {
      setCopyError(t("resident.safety.copyError"));
    }
  }

  return <div className={styles.safetyPage}>
    <section className={styles.hotline}>
      <span className={styles.hotlineIcon}><Phone size={20} /></span>
      <div><strong>{t("resident.safety.hotlineTitle")}</strong><p>{t("resident.safety.hotlineHint")}</p></div>
      <a href="tel:+639189210000">{hotline}</a>
    </section>

    <section className={`${styles.section} panel`} aria-labelledby="safety-tips-heading">
      <div className={styles.sectionHeading}><h2 id="safety-tips-heading">{t("resident.safety.tipsTitle")}</h2><p>{t("resident.safety.tipsHint")}</p></div>
      <div className={styles.tipsGrid}>
        {safetyTips.map(({ title, tip, icon: Icon }) => <article className={styles.tip} key={title}>
          <span><Icon size={18} /></span><div><h3>{title}</h3><p>{tip}</p></div>
        </article>)}
      </div>
    </section>

    <section className={`${styles.section} panel`} aria-labelledby="barangay-contacts-heading">
      <div className={styles.sectionHeading}><h2 id="barangay-contacts-heading">{t("resident.safety.contactsTitle")}</h2><p>{t("resident.safety.contactsHint")}</p></div>
      {copyError && <p className="inline-error" role="alert">{copyError}</p>}
      <div className={styles.contactsGrid}>
        {contacts.map((contact) => <article className={styles.contact} key={contact.name}>
          <div><strong>{contact.name}</strong><a href={contact.tel}>{contact.number}</a></div>
          <div className={styles.contactActions}>
            <a className="button primary" href={contact.tel}><Phone size={14} /> {t("resident.safety.call")}</a>
            <button className="button secondary" type="button" onClick={() => void copyNumber(contact.number, contact.name)}><Copy size={14} /> {copied === contact.name ? t("resident.safety.copied") : t("resident.safety.copy")}</button>
          </div>
        </article>)}
      </div>
    </section>

    <p className={styles.reportPrompt}>{t("resident.safety.reportPrompt")} <Link href="/resident/dashboard">{t("nav.dashboard")}</Link>.</p>
  </div>;
}
