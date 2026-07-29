import { ChevronLeft, ChevronRight, Coins, Dice5, ScrollText, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

// ---------- palette (tokens) ----------
const C = {
  ink: "#1B1F2B",
  inkPanel: "#232838",
  inkLine: "#343B4F",
  paper: "#F2E8D5",
  paperShadow: "#E4D6B8",
  rule: "#8B7355",
  wax: "#A63D40",
  moss: "#5C7A5C",
  slate: "#6B7280",
  inkText: "#2B2115",
  cream: "#F7F1E3",
};

// ---------- deterministic mock generation ----------
function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(seedFn) {
  let a = seedFn();
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CULTURES = [
  { name: "Verdane", first: ["Isolde", "Brannor", "Thessaly", "Corwin", "Maren", "Aldric", "Sabine", "Roderic"], last: ["Ashford", "Vell", "Kirwan", "Marrow"] },
  { name: "Keshet", first: ["Yara", "Doran", "Nima", "Kael", "Sorrel", "PIrun", "Talis", "Odessa"], last: ["Ren", "Voss", "Tharin", "Idu"] },
  { name: "Oyari", first: ["Femi", "Adaeze", "Bakari", "Nkiru", "Tolu", "Ekene", "Zuri", "Chike"], last: ["Obasi", "Enyi", "Ade", "Oku"] },
  { name: "Solmere", first: ["Liesel", "Petro", "Vanna", "Miklos", "Ines", "Rurik", "Anzhe", "Dagny"], last: ["Vashti", "Korr", "Lund", "Marek"] },
  { name: "Tanoa", first: ["Kailani", "Rehua", "Manaia", "Tavita", "Anahera", "Puna", "Hina", "Rongo"], last: ["Faleolo", "Iosefa", "Tui", "Vaka"] },
];

const FACTS = [
  "Keeps a ledger of every debt owed, real or imagined.",
  "Has not slept indoors during a full moon in years.",
  "Named every stray cat in the district after a different rival.",
  "Believes storms are omens and plans travel around them.",
  "Can't pass a market stall without haggling, even when buying nothing.",
  "Carries a spare cloak pin that belonged to someone they won't name.",
  "Refuses to eat anything blue.",
  "Writes letters to a person who may not exist.",
  "Has been banned from exactly one tavern, proudly.",
  "Collects the first coin from every place they've slept.",
];

const ARCHETYPES = [
  { key: "neighbor", label: "Neighbor", color: C.moss },
  { key: "childhood", label: "Childhood Tie", color: C.wax },
  { key: "acquaintance", label: "Acquaintance", color: "#6E7FA8" },
  { key: "chance", label: "Chance", color: "#9B6EA8" },
];

const STRENGTHS = ["Warm", "Devoted", "Strained", "Complicated", "Rivalrous", "Fond", "Wary"];

const BONDS = ["Parent", "Sibling", "Family", "Friend", "Peer", "Rival", "Acquaintance", "Mentor"];

const AGE_TAGS = [
  "Recent",
  "A few seasons",
  "Several years",
  "Half a lifetime",
  "Longer than either recalls exactly",
  "Since before either could say",
  "A passing while",
  "As long as this place has stood",
];

const SCALE_COUNTS = { Local: 8, Regional: 20, Continental: 45 };

function generateWorld(seed, scale) {
  const rand = mulberry32(hashSeed(seed + "::" + scale));
  const count = SCALE_COUNTS[scale];
  const characters = [];
  for (let i = 0; i < count; i++) {
    const culture = CULTURES[Math.floor(rand() * CULTURES.length)];
    const first = culture.first[Math.floor(rand() * culture.first.length)];
    const last = culture.last[Math.floor(rand() * culture.last.length)];
    const wealth = rand();
    const tieCount = Math.max(1, Math.round(Math.log10(count + 1) * 2.4 + (rand() - 0.5) * 3));
    const fact = FACTS[Math.floor(rand() * FACTS.length)];

    const relationships = [];
    const relCount = Math.min(tieCount, 6);
    for (let r = 0; r < relCount; r++) {
      const rc = CULTURES[Math.floor(rand() * CULTURES.length)];
      const rName = `${rc.first[Math.floor(rand() * rc.first.length)]} ${rc.last[Math.floor(rand() * rc.last.length)]}`;
      const arche = ARCHETYPES[Math.floor(rand() * (rand() < 0.55 ? 1 : ARCHETYPES.length))] || ARCHETYPES[0];
      const bond = BONDS[Math.floor(rand() * BONDS.length)];
      const strength = STRENGTHS[Math.floor(rand() * STRENGTHS.length)];
      const ageTag = AGE_TAGS[Math.floor(rand() * AGE_TAGS.length)];
      relationships.push({ name: rName, archetype: arche, bond, strength, ageTag });
    }

    characters.push({
      id: i,
      name: `${first} ${last}`,
      culture: culture.name,
      ties: tieCount,
      wealth,
      fact,
      relationships,
    });
  }
  return characters;
}

function wealthLabel(w) {
  if (w < 0.2) return "Destitute";
  if (w < 0.4) return "Modest";
  if (w < 0.65) return "Comfortable";
  if (w < 0.85) return "Affluent";
  return "Wealthy";
}

const SEED_WORDS = ["ashgrove", "dunmere", "fenwick", "thornbury", "gravemoor", "oakhollow", "brackenfall", "cindervale", "hollowmere", "wrenfield"];
function rollSeed() {
  const word = SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)];
  const num = String(Math.floor(Math.random() * 99)).padStart(2, "0");
  return `${word}-${num}`;
}

// ---------- UI ----------
export default function CharacterGeneratorMockup() {
  const [seedInput, setSeedInput] = useState("ashgrove-01");
  const [scaleInput, setScaleInput] = useState("Regional");
  const [effectiveSeed, setEffectiveSeed] = useState(seedInput);
  const [effectiveScale, setEffectiveScale] = useState(scaleInput);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [pending, setPending] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setEffectiveSeed(seedInput);
      setEffectiveScale(scaleInput);
      setPage(0);
      setSelectedId(null);
      setPending(false);
    }, 420);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setPending(false);
    };
  }, [seedInput, scaleInput]);

  const characters = useMemo(() => generateWorld(effectiveSeed, effectiveScale), [effectiveSeed, effectiveScale]);
  const pageSize = 8;
  const pageCount = Math.ceil(characters.length / pageSize);
  const pageRows = characters.slice(page * pageSize, page * pageSize + pageSize);
  const selected = characters.find((c) => c.id === selectedId) || null;

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: C.ink, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      {/* control bar */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b" style={{ borderColor: C.inkLine, background: C.inkPanel }}>
        <Dice5 size={20} color={C.wax} />
        <span className="text-sm tracking-wide" style={{ color: C.cream, fontWeight: 600, letterSpacing: "0.04em" }}>
          CARTOGRAPHER — cast generator
        </span>
        <div className="flex-1" />
        <label className="flex items-center gap-2 text-xs" style={{ color: C.slate }}>
          <span>Seed</span>
          <input
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            className="px-3 py-1.5 rounded text-sm outline-none"
            style={{ background: C.ink, color: C.cream, border: `1px solid ${C.inkLine}`, minWidth: "180px" }}
            spellCheck={false}
          />
          <button
            onClick={() => setSeedInput(rollSeed())}
            title="Roll a new seed"
            aria-label="Roll a new seed"
            className="p-1.5 rounded"
            style={{ border: `1px solid ${C.inkLine}`, background: C.ink }}
          >
            <Dice5 size={14} color={C.wax} />
          </button>
        </label>
        <label className="flex items-center gap-2 text-xs" style={{ color: C.slate }}>
          <span>Scale</span>
          <select
            value={scaleInput}
            onChange={(e) => setScaleInput(e.target.value)}
            className="px-3 py-1.5 rounded text-sm outline-none"
            style={{ background: C.ink, color: C.cream, border: `1px solid ${C.inkLine}` }}
          >
            <option>Local</option>
            <option>Regional</option>
            <option>Continental</option>
          </select>
        </label>
        <span className="text-xs w-16 text-right" style={{ color: pending ? C.wax : "transparent" }}>
          updating…
        </span>
      </div>

      {/* body */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* table */}
        <div className="md:w-1/2 flex flex-col p-5">
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.inkLine}` }}>
            <table className="w-full text-sm" style={{ color: C.cream }}>
              <thead>
                <tr style={{ background: C.inkPanel, color: C.slate }}>
                  <th className="text-left font-medium px-4 py-2.5">Name</th>
                  <th className="text-left font-medium px-4 py-2.5">Culture</th>
                  <th className="text-right font-medium px-4 py-2.5">Ties</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="cursor-pointer transition-colors"
                    style={{
                      background: selectedId === c.id ? "rgba(166,61,64,0.18)" : "transparent",
                      borderTop: `1px solid ${C.inkLine}`,
                    }}
                  >
                    <td className="px-4 py-2.5">{c.name}</td>
                    <td className="px-4 py-2.5" style={{ color: C.slate }}>{c.culture}</td>
                    <td className="px-4 py-2.5 text-right" style={{ color: c.ties >= 6 ? C.wax : C.cream }}>{c.ties}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs" style={{ color: C.slate }}>
            <span>{characters.length} characters — {effectiveScale.toLowerCase()} scale</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded disabled:opacity-30"
                style={{ border: `1px solid ${C.inkLine}` }}
              >
                <ChevronLeft size={14} color={C.cream} />
              </button>
              <span>{page + 1} / {pageCount}</span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="p-1 rounded disabled:opacity-30"
                style={{ border: `1px solid ${C.inkLine}` }}
              >
                <ChevronRight size={14} color={C.cream} />
              </button>
            </div>
          </div>
        </div>

        {/* character sheet */}
        <div className="md:w-1/2 p-5 flex">
          {!selected ? (
            <div
              className="flex-1 flex items-center justify-center rounded-lg text-sm text-center px-8"
              style={{ border: `1px dashed ${C.inkLine}`, color: C.slate }}
            >
              Select a character from the table to draw their sheet.
            </div>
          ) : (
            <div
              className="flex-1 rounded-md p-6 overflow-y-auto"
              style={{
                background: `linear-gradient(160deg, ${C.paper}, ${C.paperShadow})`,
                color: C.inkText,
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                fontFamily: "ui-serif, Georgia, 'Iowan Old Style', serif",
              }}
            >
              <div className="flex items-baseline justify-between border-b pb-3" style={{ borderColor: C.rule }}>
                <h1 className="text-2xl" style={{ letterSpacing: "0.02em" }}>{selected.name}</h1>
                <span className="text-xs uppercase tracking-widest" style={{ color: C.rule }}>
                  {selected.culture}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div
                  className="flex items-start gap-2"
                  title="Financial standing, derived from where this character sits in the vector space — wealth clusters geographically, with individual variation layered on top."
                >
                  <Coins size={15} style={{ marginTop: 2, color: C.rule }} />
                  <div>
                    <div className="text-xs uppercase tracking-wide" style={{ color: C.rule }}>Standing</div>
                    <div>{wealthLabel(selected.wealth)}</div>
                    <div className="h-1.5 w-24 rounded-full mt-1" style={{ background: "rgba(139,115,85,0.25)" }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${Math.round(selected.wealth * 100)}%`, background: C.rule }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users size={15} style={{ marginTop: 2, color: C.rule }} />
                  <div>
                    <div className="text-xs uppercase tracking-wide" style={{ color: C.rule }}>Ties</div>
                    <div>{selected.ties}</div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: C.rule }}>Relationships</div>
                <div className="space-y-1.5">
                  {selected.relationships.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b" style={{ borderColor: "rgba(139,115,85,0.25)" }}>
                      <span>{r.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: C.rule }}>{r.bond} - {r.strength}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(139,115,85,0.3)", color: C.inkText }}
                        >
                          {r.ageTag}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-start gap-2">
                <ScrollText size={15} style={{ marginTop: 2, color: C.rule }} />
                <div>
                  <div className="text-xs uppercase tracking-wide" style={{ color: C.rule }}>Field note</div>
                  <div className="text-sm italic mt-0.5">{selected.fact}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
