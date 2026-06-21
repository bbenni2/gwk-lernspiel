import { useState, useMemo, useCallback, useEffect } from "react";
import * as d3 from "d3";
import GEO from "./data/geo.json";

const W = 820, H = 580, PAD = 28;

// ─── Ländernamen (ISO-ID → Deutsch) ───────────────────────────────────────────
const NAMES = {
  "156":"China","496":"Mongolei","643":"Russland","408":"Nordkorea","704":"Vietnam",
  "418":"Laos","104":"Myanmar","356":"Indien","64":"Bhutan","524":"Nepal","586":"Pakistan",
  "4":"Afghanistan","762":"Tadschikistan","417":"Kirgisistan","398":"Kasachstan","840":"USA",
  "124":"Kanada","484":"Mexiko","233":"Estland","428":"Lettland","440":"Litauen","804":"Ukraine",
  "112":"Belarus","498":"Moldau","268":"Georgien","51":"Armenien","31":"Aserbaidschan",
  "860":"Usbekistan","795":"Turkmenistan","682":"Saudi-Arabien","400":"Jordanien","368":"Irak",
  "414":"Kuwait","634":"Katar","784":"Ver. Arab. Emirate","512":"Oman","887":"Jemen",
  "50":"Bangladesch","144":"Sri Lanka","410":"Südkorea"
};
void NAMES; // referenced in result screen indirectly

// ─── Länder-Konfiguration ─────────────────────────────────────────────────────
const COUNTRIES = {
  china:    { label:"China",         flag:"🇨🇳", color:"#e03050", bg:"#fff0f2",
              fit:[73,17,135,54], target:"156",
              ctx:["496","643","408","704","418","104","356","64","524","586","4","762","417","398"] },
  usa:      { label:"USA",           flag:"🇺🇸", color:"#2563eb", bg:"#eff6ff",
              fit:[-125,24,-66,50], target:"840",
              ctx:["124","484"] },
  russland: { label:"Russland",      flag:"🇷🇺", color:"#7c3aed", bg:"#f5f3ff",
              fit:[22,36,89,61], target:"643",
              ctx:["233","428","440","804","112","498","268","51","31","398","860","795","762","417"] },
  saudi:    { label:"Saudi-Arabien", flag:"🇸🇦", color:"#059669", bg:"#ecfdf5",
              fit:[33,12,60,33], target:"682",
              ctx:["400","368","414","634","784","512","887"] },
  indien:   { label:"Indien",        flag:"🇮🇳", color:"#ea580c", bg:"#fff7ed",
              fit:[67,6,98,37], target:"356",
              ctx:["586","156","524","64","50","104","4","144"] },
};

// ─── Karten-Inhalte ───────────────────────────────────────────────────────────
const CONTENT = {
  china: { map: [
    {cat:"Stadt", a:"Peking",      m:[116.4,39.9], hint:"Nordosten", acc:["beijing"]},
    {cat:"Stadt", a:"Shanghai",    m:[121.5,31.2], hint:"Osten"},
    {cat:"Stadt", a:"Shenyang",    m:[123.4,41.8], hint:"Nordosten"},
    {cat:"Stadt", a:"Hongkong",    m:[114.2,22.3], hint:"Süden", acc:["hong kong"]},
    {cat:"Stadt", a:"Guangzhou",   m:[113.3,23.1], hint:"Süden", acc:["kanton"]},
    {cat:"Stadt", a:"Wuhan",       m:[114.3,30.6], hint:"Zentrum"},
    {cat:"Gebirge", a:"Mount Everest", m:[86.9,28.0], hint:"Himalaya – Grenze zu Nepal/Indien", acc:["everest","himalaya"]},
    {cat:"Gebirge", a:"Pamir",     m:[73.5,38.5], hint:"Westen"},
    {cat:"Gebirge", a:"Tian Shan", m:[80.0,42.0], hint:"Nordwesten", acc:["tianshan"]},
    {cat:"Wüste",   a:"Gobi",      m:[105.0,42.5], hint:"Norden"},
    {cat:"Wüste",   a:"Takla Makan", m:[82.0,39.0], hint:"Nordwesten", acc:["taklamakan"]},
    {cat:"Naturraum", a:"Braunes China", m:[95,41],  hint:"Steppen/Wüsten – NW",            desc:"Trocken- u. Steppenregion im Nordwesten"},
    {cat:"Naturraum", a:"Weißes China",  m:[88,32],  hint:"vergletscherte Hochgebirge – SW", desc:"Vergletscherte Hochgebirge (Tibet, Himalaya)"},
    {cat:"Naturraum", a:"Gelbes China",  m:[118,40], hint:"Ackerbau/fruchtbar – NO",         desc:"Fruchtbare Ackerbau- u. Lössebene im Nordosten"},
    {cat:"Naturraum", a:"Grünes China",  m:[113,25], hint:"subtropisch/Reis – SO",            desc:"Subtropische Reisanbauregion im Südosten"},
    {cat:"Nachbarstaat", a:"Mongolei",     cid:"496"},
    {cat:"Nachbarstaat", a:"Russland",     cid:"643"},
    {cat:"Nachbarstaat", a:"Nordkorea",    cid:"408"},
    {cat:"Nachbarstaat", a:"Vietnam",      cid:"704"},
    {cat:"Nachbarstaat", a:"Laos",         cid:"418"},
    {cat:"Nachbarstaat", a:"Myanmar",      cid:"104"},
    {cat:"Nachbarstaat", a:"Indien",       cid:"356"},
    {cat:"Nachbarstaat", a:"Bhutan",       cid:"64"},
    {cat:"Nachbarstaat", a:"Nepal",        cid:"524"},
    {cat:"Nachbarstaat", a:"Pakistan",     cid:"586"},
    {cat:"Nachbarstaat", a:"Afghanistan",  cid:"4"},
    {cat:"Nachbarstaat", a:"Tadschikistan",cid:"762"},
    {cat:"Nachbarstaat", a:"Kirgisistan",  cid:"417"},
    {cat:"Nachbarstaat", a:"Kasachstan",   cid:"398"},
  ]},
  usa: { map: [
    {cat:"Stadt", a:"Chicago",         m:[-87.6,41.9],   hint:"Norden – Illinois"},
    {cat:"Stadt", a:"Detroit",         m:[-83.0,42.3],   hint:"Norden – Michigan"},
    {cat:"Stadt", a:"Minneapolis",     m:[-93.3,44.98],  hint:"Norden – Minnesota"},
    {cat:"Stadt", a:"New York City",   m:[-74.0,40.7],   hint:"Osten", acc:["nyc","new york"]},
    {cat:"Stadt", a:"Washington D.C.", m:[-77.0,38.9],   hint:"Osten – Hauptstadt", acc:["washington"]},
    {cat:"Stadt", a:"Boston",          m:[-71.06,42.36], hint:"Osten – Massachusetts"},
    {cat:"Stadt", a:"Houston",         m:[-95.37,29.76], hint:"Süden – Texas"},
    {cat:"Stadt", a:"Miami",           m:[-80.19,25.76], hint:"Süden – Florida"},
    {cat:"Stadt", a:"Atlanta",         m:[-84.39,33.75], hint:"Süden – Georgia"},
    {cat:"Stadt", a:"New Orleans",     m:[-90.07,29.95], hint:"Süden – Louisiana"},
    {cat:"Stadt", a:"Los Angeles",     m:[-118.24,34.05],hint:"Westen – Kalifornien", acc:["la"]},
    {cat:"Stadt", a:"San Francisco",   m:[-122.42,37.77],hint:"Westen – Kalifornien", acc:["sf"]},
    {cat:"Stadt", a:"Seattle",         m:[-122.33,47.6], hint:"Westen – Washington"},
    {cat:"Stadt", a:"Denver",          m:[-104.99,39.74],hint:"Westen – Colorado"},
    {cat:"Großlandschaft", a:"Küstenebene",       m:[-78,35],   hint:"Ostküste – flach",     desc:"Flaches Küstenland an der Ostküste"},
    {cat:"Großlandschaft", a:"Zentrales Tiefland",m:[-92,40],   hint:"flach, fruchtbar",     desc:"Weites fruchtbares Flachland im Zentrum"},
    {cat:"Großlandschaft", a:"Appalachen",        m:[-81,37],   hint:"Osten – Gebirge",      desc:"Altes Faltengebirge, dicht bewaldet (Ostküste)"},
    {cat:"Großlandschaft", a:"Great Plains",      m:[-100,41],  hint:"Prärie, westlich",     desc:"Weite Grasland-Prärie westlich des Mississippi"},
    {cat:"Großlandschaft", a:"Rocky Mountains",   m:[-106,39],  hint:"Westen – Hochgebirge", acc:["rockies","felsengebirge"], desc:"Junges Hochgebirge im Westen (3000–4400 m)"},
    {cat:"See", a:"Great Lakes",     m:[-83,45],    hint:"5 Seen – Grenze Kanada", acc:["große seen","grosse seen"]},
    {cat:"See", a:"Great Salt Lake", m:[-112.5,41.1],hint:"Westen – Utah"},
    {cat:"See", a:"Lake Tahoe",      m:[-120.0,39.1],hint:"Sierra Nevada"},
    {cat:"Ozean", a:"Pazifischer Ozean",  m:[-124,36.5], hint:"Westen", acc:["pazifik"]},
    {cat:"Ozean", a:"Atlantischer Ozean", m:[-71.5,34],  hint:"Osten", acc:["atlantik"]},
    {cat:"Fluss", a:"Mississippi River", line:[[-95.2,47.2],[-91,44],[-90.2,38.6],[-90,35],[-91,32],[-89.3,29]], hint:"von N nach S", acc:["mississippi"]},
    {cat:"Fluss", a:"Missouri River",    line:[[-111.5,45.9],[-101.4,47.5],[-96,41.2],[-94.6,39.1],[-90.1,38.8]], hint:"Rocky Mountains → Great Plains → St. Louis", acc:["missouri"]},
    {cat:"Fluss", a:"Hudson River",      line:[[-73.6,43.3],[-73.7,42.7],[-73.9,41.7],[-74.0,40.7]], hint:"New York", acc:["hudson"]},
    {cat:"Nachbarstaat", a:"Kanada", cid:"124"},
    {cat:"Nachbarstaat", a:"Mexiko", cid:"484"},
  ]},
  russland: { map: [
    {cat:"Nachfolgestaat", a:"Estland",       cid:"233", hint:"Baltikum"},
    {cat:"Nachfolgestaat", a:"Lettland",      cid:"428", hint:"Baltikum"},
    {cat:"Nachfolgestaat", a:"Litauen",       cid:"440", hint:"Baltikum"},
    {cat:"Nachfolgestaat", a:"Ukraine",       cid:"804", hint:"Osteuropa"},
    {cat:"Nachfolgestaat", a:"Belarus",       cid:"112", hint:"Osteuropa", acc:["weißrussland","weissrussland"]},
    {cat:"Nachfolgestaat", a:"Moldau",        cid:"498", hint:"Osteuropa", acc:["moldawien"]},
    {cat:"Nachfolgestaat", a:"Georgien",      cid:"268", hint:"Kaukasus"},
    {cat:"Nachfolgestaat", a:"Armenien",      cid:"51",  hint:"Kaukasus"},
    {cat:"Nachfolgestaat", a:"Aserbaidschan", cid:"31",  hint:"Kaukasus"},
    {cat:"Nachfolgestaat", a:"Kasachstan",    cid:"398", hint:"Zentralasien"},
    {cat:"Nachfolgestaat", a:"Usbekistan",    cid:"860", hint:"Zentralasien"},
    {cat:"Nachfolgestaat", a:"Turkmenistan",  cid:"795", hint:"Zentralasien"},
    {cat:"Nachfolgestaat", a:"Tadschikistan", cid:"762", hint:"Zentralasien"},
    {cat:"Nachfolgestaat", a:"Kirgisistan",   cid:"417", hint:"Zentralasien"},
  ]},
  saudi: { map: [
    {cat:"Stadt", a:"Riad",   m:[46.7,24.7], hint:"Hauptstadt – Zentrum", acc:["riyadh"]},
    {cat:"Stadt", a:"Jeddah", m:[39.2,21.5], hint:"Hafenstadt – W, Rotes Meer", acc:["dschidda","jiddah"]},
    {cat:"Stadt", a:"Mekka",  m:[39.8,21.4], hint:"Islam – W", acc:["mecca","makka"]},
    {cat:"Stadt", a:"Medina", m:[39.6,24.5], hint:"Islam – W", acc:["madina"]},
    {cat:"Gewässer", a:"Rotes Meer",        m:[37.5,22],   hint:"Westküste – trennt v. Afrika", acc:["red sea"]},
    {cat:"Gewässer", a:"Straße von Hormuz", m:[56.3,26.6], hint:"Seestraße – Öltransport", acc:["hormuz","hormus"]},
    {cat:"Nachbarstaat", a:"Jordanien",          cid:"400", hint:"Norden"},
    {cat:"Nachbarstaat", a:"Irak",               cid:"368", hint:"Norden"},
    {cat:"Nachbarstaat", a:"Kuwait",             cid:"414", hint:"Norden"},
    {cat:"Nachbarstaat", a:"Katar",              cid:"634", hint:"Osten"},
    {cat:"Nachbarstaat", a:"Ver. Arab. Emirate", cid:"784", hint:"Osten", acc:["vae","emirate","uae"]},
    {cat:"Nachbarstaat", a:"Bahrain",            m:[50.55,26.05], hint:"Osten (Insel)"},
    {cat:"Nachbarstaat", a:"Oman",               cid:"512", hint:"Süden/Osten"},
    {cat:"Nachbarstaat", a:"Jemen",              cid:"887", hint:"Süden"},
  ]},
  indien: { map: [
    {cat:"Stadt", a:"Neu-Delhi",  m:[77.2,28.6],  hint:"politische Hauptstadt", acc:["delhi","new delhi","neu delhi"]},
    {cat:"Stadt", a:"Mumbai",     m:[72.9,19.1],  hint:"Westen – Wirtschaftshauptstadt", acc:["bombay"]},
    {cat:"Stadt", a:"Bengaluru",  m:[77.6,12.97], hint:"Süden – Technologie", acc:["bangalore"]},
    {cat:"Stadt", a:"Kolkata",    m:[88.4,22.6],  hint:"Osten – Kultur", acc:["kalkutta","calcutta"]},
    {cat:"Stadt", a:"Chennai",    m:[80.3,13.1],  hint:"Süden – Automobil", acc:["madras"]},
    {cat:"Stadt", a:"Hyderabad",  m:[78.5,17.4],  hint:"Pharmazie"},
    {cat:"Fluss", a:"Ganges",      line:[[78.4,30.0],[80,27],[81.9,25.4],[85.1,25.6],[88,24],[90.5,23.5]], hint:"Himalaya → Bangladesch, heiligster Fluss", acc:["ganga"]},
    {cat:"Fluss", a:"Indus",       line:[[79.5,33],[76.5,34.5],[74.5,35],[72,32]], hint:"Tibet → Pakistan, namensgebend"},
    {cat:"Fluss", a:"Narmada",     line:[[81.7,22.7],[78,22.4],[75.9,22.1],[73,21.9],[72.8,21.6]], hint:"O → W, Grenze Nord-Süd"},
    {cat:"Fluss", a:"Brahmaputra", line:[[88,29],[92,27.5],[91.7,26.2],[90,25],[90.5,24]], hint:"Tibet → Nordosten → Ganges"},
    {cat:"Fluss", a:"Godavari",    line:[[73.5,19.9],[77,19],[79,18.3],[81.8,17],[82.3,16.9]], hint:"W → O, längster Fluss Südindiens"},
    {cat:"Gebirge", a:"Western Ghats", line:[[73,20],[74,16],[76,12],[77,9]], hint:"entlang Westküste"},
    {cat:"Gebirge", a:"Eastern Ghats", line:[[84,20],[80,17],[79,14]], hint:"entlang Ostküste"},
    {cat:"Nachbarstaat", a:"Pakistan",    cid:"586", hint:"NW"},
    {cat:"Nachbarstaat", a:"China",       cid:"156", hint:"N"},
    {cat:"Nachbarstaat", a:"Nepal",       cid:"524", hint:"N"},
    {cat:"Nachbarstaat", a:"Bhutan",      cid:"64",  hint:"NO"},
    {cat:"Nachbarstaat", a:"Bangladesch", cid:"50",  hint:"O"},
    {cat:"Nachbarstaat", a:"Myanmar",     cid:"104", hint:"O"},
    {cat:"Nachbarstaat", a:"Afghanistan", cid:"4",   hint:"N"},
    {cat:"Nachbarstaat", a:"Sri Lanka",   cid:"144", hint:"S"},
  ]},
};

// ─── Fakten ───────────────────────────────────────────────────────────────────
const FACTS = {
  china:    { Regierungschef:"Xi Jinping",
              Einwohner:"1,2 Mrd (homogen – Han-Chinesen + 56 weitere)",
              Stärken:"2.-größte Volkswirtschaft – Autos, neue Technologie, Solar, Batterien, neue Exportmärkte",
              Hindernisse:"Verschuldung, Immobilienkrise, demografischer Wandel",
              Geopolitik:"Einfluss im Pazifik & in UNO/WTO, Taiwan, Machterhalt der KPCh",
              Verbündete:"Meidung klass. Bündnisse → strateg. Partnerschaften: Nordkorea & Russland",
              Feinde:"Taiwan & USA",
              Schwemmebene:"Flaches Gelände, wo Flüsse Gesteinsmaterial aus dem Gebirge ablagern (anschwemmen)" },
  usa:      { Regierungschef:"Donald Trump",
              Einwohner:"330 Mio (sehr divers – Hispanics, Europäer)",
              Stärken:"größte Volkswirtschaft – Technologie, Software, Innovation, Finanzwesen",
              Hindernisse:"Zölle, Handelsstreit mit China, protektionistische Handelspolitik",
              Geopolitik:"unklar, Rückzug aus Kriegen, technologische Vorherrschaft",
              Verbündete:"Israel, NATO, Europa",
              Feinde:"Iran & Russland" },
  russland: { Regierungschef:"Wladimir Putin",
              Einwohner:"143,5 Mio (185 Ethnien, stark schrumpfend)",
              Stärken:"Erdöl, Erdgas, Rüstung, Industrie",
              Hindernisse:"Innovationslosigkeit, Krieg",
              Geopolitik:"Sieg im Ukraine-Krieg, westlichen Einfluss eindämmen",
              Verbündete:"China",
              Feinde:"Ukraine" },
  saudi:    { Regierungschef:"Mohammed bin Salman (Kronprinz)",
              Einwohner:"34 Mio (40 % Gastarbeiter:innen)",
              Stärken:"Erdöl, Erdgas, Pilgertourismus",
              Hindernisse:"Klimawandel, Abhängigkeit von Ölexport & Gastarbeiter:innen",
              Geopolitik:"Vormacht im arabischen Raum, Annäherung an Europa",
              Verbündete:"USA",
              Feinde:"Iran" },
  indien:   { Regierungschef:"Narendra Modi",
              Einwohner:"1,44 Mrd (jung, wachsend, 14 % Moslems, Kastenwesen)",
              Stärken:"Dienstleistungen, IT, Pharma, großer Binnenmarkt",
              Hindernisse:"Arbeitslosigkeit, schwache Industrie, riesiger informeller Sektor",
              Geopolitik:'"India first", "Freund der Welt", Indischer Ozean',
              Verbündete:"keine (~USA, ~EU)",
              Feinde:"Pakistan & China" },
};

const LEADER_ACC = {
  "Xi Jinping":["xi","xijinping"],
  "Donald Trump":["trump"],
  "Wladimir Putin":["putin","vladimir putin","wladimir putin"],
  "Mohammed bin Salman (Kronprinz)":["mbs","mohammed bin salman","bin salman","salman"],
  "Narendra Modi":["modi"],
};

const FACT_Q = {
  Regierungschef:"Regierungschef von",
  Einwohner:"Einwohner / Homogenität von",
  Stärken:"Wirtschaftliche Stärken von",
  Hindernisse:"Wirtschaftliche Hindernisse von",
  Geopolitik:"Geopolitische Interessen von",
  Verbündete:"Verbündete von",
  Feinde:"Feinde von",
  Schwemmebene:"Was ist eine Schwemmebene?",
};

const FACT_ICON = {
  Regierungschef:"👤", Einwohner:"👥", Stärken:"📈",
  Hindernisse:"⚠️", Geopolitik:"🌐", Verbündete:"🤝", Feinde:"⚔️",
  Schwemmebene:"🏔️",
};

// ─── Globaler Fakten-Antworten-Pool (Bug-Fix: MC-Optionen bei Einzelland) ─────
const ALL_FACT_ANSWERS = {};
Object.values(FACTS).forEach(f =>
  Object.entries(f).forEach(([sub, ans]) => {
    if (!ALL_FACT_ANSWERS[sub]) ALL_FACT_ANSWERS[sub] = [];
    if (!ALL_FACT_ANSWERS[sub].includes(ans)) ALL_FACT_ANSWERS[sub].push(ans);
  })
);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const shuffle = a => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

const norm = s =>
  (s || "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss").replace(/[^a-z0-9]/g, "");

function editDist(a, b) {
  if (Math.abs(a.length - b.length) > 4) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => j === 0 ? i : 0));
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[a.length][b.length];
}

function matches(input, item) {
  const n = norm(input);
  if (!n) return false;
  const cands = [item.a, ...(item.acc || [])].map(norm);
  if (cands.includes(n)) return true;
  if (n.length < 3) return false;
  return cands.some(c => {
    if (c.length < 4) return false;
    const maxErr = c.length <= 5 ? 1 : c.length <= 10 ? 2 : 3;
    return n.length >= c.length - maxErr && editDist(c, n) <= maxErr;
  });
}

function fitMercator([w, s, e, n]) {
  const r = d => d * Math.PI / 180;
  const my = lat => Math.log(Math.tan(Math.PI / 4 + r(lat) / 2));
  const scale = Math.min((W - 2*PAD) / r(e - w), (H - 2*PAD) / (my(n) - my(s)));
  return d3.geoMercator().scale(scale).center([(w+e)/2, (s+n)/2]).translate([W/2, H/2]);
}

const CAT_PROMPT = {
  Stadt:"Welche Stadt", Wüste:"Welche Wüste", Gebirge:"Welches Gebirge",
  See:"Welcher See", Ozean:"Welcher Ozean", Gewässer:"Welches Gewässer",
  Naturraum:"Welcher Naturraum", Großlandschaft:"Welche Großlandschaft", Fluss:"Welcher Fluss",
};

function mapPrompt(q) {
  if (q.kind === "country")
    return q.cat === "Nachfolgestaat"
      ? "Welcher Nachfolgestaat der Sowjetunion ist markiert?"
      : "Welcher Nachbarstaat ist markiert?";
  return `${CAT_PROMPT[q.cat] || "Was"} ist markiert?`;
}

// ─── Fragen-Generator ─────────────────────────────────────────────────────────
function buildQuestions(selKeys, scope) {
  const qs = [];
  selKeys.forEach(key => {
    if (scope !== "fakten") {
      CONTENT[key].map.forEach(it => {
        const kind = it.cid ? "country" : it.line ? "line" : "marker";
        qs.push({ type: "map", country: key, kind, cat: it.cat, ...it });
      });
    }
    if (scope !== "karte") {
      Object.entries(FACTS[key]).forEach(([sub, ans]) =>
        qs.push({ type: "fact", country: key, sub, a: ans,
                  typeable: sub === "Regierungschef", acc: LEADER_ACC[ans] || [] })
      );
    }
  });
  return shuffle(qs);
}

function optionsFor(q, all) {
  let pool;
  if (q.type === "fact") {
    pool = all.filter(x => x.type === "fact" && x.sub === q.sub && x.a !== q.a).map(x => x.a);
    // Bug-Fix: bei zu wenigen Optionen aus globalem Pool auffüllen
    if (pool.length < 3) {
      const extra = (ALL_FACT_ANSWERS[q.sub] || []).filter(a => a !== q.a);
      pool = [...new Set([...pool, ...extra])];
    }
  } else {
    pool = CONTENT[q.country].map.filter(x => x.cat === q.cat && x.a !== q.a).map(x => x.a);
    if (pool.length < 3) {
      const extra = CONTENT[q.country].map.filter(x => x.a !== q.a).map(x => x.a);
      pool = [...new Set([...pool, ...extra])];
    }
    // Fallback: andere Länder
    if (pool.length < 3) {
      Object.entries(CONTENT).forEach(([key, c]) => {
        if (key !== q.country)
          c.map.filter(x => x.cat === q.cat && x.a !== q.a).forEach(x => pool.push(x.a));
      });
      pool = [...new Set(pool)];
    }
  }
  const opts = shuffle(pool).slice(0, 3);
  opts.push(q.a);
  return shuffle([...new Set(opts)]);
}

function needsMC(q, diff) {
  if (diff === "normal") return true;
  if (q.type === "map") return false;
  return !q.typeable;
}

// ─── Fortschritt (localStorage) ──────────────────────────────────────────────
const PROG_KEY = "gwk_v1";
function loadProg() {
  try { return JSON.parse(localStorage.getItem(PROG_KEY) || "{}"); }
  catch { return {}; }
}
function qKey(q) {
  return q.type === "fact"
    ? `${q.country}_F_${q.sub}`
    : `${q.country}_${q.cat}_${q.a}`;
}

// ─── MapView ──────────────────────────────────────────────────────────────────
function MapView({ q, answered, correct }) {
  const c = COUNTRIES[q.country];
  const accent = c.color;
  const okCol = answered ? (correct ? "#16a34a" : "#dc2626") : accent;

  const proj = useMemo(() => {
    if (q.kind === "country" && q.cid && GEO[q.cid]) {
      const b = d3.geoBounds({ type: "Feature", geometry: GEO[q.cid].geometry });
      const [cw, cs] = b[0], [ce, cn] = b[1];
      const dLon = ce - cw, dLat = cn - cs;
      const padLon = Math.max(6, Math.min(18, dLon * 2.5));
      const padLat = Math.max(4, Math.min(12, dLat * 2.5));
      return fitMercator([cw - padLon, cs - padLat, ce + padLon, cn + padLat]);
    }
    return fitMercator(c.fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.country, q.cid, q.kind]);
  const path = useMemo(() => d3.geoPath(proj), [proj]);
  const toSVG = useCallback(([lon, lat]) => proj([lon, lat]), [proj]);

  const feat = id => GEO[id] ? { type: "Feature", geometry: GEO[id].geometry } : null;

  const targetFeat = feat(c.target);
  const sameCat = CONTENT[q.country].map.filter(x => x.cat === q.cat);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" aria-label="Karte">
      {/* Hintergrund – Ozean */}
      <rect x={0} y={0} width={W} height={H} fill="#9bbdd6" />

      {/* Andere Länder als geographischer Hintergrund */}
      {Object.entries(GEO).map(([id, geo]) => {
        if (id === c.target || c.ctx.includes(id)) return null;
        return (
          <path key={`bg-${id}`}
            d={path({ type: "Feature", geometry: geo.geometry })}
            fill="#cfdde8" stroke="#a8c0cf" strokeWidth={0.4}
          />
        );
      })}

      {/* Zielland – zuerst als deutlich sichtbare Fläche */}
      {targetFeat && (
        <path d={path(targetFeat)}
          fill={accent} fillOpacity={0.32}
          stroke={accent} strokeWidth={2.2} strokeLinejoin="round"
        />
      )}

      {/* Kontext-Nachbarn / Nachfolgestaaten */}
      {c.ctx.map(id => {
        const f = feat(id);
        if (!f) return null;
        const isHi = q.kind === "country" && q.cid === id;
        return (
          <path key={id} d={path(f)}
            fill={isHi ? okCol : "#dce9f5"}
            fillOpacity={isHi ? 0.88 : 1}
            stroke={isHi ? okCol : "#9ab8d0"}
            strokeWidth={isHi ? 2 : 0.8}
          />
        );
      })}

      {/* Faint Marker gleicher Kategorie */}
      {q.kind === "marker" && sameCat.filter(x => x.m && x.a !== q.a).map((x, i) => {
        const pt = toSVG(x.m);
        if (!pt) return null;
        return <circle key={i} cx={pt[0]} cy={pt[1]} r={3.5} fill="#8ca8be" opacity={0.4} />;
      })}

      {/* Faint Linien gleicher Kategorie */}
      {q.kind === "line" && CONTENT[q.country].map
        .filter(x => x.line && x.cat === q.cat && x.a !== q.a)
        .map((x, i) => {
          const d = "M" + x.line.map(p => toSVG(p).join(",")).join("L");
          return <path key={i} d={d} fill="none" stroke="#8ca8be" strokeWidth={2} opacity={0.38} />;
        })}

      {/* HIGHLIGHT: Linie */}
      {q.kind === "line" && (() => {
        const d = "M" + q.line.map(p => toSVG(p).join(",")).join("L");
        return (
          <g>
            {!answered && (
              <path d={d} fill="none" stroke={okCol} strokeWidth={16} opacity={0.18} strokeLinecap="round">
                <animate attributeName="opacity" values="0.1;0.32;0.1" dur="1.4s" repeatCount="indefinite"/>
              </path>
            )}
            <path d={d} fill="none" stroke={okCol} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round"/>
          </g>
        );
      })()}

      {/* HIGHLIGHT: Punkt */}
      {q.kind === "marker" && (() => {
        const pt = toSVG(q.m);
        if (!pt) return null;
        const [px, py] = pt;
        return (
          <g>
            {!answered && (
              <circle cx={px} cy={py} r={10} fill={okCol} opacity={0.22}>
                <animate attributeName="r" values="10;22;10" dur="1.5s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.28;0.05;0.28" dur="1.5s" repeatCount="indefinite"/>
              </circle>
            )}
            <circle cx={px} cy={py} r={7} fill={okCol} stroke="white" strokeWidth={2.5}/>
            {answered && (() => {
              const lw = Math.max(52, q.a.length * 8.2);
              return (
                <g>
                  <rect x={px+12} y={py-14} width={lw} height={24} rx={6} fill="#111827" opacity={0.93}/>
                  <text x={px+18} y={py+4} fill="white" fontSize={13} fontWeight="700">{q.a}</text>
                </g>
              );
            })()}
          </g>
        );
      })()}

      {/* ? Pulsing marker – vor Antwort */}
      {q.kind === "country" && !answered && (() => {
        const f = feat(q.cid);
        if (!f) return null;
        const ct = path.centroid(f);
        if (!ct || isNaN(ct[0])) return null;
        return (
          <g>
            <circle cx={ct[0]} cy={ct[1]} r={14} fill={accent} opacity={0.85}>
              <animate attributeName="r" values="12;22;12" dur="1.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.9;0.35;0.9" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            <text x={ct[0]} y={ct[1]+5} fill="white" fontSize={15} fontWeight="900" textAnchor="middle">?</text>
          </g>
        );
      })()}

      {/* HIGHLIGHT: Land-Label */}
      {q.kind === "country" && answered && (() => {
        const f = feat(q.cid);
        if (!f) return null;
        const ct = path.centroid(f);
        if (!ct || isNaN(ct[0])) return null;
        const lw = Math.max(70, q.a.length * 8.6);
        return (
          <g>
            <rect x={ct[0]-lw/2} y={ct[1]-13} width={lw} height={24} rx={6} fill="#111827" opacity={0.93}/>
            <text x={ct[0]} y={ct[1]+4} fill="white" fontSize={13} fontWeight="700" textAnchor="middle">{q.a}</text>
          </g>
        );
      })()}
    </svg>
  );
}

// ─── Toggle-Button ────────────────────────────────────────────────────────────
function Toggle({ on, onClick, title, sub }) {
  return (
    <button onClick={onClick}
      className={[
        "flex-1 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150 text-center",
        on
          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
      ].join(" ")}
    >
      <div>{title}</div>
      {sub && <div className={`text-[10px] font-normal mt-0.5 ${on ? "text-slate-400" : "text-slate-400"}`}>{sub}</div>}
    </button>
  );
}

// ─── Haupt-App ────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("menu");
  const [sel, setSel]       = useState(Object.keys(COUNTRIES));
  const [diff, setDiff]     = useState("normal");
  const [scope, setScope]   = useState("alles");
  const [len, setLen]       = useState(25);

  const [queue,    setQueue]    = useState([]);
  const [idx,      setIdx]      = useState(0);
  const [score,    setScore]    = useState(0);
  const [answered, setAnswered] = useState(false);
  const [correct,  setCorrect]  = useState(false);
  const [input,    setInput]    = useState("");
  const [picked,   setPicked]   = useState(null);
  const [opts,     setOpts]     = useState([]);
  const [allQ,     setAllQ]     = useState([]);
  const [log,      setLog]      = useState([]);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Enter" && answered && screen === "quiz") next();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [answered, screen]);

  function prep(q, pool) {
    setAnswered(false); setCorrect(false); setInput(""); setPicked(null);
    if (needsMC(q, diff)) setOpts(optionsFor(q, pool ?? allQ));
    else setOpts([]);
  }

  function start() {
    if (!sel.length) return;
    const qs = buildQuestions(sel, scope);
    setAllQ(qs);
    const sliced = len ? qs.slice(0, len) : qs;
    setQueue(sliced); setIdx(0); setScore(0); setLog([]);
    prep(sliced[0], qs);
    setScreen("quiz");
  }

  function submit(answerText, isMC) {
    if (answered) return;
    const ok = isMC ? answerText === queue[idx].a : matches(answerText, queue[idx]);
    setCorrect(ok); setAnswered(true);
    if (ok) setScore(s => s + 1);
    setLog(l => [...l, { q: queue[idx], ok }]);
    const pk = qKey(queue[idx]);
    const prog = loadProg();
    const prev = prog[pk] || { c: 0, t: 0 };
    localStorage.setItem(PROG_KEY, JSON.stringify({ ...prog, [pk]: { c: prev.c + (ok ? 1 : 0), t: prev.t + 1 } }));
  }

  function repeatWrong() {
    const wrongQs = shuffle(log.filter(l => !l.ok).map(l => l.q));
    if (!wrongQs.length) return;
    setAllQ(wrongQs); setQueue(wrongQs); setIdx(0); setScore(0); setLog([]);
    prep(wrongQs[0], wrongQs);
    setScreen("quiz");
  }

  function startWeak() {
    if (!sel.length) return;
    const p = loadProg();
    const qs = buildQuestions(sel, scope);
    const weakQs = qs.filter(q => {
      const pr = p[qKey(q)];
      return pr && pr.t > 0 && (pr.c === 0 || pr.c / pr.t < 0.6);
    });
    if (!weakQs.length) return;
    const sliced = len ? weakQs.slice(0, len) : weakQs;
    setAllQ(weakQs); setQueue(sliced); setIdx(0); setScore(0); setLog([]);
    prep(sliced[0], weakQs);
    setScreen("quiz");
  }

  function next() {
    const n = idx + 1;
    if (n >= queue.length) { setScreen("result"); return; }
    setIdx(n); prep(queue[n]);
  }

  const country = screen === "quiz" ? COUNTRIES[queue[idx]?.country] : null;
  const q       = screen === "quiz" ? queue[idx] : null;

  // ── MENÜ ──────────────────────────────────────────────────────────────────
  if (screen === "menu") {
    const _prog = loadProg();
    const progStats = Object.fromEntries(Object.keys(COUNTRIES).map(k => {
      const qs = buildQuestions([k], "alles");
      const mastered = qs.filter(q => (_prog[qKey(q)]?.c || 0) >= 1).length;
      return [k, { total: qs.length, mastered }];
    }));
    const totalAll  = Object.values(progStats).reduce((s, v) => s + v.total, 0);
    const masteredAll = Object.values(progStats).reduce((s, v) => s + v.mastered, 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-500 mb-4 shadow-sm tracking-wide uppercase">
              🗺️ GWK-Karten-Trainer
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2 leading-tight">
              Geografie-Quiz
            </h1>
            <p className="text-slate-500 text-sm">Lerne Karten, Städte, Fakten und Grenzen</p>
          </div>

          {/* Gesamtfortschritt */}
          {masteredAll > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Gesamtfortschritt</div>
                <span className="text-sm font-black text-slate-700">{masteredAll}/{totalAll} Fragen</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${Math.round(masteredAll / totalAll * 100)}%` }}/>
              </div>
              <div className="text-xs text-slate-500">
                {Math.round(masteredAll / totalAll * 100)}% beherrscht
                <span className="text-slate-400 ml-1">· {totalAll - masteredAll} noch zu lernen</span>
              </div>
            </div>
          )}

          {/* Länder-Auswahl */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Länder wählen</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(COUNTRIES).map(([k, c]) => {
                const on = sel.includes(k);
                return (
                  <button key={k}
                    onClick={() => setSel(on ? sel.filter(x => x !== k) : [...sel, k])}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-150 text-left"
                    style={on
                      ? { borderColor: c.color, background: c.bg, color: c.color }
                      : { borderColor: "#e2e8f0", background: "white", color: "#64748b" }}
                  >
                    <span className="text-2xl leading-none">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold" style={{ color: on ? c.color : "#334155" }}>{c.label}</div>
                      <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: on ? `${c.color}22` : "#f1f5f9" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.round(progStats[k].mastered / progStats[k].total * 100)}%`, background: on ? c.color : "#94a3b8" }}/>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: on ? c.color : "#94a3b8" }}>
                        {progStats[k].mastered}/{progStats[k].total} beherrscht{on ? " · Ausgewählt" : ""}
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0 transition-all"
                      style={on
                        ? { background: c.color, borderColor: c.color, color: "white" }
                        : { background: "transparent", borderColor: "#cbd5e1" }}>
                      {on && "✓"}
                    </div>
                  </button>
                );
              })}
            </div>
            {sel.length === 0 && (
              <p className="text-xs text-rose-500 mt-2 text-center">Bitte mindestens ein Land auswählen</p>
            )}
          </div>

          {/* Optionen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Schwierigkeit</div>
              <div className="flex gap-2">
                <Toggle on={diff === "normal"} onClick={() => setDiff("normal")} title="Normal" sub="Multiple Choice"/>
                <Toggle on={diff === "schwer"} onClick={() => setDiff("schwer")} title="Schwer" sub="Selbst tippen"/>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Inhalt</div>
              <div className="flex gap-2">
                <Toggle on={scope === "alles"}  onClick={() => setScope("alles")}  title="Alles"/>
                <Toggle on={scope === "karte"}  onClick={() => setScope("karte")}  title="Karte"/>
                <Toggle on={scope === "fakten"} onClick={() => setScope("fakten")} title="Fakten"/>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Fragenanzahl</div>
            <div className="flex gap-2">
              {[15, 25, 40, 0].map(n => (
                <Toggle key={n} on={len === n} onClick={() => setLen(n)} title={n === 0 ? "Alle" : `${n}`}/>
              ))}
            </div>
          </div>

          <button onClick={start} disabled={!sel.length}
            className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", boxShadow: "0 4px 20px rgba(15,23,42,0.25)" }}>
            Quiz starten →
          </button>

          {(() => {
            if (!sel.length) return null;
            const p = loadProg();
            const qs = buildQuestions(sel, scope);
            const weakCount = qs.filter(q => {
              const pr = p[qKey(q)];
              return pr && pr.t > 0 && (pr.c === 0 || pr.c / pr.t < 0.6);
            }).length;
            if (!weakCount) return null;
            return (
              <button onClick={startWeak}
                className="mt-2 w-full py-3.5 rounded-2xl font-bold text-sm border-2 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors">
                {weakCount} schwache Fragen gezielt üben →
              </button>
            );
          })()}

          <p className="text-xs text-slate-400 text-center mt-4 leading-relaxed">
            Normal: Klick die richtige Antwort aus 4 Optionen. &nbsp;·&nbsp; Schwer: Tippe den Namen selbst ein.
          </p>
        </div>
      </div>
    );
  }

  // ── ERGEBNIS ──────────────────────────────────────────────────────────────
  if (screen === "result") {
    const pct    = Math.round((score / queue.length) * 100);
    const wrong  = log.filter(l => !l.ok);
    const isGreat = pct >= 80;
    const isOk   = pct >= 50;
    const scoreColor = isGreat ? "#16a34a" : isOk ? "#d97706" : "#dc2626";

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-2xl mx-auto px-4 py-8">

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 mb-5 text-center">
            <div className="text-5xl mb-3">{isGreat ? "🏆" : isOk ? "👍" : "📚"}</div>
            <div className="text-7xl font-black tracking-tight mb-1" style={{ color: scoreColor }}>{pct}%</div>
            <div className="text-slate-500 text-sm mb-5">{score} von {queue.length} richtig</div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: scoreColor }}/>
            </div>
            <div className="text-xs text-slate-400">
              {isGreat ? "Ausgezeichnet! Du kennst dich hervorragend aus." : isOk ? "Gut gemacht! Mit etwas Übung wird's noch besser." : "Nicht aufgeben – schau die Antworten nochmal durch!"}
            </div>
          </div>

          {wrong.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Nochmal anschauen · {wrong.length} Fehler
              </div>
              <div className="space-y-2">
                {wrong.map((l, i) => {
                  const cc = COUNTRIES[l.q.country];
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 border border-rose-100">
                      <span className="text-xl flex-shrink-0 leading-none mt-0.5">{cc.flag}</span>
                      <div className="text-sm min-w-0">
                        <span className="text-slate-500">
                          {l.q.type === "fact"
                            ? `${FACT_Q[l.q.sub]} ${cc.label}: `
                            : `${l.q.cat} (${cc.label}): `}
                        </span>
                        <span className="font-bold text-rose-700">{l.q.a}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={start}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm"
              style={{ background: "#0f172a" }}>
              Nochmal spielen
            </button>
            <button onClick={() => setScreen("menu")}
              className="flex-1 py-3.5 rounded-2xl font-bold bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 text-sm transition-colors">
              Zum Menü
            </button>
          </div>
          {wrong.length > 0 && (
            <button onClick={repeatWrong}
              className="mt-2 w-full py-3 rounded-2xl font-bold border-2 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm transition-colors">
              {wrong.length} falsche Fragen wiederholen →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── QUIZ ──────────────────────────────────────────────────────────────────
  if (!q || !country) return null;

  const isMap      = q.type === "map";
  const useMCMode  = needsMC(q, diff);
  const promptText = isMap ? mapPrompt(q)
    : (FACT_Q[q.sub] || "").endsWith("?")
      ? FACT_Q[q.sub]
      : `${FACT_Q[q.sub]} ${country.label}?`;
  const progress   = (idx / queue.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-2xl mx-auto px-4 py-4">

        {/* Top-Bar */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setScreen("menu")}
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium">
            ← Menü
          </button>
          <span className="text-xs font-bold px-3 py-1 rounded-full text-white"
            style={{ background: country.color }}>
            {country.flag} {country.label}
          </span>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-black" style={{ color: country.color }}>✔ {score}</span>
            <span className="text-slate-400 font-medium">{idx + 1} / {queue.length}</span>
          </div>
        </div>

        {/* Fortschrittsbalken */}
        <div className="h-1.5 bg-slate-200 rounded-full mb-2 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: country.color }}/>
        </div>

        {/* Lernstand Kontext */}
        {(() => {
          const p = loadProg();
          const qs = buildQuestions([q.country], "alles");
          const cats = {};
          qs.forEach(item => {
            const cat = item.type === "fact" ? "Fakten" : item.cat;
            if (!cats[cat]) cats[cat] = { c: 0, t: 0 };
            const pr = p[qKey(item)] || { c: 0, t: 0 };
            cats[cat].c += pr.c;
            cats[cat].t += pr.t;
          });
          const entries = Object.entries(cats).filter(([, v]) => v.t > 0);
          if (!entries.length) return <div className="mb-3"/>;
          return (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {entries.map(([cat, { c, t }]) => {
                const pct = Math.round(c / t * 100);
                const col = pct >= 70 ? "#16a34a" : pct >= 40 ? "#d97706" : "#dc2626";
                return (
                  <span key={cat} className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                    {cat} <span className="font-bold" style={{ color: col }}>{pct}%</span>
                  </span>
                );
              })}
            </div>
          );
        })()}

        {/* Frage-Karte */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-3">
          {/* Kategorie-Header */}
          <div className="px-4 py-2.5 flex items-center gap-2 border-b"
            style={{ background: country.bg, borderColor: `${country.color}20` }}>
            <span className="text-base leading-none">{isMap ? "🗺️" : (FACT_ICON[q.sub] || "💡")}</span>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: country.color }}>
              {isMap ? q.cat : "Fakten-Frage"}
            </span>
          </div>

          <div className="px-5 pt-4 pb-3">
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{promptText}</h2>
            {q.desc && <p className="text-sm text-slate-500 mt-1">💡 {q.desc}</p>}
          </div>

          {isMap && (
            <div className="px-4 pb-4">
              <div className="rounded-xl overflow-hidden border border-slate-100 shadow-inner">
                <MapView q={q} answered={answered} correct={correct}/>
              </div>
            </div>
          )}
        </div>

        {/* Antwort-Bereich */}
        <div className="mb-3">
          {useMCMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {opts.map((o, i) => {
                let cls = "", style = {};
                if (answered) {
                  if (o === q.a)       { cls = "border-emerald-400 !bg-emerald-50 text-emerald-800 font-bold"; }
                  else if (o === picked){ cls = "border-rose-400 !bg-rose-50 text-rose-800 font-bold"; }
                  else                  { cls = "border-slate-100 text-slate-400 opacity-50"; style.background = "white"; }
                } else {
                  cls = "border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50 font-semibold";
                  style.background = "white";
                }
                return (
                  <button key={i} disabled={answered}
                    onClick={() => { setPicked(o); submit(o, true); }}
                    className={`text-left px-4 py-3.5 rounded-xl border-2 text-sm transition-all duration-150 bg-white ${cls}`}
                    style={style}>
                    <span className="text-slate-400 text-xs mr-2 font-mono">{String.fromCharCode(65+i)}.</span>
                    {o}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex gap-2">
              <input autoFocus value={input} disabled={answered}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !answered && input.trim()) submit(input, false); }}
                placeholder="Antwort eintippen und Enter drücken…"
                className="flex-1 px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-slate-500 outline-none font-semibold text-sm bg-white transition-colors"
              />
              {!answered && (
                <button onClick={() => input.trim() && submit(input, false)}
                  className="px-5 rounded-xl font-bold text-white text-sm transition-colors"
                  style={{ background: country.color }}>
                  OK
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feedback */}
        {answered && (
          <div className={`p-4 rounded-2xl border ${correct ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0 leading-none">{correct ? "✅" : "❌"}</span>
              <div className="flex-1">
                <div className="font-bold text-sm" style={{ color: correct ? "#16a34a" : "#dc2626" }}>
                  {correct ? "Richtig!" : "Leider falsch"}
                </div>
                {!correct && (
                  <div className="text-sm text-slate-700 mt-0.5">
                    Richtige Antwort: <span className="font-bold">{q.a}</span>
                  </div>
                )}
                {q.hint && <div className="text-xs text-slate-500 mt-1">💡 {q.hint}</div>}
              </div>
            </div>
            <button onClick={next}
              className="mt-3 w-full py-2.5 rounded-xl font-bold text-white text-sm transition-colors"
              style={{ background: "#0f172a" }}>
              {idx + 1 >= queue.length ? "Auswertung ansehen →" : "Weiter →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
