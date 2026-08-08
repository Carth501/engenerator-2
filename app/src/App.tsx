import { useEffect, useState } from "react";
import "./App.css";
import type { Character, ScaleName } from "./lib/types";
import {
  generateWorldAsync,
  type GenerationStage,
  wealthLabel,
} from "./lib/worldGenerator";
import { useAppStore } from "./store.ts";

const SCALE_OPTIONS: ScaleName[] = ["Local", "Regional", "Continental"];
const AXIS_OPTIONS = [
  { key: "wealth", label: "Wealth" },
  { key: "positionX", label: "Position X" },
  { key: "positionY", label: "Position Y" },
  { key: "abstract1", label: "Abstract 1" },
  { key: "abstract2", label: "Abstract 2" },
  { key: "abstract3", label: "Abstract 3" },
] as const;
const SHOW_GENERATION_LOG_FEATURE = true;
const GENERATION_WARNING_THRESHOLD_MS = 5000;
const panelClassName =
  "rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-overlay-strong)] p-5 shadow-panel";

type CharacterSheetTab = "sheet" | "visualizer";
type AxisKey = (typeof AXIS_OPTIONS)[number]["key"];

function findDistinctAxis(
  excludedAxis: AxisKey,
  preferredAxis?: AxisKey,
): AxisKey {
  if (preferredAxis && preferredAxis !== excludedAxis) {
    return preferredAxis;
  }

  const fallback = AXIS_OPTIONS.find(({ key }) => key !== excludedAxis);
  return fallback ? fallback.key : "wealth";
}

function seedWords() {
  return [
    "ashgrove",
    "dunmere",
    "fenwick",
    "thornbury",
    "gravemoor",
    "oakhollow",
    "brackenfall",
    "cindervale",
  ];
}

function rollSeed() {
  const words = seedWords();
  const word = words[Math.floor(Math.random() * words.length)];
  const number = String(Math.floor(Math.random() * 99)).padStart(2, "0");
  return `${word}-${number}`;
}

function App() {
  const { seed, scale, setSeed, setScale, selectedId, selectCharacter } =
    useAppStore();
  const [seedInput, setSeedInput] = useState(seed);
  const [scaleInput, setScaleInput] = useState<ScaleName>(scale);
  const [showGenerationLog, setShowGenerationLog] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationWarning, setGenerationWarning] = useState(false);
  const [generationStage, setGenerationStage] =
    useState<GenerationStage>("complete");
  const [generationElapsedMs, setGenerationElapsedMs] = useState(0);

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();
    const warningTimer = setTimeout(() => {
      if (isActive) {
        setGenerationWarning(true);
      }
    }, GENERATION_WARNING_THRESHOLD_MS);

    queueMicrotask(() => {
      if (!isActive) {
        return;
      }

      setIsGenerating(true);
      setGenerationWarning(false);
      setGenerationStage("profiles");
      setGenerationElapsedMs(0);
      setCharacters([]);
    });

    void generateWorldAsync(seedInput, scaleInput, {
      signal: abortController.signal,
      onProgress: (progress) => {
        if (!isActive) {
          return;
        }

        setCharacters(progress.characters);
        setGenerationStage(progress.stage);
        setGenerationElapsedMs(progress.elapsedMs);
      },
    })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Failed to generate world", error);
      })
      .finally(() => {
        if (!isActive) {
          return;
        }

        clearTimeout(warningTimer);
        setIsGenerating(false);
        setGenerationWarning(false);
      });

    return () => {
      isActive = false;
      clearTimeout(warningTimer);
      abortController.abort();
    };
  }, [seedInput, scaleInput]);

  const selectedCharacter =
    characters.find((character) => character.id === selectedId) ?? null;

  return (
    <div className="min-h-screen p-6 text-cream-50">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-border bg-surface-900/90 px-6 py-5 shadow-panel backdrop-blur">
        <div>
          <p className="mb-2 text-[0.74rem] uppercase tracking-[0.24em] text-blue-400">
            Deterministic world generator
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Engenerator MVP
          </h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-blue-300">
            <span>Seed</span>
            <input
              className="rounded-[10px] border border-white/10 bg-surface-800 px-3 py-2 text-cream-50 outline-none transition focus:border-amber-600"
              value={seedInput}
              onChange={(event) => {
                setSeedInput(event.target.value);
                setSeed(event.target.value);
              }}
              spellCheck={false}
            />
          </label>
          <button
            type="button"
            className="rounded-[10px] border border-white/10 bg-surface-800 px-3 py-2 text-sm text-cream-50 transition hover:border-blue-400 hover:bg-surface-700"
            onClick={() => {
              const nextSeed = rollSeed();
              setSeedInput(nextSeed);
              setSeed(nextSeed);
            }}
          >
            Roll seed
          </button>
          <label className="flex flex-col gap-1.5 text-sm text-blue-300">
            <span>Scale</span>
            <select
              className="rounded-[10px] border border-white/10 bg-surface-800 px-3 py-2 text-cream-50 outline-none transition focus:border-amber-600"
              value={scaleInput}
              onChange={(event) => {
                const nextScale = event.target.value as ScaleName;
                setScaleInput(nextScale);
                setScale(nextScale);
              }}
            >
              {SCALE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          {SHOW_GENERATION_LOG_FEATURE ? (
            <button
              type="button"
              className={`rounded-[10px] border px-3 py-2 text-sm transition ${
                showGenerationLog
                  ? "border-amber-600 bg-amber-700 text-cream-50"
                  : "border-white/10 bg-surface-800 text-cream-50 hover:border-blue-400 hover:bg-surface-700"
              }`}
              onClick={() => setShowGenerationLog((current) => !current)}
            >
              {showGenerationLog ? "Hide log" : "Show log"}
            </button>
          ) : null}
        </div>
      </header>

      {isGenerating ? (
        <section
          className={`mb-4 rounded-[12px] border px-4 py-3 text-sm ${
            generationWarning
              ? "border-amber-600/80 bg-amber-700/20"
              : "border-border bg-surface-800/80"
          }`}
        >
          <p
            className={`m-0 ${generationWarning ? "text-amber-200" : "text-blue-200"}`}
          >
            Generating world... stage: {generationStage} • elapsed:{" "}
            {Math.round(generationElapsedMs)} ms
          </p>
          {generationWarning ? (
            <p className="mt-1.5 text-amber-200">
              Generation has exceeded 5 seconds and is still in progress.
            </p>
          ) : null}
        </section>
      ) : null}

      <main className="content-grid lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className={`${panelClassName} flex flex-col`}>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Character roster
            </h2>
            <p className="text-sm text-blue-400">
              {characters.length} characters • {scaleInput.toLowerCase()} scale
            </p>
          </div>
          <div className="overflow-hidden rounded-card border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-800/80 text-left text-blue-300">
                <tr>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Culture</th>
                  <th className="px-3 py-2.5">Ties</th>
                </tr>
              </thead>
              <tbody>
                {characters.map((character) => (
                  <tr
                    key={character.id}
                    className={`cursor-pointer transition ${
                      selectedId === character.id
                        ? "bg-amber-700/25"
                        : "hover:bg-white/5"
                    }`}
                    onClick={() => selectCharacter(character.id)}
                  >
                    <td className="border-t border-border px-3 py-2.5">
                      {character.name}
                    </td>
                    <td className="border-t border-border px-3 py-2.5">
                      {character.culture}
                    </td>
                    <td className="border-t border-border px-3 py-2.5">
                      {character.tieContract.realized}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${panelClassName} flex flex-col gap-3.5`}>
          <CharacterWorkspace
            characters={characters}
            selectedCharacter={selectedCharacter}
            selectedId={selectedId}
            onSelectCharacter={selectCharacter}
            showGenerationLog={SHOW_GENERATION_LOG_FEATURE && showGenerationLog}
          />
        </section>
      </main>
    </div>
  );
}

function CharacterWorkspace({
  characters,
  selectedCharacter,
  selectedId,
  onSelectCharacter,
  showGenerationLog,
}: {
  characters: Character[];
  selectedCharacter: Character | null;
  selectedId: number | null;
  onSelectCharacter: (id: number | null) => void;
  showGenerationLog: boolean;
}) {
  const [activeTab, setActiveTab] = useState<CharacterSheetTab>("sheet");
  const [xAxis, setXAxis] = useState<AxisKey>("positionX");
  const [yAxis, setYAxis] = useState<AxisKey>("positionY");

  const handleXAxisChange = (nextXAxis: AxisKey) => {
    if (nextXAxis === yAxis) {
      setYAxis(findDistinctAxis(nextXAxis, xAxis));
    }

    setXAxis(nextXAxis);
  };

  const handleYAxisChange = (nextYAxis: AxisKey) => {
    if (nextYAxis === xAxis) {
      setXAxis(findDistinctAxis(nextYAxis, yAxis));
    }

    setYAxis(nextYAxis);
  };

  return (
    <div className="sheet-shell flex flex-1 flex-col rounded-[22px] border border-[color:var(--sheet-rule)]/70 p-5">
      <div className="sheet-tabs flex gap-2 border-b pb-3">
        <button
          type="button"
          className={`sheet-tab rounded-[10px] border px-3 py-1.5 text-xs uppercase tracking-[0.22em] transition ${
            activeTab === "sheet"
              ? "is-active"
              : "hover:opacity-90 focus:outline-none focus-visible:opacity-90"
          }`}
          onClick={() => setActiveTab("sheet")}
        >
          Character sheet
        </button>
        <button
          type="button"
          className={`sheet-tab rounded-[10px] border px-3 py-1.5 text-xs uppercase tracking-[0.22em] transition ${
            activeTab === "visualizer"
              ? "is-active"
              : "hover:opacity-90 focus:outline-none focus-visible:opacity-90"
          }`}
          onClick={() => setActiveTab("visualizer")}
        >
          Axis visualizer
        </button>
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        {activeTab === "sheet" ? (
          selectedCharacter ? (
            <CharacterSheetPane
              character={selectedCharacter}
              onSelectCharacter={onSelectCharacter}
              showGenerationLog={showGenerationLog}
            />
          ) : (
            <EmptySheet />
          )
        ) : (
          <AxisVisualizerPane
            characters={characters}
            selectedId={selectedId}
            onSelectCharacter={onSelectCharacter}
            xAxis={xAxis}
            yAxis={yAxis}
            onXAxisChange={handleXAxisChange}
            onYAxisChange={handleYAxisChange}
          />
        )}
      </div>
    </div>
  );
}

function CharacterSheetPane({
  character,
  onSelectCharacter,
  showGenerationLog,
}: {
  character: Character;
  onSelectCharacter: (id: number | null) => void;
  showGenerationLog: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="sheet-heading flex items-baseline justify-between gap-3 border-b pb-3">
        <h2 className="text-2xl font-semibold tracking-[0.02em]">
          {character.name}
        </h2>
        <p className="sheet-label text-xs uppercase tracking-[0.24em]">
          {character.culture}
        </p>
      </div>
      <div className="grid gap-2.5 md:grid-cols-3">
        <div className="sheet-card rounded-[12px] border p-3">
          <span className="sheet-label mb-1 block text-xs uppercase tracking-[0.2em]">
            Wealth
          </span>
          <strong className="text-sm">{wealthLabel(character.wealth)}</strong>
        </div>
        <div className="sheet-card rounded-[12px] border p-3">
          <span className="sheet-label mb-1 block text-xs uppercase tracking-[0.2em]">
            Requested ties
          </span>
          <strong className="text-sm">{character.tieContract.requested}</strong>
        </div>
        <div className="sheet-card rounded-[12px] border p-3">
          <span className="sheet-label mb-1 block text-xs uppercase tracking-[0.2em]">
            Realized ties
          </span>
          <strong className="text-sm">{character.tieContract.realized}</strong>
        </div>
      </div>
      <p className="sheet-rule border-y py-3 text-sm leading-6 italic">
        {character.fact}
      </p>
      <div className="flex flex-col gap-2.5">
        {character.relationships.map((relationship, index) => (
          <button
            type="button"
            key={`${character.id}-${index}`}
            className="sheet-card w-full rounded-[12px] border p-3 text-left text-inherit transition hover:opacity-90 focus:outline-none focus-visible:opacity-90"
            onClick={() => onSelectCharacter(relationship.partnerId)}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <strong>{relationship.name}</strong>
            </div>
            <p className="sheet-muted text-sm">
              {relationship.bond} • {relationship.strength} •{" "}
              {relationship.ageTag}
            </p>
          </button>
        ))}
      </div>
      {showGenerationLog ? (
        <GenerationLogPanel entries={character.generationLog} />
      ) : null}
    </div>
  );
}

function AxisVisualizerPane({
  characters,
  selectedId,
  onSelectCharacter,
  xAxis,
  yAxis,
  onXAxisChange,
  onYAxisChange,
}: {
  characters: Character[];
  selectedId: number | null;
  onSelectCharacter: (id: number | null) => void;
  xAxis: AxisKey;
  yAxis: AxisKey;
  onXAxisChange: (axis: AxisKey) => void;
  onYAxisChange: (axis: AxisKey) => void;
}) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const chartWidth = 540;
  const chartHeight = 340;
  const chartPadding = 34;
  const plotWidth = chartWidth - chartPadding * 2;
  const plotHeight = chartHeight - chartPadding * 2;
  const labeledIds = new Set<number>();

  if (selectedId !== null) {
    labeledIds.add(selectedId);
  }

  if (hoveredId !== null) {
    labeledIds.add(hoveredId);
  }

  const points = characters.map((character) => {
    const x = Math.min(Math.max(character.axes[xAxis], 0), 1);
    const y = Math.min(Math.max(character.axes[yAxis], 0), 1);

    return {
      character,
      chartX: chartPadding + x * plotWidth,
      chartY: chartHeight - chartPadding - y * plotHeight,
    };
  });

  return (
    <section
      className="axis-visualizer flex flex-1 flex-col gap-3"
      aria-label="Character axis visualizer"
    >
      <div className="axis-grid grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs uppercase tracking-[0.2em]">
          <span className="sheet-label">X axis</span>
          <select
            className="sheet-select rounded-[10px] border px-2.5 py-2 text-sm outline-none transition"
            value={xAxis}
            onChange={(event) => onXAxisChange(event.target.value as AxisKey)}
          >
            {AXIS_OPTIONS.map((axis) => (
              <option key={axis.key} value={axis.key}>
                {axis.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs uppercase tracking-[0.2em]">
          <span className="sheet-label">Y axis</span>
          <select
            className="sheet-select rounded-[10px] border px-2.5 py-2 text-sm outline-none transition"
            value={yAxis}
            onChange={(event) => onYAxisChange(event.target.value as AxisKey)}
          >
            {AXIS_OPTIONS.map((axis) => (
              <option key={axis.key} value={axis.key}>
                {axis.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {characters.length === 0 ? (
        <div className="sheet-empty grid min-h-52 place-items-center rounded-[12px] border border-dashed p-4 text-center">
          <p className="sheet-muted m-0 text-sm">
            Generate a world to plot characters on the axis chart.
          </p>
        </div>
      ) : (
        <div className="axis-frame min-h-0 flex-1 rounded-[12px] border p-3">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-full w-full"
            role="img"
            aria-label="Scatter chart of characters by selected axes"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
              const x = chartPadding + tick * plotWidth;
              const y = chartHeight - chartPadding - tick * plotHeight;

              return (
                <g key={tick}>
                  <line
                    x1={x}
                    y1={chartPadding}
                    x2={x}
                    y2={chartHeight - chartPadding}
                    className="axis-grid-line"
                  />
                  <line
                    x1={chartPadding}
                    y1={y}
                    x2={chartWidth - chartPadding}
                    y2={y}
                    className="axis-grid-line"
                  />
                </g>
              );
            })}

            <line
              x1={chartPadding}
              y1={chartHeight - chartPadding}
              x2={chartWidth - chartPadding}
              y2={chartHeight - chartPadding}
              className="axis-line"
            />
            <line
              x1={chartPadding}
              y1={chartPadding}
              x2={chartPadding}
              y2={chartHeight - chartPadding}
              className="axis-line"
            />

            <text
              x={chartWidth / 2}
              y={chartHeight - 8}
              textAnchor="middle"
              className="axis-label"
            >
              {AXIS_OPTIONS.find((axis) => axis.key === xAxis)?.label}
            </text>
            <text
              x={12}
              y={chartHeight / 2}
              textAnchor="middle"
              className="axis-label"
              transform={`rotate(-90 12 ${chartHeight / 2})`}
            >
              {AXIS_OPTIONS.find((axis) => axis.key === yAxis)?.label}
            </text>

            {points.map(({ character, chartX, chartY }) => {
              const isSelected = selectedId === character.id;
              const isHovered = hoveredId === character.id;
              const className = isSelected
                ? "axis-point is-selected"
                : isHovered
                  ? "axis-point is-hovered"
                  : "axis-point";

              return (
                <circle
                  key={character.id}
                  cx={chartX}
                  cy={chartY}
                  r={isSelected ? 5.5 : isHovered ? 4.5 : 3.5}
                  className={className}
                  onMouseEnter={() => setHoveredId(character.id)}
                  onMouseLeave={() =>
                    setHoveredId((current) =>
                      current === character.id ? null : current,
                    )
                  }
                  onClick={() => onSelectCharacter(character.id)}
                />
              );
            })}

            {points
              .filter(({ character }) => labeledIds.has(character.id))
              .map(({ character, chartX, chartY }) => (
                <text
                  key={`label-${character.id}`}
                  x={chartX + 7}
                  y={chartY - 7}
                  className="axis-point-label"
                >
                  {character.name}
                </text>
              ))}
          </svg>
        </div>
      )}
      <p className="sheet-muted m-0 text-xs leading-5">
        All characters are plotted. Labels appear for hovered and selected
        points.
      </p>
    </section>
  );
}

function GenerationLogPanel({ entries }: { entries: string[] }) {
  return (
    <section
      className="sheet-rule mt-1 border-t pt-4"
      aria-label="Generation log"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Generation log</h2>
        <p className="sheet-muted text-sm">{entries.length} steps</p>
      </div>
      <div className="flex max-h-80 flex-col gap-2 overflow-auto pr-1">
        {entries.map((entry, index) => (
          <p
            key={`${entry}-${index}`}
            className="sheet-card m-0 rounded-[10px] border px-3 py-2 text-sm leading-5"
          >
            {entry}
          </p>
        ))}
      </div>
    </section>
  );
}

function EmptySheet() {
  return (
    <div className="sheet-empty grid min-h-60 place-items-center rounded-[14px] border border-dashed px-6 text-center">
      <div>
        <h2 className="sheet-label mb-2 text-lg font-semibold tracking-tight">
          Choose a character
        </h2>
        <p className="sheet-muted m-0 text-sm">
          Select someone from the roster to inspect their relationship sheet.
        </p>
      </div>
    </div>
  );
}

export default App;
