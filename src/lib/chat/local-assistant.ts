import type { ChatTurn } from "@/lib/chat/assistant";

type ChatLanguage = "en" | "fil" | "ceb";

const copy = {
  en: {
    emergency: "If someone is in immediate danger, call 911 now. Then open Report an emergency on your dashboard, describe what is happening, and add a location so responders can find it.",
    report: "Open Report an emergency on your resident dashboard. Choose a category, describe what happened, then share your GPS location or enter an address or landmark. Add a photo or video if it is safe to do so, then send the report.",
    status: "Pending means the barangay has received your report. Responding means responders are handling it. Resolved means the response has been completed. Open My reports on your dashboard to follow updates or message staff about a report.",
    safety: "Prepare drinking water, ready-to-eat food, medicines, a flashlight, batteries, a charged phone and power bank, copies of important documents in a waterproof bag, and basic first-aid supplies. Follow official announcements and leave early if authorities advise evacuation.",
    fallback: "I can help you submit an incident report, understand report statuses, and prepare for common emergencies. For immediate danger, call 911. You can also check barangay announcements on your dashboard.",
  },
  fil: {
    emergency: "Kung may agarang panganib, tumawag agad sa 911. Pagkatapos, buksan ang Report an emergency sa iyong dashboard, ilarawan ang nangyayari, at ilagay ang lokasyon para mahanap ka ng mga responder.",
    report: "Buksan ang Report an emergency sa resident dashboard. Pumili ng kategorya, ilarawan ang nangyari, at ibahagi ang GPS location o ilagay ang address o palatandaan. Magdagdag lang ng litrato o video kung ligtas, pagkatapos ay ipadala ang report.",
    status: "Ang Pending ay natanggap na ng barangay ang report. Ang Responding ay inaasikaso na ito ng mga responder. Ang Resolved ay tapos na ang pagtugon. Buksan ang My reports sa dashboard para makita ang updates o mag-message sa staff tungkol sa report.",
    safety: "Maghanda ng inuming tubig, pagkaing madaling kainin, gamot, flashlight, baterya, cellphone at power bank na may charge, mahahalagang dokumento sa waterproof na supot, at first-aid supplies. Sundin ang opisyal na anunsyo at lumikas agad kung ipinayo ng awtoridad.",
    fallback: "Matutulungan kitang magpadala ng incident report, unawain ang status nito, at maghanda sa mga karaniwang emergency. Kung may agarang panganib, tumawag sa 911. Tingnan din ang mga anunsyo ng barangay sa dashboard.",
  },
  ceb: {
    emergency: "Kung adunay dinaliang peligro, tawag dayon sa 911. Human niana, ablihi ang Report an emergency sa imong dashboard, ihulagway ang nahitabo, ug isulat ang lokasyon aron makita ka sa mga responder.",
    report: "Ablihi ang Report an emergency sa resident dashboard. Pilia ang kategorya, ihulagway ang nahitabo, ug ipaambit ang GPS location o isulat ang address o duol nga landmark. Pagdugang og litrato o video kon luwas, dayon ipadala ang report.",
    status: "Ang Pending nagpasabot nga nadawat na sa barangay ang report. Ang Responding nagpasabot nga giatiman na kini sa mga responder. Ang Resolved nagpasabot nga nahuman na ang pagresponde. Ablihi ang My reports sa dashboard aron makita ang updates o mag-message sa staff.",
    safety: "Pag-andam og tubig nga imnon, pagkaon nga dali kaunon, tambal, flashlight, baterya, cellphone ug power bank nga puno, importanteng dokumento sulod sa waterproof nga supot, ug first-aid supplies. Sunda ang opisyal nga pahibalo ug sayo nga pagbakwit kon sugoon sa awtoridad.",
    fallback: "Makatabang ko sa pagpadala og incident report, pagsabot sa status niini, ug pagpangandam sa kasagarang emerhensiya. Kung adunay dinaliang peligro, tawag sa 911. Tan-awa usab ang mga pahibalo sa barangay sa dashboard.",
  },
} satisfies Record<ChatLanguage, Record<"emergency" | "report" | "status" | "safety" | "fallback", string>>;

/** Gives residents useful app and safety guidance when no AI provider key is configured. */
export function localAssistantReply(messages: ChatTurn[], language: string) {
  const lang: ChatLanguage = language === "fil" || language === "ceb" ? language : "en";
  const question = [...messages].reverse().find((turn) => turn.role === "user")?.content.toLocaleLowerCase() ?? "";
  const answers = copy[lang];

  if (/right now|happening now|life[- ]threatening|can't breathe|cannot breathe|unconscious|severely bleeding|trapped|ngayon na|karong orasa|dili na kaginhawa/.test(question)) return answers.emergency;
  if (/status|pending|responding|resolved|follow|update|kahulugan|kahimtang/.test(question)) return answers.status;
  if (/typhoon|storm|bag|prepare|prepar|earthquake|baha|bagyo|lindol|go-bag/.test(question)) return answers.safety;
  if (/report|incident|emergency|submit|send|ulat|reporta/.test(question)) return answers.report;
  return answers.fallback;
}
