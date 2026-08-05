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
const SHOW_GENERATION_LOG_FEATURE = true;
const GENERATION_WARNING_THRESHOLD_MS = 5000;
const panelClassName =
  "rounded-[20px] border border-[color:var(--color-border)] bg-[color:var(--color-overlay-strong)] p-5 shadow-panel";

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
          {selectedCharacter ? (
            <CharacterSheet
              character={selectedCharacter}
              onSelectCharacter={selectCharacter}
              showGenerationLog={
                SHOW_GENERATION_LOG_FEATURE && showGenerationLog
              }
            />
          ) : (
            <EmptySheet />
          )}
        </section>
      </main>
    </div>
  );
}

function CharacterSheet({
  character,
  onSelectCharacter,
  showGenerationLog,
}: {
  character: Character;
  onSelectCharacter: (id: number | null) => void;
  showGenerationLog: boolean;
}) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {character.name}
        </h2>
        <p className="text-sm text-blue-400">{character.culture}</p>
      </div>
      <div className="grid gap-2.5 md:grid-cols-3">
        <div className="rounded-[12px] bg-white/5 p-3">
          <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-blue-400">
            Wealth
          </span>
          <strong className="text-sm text-cream-50">
            {wealthLabel(character.wealth)}
          </strong>
        </div>
        <div className="rounded-[12px] bg-white/5 p-3">
          <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-blue-400">
            Requested ties
          </span>
          <strong className="text-sm text-cream-50">
            {character.tieContract.requested}
          </strong>
        </div>
        <div className="rounded-[12px] bg-white/5 p-3">
          <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-blue-400">
            Realized ties
          </span>
          <strong className="text-sm text-cream-50">
            {character.tieContract.realized}
          </strong>
        </div>
      </div>
      <p className="border-y border-border py-3 text-sm leading-6 text-cream-100">
        {character.fact}
      </p>
      <div className="flex flex-col gap-2.5">
        {character.relationships.map((relationship, index) => (
          <button
            type="button"
            key={`${character.id}-${index}`}
            className="w-full rounded-[12px] border border-transparent bg-white/5 p-3 text-left text-inherit transition hover:border-blue-400/50 hover:bg-white/10 focus:outline-none focus-visible:border-blue-400/60"
            onClick={() => onSelectCharacter(relationship.partnerId)}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <strong>{relationship.name}</strong>
            </div>
            <p className="text-sm text-blue-300">
              {relationship.bond} • {relationship.strength} •{" "}
              {relationship.ageTag}
            </p>
          </button>
        ))}
      </div>
      {showGenerationLog ? (
        <GenerationLogPanel entries={character.generationLog} />
      ) : null}
    </>
  );
}

function GenerationLogPanel({ entries }: { entries: string[] }) {
  return (
    <section
      className="mt-1 border-t border-border pt-4"
      aria-label="Generation log"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Generation log</h2>
        <p className="text-sm text-blue-400">{entries.length} steps</p>
      </div>
      <div className="flex max-h-80 flex-col gap-2 overflow-auto pr-1">
        {entries.map((entry, index) => (
          <p
            key={`${entry}-${index}`}
            className="m-0 rounded-[10px] bg-white/5 px-3 py-2 text-sm leading-5 text-cream-200"
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
    <div className="grid min-h-60 place-items-center rounded-panel border border-dashed border-border bg-surface-900/60 px-6 text-center text-blue-400">
      <div>
        <h2 className="mb-2 text-lg font-semibold tracking-tight text-cream-50">
          Choose a character
        </h2>
        <p className="m-0 text-sm text-blue-400">
          Select someone from the roster to inspect their relationship sheet.
        </p>
      </div>
    </div>
  );
}

export default App;
