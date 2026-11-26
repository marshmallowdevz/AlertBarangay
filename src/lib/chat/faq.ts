/**
 * Built-in answers used when no GEMINI_API_KEY is configured (or Gemini is down),
 * so the resident assistant works out of the box. Matches on keywords in
 * English, Filipino and Cebuano and replies in the resident's language.
 */
export type FaqLang = "en" | "fil" | "ceb";

type Topic = { keywords: string[]; answer: Record<FaqLang, string> };

const CEB_HINTS = ["unsaon", "unsa", "asa", "nganong", "ngano", "kanus-a", "nimo", "nako", "akong", "imong", "dili", "naa", "wala ", "unya", "karon", "mo-report", "bagyo", "linog"];
const FIL_HINTS = ["paano", "ano ", "saan", "bakit", "kailan", "ang ", "mga ", "ako", "ko ", "hindi", "may ", "naman", "lindol", "bagyo", "sunog", "baha"];

/** Picks the language of the message, falling back to the app language. */
export function detectLang(text: string, fallback: FaqLang): FaqLang {
  const lower = ` ${text.toLowerCase()} `;
  const score = (hints: string[]) => hints.filter((hint) => lower.includes(hint)).length;
  const ceb = score(CEB_HINTS);
  const fil = score(FIL_HINTS);
  if (ceb === 0 && fil === 0) return fallback;
  return ceb >= fil ? "ceb" : "fil";
}

const topics: Topic[] = [
  {
    keywords: ["emergency now", "dying", "unconscious", "not breathing", "bleeding", "trapped", "naghihingalo", "walang malay", "hindi humihinga", "nagdudugo", "naipit", "nag-agaw", "walay panimuot", "dili moginhawa", "nagdugo", "tabang", "saklolo", "help me"],
    answer: {
      en: "If someone's life is in danger, call 911 right now. Then send a report from the Report an emergency form on your dashboard so barangay responders can find you.",
      fil: "Kung may buhay na nanganganib, tumawag agad sa 911. Pagkatapos, magpadala ng ulat gamit ang form na Mag-ulat ng emergency sa iyong dashboard para mahanap ka ng mga responder.",
      ceb: "Kung naay kinabuhi nga nameligro, tawag dayon sa 911. Unya ipadala ang report gamit ang form nga Mo-report og emergency sa imong dashboard aron makit-an ka sa mga responder.",
    },
  },
  {
    keywords: ["status", "pending", "responding", "resolved", "naghihintay", "tinutugunan", "naresolba", "naghulat", "nasulbad", "progress", "my report", "aking ulat", "akong report"],
    answer: {
      en: "Report statuses:\n• Pending: the barangay has received your report.\n• Responding: officials are acting on it.\n• Resolved: the incident has been handled.\nYour reports update automatically under My reports, and the bell at the top tells you when a status changes.",
      fil: "Mga status ng ulat:\n• Naghihintay: natanggap na ng barangay ang iyong ulat.\n• Tinutugunan: kumikilos na ang mga opisyal.\n• Naresolba: naasikaso na ang insidente.\nKusang nag-a-update ang iyong mga ulat sa Aking mga ulat, at aabisuhan ka ng kampana sa itaas kapag nagbago ang status.",
      ceb: "Mga status sa report:\n• Naghulat: nadawat na sa barangay ang imong report.\n• Gitubag na: naglihok na ang mga opisyal.\n• Nasulbad: naatiman na ang insidente.\nAwtomatikong ma-update ang imong mga report sa Akong mga report, ug ang lingganay sa ibabaw mopahibalo nimo kung mausab ang status.",
    },
  },
  {
    keywords: ["report", "send", "file", "submit", "how do i", "mag-ulat", "ulat", "magpadala", "paano mag", "mo-report", "ipadala", "unsaon pag"],
    answer: {
      en: "To send a report:\n1. Pick what is happening (fire, medical, flood, and so on).\n2. Describe what happened.\n3. Tap Use my current location, or type the address or a nearby landmark.\n4. Add a photo or video if you can.\n5. Tap Send report.\nFor life-threatening emergencies, call 911 first.",
      fil: "Para magpadala ng ulat:\n1. Piliin kung ano ang nangyayari (sunog, medikal, baha, at iba pa).\n2. Ilarawan ang nangyari.\n3. Pindutin ang Gamitin ang aking kasalukuyang lokasyon, o i-type ang address o malapit na palatandaan.\n4. Magdagdag ng larawan o video kung kaya.\n5. Pindutin ang Ipadala ang ulat.\nKung may buhay na nanganganib, tumawag muna sa 911.",
      ceb: "Aron magpadala og report:\n1. Pilia kung unsa ang nahitabo (sunog, medikal, baha, ug uban pa).\n2. Ihulagway ang nahitabo.\n3. Pinduta ang Gamita ang akong lokasyon karon, o i-type ang address o duol nga timaan.\n4. Dugangi og litrato o video kung mahimo.\n5. Pinduta ang Ipadala ang report.\nKung naay kinabuhi nga nameligro, tawag una sa 911.",
    },
  },
  {
    keywords: ["typhoon", "storm", "bagyo", "go-bag", "go bag", "prepare", "maghanda", "pangandam", "andam"],
    answer: {
      en: "Before a typhoon:\n• Pack a go-bag: water, ready-to-eat food, flashlight, power bank, medicines, copies of IDs, cash, a whistle.\n• Charge your phone and follow barangay announcements here.\n• Secure loose items and know your nearest evacuation area.\n• Evacuate early when the barangay tells you to.",
      fil: "Bago dumating ang bagyo:\n• Maghanda ng go-bag: tubig, pagkaing handa nang kainin, flashlight, power bank, gamot, kopya ng ID, pera, pito.\n• I-charge ang telepono at sundan ang mga anunsyo ng barangay dito.\n• Itali o itabi ang mga bagay na puwedeng liparin at alamin ang pinakamalapit na evacuation area.\n• Lumikas nang maaga kapag sinabi ng barangay.",
      ceb: "Sa dili pa moabot ang bagyo:\n• Andama ang go-bag: tubig, pagkaon nga andam na kan-on, flashlight, power bank, tambal, kopya sa ID, kwarta, pito.\n• I-charge ang telepono ug sunda ang mga pahibalo sa barangay dinhi.\n• Higti o tipigi ang mga butang nga mahimong mahuyop ug hibaloa ang pinakaduol nga evacuation area.\n• Pag-evacuate og sayo kung isulti sa barangay.",
    },
  },
  {
    keywords: ["fire", "smoke", "sunog", "usok", "aso", "kalayo"],
    answer: {
      en: "If there's a fire: get everyone out and stay out, stay low under smoke, and call 911 or the fire station. Don't go back for belongings. Then send a Fire report from your dashboard with the location.",
      fil: "Kapag may sunog: ilabas ang lahat at huwag nang bumalik, yumuko kapag may usok, at tumawag sa 911 o sa bumbero. Huwag balikan ang mga gamit. Pagkatapos, magpadala ng ulat na Sunog mula sa dashboard kasama ang lokasyon.",
      ceb: "Kung naay sunog: pagawasa ang tanan ug ayaw na pagbalik, pag-ubos kung naay aso, ug tawag sa 911 o sa bombero. Ayaw balika ang mga gamit. Unya ipadala ang report nga Sunog gikan sa dashboard uban ang lokasyon.",
    },
  },
  {
    keywords: ["flood", "baha", "water rising", "tumataas ang tubig", "nagsaka ang tubig"],
    answer: {
      en: "During a flood: move to higher ground, switch off electricity if water is coming in, and never walk or drive through moving water. Send a Flood report from your dashboard and follow barangay announcements.",
      fil: "Kapag may baha: lumipat sa mataas na lugar, patayin ang kuryente kung pumapasok ang tubig, at huwag lumusong o magmaneho sa umaagos na tubig. Magpadala ng ulat na Baha mula sa dashboard at sundan ang mga anunsyo ng barangay.",
      ceb: "Kung naay baha: balhin sa taas nga lugar, palonga ang kuryente kung mosulod ang tubig, ug ayaw paglakaw o pagmaneho sa nagdagayday nga tubig. Ipadala ang report nga Baha gikan sa dashboard ug sunda ang mga pahibalo sa barangay.",
    },
  },
  {
    keywords: ["earthquake", "lindol", "linog"],
    answer: {
      en: "During an earthquake: Drop, Cover and Hold On under a sturdy table, away from windows. When the shaking stops, go outside to an open area and watch for aftershocks. Report damage or injuries from your dashboard.",
      fil: "Kapag may lindol: Dumapa, Magtago at Kumapit sa ilalim ng matibay na mesa, malayo sa bintana. Kapag tumigil ang pagyanig, lumabas sa bukas na lugar at mag-ingat sa aftershocks. I-ulat ang pinsala o nasaktan mula sa dashboard.",
      ceb: "Kung naay linog: Pagyukbo, Pagtago ug Kupot ilalom sa lig-on nga lamesa, layo sa bintana. Kung mohunong ang pag-uyog, gawas sa abli nga lugar ug pagbantay sa aftershocks. I-report ang kadaot o samdan gikan sa dashboard.",
    },
  },
  {
    keywords: ["first aid", "injury", "wound", "burn", "faint", "sugat", "paso", "nahimatay", "napaso", "samad"],
    answer: {
      en: "Basic first aid: press a clean cloth on bleeding wounds, cool burns under running water for 10–20 minutes, and lay a fainted person on their back with legs raised. For anything serious, call 911 and get medical help.",
      fil: "Pangunang lunas: diinan ng malinis na tela ang sugat na dumudugo, palamigin ang paso sa umaagos na tubig nang 10–20 minuto, at ihiga nang patihaya ang nahimatay at itaas ang mga paa. Kung malala, tumawag sa 911 at magpatingin sa doktor.",
      ceb: "Unang tabang: idiin ang limpyo nga panapton sa samad nga nagdugo, pabugnawa ang paso sa nagdagayday nga tubig sulod sa 10–20 ka minuto, ug ihigda nga patihaya ang nakuyapan ug ipataas ang tiil. Kung grabe, tawag sa 911 ug pagpatan-aw sa doktor.",
    },
  },
  {
    keywords: ["message", "chat with", "contact", "mensahe", "makipag-usap", "kontak"],
    answer: {
      en: "To message the barangay about a report, open My reports and tap Messages under that report. Your phone number and email stay private.",
      fil: "Para magmensahe sa barangay tungkol sa isang ulat, buksan ang Aking mga ulat at pindutin ang Mga mensahe sa ilalim ng ulat. Mananatiling pribado ang iyong numero at email.",
      ceb: "Aron magmensahe sa barangay bahin sa usa ka report, ablihi ang Akong mga report ug pinduta ang Mga mensahe ilalom sa report. Magpabiling pribado ang imong numero ug email.",
    },
  },
  {
    keywords: ["offline", "no signal", "no internet", "walang signal", "walay signal", "walay internet"],
    answer: {
      en: "You can still write a report without internet. It is saved on your phone and sent automatically when you're back online. For life-threatening emergencies, call 911.",
      fil: "Puwede ka pa ring sumulat ng ulat kahit walang internet. Mase-save ito sa telepono at kusang maipapadala pagbalik ng koneksyon. Kung may buhay na nanganganib, tumawag sa 911.",
      ceb: "Makasulat ka gihapon og report bisan walay internet. Ma-save kini sa imong telepono ug awtomatikong maipadala inig balik sa koneksyon. Kung naay kinabuhi nga nameligro, tawag sa 911.",
    },
  },
  {
    keywords: ["password", "name", "photo", "account", "pangalan", "litrato", "larawan", "ngalan"],
    answer: {
      en: "Open Account at the top of the page to change your name, photo or password.",
      fil: "Buksan ang Account sa itaas ng pahina para palitan ang iyong pangalan, larawan o password.",
      ceb: "Ablihi ang Account sa ibabaw sa panid aron usbon ang imong ngalan, litrato o password.",
    },
  },
];

const fallback: Record<FaqLang, string> = {
  en: "I can help with sending a report, report statuses, messages to the barangay, and safety tips for typhoons, floods, fires, earthquakes and first aid. Try asking about one of those. For a life-threatening emergency, call 911.",
  fil: "Matutulungan kita sa pagpapadala ng ulat, mga status ng ulat, pagmemensahe sa barangay, at mga tip sa kaligtasan sa bagyo, baha, sunog, lindol at pangunang lunas. Subukang magtanong tungkol dito. Kung may buhay na nanganganib, tumawag sa 911.",
  ceb: "Matabangan tika sa pagpadala og report, mga status sa report, pagmensahe sa barangay, ug tips sa kaluwasan sa bagyo, baha, sunog, linog ug unang tabang. Sulayi pangutana bahin niini. Kung naay kinabuhi nga nameligro, tawag sa 911.",
};

/** Answer for the resident's latest message, without any AI service. */
export function answerFromFaq(question: string, appLang: FaqLang) {
  const lang = detectLang(question, appLang);
  const lower = question.toLowerCase();
  const topic = topics.find((item) => item.keywords.some((keyword) => lower.includes(keyword)));
  return (topic ?? { answer: fallback }).answer[lang];
}
