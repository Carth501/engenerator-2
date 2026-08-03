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
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Deterministic world generator</p>
          <h1 className="text-3xl font-semibold">Engenerator MVP</h1>
        </div>
        <div className="toolbar">
          <label>
            <span>Seed</span>
            <input
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
            onClick={() => {
              const nextSeed = rollSeed();
              setSeedInput(nextSeed);
              setSeed(nextSeed);
            }}
          >
            Roll seed
          </button>
          <label>
            <span>Scale</span>
            <select
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
              className={showGenerationLog ? "active" : ""}
              onClick={() => setShowGenerationLog((current) => !current)}
            >
              {showGenerationLog ? "Hide log" : "Show log"}
            </button>
          ) : null}
        </div>
      </header>

      {isGenerating ? (
        <section
          className={`generation-status ${generationWarning ? "warning" : ""}`}
        >
          <p>
            Generating world... stage: {generationStage} • elapsed:{" "}
            {Math.round(generationElapsedMs)} ms
          </p>
          {generationWarning ? (
            <p>Generation has exceeded 5 seconds and is still in progress.</p>
          ) : null}
        </section>
      ) : null}

      <main className="content-grid">
        <section className="panel table-panel">
          <div className="panel-header">
            <h2>Character roster</h2>
            <p>
              {characters.length} characters • {scaleInput.toLowerCase()} scale
            </p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Culture</th>
                <th>Ties</th>
              </tr>
            </thead>
            <tbody>
              {characters.map((character) => (
                <tr
                  key={character.id}
                  className={selectedId === character.id ? "active" : ""}
                  onClick={() => selectCharacter(character.id)}
                >
                  <td>{character.name}</td>
                  <td>{character.culture}</td>
                  <td>{character.tieContract.realized}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel sheet-panel">
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
      <div className="panel-header">
        <h2>{character.name}</h2>
        <p>{character.culture}</p>
      </div>
      <div className="sheet-meta">
        <div>
          <span className="meta-label">Wealth</span>
          <strong>{wealthLabel(character.wealth)}</strong>
        </div>
        <div>
          <span className="meta-label">Requested ties</span>
          <strong>{character.tieContract.requested}</strong>
        </div>
        <div>
          <span className="meta-label">Realized ties</span>
          <strong>{character.tieContract.realized}</strong>
        </div>
      </div>
      <p className="fact">{character.fact}</p>
      <div className="relationship-list">
        {character.relationships.map((relationship, index) => (
          <button
            type="button"
            key={`${character.id}-${index}`}
            className="relationship-card"
            onClick={() => onSelectCharacter(relationship.partnerId)}
          >
            <div className="relationship-topline">
              <strong>{relationship.name}</strong>
            </div>
            <p>
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
    <section className="generation-log-panel" aria-label="Generation log">
      <div className="panel-header">
        <h2>Generation log</h2>
        <p>{entries.length} steps</p>
      </div>
      <div className="generation-log-list">
        {entries.map((entry, index) => (
          <p key={`${entry}-${index}`}>{entry}</p>
        ))}
      </div>
    </section>
  );
}

function EmptySheet() {
  return (
    <div className="empty-sheet">
      <h2>Choose a character</h2>
      <p>Select someone from the roster to inspect their relationship sheet.</p>
    </div>
  );
}

export default App;
