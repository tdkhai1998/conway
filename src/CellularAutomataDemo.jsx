import React, { useEffect, useRef, useState } from "react";

export default function CellularAutomataDemo() {
  const ROWS = 80;
  const COLS = 120;
  const CELL = 5;

  const OFF = 0;
  const ON = 1;
  const DYING = 2;

  const [running, setRunning] = useState(true);
  const [mode, setMode] = useState("brian");
  const [lifePreset, setLifePreset] = useState("conway");
  const [birthRules, setBirthRules] = useState([3]);
  const [survivalRules, setSurvivalRules] = useState([2, 3]);
  const [brushState, setBrushState] = useState(ON);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef(null);
  const gridRef = useRef(createRandomGrid("brian"));

  function createRandomGrid(activeMode = mode) {
    return Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => {
        const rand = Math.random();

        if (activeMode === "brian") {
          if (rand < 0.06) return ON;
          if (rand < 0.1) return DYING;
          return OFF;
        }

        return rand < 0.18 ? ON : OFF;
      })
    );
  }

  const patterns = {
    neuronFiring: [
      [0, 0, 1, 0, 0],
      [0, 1, 2, 1, 0],
      [1, 2, 0, 2, 1],
      [0, 1, 2, 1, 0],
      [0, 0, 1, 0, 0],
    ],
    electricWave: [
      [1, 0, 1, 0, 1, 0, 1, 0, 1],
      [0, 2, 0, 2, 0, 2, 0, 2, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1],
      [0, 2, 0, 2, 0, 2, 0, 2, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1],
    ],
    neuralNetwork: [
      [1, 0, 0, 0, 1, 0, 0, 0, 1],
      [0, 2, 0, 2, 0, 2, 0, 2, 0],
      [0, 0, 1, 0, 0, 0, 1, 0, 0],
      [0, 2, 0, 2, 0, 2, 0, 2, 0],
      [1, 0, 0, 0, 1, 0, 0, 0, 1],
    ],
    galaxy: [
      [0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
      [0, 0, 1, 2, 1, 1, 2, 1, 0, 0],
      [0, 1, 2, 0, 0, 0, 0, 2, 1, 0],
      [1, 2, 0, 1, 0, 0, 1, 0, 2, 1],
      [0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
      [0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
      [1, 2, 0, 1, 0, 0, 1, 0, 2, 1],
      [0, 1, 2, 0, 0, 0, 0, 2, 1, 0],
      [0, 0, 1, 2, 1, 1, 2, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 1, 0, 0, 0],
    ],
    nightBloom: [
      [0, 0, 0, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 1, 1, 0, 1, 1, 0],
      [1, 1, 0, 0, 0, 1, 1],
      [0, 1, 1, 0, 1, 1, 0],
      [0, 0, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 0],
    ],
    voidBloom: [
      [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0],
      [0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0],
      [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1],
      [1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1],
      [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1],
      [0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0],
      [0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
    ],
    yinYang: [
      [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0],
      [0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0],
      [1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1],
      [1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
      [1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1],
      [1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1],
      [1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1],
      [0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0],
      [0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
    ],
    glider: [[0, 1, 0], [0, 0, 1], [1, 1, 1]],
    lwss: [[0, 1, 1, 1, 1], [1, 0, 0, 0, 1], [0, 0, 0, 0, 1], [1, 0, 0, 1, 0]],
    blinker: [[1, 1, 1]],
    pulsar: [[0,0,1,1,1,0,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0],[1,0,0,0,0,1,0,1,0,0,0,0,1],[1,0,0,0,0,1,0,1,0,0,0,0,1],[1,0,0,0,0,1,0,1,0,0,0,0,1],[0,0,1,1,1,0,0,0,1,1,1,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,1,1,1,0,0,0,1,1,1,0,0],[1,0,0,0,0,1,0,1,0,0,0,0,1],[1,0,0,0,0,1,0,1,0,0,0,0,1],[1,0,0,0,0,1,0,1,0,0,0,0,1],[0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,1,1,1,0,0,0,1,1,1,0,0]],
    gosperGun: [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],[0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1],[1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],
    doubleGun: [[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],[0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,1,0,0,0],[1,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,0,0,0],[1,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,1,0,0,0,0,1,0,1],[0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],[0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0]],
    gliderStream: [[1,1,1,0,0,0,1,1,1],[1,0,0,0,0,0,0,0,1],[0,0,1,0,0,0,1,0,0],[0,0,0,1,0,1,0,0,0],[0,0,1,0,1,0,1,0,0],[0,1,0,1,0,1,0,1,0],[1,0,1,0,1,0,1,0,1]],
    reflector: [[0,0,1,1,1,0,0],[0,1,0,0,0,1,0],[1,0,0,1,0,0,1],[1,0,1,0,1,0,1],[1,0,0,1,0,0,1],[0,1,0,0,0,1,0],[0,0,1,1,1,0,0]],
    breeder: [[1,1,1,0,0,0,1,1,1],[1,0,0,0,0,0,0,0,1],[0,0,1,0,0,0,1,0,0],[0,0,0,1,0,1,0,0,0],[0,0,1,0,1,0,1,0,0],[0,1,0,1,0,1,0,1,0],[1,0,1,0,1,0,1,0,1],[0,1,0,1,0,1,0,1,0],[1,0,1,0,1,0,1,0,1]],
  };

  function countOnNeighbors(grid, row, col) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === ON) count++;
      }
    }
    return count;
  }

  function stepLifeLike(grid) {
    return grid.map((row, r) => row.map((cell, c) => {
      const neighbors = countOnNeighbors(grid, r, c);
      if (cell === ON) return survivalRules.includes(neighbors) ? ON : OFF;
      return birthRules.includes(neighbors) ? ON : OFF;
    }));
  }

  function stepBriansBrain(grid) {
    return grid.map((row, r) => row.map((cell, c) => {
      const neighbors = countOnNeighbors(grid, r, c);
      if (cell === OFF) return neighbors === 2 ? ON : OFF;
      if (cell === ON) return DYING;
      return OFF;
    }));
  }

  function draw(grid) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const state = grid[r][c];
        if (state === ON) ctx.fillStyle = "#38bdf8";
        else if (state === DYING) ctx.fillStyle = "#7c3aed";
        else continue;
        ctx.fillRect(c * CELL, r * CELL, CELL - 1, CELL - 1);
      }
    }
  }

  function clearGrid() {
    gridRef.current = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => OFF));
    draw(gridRef.current);
  }

  function randomizeGrid() {
    gridRef.current = createRandomGrid(mode);
    draw(gridRef.current);
  }

  function stampPattern(pattern, startR, startC) {
    const next = gridRef.current.map((row) => [...row]);
    for (let r = 0; r < pattern.length; r++) {
      for (let c = 0; c < pattern[r].length; c++) {
        const rr = startR + r;
        const cc = startC + c;
        if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) {
          next[rr][cc] = mode === "conway" && pattern[r][c] === DYING ? OFF : pattern[r][c];
        }
      }
    }
    gridRef.current = next;
    draw(gridRef.current);
  }

  function getEventPos(event) {
    if (event.touches) {
      const touch = event.touches[0] || event.changedTouches[0];
      return { clientX: touch.clientX, clientY: touch.clientY };
    }
    return { clientX: event.clientX, clientY: event.clientY };
  }

  function paintCell(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const { clientX, clientY } = getEventPos(event);
    const col = Math.floor(((clientX - rect.left) * scaleX) / CELL);
    const row = Math.floor(((clientY - rect.top) * scaleY) / CELL);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;

    if (selectedPattern) {
      const pattern = patterns[selectedPattern.key];
      stampPattern(pattern, row - Math.floor(pattern.length / 2), col - Math.floor(pattern[0].length / 2));
      return;
    }

    const next = gridRef.current.map((gridRow) => [...gridRow]);
    next[row][col] = mode === "conway" && brushState === DYING ? OFF : brushState;
    gridRef.current = next;
    draw(gridRef.current);
  }

  function selectPatternBrush(key, label) {
    setSelectedPattern({ key, label });
  }

  function clearPatternBrush() {
    setSelectedPattern(null);
  }

  function toggleRule(list, value, setter) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value].sort((a, b) => a - b));
  }

  function setPreset(name, birth, survival) {
    setMode("conway");
    setLifePreset(name);
    setBirthRules(birth);
    setSurvivalRules(survival);
  }

  useEffect(() => {
    draw(gridRef.current);
    const timer = setInterval(() => {
      if (!running) return;
      gridRef.current = mode === "conway" ? stepLifeLike(gridRef.current) : stepBriansBrain(gridRef.current);
      draw(gridRef.current);
    }, 70);
    return () => clearInterval(timer);
  }, [running, mode, birthRules, survivalRules]);

  const description = mode === "conway"
    ? lifePreset === "daynight"
      ? "Day & Night — B3678/S34678. Symmetric life-like rule with dark/light balance."
      : `Life-like rule: B${birthRules.join("") || "-"}/S${survivalRules.join("") || "-"}.`
    : "Brian's Brain — OFF, ON, DYING. OFF turns ON with exactly 2 ON neighbors.";

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-56">
      <main className="p-3 md:p-6 flex flex-col items-center gap-4">
        <div className="max-w-4xl w-full">
          <h1 className="text-xl md:text-3xl font-bold">{mode === "conway" ? "Life-like Cellular Automata" : "Brian's Brain Cellular Automaton"}</h1>
          <p className="text-slate-400 mt-1">{description}</p>
          <p className="text-slate-500 text-sm mt-1">{selectedPattern ? `Pattern brush: ${selectedPattern.label}. Click canvas để đặt pattern.` : "Click/drag trực tiếp trên canvas để vẽ cell."}</p>
        </div>
        <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-2xl w-full">
          <canvas
            ref={canvasRef}
            width={COLS * CELL}
            height={ROWS * CELL}
            onMouseDown={(event) => { setIsDrawing(true); paintCell(event); }}
            onMouseMove={(event) => { if (isDrawing && !selectedPattern) paintCell(event); }}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
            onTouchStart={(event) => { event.preventDefault(); setIsDrawing(true); paintCell(event); }}
            onTouchMove={(event) => { event.preventDefault(); if (!selectedPattern) paintCell(event); }}
            onTouchEnd={() => setIsDrawing(false)}
            style={{ width: "100%", height: "auto", touchAction: "none" }}
            className="cursor-crosshair block"
          />
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur p-4 max-h-[45vh] overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setMode(mode === "conway" ? "brian" : "conway")} className="px-3 py-1.5 text-sm rounded-2xl bg-yellow-600 hover:bg-yellow-500 transition">{mode === "conway" ? "Brian's Brain" : "Life-like"}</button>
            <button onClick={() => setRunning(!running)} className="px-3 py-1.5 text-sm rounded-2xl bg-sky-500 hover:bg-sky-400 transition">{running ? "Pause" : "Resume"}</button>
            <button onClick={randomizeGrid} className="px-3 py-1.5 text-sm rounded-2xl bg-slate-700 hover:bg-slate-600 transition">Random</button>
            <button onClick={clearGrid} className="px-3 py-1.5 text-sm rounded-2xl bg-slate-800 hover:bg-slate-700 transition">Clear</button>
            <button onClick={() => { setSelectedPattern(null); setBrushState(ON); }} className={`px-3 py-1.5 text-sm rounded-2xl transition ${!selectedPattern && brushState === ON ? "bg-sky-500" : "bg-slate-800 hover:bg-slate-700"}`}>ON</button>
            <button onClick={() => { setSelectedPattern(null); setBrushState(DYING); }} className={`px-3 py-1.5 text-sm rounded-2xl transition ${!selectedPattern && brushState === DYING ? "bg-purple-600" : "bg-slate-800 hover:bg-slate-700"}`}>DYING</button>
            <button onClick={() => { setSelectedPattern(null); setBrushState(OFF); }} className={`px-3 py-1.5 text-sm rounded-2xl transition ${!selectedPattern && brushState === OFF ? "bg-red-600" : "bg-slate-800 hover:bg-slate-700"}`}>Erase</button>
            {selectedPattern && <button onClick={clearPatternBrush} className="px-3 py-1.5 text-sm rounded-2xl bg-rose-700 hover:bg-rose-600 transition">{selectedPattern.label} ✕</button>}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setPreset("conway", [3], [2, 3])} className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 transition">Conway B3/S23</button>
            <button onClick={() => setPreset("highlife", [3, 6], [2, 3])} className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 transition">HighLife B36/S23</button>
            <button onClick={() => setPreset("seeds", [2], [])} className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 transition">Seeds B2/S-</button>
            <button onClick={() => setPreset("daynight", [3, 6, 7, 8], [3, 4, 6, 7, 8])} className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 transition">Day & Night B3678/S34678</button>
          </div>

          {mode === "conway" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><div className="text-slate-400 mb-1">Birth</div><div className="flex gap-1 flex-wrap">{[0,1,2,3,4,5,6,7,8].map((n) => <button key={`b-${n}`} onClick={() => toggleRule(birthRules, n, setBirthRules)} className={`px-2.5 py-1 rounded-lg ${birthRules.includes(n) ? "bg-sky-500" : "bg-slate-800"}`}>{n}</button>)}</div></div>
              <div><div className="text-slate-400 mb-1">Survival</div><div className="flex gap-1 flex-wrap">{[0,1,2,3,4,5,6,7,8].map((n) => <button key={`s-${n}`} onClick={() => toggleRule(survivalRules, n, setSurvivalRules)} className={`px-2.5 py-1 rounded-lg ${survivalRules.includes(n) ? "bg-purple-600" : "bg-slate-800"}`}>{n}</button>)}</div></div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {mode === "conway" ? (
              <>
                <button onClick={() => selectPatternBrush("glider", "Glider")} className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 transition">Glider Brush</button>
                <button onClick={() => selectPatternBrush("lwss", "LWSS Ship")} className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 transition">LWSS Brush</button>
                <button onClick={() => selectPatternBrush("blinker", "Blinker")} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition">Blinker Brush</button>
                <button onClick={() => selectPatternBrush("pulsar", "Pulsar")} className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 transition">Pulsar Brush</button>
                <button onClick={() => selectPatternBrush("gosperGun", "Gosper Gun")} className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 transition">Gun Brush</button>
                <button onClick={() => selectPatternBrush("doubleGun", "Double Gun")} className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 transition">Double Gun</button>
                <button onClick={() => selectPatternBrush("gliderStream", "Glider Stream")} className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 transition">Glider Stream</button>
                <button onClick={() => selectPatternBrush("reflector", "Reflector")} className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 transition">Reflector</button>
                <button onClick={() => selectPatternBrush("breeder", "Breeder")} className="px-3 py-1.5 rounded-xl bg-lime-600 hover:bg-lime-500 transition">Breeder</button>
                <button onClick={() => selectPatternBrush("nightBloom", "Night Bloom")} className="px-3 py-1.5 rounded-xl bg-fuchsia-700 hover:bg-fuchsia-600 transition">Night Bloom Brush</button>
                <button onClick={() => selectPatternBrush("voidBloom", "Void Bloom")} className="px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 transition">Void Brush</button>
                <button onClick={() => selectPatternBrush("yinYang", "Yin Yang")} className="px-3 py-1.5 rounded-xl bg-violet-700 hover:bg-violet-600 transition">Yin Yang Brush</button>
              </>
            ) : (
              <>
                <button onClick={() => selectPatternBrush("neuronFiring", "Neuron")} className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 transition">Neuron Brush</button>
                <button onClick={() => selectPatternBrush("electricWave", "Wave")} className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition">Wave Brush</button>
                <button onClick={() => selectPatternBrush("neuralNetwork", "Network")} className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 transition">Network Brush</button>
                <button onClick={() => selectPatternBrush("galaxy", "Galaxy")} className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 transition">Galaxy Brush</button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
