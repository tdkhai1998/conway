// ───────────────────────────────────────────────────────────────
// CellularAutomataDemo.jsx — Mobile-first redesign (V3 Floating HUD)
//
// Drop-in replacement for the original component.
// Same engine (Conway + Brian's Brain), same patterns, but rebuilt
// around a full-bleed canvas with a glass HUD capsule and on-demand
// sheets for Brush / Patterns / Rules. Works mobile + desktop.
//
// Tailwind classes are used throughout (matching the repo's setup).
// No new dependencies required — drop into src/ and it just works.
// ───────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from "react";

// ─── Engine constants ──────────────────────────────────────────
const ROWS = 100;
const COLS = 64;
const CELL = 5;

const OFF = 0;
const ON = 1;
const DYING = 2;

const PATTERNS = {
  neuronFiring: [[0,0,1,0,0],[0,1,2,1,0],[1,2,0,2,1],[0,1,2,1,0],[0,0,1,0,0]],
  electricWave: [[1,0,1,0,1,0,1,0,1],[0,2,0,2,0,2,0,2,0],[1,0,1,0,1,0,1,0,1],[0,2,0,2,0,2,0,2,0],[1,0,1,0,1,0,1,0,1]],
  galaxy: [
    [0,0,0,1,0,0,1,0,0,0],[0,0,1,2,1,1,2,1,0,0],[0,1,2,0,0,0,0,2,1,0],
    [1,2,0,1,0,0,1,0,2,1],[0,1,0,0,1,1,0,0,1,0],[0,1,0,0,1,1,0,0,1,0],
    [1,2,0,1,0,0,1,0,2,1],[0,1,2,0,0,0,0,2,1,0],[0,0,1,2,1,1,2,1,0,0],
    [0,0,0,1,0,0,1,0,0,0],
  ],
  glider:  [[0,1,0],[0,0,1],[1,1,1]],
  blinker: [[1,1,1]],
  lwss:    [[0,1,1,1,1],[1,0,0,0,1],[0,0,0,0,1],[1,0,0,1,0]],
  pulsar:  [
    [0,0,1,1,1,0,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0],
    [1,0,0,0,0,1,0,1,0,0,0,0,1],[1,0,0,0,0,1,0,1,0,0,0,0,1],
    [1,0,0,0,0,1,0,1,0,0,0,0,1],[0,0,1,1,1,0,0,0,1,1,1,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,1,1,1,0,0,0,1,1,1,0,0],
    [1,0,0,0,0,1,0,1,0,0,0,0,1],[1,0,0,0,0,1,0,1,0,0,0,0,1],
    [1,0,0,0,0,1,0,1,0,0,0,0,1],[0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,1,1,1,0,0,0,1,1,1,0,0],
  ],
  gosperGun: [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
    [1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ],
  doubleGun: [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],[0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0],[1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,0,0,0],[1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,0,0,0,1,0,1],[0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],[0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0]],
  gliderStream: [[1,1,1,0,0,0,1,1,1],[1,0,0,0,0,0,0,0,1],[0,0,1,0,0,0,1,0,0],[0,0,0,1,0,1,0,0,0],[0,0,1,0,1,0,1,0,0],[0,1,0,1,0,1,0,1,0],[1,0,1,0,1,0,1,0,1]],
  reflector: [[0,0,1,1,1,0,0],[0,1,0,0,0,1,0],[1,0,0,1,0,0,1],[1,0,1,0,1,0,1],[1,0,0,1,0,0,1],[0,1,0,0,0,1,0],[0,0,1,1,1,0,0]],
  breeder: [[1,1,1,0,0,0,1,1,1],[1,0,0,0,0,0,0,0,1],[0,0,1,0,0,0,1,0,0],[0,0,0,1,0,1,0,0,0],[0,0,1,0,1,0,1,0,0],[0,1,0,1,0,1,0,1,0],[1,0,1,0,1,0,1,0,1],[0,1,0,1,0,1,0,1,0],[1,0,1,0,1,0,1,0,1]],
  nightBloom: [[0,0,0,1,0,0,0],[0,0,1,1,1,0,0],[0,1,1,0,1,1,0],[1,1,0,0,0,1,1],[0,1,1,0,1,1,0],[0,0,1,1,1,0,0],[0,0,0,1,0,0,0]],
  voidBloom: [[0,0,0,1,1,1,1,1,0,0,0],[0,0,1,1,0,0,0,1,1,0,0],[0,1,1,0,1,1,1,0,1,1,0],[1,1,0,1,1,0,1,1,0,1,1],[1,0,1,1,0,0,0,1,1,0,1],[1,0,1,0,0,0,0,0,1,0,1],[1,0,1,1,0,0,0,1,1,0,1],[1,1,0,1,1,0,1,1,0,1,1],[0,1,1,0,1,1,1,0,1,1,0],[0,0,1,1,0,0,0,1,1,0,0],[0,0,0,1,1,1,1,1,0,0,0]],
  yinYang: [[0,0,0,1,1,1,1,1,0,0,0],[0,0,1,1,1,1,0,0,1,0,0],[0,1,1,1,1,0,0,0,0,1,0],[1,1,1,1,0,0,0,0,0,1,1],[1,1,1,0,0,1,1,0,0,1,1],[1,1,0,0,1,1,1,1,0,0,1],[1,1,0,0,1,1,0,0,0,1,1],[1,1,0,0,0,0,0,1,1,1,1],[0,1,0,0,0,0,1,1,1,1,0],[0,0,1,0,0,1,1,1,1,0,0],[0,0,0,1,1,1,1,1,0,0,0]],
  neuralNetwork: [[1,0,0,0,1,0,0,0,1],[0,2,0,2,0,2,0,2,0],[0,0,1,0,0,0,1,0,0],[0,2,0,2,0,2,0,2,0],[1,0,0,0,1,0,0,0,1]],
};

const CATALOG = {
  conway: [
    { key: "glider",      label: "Glider",       color: "sky-400",    sub: "Moves diagonally" },
    { key: "blinker",     label: "Blinker",      color: "emerald-500",sub: "Period-2 oscillator" },
    { key: "lwss",        label: "LWSS",         color: "cyan-500",   sub: "Lightweight spaceship" },
    { key: "pulsar",      label: "Pulsar",       color: "violet-500", sub: "Period-3 oscillator" },
    { key: "gosperGun",   label: "Gosper Gun",   color: "rose-500",   sub: "Glider factory" },
    { key: "doubleGun",   label: "Double Gun",   color: "rose-500",   sub: "Dual glider factory" },
    { key: "gliderStream",label: "Glider Stream",color: "sky-400",    sub: "Stream emitter" },
    { key: "reflector",   label: "Reflector",    color: "amber-500",  sub: "Symmetric structure" },
    { key: "breeder",     label: "Breeder",      color: "lime-500",   sub: "Population explosion" },
    { key: "nightBloom",  label: "Night Bloom",  color: "fuchsia-500",sub: "Radial bloom" },
    { key: "voidBloom",   label: "Void Bloom",   color: "indigo-400", sub: "Dense symmetry" },
    { key: "yinYang",     label: "Yin Yang",     color: "violet-400", sub: "Balanced duality" },
  ],
  brian: [
    { key: "neuronFiring",  label: "Neuron",   color: "violet-500", sub: "Radial pulse" },
    { key: "electricWave",  label: "Wave",     color: "emerald-500",sub: "Lattice ripple" },
    { key: "galaxy",        label: "Galaxy",   color: "pink-500",   sub: "Spiral arms" },
    { key: "neuralNetwork", label: "Network",  color: "orange-400", sub: "Neural grid" },
  ],
};

const PRESETS = [
  { id: "conway",    label: "Conway",      rule: "B3/S23",         birth: [3],        survive: [2, 3] },
  { id: "highlife",  label: "HighLife",    rule: "B36/S23",        birth: [3, 6],     survive: [2, 3] },
  { id: "seeds",     label: "Seeds",       rule: "B2/S—",          birth: [2],        survive: [] },
  { id: "daynight",  label: "Day & Night", rule: "B3678/S34678",   birth: [3,6,7,8],  survive: [3,4,6,7,8] },
];

// ─── Engine helpers ────────────────────────────────────────────
function makeRandomGrid(mode) {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => {
      const r = Math.random();
      if (mode === "brian") {
        if (r < 0.06) return ON;
        if (r < 0.10) return DYING;
        return OFF;
      }
      return r < 0.18 ? ON : OFF;
    })
  );
}

function countOn(g, r, c) {
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && g[nr][nc] === ON) n++;
  }
  return n;
}

function stepLife(g, birth, survive) {
  return g.map((row, r) => row.map((cell, c) => {
    const n = countOn(g, r, c);
    if (cell === ON) return survive.includes(n) ? ON : OFF;
    return birth.includes(n) ? ON : OFF;
  }));
}

function stepBrain(g) {
  return g.map((row, r) => row.map((cell, c) => {
    const n = countOn(g, r, c);
    if (cell === OFF) return n === 2 ? ON : OFF;
    if (cell === ON) return DYING;
    return OFF;
  }));
}

// ─── Main component ────────────────────────────────────────────
export default function CellularAutomataDemo() {
  const [running, setRunning] = useState(true);
  const [mode, setMode] = useState("brian");
  const [preset, setPreset] = useState("conway");
  const [birth, setBirth] = useState([3]);
  const [survive, setSurvive] = useState([2, 3]);
  const [brush, setBrush] = useState(ON);
  const [patternBrush, setPatternBrush] = useState(null);
  const [generation, setGeneration] = useState(0);
  const [sheet, setSheet] = useState(null); // "brush" | "patterns" | "rules" | null
  const [speedIdx, setSpeedIdx] = useState(1);

  const canvasRef = useRef(null);
  const gridRef = useRef(makeRandomGrid("brian"));
  const drawingRef = useRef(false);

  const SPEEDS = [240, 90, 45, 22];
  const tickMs = SPEEDS[speedIdx];

  function draw(g) {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, cv.width, cv.height);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const s = g[r][c];
        if (s === ON) ctx.fillStyle = "#38bdf8";
        else if (s === DYING) ctx.fillStyle = "#7c3aed";
        else continue;
        ctx.fillRect(c * CELL, r * CELL, CELL - 1, CELL - 1);
      }
    }
  }

  useEffect(() => {
    draw(gridRef.current);
    const t = setInterval(() => {
      if (!running) return;
      gridRef.current = mode === "conway"
        ? stepLife(gridRef.current, birth, survive)
        : stepBrain(gridRef.current);
      draw(gridRef.current);
      setGeneration((g) => g + 1);
    }, tickMs);
    return () => clearInterval(t);
  }, [running, mode, birth, survive, tickMs]);

  function randomize() {
    gridRef.current = makeRandomGrid(mode);
    draw(gridRef.current);
    setGeneration(0);
  }
  function clearGrid() {
    gridRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(OFF));
    draw(gridRef.current);
    setGeneration(0);
  }
  function stamp(pattern, sr, sc) {
    const next = gridRef.current.map((row) => [...row]);
    for (let r = 0; r < pattern.length; r++) {
      for (let c = 0; c < pattern[r].length; c++) {
        const rr = sr + r, cc = sc + c;
        if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) {
          next[rr][cc] = mode === "conway" && pattern[r][c] === DYING ? OFF : pattern[r][c];
        }
      }
    }
    gridRef.current = next;
    draw(gridRef.current);
  }
  function paintAt(clientX, clientY) {
    const cv = canvasRef.current;
    if (!cv) return;
    const rect = cv.getBoundingClientRect();
    const sx = cv.width / rect.width, sy = cv.height / rect.height;
    const col = Math.floor(((clientX - rect.left) * sx) / CELL);
    const row = Math.floor(((clientY - rect.top) * sy) / CELL);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    if (patternBrush) {
      const p = PATTERNS[patternBrush];
      stamp(p, row - Math.floor(p.length / 2), col - Math.floor(p[0].length / 2));
      return;
    }
    const next = gridRef.current.map((r) => [...r]);
    next[row][col] = mode === "conway" && brush === DYING ? OFF : brush;
    gridRef.current = next;
    draw(gridRef.current);
  }

  function toggleMode() {
    const nm = mode === "conway" ? "brian" : "conway";
    setMode(nm);
    gridRef.current = makeRandomGrid(nm);
    draw(gridRef.current);
    setGeneration(0);
  }
  function applyPreset(p) {
    setMode("conway");
    setPreset(p.id);
    setBirth(p.birth);
    setSurvive(p.survive);
  }

  const ruleString = mode === "brian"
    ? "Brian's Brain"
    : `B${birth.join("") || "—"}/S${survive.join("") || "—"}`;

  const cat = CATALOG[mode];

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden text-white font-sans">
      {/* ─── Canvas full-bleed ─── */}
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drawingRef.current = true; paintAt(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (drawingRef.current && !patternBrush) paintAt(e.clientX, e.clientY); }}
        onPointerUp={() => { drawingRef.current = false; }}
        onPointerCancel={() => { drawingRef.current = false; }}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ cursor: patternBrush ? "copy" : "crosshair", imageRendering: "pixelated" }}
      />

      {/* ─── Protection gradients ─── */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-slate-950/80 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-slate-950/90 to-transparent" />

      {/* ─── Top-left: mode chip ─── */}
      <button
        onClick={toggleMode}
        className="absolute top-[max(env(safe-area-inset-top),16px)] left-4 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-xl border border-white/10 active:scale-95 transition"
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: mode === "brian" ? "#7c3aed" : "#38bdf8",
            boxShadow: `0 0 8px ${mode === "brian" ? "#7c3aed" : "#38bdf8"}`,
          }}
        />
        <span className="text-xs font-bold tracking-wider">{mode === "brian" ? "BRAIN" : "LIFE"}</span>
        <span className="text-[11px] text-slate-400 font-mono pl-2 ml-1 border-l border-white/10">
          {mode === "brian" ? "·" : `${birth.join("")||"—"}/${survive.join("")||"—"}`}
        </span>
      </button>

      {/* ─── Top-right: generation counter ─── */}
      <div className="absolute top-[max(env(safe-area-inset-top),16px)] right-4 z-20 px-3 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-xl border border-white/10 font-mono text-[11px] tracking-wider">
        <span className="text-slate-500">GEN</span>{" "}
        <span className="text-white font-bold">{String(generation).padStart(4, "0")}</span>
      </div>

      {/* ─── Pattern brush badge ─── */}
      {patternBrush && !sheet && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 mt-8 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-600/85 backdrop-blur-xl border border-white/15 shadow-lg shadow-violet-600/40">
          <span className="text-xs font-bold">● Tap to place {patternBrush}</span>
          <button
            onClick={() => setPatternBrush(null)}
            className="w-4 h-4 rounded-full bg-white/25 hover:bg-white/40 text-[10px] flex items-center justify-center"
          >✕</button>
        </div>
      )}

      {/* ─── Bottom floating HUD ─── */}
      <div
        className={`absolute left-0 right-0 z-30 flex flex-col items-center gap-2.5 transition-opacity duration-200 ${sheet ? "opacity-40 pointer-events-none" : "opacity-100"}`}
        style={{ bottom: "max(env(safe-area-inset-bottom), 24px)" }}
      >
        {/* speed dial */}
        <div className="flex items-center p-[3px] rounded-full bg-slate-900/70 backdrop-blur-xl border border-white/10">
          {["⅓×", "1×", "2×", "4×"].map((label, i) => (
            <button
              key={i}
              onClick={() => setSpeedIdx(i)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums transition ${
                speedIdx === i ? "bg-white/15 text-white" : "text-slate-400 active:bg-white/5"
              }`}
            >{label}</button>
          ))}
        </div>

        {/* primary capsule */}
        <div className="flex items-center gap-1.5 p-2 rounded-[36px] bg-slate-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50">
          <HudIcon onClick={clearGrid} title="Clear"><TrashIcon /></HudIcon>
          <HudIcon onClick={randomize} title="Randomize"><DiceIcon /></HudIcon>
          <HudIcon onClick={() => setSheet("brush")} title="Brush"
            active={sheet === "brush"} activeColor={brushColor(brush)}
          ><BrushIcon /></HudIcon>
          <button
            onClick={() => setRunning(!running)}
            className={`w-[54px] h-[54px] rounded-full flex items-center justify-center text-white active:scale-95 transition shadow-lg ${
              running ? "bg-violet-600 shadow-violet-600/50" : "bg-sky-500 shadow-sky-500/50"
            }`}
            style={{ boxShadow: `0 6px 20px ${running ? "rgba(124,58,237,0.5)" : "rgba(14,165,233,0.5)"}, inset 0 1px 0 rgba(255,255,255,0.2)` }}
          >
            {running ? <PauseIcon /> : <PlayIcon />}
          </button>
          <HudIcon onClick={() => setSheet("patterns")} title="Patterns"
            active={sheet === "patterns"} activeColor="bg-violet-600"
          ><PatternsIcon /></HudIcon>
          <HudIcon onClick={() => setSheet("rules")} title="Rules"
            active={sheet === "rules"} activeColor="bg-yellow-600"
          ><SlidersIcon /></HudIcon>
        </div>
      </div>

      {/* ─── Sheet overlay ─── */}
      {sheet && (
        <>
          <div
            onClick={() => setSheet(null)}
            className="absolute inset-0 z-40 bg-slate-950/45 backdrop-blur-sm cursor-pointer"
          />
          <div
            className="absolute left-2 right-2 z-50 bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl shadow-black/60 px-5 pt-3 pb-6 max-h-[60vh] overflow-y-auto"
            style={{ bottom: "max(env(safe-area-inset-bottom), 20px)" }}
          >
            <div className="flex justify-center mb-2">
              <div className="w-9 h-1.5 rounded-full bg-white/20" />
            </div>
            {sheet === "brush" && (
              <BrushSheet
                brush={brush} setBrush={setBrush} mode={mode}
                patternBrush={patternBrush} setPatternBrush={setPatternBrush}
                onClose={() => setSheet(null)}
              />
            )}
            {sheet === "patterns" && (
              <PatternsSheet
                mode={mode} cat={cat}
                patternBrush={patternBrush} setPatternBrush={setPatternBrush}
                onClose={() => setSheet(null)}
              />
            )}
            {sheet === "rules" && (
              <RulesSheet
                mode={mode} preset={preset} applyPreset={applyPreset}
                birth={birth} setBirth={setBirth}
                survive={survive} setSurvive={setSurvive}
                onClose={() => setSheet(null)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Small atoms ───────────────────────────────────────────────
function HudIcon({ children, onClick, title, active, activeColor }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-95 transition ${
        active ? activeColor : "bg-transparent"
      }`}
    >{children}</button>
  );
}

function SheetHeader({ title, onClose }) {
  return (
    <div className="flex justify-between items-center mb-3.5">
      <div className="text-white text-[17px] font-bold tracking-tight">{title}</div>
      <button onClick={onClose} className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-xs flex items-center justify-center">✕</button>
    </div>
  );
}

function brushColor(brush) {
  if (brush === ON) return "bg-sky-500";
  if (brush === DYING) return "bg-violet-600";
  return "bg-red-600";
}

// ─── Sheet bodies ──────────────────────────────────────────────
function BrushSheet({ brush, setBrush, mode, patternBrush, setPatternBrush, onClose }) {
  return (
    <div>
      <SheetHeader title="Brush" onClose={onClose} />
      <div className="grid grid-cols-3 gap-2">
        <BrushCard
          active={!patternBrush && brush === ON}
          colorClass="bg-sky-500" shadowClass="shadow-sky-500/50"
          label="Alive" glyph="●"
          onClick={() => { setPatternBrush(null); setBrush(ON); }}
        />
        <BrushCard
          active={!patternBrush && brush === DYING}
          disabled={mode !== "brian"}
          colorClass="bg-violet-600" shadowClass="shadow-violet-600/50"
          label="Dying" glyph="◐"
          onClick={() => { if (mode === "brian") { setPatternBrush(null); setBrush(DYING); } }}
        />
        <BrushCard
          active={!patternBrush && brush === OFF}
          colorClass="bg-red-600" shadowClass="shadow-red-600/50"
          label="Erase" glyph="○"
          onClick={() => { setPatternBrush(null); setBrush(OFF); }}
        />
      </div>
    </div>
  );
}

function BrushCard({ active, disabled, colorClass, shadowClass, label, glyph, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`py-3.5 rounded-2xl text-white text-center active:scale-95 transition ${
        disabled
          ? "bg-slate-800/40 text-slate-600 cursor-not-allowed"
          : active
            ? `${colorClass} shadow-lg ${shadowClass}`
            : "bg-slate-800"
      }`}
    >
      <div className="text-3xl leading-none mb-1.5">{glyph}</div>
      <div className="text-xs font-bold">{label}</div>
    </button>
  );
}

function PatternsSheet({ mode, cat, patternBrush, setPatternBrush, onClose }) {
  return (
    <div>
      <SheetHeader title={`Patterns · ${mode === "conway" ? "Life-like" : "Brain"}`} onClose={onClose} />
      <div className="grid grid-cols-2 gap-2">
        {cat.map((p) => {
          const active = patternBrush === p.key;
          const bgClass = `bg-${p.color}`;
          return (
            <button
              key={p.key}
              onClick={() => { setPatternBrush(p.key); onClose(); }}
              className={`p-2.5 rounded-2xl text-white text-left flex items-center gap-2.5 active:scale-95 transition ${
                active ? `${bgClass} shadow-lg` : "bg-slate-800"
              }`}
            >
              <PatternThumb pattern={PATTERNS[p.key]} color={p.color} active={active} />
              <div className="min-w-0">
                <div className="text-[13px] font-bold">{p.label}</div>
                <div className={`text-[10px] mt-0.5 ${active ? "text-white/80" : "text-slate-400"}`}>{p.sub}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PatternThumb({ pattern, color, active }) {
  if (!pattern) return null;
  const max = 10;
  const rows = pattern.slice(0, max);
  const cols = Math.min(max, Math.max(...rows.map((r) => r.length)));
  const px = 4;
  return (
    <div
      className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${
        active ? "bg-black/25" : "bg-slate-950"
      }`}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${px}px)`,
          gridTemplateRows: `repeat(${rows.length}, ${px}px)`,
          gap: 1,
        }}
      >
        {rows.flatMap((row, r) =>
          Array.from({ length: cols }, (_, c) => {
            const v = row[c] || 0;
            return (
              <div
                key={`${r}-${c}`}
                className={`rounded-[1px] bg-${v === 1 ? color : v === 2 ? "white/50" : "transparent"}`}
                style={{ width: px, height: px }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function RulesSheet({ mode, preset, applyPreset, birth, setBirth, survive, setSurvive, onClose }) {
  return (
    <div>
      <SheetHeader title="Rules" onClose={onClose} />
      {mode === "conway" ? (
        <>
          <div className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-2">Presets</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-left text-white active:scale-95 transition ${
                  preset === p.id ? "bg-slate-700 ring-1 ring-sky-400/80" : "bg-slate-800"
                }`}
              >
                <div className="text-xs font-bold">{p.label}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.rule}</div>
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-2">Birth</div>
          <div className="flex gap-1.5 flex-wrap mb-3.5">
            {[0,1,2,3,4,5,6,7,8].map((n) => (
              <button
                key={`b${n}`}
                onClick={() => setBirth(birth.includes(n) ? birth.filter(x=>x!==n) : [...birth, n].sort())}
                className={`w-[30px] h-[30px] rounded-lg text-[13px] font-bold tabular-nums active:scale-95 transition ${
                  birth.includes(n) ? "bg-sky-500 shadow-md shadow-sky-500/50" : "bg-slate-800"
                }`}
              >{n}</button>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-2">Survival</div>
          <div className="flex gap-1.5 flex-wrap">
            {[0,1,2,3,4,5,6,7,8].map((n) => (
              <button
                key={`s${n}`}
                onClick={() => setSurvive(survive.includes(n) ? survive.filter(x=>x!==n) : [...survive, n].sort())}
                className={`w-[30px] h-[30px] rounded-lg text-[13px] font-bold tabular-nums active:scale-95 transition ${
                  survive.includes(n) ? "bg-violet-600 shadow-md shadow-violet-600/50" : "bg-slate-800"
                }`}
              >{n}</button>
            ))}
          </div>
        </>
      ) : (
        <div className="p-3.5 rounded-2xl bg-slate-800 text-slate-300 text-xs leading-relaxed">
          <div className="text-white font-bold mb-1.5 text-[13px]">Brian's Brain</div>
          Fixed 3-state rule. To edit B/S rules, switch to <span className="text-sky-400 font-bold">Life</span> mode using the chip at top-left.
        </div>
      )}
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────
function PlayIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l10-5.5z"/></svg>;
}
function PauseIcon() {
  return <svg width="14" height="16" viewBox="0 0 12 14" fill="currentColor"><rect x="0" y="0" width="4" height="14" rx="1"/><rect x="8" y="0" width="4" height="14" rx="1"/></svg>;
}
function DiceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="2.5"/>
      <circle cx="5.5" cy="5.5" r="0.9" fill="currentColor"/>
      <circle cx="10.5" cy="5.5" r="0.9" fill="currentColor"/>
      <circle cx="8" cy="8" r="0.9" fill="currentColor"/>
      <circle cx="5.5" cy="10.5" r="0.9" fill="currentColor"/>
      <circle cx="10.5" cy="10.5" r="0.9" fill="currentColor"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9h5L11 4"/>
    </svg>
  );
}
function BrushIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 14.5l-3 3M18 4l2 2-8 8-2-2zM4 20s2-1 4-1 3 1 3 1"/></svg>;
}
function PatternsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="6" r="1.8"/><circle cx="18" cy="6" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="6" cy="18" r="1.8"/><circle cx="18" cy="18" r="1.8"/></svg>;
}
function SlidersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 7h6M14 7h6M4 12h10M18 12h2M4 17h2M10 17h10"/>
      <circle cx="12" cy="7" r="2" fill="currentColor"/>
      <circle cx="16" cy="12" r="2" fill="currentColor"/>
      <circle cx="8" cy="17" r="2" fill="currentColor"/>
    </svg>
  );
}
