import { useMemo, useState } from "react";
import "./App.css";
import type { Character, ScaleName } from "./lib/types";
import { generateWorld, wealthLabel } from "./lib/worldGenerator";
import { useAppStore } from "./store.ts";

const SCALE_OPTIONS: ScaleName[] = ["Local", "Regional", "Continental"];

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

  const characters = useMemo(
    () => generateWorld(seedInput, scaleInput),
    [seedInput, scaleInput],
  );
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
        </div>
      </header>

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
                  <td>{character.tiesRealized}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel sheet-panel">
          {selectedCharacter ? (
            <CharacterSheet character={selectedCharacter} />
          ) : (
            <EmptySheet />
          )}
        </section>
      </main>
    </div>
  );
}

function CharacterSheet({ character }: { character: Character }) {
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
          <strong>{character.tiesRequested}</strong>
        </div>
        <div>
          <span className="meta-label">Realized ties</span>
          <strong>{character.tiesRealized}</strong>
        </div>
      </div>
      <p className="fact">{character.fact}</p>
      <div className="relationship-list">
        {character.relationships.map((relationship, index) => (
          <article
            key={`${character.id}-${index}`}
            className="relationship-card"
          >
            <div className="relationship-topline">
              <strong>{relationship.name}</strong>
            </div>
            <p>
              {relationship.bond} • {relationship.strength} •{" "}
              {relationship.ageTag}
            </p>
          </article>
        ))}
      </div>
    </>
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
