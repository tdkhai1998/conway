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
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

// ─── Engine constants ──────────────────────────────────────────
// GRID_ROWS/COLS: full simulation grid (supports zoom=0.5 view)
// BASE_ROWS/COLS: cells visible at zoom=1 (the "default" viewport)
const GRID_ROWS = 400;
const GRID_COLS = 500;
const BASE_ROWS = 100;
const BASE_COLS = 64;
const CELL = 5;

const OFF = 0;
const ON = 1;
const DYING = 2;
const WIRE_EMPTY = 0;
const WIRE_CONDUCTOR = 1;
const WIRE_HEAD = 2;
const WIRE_TAIL = 3;
const MODE_ORDER = ["brian", "conway", "wireworld", "langton", "boids", "slime", "nbody"];
const PATH_REPLAY_DURATION_MS = 500;
const LANGTON_DEFAULT_RULE = "RL";
const LANGTON_COLOR_FALLBACK = [
  "#f8fafc",
  "#38bdf8",
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#f97316",
  "#ef4444",
  "#f472b6",
  "#22d3ee",
];
const BOID_DEFAULTS = {
  count: 180,
  vision: 44,
  separation: 0.95,
  alignment: 0.06,
  cohesion: 0.012,
  steer: 0.17,
  minSpeed: 0.9,
  maxSpeed: 2.7,
  drag: 0.992,
  randomness: 0.018,
  bounce: false,
};
const NBODY_DEFAULTS = {
  count: 160,
  gravity: 0.42,
  damping: 0.999,
  softening: 28,
  maxSpeed: 4.2,
};
const NBODY_PRESETS = [
  { id: "solar", label: "Solar", count: 6, gravity: 0.34, damping: 0.9992, softening: 26, maxSpeed: 3.6, radiusMin: 0.14, radiusMax: 0.42, jitter: 0.04, centerMass: 320 },
  { id: "chaotic", label: "Chaotic", count: 8, gravity: 0.58, damping: 0.9975, softening: 20, maxSpeed: 5.8, radiusMin: 0.08, radiusMax: 0.4, jitter: 0.24, centerMass: 220 },
  { id: "cluster", label: "Dense Cluster", count: 5, gravity: 0.48, damping: 0.9985, softening: 16, maxSpeed: 4.4, radiusMin: 0.04, radiusMax: 0.2, jitter: 0.1, centerMass: 280 },
];
const NBODY_COUNTS = [2, 3, 4, 5, 6, 8];
const BOID_COLOR_MODES = [
  { id: "classic", label: "Classic" },
  { id: "speed", label: "Speed" },
  { id: "density", label: "Density" },
  { id: "turn", label: "Turn Rate" },
];
const BOID_SHAPES = [
  { id: "dart", label: "Dart" },
  { id: "diamond", label: "Diamond" },
  { id: "kite", label: "Kite" },
  { id: "dot", label: "Dot" },
  { id: "shark", label: "Shark" },
];
const SLIME_MAZE_LEVELS = {
  easy: { label: "Easy", cellSize: 7, wallThickness: 1 },
  medium: { label: "Medium", cellSize: 6, wallThickness: 2 },
  hard: { label: "Hard", cellSize: 5, wallThickness: 2 },
};

const PATTERNS = {
  neuronFiring: [[0,0,1,0,0],[0,1,2,1,0],[1,2,0,2,1],[0,1,2,1,0],[0,0,1,0,0]],
  electricWave: [[1,0,1,0,1,0,1,0,1],[0,2,0,2,0,2,0,2,0],[1,0,1,0,1,0,1,0,1],[0,2,0,2,0,2,0,2,0],[1,0,1,0,1,0,1,0,1]],
  galaxy: [
    [0,0,0,1,0,0,1,0,0,0],[0,0,1,2,1,1,2,1,0,0],[0,1,2,0,0,0,0,2,1,0],
    [1,2,0,1,0,0,1,0,2,1],[0,1,0,0,1,1,0,0,1,0],[0,1,0,0,1,1,0,0,1,0],
    [1,2,0,1,0,0,1,0,2,1],[0,1,2,0,0,0,0,2,1,0],[0,0,1,2,1,1,2,1,0,0],
    [0,0,0,1,0,0,1,0,0,0],
  ],
  pulseRing: [
    [0,0,1,1,1,0,0],
    [0,1,2,0,2,1,0],
    [1,2,0,0,0,2,1],
    [1,0,0,0,0,0,1],
    [1,2,0,0,0,2,1],
    [0,1,2,0,2,1,0],
    [0,0,1,1,1,0,0],
  ],
  synapseFork: [
    [0,0,0,1,0,0,0],
    [0,0,1,2,1,0,0],
    [1,1,2,0,2,1,1],
    [0,0,1,2,1,0,0],
    [0,1,2,0,2,1,0],
    [1,2,0,0,0,2,1],
    [0,1,0,0,0,1,0],
  ],
  relayChain: [
    [1,0,0,0,1,0,0,0,1],
    [0,2,1,2,0,2,1,2,0],
    [0,1,2,1,0,1,2,1,0],
    [0,2,1,2,0,2,1,2,0],
    [1,0,0,0,1,0,0,0,1],
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

const PRESETS = [
  { id: "conway",    label: "Conway",      rule: "B3/S23",         birth: [3],        survive: [2, 3] },
  { id: "highlife",  label: "HighLife",    rule: "B36/S23",        birth: [3, 6],     survive: [2, 3] },
  { id: "seeds",     label: "Seeds",       rule: "B2/S—",          birth: [2],        survive: [] },
  { id: "daynight",  label: "Day & Night", rule: "B3678/S34678",   birth: [3,6,7,8],  survive: [3,4,6,7,8] },
];

const PALETTES = [
  { id: "heat",   label: "Heat",   colors: ["#0f4c75","#1565c0","#38bdf8","#34d399","#fbbf24","#f97316","#ef4444","#dc2626","#9f1239"] },
  { id: "viridis", label: "Viridis", colors: ["#440154","#482475","#414487","#355f8d","#2a788e","#21918c","#22a884","#44bf70","#7ad151"] },
  { id: "plasma",  label: "Plasma",  colors: ["#0d0887","#46039f","#7201a8","#9c179e","#bd3786","#d8576b","#ed7953","#fb9f3a","#fdca26"] },
  { id: "inferno", label: "Inferno", colors: ["#000004","#1b0c41","#4a0c6b","#781c6d","#a52c60","#cf4446","#ed6925","#fb9b06","#f7d13d"] },
  { id: "magma",   label: "Magma",   colors: ["#000004","#180f3d","#440f76","#721f81","#9e2f7f","#cd4071","#f1605d","#fd9567","#feca8d"] },
  { id: "cividis", label: "Cividis", colors: ["#00224e","#123570","#3b496c","#575d6d","#707173","#8a8678","#a59c74","#c3b369","#e5cc5c"] },
  { id: "turbo",   label: "Turbo",   colors: ["#30123b","#4145ab","#4675ed","#39a2fc","#1bcfd4","#24eca6","#61fc6c","#b7e336","#f9ba38"] },
  { id: "spectral",label: "Spectral",colors: ["#9e0142","#d53e4f","#f46d43","#fdae61","#fee08b","#e6f598","#abdda4","#66c2a5","#3288bd"] },
];

const WIREWORLD_THEMES = [
  { id: "classic", label: "Classic Circuit", colors: { empty: "#07111d", conductor: "#d4a14a", head: "#38bdf8", tail: "#f97316" } },
  { id: "neon", label: "Neon Grid", colors: { empty: "#050816", conductor: "#c084fc", head: "#22d3ee", tail: "#f43f5e" } },
  { id: "amber", label: "Amber Terminal", colors: { empty: "#0d0a05", conductor: "#fbbf24", head: "#fde68a", tail: "#fb923c" } },
  { id: "ice", label: "Ice Signal", colors: { empty: "#06111a", conductor: "#7dd3fc", head: "#f8fafc", tail: "#38bdf8" } },
  { id: "mono", label: "Mono Debug", colors: { empty: "#050505", conductor: "#a3a3a3", head: "#fafafa", tail: "#525252" } },
  { id: "paper", label: "Paper Logic", colors: { empty: "#111827", conductor: "#ffffff", head: "#000000", tail: "#6b7280" } },
];

function sanitizeLangtonRule(rule) {
  const cleaned = String(rule || "")
    .toUpperCase()
    .replace(/[^LR]/g, "");
  return cleaned.length ? cleaned : LANGTON_DEFAULT_RULE;
}

function parseAsciiCells(lines, mapping) {
  const height = lines.length;
  const width = Math.max(...lines.map((line) => line.length));
  const cells = [];
  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];
    for (let x = 0; x < width; x++) {
      const ch = line[x] || ".";
      const state = mapping[ch];
      if (state == null || state === 0) continue;
      cells.push({ x, y, state });
    }
  }
  return { width, height, cells };
}

function makePreset(modeId, id, name, description, category, payload = {}) {
  return { id, modeId, name, description, category, ...payload };
}

const WIRE_ASCII = {
  ".": WIRE_EMPTY,
  c: WIRE_CONDUCTOR,
  h: WIRE_HEAD,
  t: WIRE_TAIL,
};

function makeWirePreset(id, name, description, category, lines) {
  return makePreset("wireworld", id, name, description, category, {
    variant: "live",
    ...parseAsciiCells(lines, WIRE_ASCII),
  });
}

function makeWireBlueprint(id, name, description, category, lines) {
  return makePreset("wireworld", id, name, description, category, {
    variant: "static",
    ...parseAsciiCells(lines, WIRE_ASCII),
  });
}

function makeWirePresetFromMatrix(id, name, description, category, matrix, source = null) {
  const height = matrix.length;
  const width = Math.max(...matrix.map((row) => row.length));
  const cells = [];
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      const raw = matrix[y][x];
      let state = WIRE_EMPTY;
      if (raw === 3) state = WIRE_CONDUCTOR;
      else if (raw === 1) state = WIRE_HEAD;
      else if (raw === 2) state = WIRE_TAIL;
      if (state !== WIRE_EMPTY) cells.push({ x, y, state });
    }
  }
  return makePreset("wireworld", id, name, description, category, {
    variant: "live",
    width,
    height,
    cells,
    source,
  });
}

function makeWireBlueprintFromPreset(preset, id, name, description = null) {
  return {
    ...preset,
    id,
    name,
    description: description || `Static blueprint of ${preset.name}.`,
    variant: "static",
    cells: (preset.cells || []).map((cell) => ({
      ...cell,
      state: cell.state === WIRE_EMPTY ? WIRE_EMPTY : WIRE_CONDUCTOR,
    })),
  };
}

function withPresetMeta(preset, extra) {
  return { ...preset, ...extra };
}

function makeLangtonPreset({
  id,
  name,
  description,
  category,
  rule = LANGTON_DEFAULT_RULE,
  ants = [],
  cells = [],
  width = 1,
  height = 1,
  options = {},
}) {
  return makePreset("langton", id, name, description, category, {
    rule: sanitizeLangtonRule(rule),
    ants,
    cells,
    width,
    height,
    options,
  });
}

const WIREWORLD_PRESETS = [
  makeWirePreset("wireStraight", "Straight Pulse", "A clean wire carrying one moving electron.", "Basic", [
    "ccccchtcccccccc",
  ]),
  makeWirePreset("wireCorner", "Corner Wire", "Signal rounds a right-angle bend.", "Basic", [
    "....c",
    "....c",
    "....c",
    "....c",
    "htccc",
  ]),
  makeWirePreset("wireSplitter", "Splitter", "One pulse branches into two lanes.", "Basic", [
    "..c..",
    "..c..",
    "..c..",
    "htccc",
    "..c.c",
    "..c.c",
    "..c.c",
  ]),
  makeWirePreset("wireLoop", "Loop Oscillator", "A looping pulse that keeps circulating.", "Basic", [
    ".cccccc.",
    "c......c",
    "c......c",
    "c......c",
    "c......c",
    "htccccc.",
  ]),
  makeWirePreset("wirePulseGen", "Pulse Generator", "Loop clock feeding a straight output wire.", "Basic", [
    ".cccccc....",
    "c......c...",
    "c......c...",
    "c......ccccc",
    "c......c...",
    "htccccc....",
  ]),
  makeWirePresetFromMatrix("wireDiodesDoc", "Dual Diodes", "Documented diode pair: top conducts, bottom blocks in reverse.", "Logic", [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0],
    [2, 1, 3, 3, 3, 3, 3, 0, 3, 3, 3, 3, 3, 3],
    [0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0],
    [2, 1, 3, 3, 3, 3, 0, 3, 3, 3, 3, 3, 3, 3],
    [0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ], "CellPyLib docs"),
  makeWirePresetFromMatrix("wireXorDoc", "XOR Gate", "Documented XOR gate with two inputs and one output.", "Showcase", [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 3, 1, 2, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 3, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 3, 3, 3, 3, 2],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 3, 0, 0, 0, 0],
    [0, 0, 0, 3, 3, 2, 1, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0],
    [0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ], "CellPyLib docs"),
  makeWirePreset("wireDiode", "One-Way Diode", "Asymmetric routing that behaves like a diode-like filter.", "Logic", [
    ".....c.....",
    "....ccc....",
    "htccccccc..",
    "....ccc.ccc",
    ".....c.....",
  ]),
  makeWirePreset("wireAnd", "AND Gate", "Two incoming pulses meet before the shared output lane.", "Logic", [
    "c........c",
    "c........c",
    "tc......ht",
    ".hccc.ccc.",
    "....ccc...",
    ".....c....",
    ".....c....",
  ]),
  makeWirePreset("wireOr", "OR Gate", "Either branch can feed the output spine.", "Logic", [
    "c........c",
    "c........c",
    "tc......ht",
    ".hccccccc.",
    "...c...c..",
    "...c...c..",
    "...ccccc..",
  ]),
  makeWirePreset("wireMerge", "Signal Merge", "Two pulses converge into one shared trunk.", "Logic", [
    "c.......c",
    "c.......c",
    "tc.....ht",
    ".hcccccc.",
    "....c....",
    "....c....",
    "....c....",
  ]),
  makeWirePreset("wireFork", "Signal Fork", "One channel fans out into mirrored exits.", "Logic", [
    "....c....",
    "....c....",
    "....c....",
    "htccccccc",
    "....c....",
    "..ccc....",
    ".c...c...",
  ]),
  makeWirePreset("wireClock", "Clock Loop", "Closed loop with taps to watch periodic timing.", "Logic", [
    ".cccccccc.",
    "c........c",
    "c.cc..cc.c",
    "c.c....c.c",
    "c.cc..cc.c",
    "htccccccc.",
  ]),
  makeWirePreset("wireGarden", "Cyber Circuit Garden", "A decorative motherboard patch full of live pulses.", "Showcase", [
    "..c......cccccc....",
    "..c......c....c....",
    "..c......c....c....",
    "htcccccccc....cccc.",
    "..c......c....c..c.",
    "..c..cccccccccc..c.",
    "..c..c....c....c.c.",
    "..cccc....c....ccc.",
  ]),
  makeWirePreset("wireFoundry", "Signal Foundry", "A large ready-made motherboard scene with twin clocks, buses, forks, and merges.", "Showcase", [
    "................................................................",
    "..cccccccccc......................cccccccccc.....................",
    "..c........c......................c........c.....................",
    "..c........c.....cccccccccccc.....c........c.....................",
    "..c........ccccccc..........ccccccc........c.....................",
    "..c........c.....c..........c.....c........c.....................",
    "..htcccccccc.....c....cccc..c.....cccccccccc......cccccccc.......",
    "............cccccc....c..c..c.............cccccccc......c.......",
    "................c.....c..c..c.............c.............c.......",
    "..cccccccc......c.....cccc..cccccccc......c....cccccccccc.......",
    "..c......c.......cccccc...........c........c....c................",
    "..c......c............c...........c........c....c................",
    "..c......cccccccc.....c....cccccccc........cccccc................",
    "..c......c......c.....c....c..................c..................",
    "..htcccccc......c.....c....c..................c..................",
    ".................cccccc....cccccccccccc.......c..................",
    "......................c...............c.......c..................",
    "..............cccccccccccc............c....cccccccccc............",
    "..............c...........c............cccccc........c............",
    "..............c...........cccccccccccccc.............c............",
    "..............c...........c............ccccccccccccccc............",
    "..............ccccccccccccc.......................................",
    "................................................................",
  ]),
  makeWirePreset("wireGrandBoard", "Grand Logic Board", "A larger balanced board with mirrored clocks, buses, forks, and a central gate spine.", "Showcase", [
    "................................................................................",
    "..cccccccccc............................cccccccccc...............................",
    "..c........c............................c........c...............................",
    "..c........c......cccccccccccccccc......c........c...............................",
    "..c........cccccccc..............cccccccc........c...............................",
    "..c........c......c..............c......c........c...............................",
    "..htcccccccc......c....cccccc....c......cccccccccc...........cccccccccc.........",
    ".................cccccc....ccccccc.............ccccccccccccccc........c.........",
    ".....................c......c...c..............c.............c........c.........",
    ".....cccccccccc......c......c...c......cccccc..c..cccccccc...c........c.........",
    ".....c........c......cccccccc...cccccccc....cccccc......c....cccccccccc.........",
    ".....c........c...........c...............c....c........c...........c...........",
    ".....c........cccccccc....c....cccccccc...c....c........cccccccc....c...........",
    ".....c........c......c....c....c......c...c....c........c......c....c...........",
    ".....htcccccccc......c....cccccc......cccccc....cccccccccc......cccccc...........",
    "......................c........c......c...c.............c........c...............",
    "....cccccccccccc......c........cccccccc...cccccccc......c........c......cccccc...",
    "....c..........c......cccccccccc......c...c......c......cccccccccc......c....c...",
    "....c..........cccccccc...............c...c......cccccccc...............c....c...",
    "....c..........c......c......cccccccccc...cccccccc......c......cccccccccc....c...",
    "....htcccccccccc......c......c....................c......c......c.............c...",
    "......................cccccccc....................cccccccc......ccccccccccccccc...",
    "................................................................................",
  ]),
  makeWirePreset("wireDisplayRig", "Pulse Display Rig", "Clocked signal board with a display-like front end and visibly staggered pulse lanes.", "Showcase", [
    "........................................................................",
    "..cccccccccc....................cccccccccc...............................",
    "..c........c....................c........c...............................",
    "..c........cccccccc......cccccccc........c...........cccccccccccc........",
    "..c........c......c......c......c........c...........c..........c........",
    "..htcccccccc......cccccccc......cccccccccc...........c..cccccc..c........",
    ".................c......c......c.....................c..c....c..c........",
    ".................c......c......c......cccccccccc.....c..c....c..c........",
    "..cccccccccc.....cccccccc......cccccccc........c.....c..cccccc..c........",
    "..c........c...........c..........c.............c.....c..........c........",
    "..c........cccccccc....c....cccc..c....cccccc...c.....cccccccccccc........",
    "..c........c......c....c....c..c..c....c....c...c...........c.............",
    "..htcccccccc......cccccc....c..c..cccccc....cccccc...........c.............",
    ".................c..........c..c..c..............c.....cccccccccccc........",
    ".................c....ccccccc..c..c....cccccc....c.....c..........c........",
    ".....cccccccc....c....c........c..c....c....c....c.....c..cccccc..c........",
    ".....c......c....cccccc........c..cccccc....cccccc.....c..c....c..c........",
    ".....c......c.........c........c...............c........c..cccccc..c........",
    ".....htcccccc.........cccccccccc...............c........c..........c........",
    "...............................................cccccccccccccccccccccc........",
    "........................................................................",
  ]),
  makeWirePreset("wireMaze", "Pulse Maze", "A long routed maze with a traveling head.", "Showcase", [
    "ccccccccccccccc.",
    "............c.c.",
    ".cccccccccc.c.c.",
    ".c........c.c.c.",
    ".c.ccccccc.c.c.",
    ".c.c.....c.c.c.",
    ".c.c.ccccc.c.c.",
    ".htc.c.......c.",
    "..ccccccccccccc",
  ]),
];

function ringAnts(count, radius, startDir = 0, color = "#f8fafc") {
  const ants = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    ants.push({
      x: Math.round(Math.cos(a) * radius),
      y: Math.round(Math.sin(a) * radius),
      dir: (startDir + i) % 4,
      color,
    });
  }
  return ants;
}

const LANGTON_PRESETS = [
  makeLangtonPreset({
    id: "antClassic",
    name: "Single Classic Ant",
    description: "The canonical RL ant that eventually builds a highway.",
    category: "Basic",
    rule: "RL",
    ants: [{ x: 0, y: 0, dir: 0, color: "#f8fafc" }],
  }),
  makeLangtonPreset({
    id: "antFour",
    name: "Four Symmetric Ants",
    description: "Mirrored ants radiate from the center in balance.",
    category: "Basic",
    rule: "RL",
    ants: [
      { x: -4, y: 0, dir: 1, color: "#38bdf8" },
      { x: 4, y: 0, dir: 3, color: "#f472b6" },
      { x: 0, y: -4, dir: 2, color: "#fbbf24" },
      { x: 0, y: 4, dir: 0, color: "#34d399" },
    ],
    width: 9,
    height: 9,
  }),
  makeLangtonPreset({
    id: "antCorners",
    name: "Ants from Corners",
    description: "Four ants rush inward from offset corners.",
    category: "Basic",
    rule: "RL",
    ants: [
      { x: -10, y: -10, dir: 1, color: "#38bdf8" },
      { x: 10, y: -10, dir: 2, color: "#fbbf24" },
      { x: -10, y: 10, dir: 0, color: "#34d399" },
      { x: 10, y: 10, dir: 3, color: "#f472b6" },
    ],
    width: 21,
    height: 21,
  }),
  makeLangtonPreset({
    id: "antCollision",
    name: "Ant Collision Test",
    description: "Opposing ants collide through the same lane.", 
    category: "Basic",
    rule: "RL",
    ants: [
      { x: -8, y: 0, dir: 1, color: "#f8fafc" },
      { x: 8, y: 0, dir: 3, color: "#f97316" },
      { x: 0, y: -8, dir: 2, color: "#22d3ee" },
      { x: 0, y: 8, dir: 0, color: "#a78bfa" },
    ],
    width: 17,
    height: 17,
  }),
  makeLangtonPreset({
    id: "antHighway",
    name: "Highway Starter",
    description: "Classic RL seeded just off-center for a quick highway build.",
    category: "Beautiful",
    rule: "RL",
    ants: [{ x: -3, y: 2, dir: 1, color: "#f8fafc" }],
    width: 7,
    height: 7,
  }),
  makeLangtonPreset({
    id: "antSpiralChaos",
    name: "Spiral Chaos",
    description: "RLLR rule with a tight spiral of ants.",
    category: "Beautiful",
    rule: "RLLR",
    ants: ringAnts(6, 5, 0, "#38bdf8"),
    width: 13,
    height: 13,
  }),
  makeLangtonPreset({
    id: "antMandala",
    name: "Mandala Ants",
    description: "Symmetric launch that blooms into a mandala-like field.",
    category: "Beautiful",
    rule: "LLRR",
    ants: ringAnts(8, 8, 0, "#fbbf24"),
    width: 17,
    height: 17,
  }),
  makeLangtonPreset({
    id: "antSwarmCross",
    name: "Swarm Cross",
    description: "A dense cross of ants with varied headings.",
    category: "Beautiful",
    rule: "RLR",
    ants: [
      { x: -8, y: 0, dir: 1, color: "#38bdf8" },
      { x: -4, y: 0, dir: 1, color: "#7dd3fc" },
      { x: 4, y: 0, dir: 3, color: "#f472b6" },
      { x: 8, y: 0, dir: 3, color: "#fb7185" },
      { x: 0, y: -8, dir: 2, color: "#fbbf24" },
      { x: 0, y: -4, dir: 2, color: "#fde68a" },
      { x: 0, y: 4, dir: 0, color: "#34d399" },
      { x: 0, y: 8, dir: 0, color: "#86efac" },
    ],
    width: 17,
    height: 17,
  }),
  makeLangtonPreset({
    id: "antMirror",
    name: "Mirror Ants",
    description: "Paired ants mirror each other across the center line.",
    category: "Beautiful",
    rule: "LLRR",
    ants: [
      { x: -6, y: -2, dir: 1, color: "#f8fafc" },
      { x: 6, y: -2, dir: 3, color: "#f8fafc" },
      { x: -6, y: 2, dir: 1, color: "#a78bfa" },
      { x: 6, y: 2, dir: 3, color: "#a78bfa" },
    ],
    width: 13,
    height: 9,
  }),
  makeLangtonPreset({
    id: "antOrbit",
    name: "Orbit Ants",
    description: "A colored ring of ants with clockwise momentum.",
    category: "Beautiful",
    rule: "LRRRRRLLR",
    ants: ringAnts(10, 10, 1, "#22d3ee"),
    width: 21,
    height: 21,
  }),
  makeLangtonPreset({
    id: "antDenseChaos",
    name: "Dense Center Chaos",
    description: "Many ants start packed in the middle for fast chaos.",
    category: "Beautiful",
    rule: "LLRRRLR",
    ants: [
      { x: -2, y: -2, dir: 0, color: "#f8fafc" },
      { x: 0, y: -2, dir: 1, color: "#22d3ee" },
      { x: 2, y: -2, dir: 2, color: "#f472b6" },
      { x: -2, y: 0, dir: 3, color: "#fbbf24" },
      { x: 0, y: 0, dir: 0, color: "#34d399" },
      { x: 2, y: 0, dir: 1, color: "#a78bfa" },
      { x: -2, y: 2, dir: 2, color: "#fb7185" },
      { x: 0, y: 2, dir: 3, color: "#7dd3fc" },
      { x: 2, y: 2, dir: 0, color: "#fde68a" },
    ],
    width: 7,
    height: 7,
  }),
];

const WIREWORLD_ORTHO_PRESETS = [
  withPresetMeta(
    makeWirePreset("wireBatteryCell", "Battery Cell", "Orthogonal-only pulse source: a circulating cell with an output lead.", "Orthogonal Only", [
      "....cccccc..........",
      "....c....c..........",
      "....c....c..........",
      "htccc....ccccccccccc",
      "....c....c..........",
      "....c....c..........",
      "....cccccc..........",
    ]),
    { ruleSet: "orthogonal" }
  ),
  withPresetMeta(
    makeWirePreset("wireOrthoStraight", "Ortho Straight Pulse", "A clean single-pass pulse that uses only horizontal wiring.", "Orthogonal Only", [
      "htcccccccccccccc",
    ]),
    { ruleSet: "orthogonal" }
  ),
  withPresetMeta(
    makeWirePreset("wireOrthoCorner", "Ortho Corner Pulse", "A right-angle pulse path that stays fully orthogonal.", "Orthogonal Only", [
      ".....c",
      ".....c",
      ".....c",
      ".....c",
      "htcccc",
    ]),
    { ruleSet: "orthogonal" }
  ),
  withPresetMeta(
    makeWirePreset("wireOrthoClock", "Ortho Clock Loop", "A rectangular oscillator tuned for the orthogonal-only experimental rule.", "Orthogonal Only", [
      ".ccccccc.",
      "c.......c",
      "c.......c",
      "c.......c",
      "c.......c",
      "htcccccc.",
    ]),
    { ruleSet: "orthogonal" }
  ),
];

const WIREWORLD_BLUEPRINT_PRESETS = [
  makeWireBlueprint(
    "wireColumnBusBlueprint",
    "Column Bus Blueprint",
    "Vertical columns 20 cells tall, spaced by one gap, without the bottom bus.",
    "Static Blueprint",
    [
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
      "c.c.c.c.c.c.c.c.c.c.c.c",
    ]
  ),
  makeWireBlueprintFromPreset(
    WIREWORLD_PRESETS.find((preset) => preset.id === "wireClock"),
    "wireClockBlueprint",
    "Clock Blueprint",
    "Static clock layout with conductors only."
  ),
  makeWireBlueprintFromPreset(
    WIREWORLD_PRESETS.find((preset) => preset.id === "wireFoundry"),
    "wireFoundryBlueprint",
    "Foundry Blueprint",
    "Static motherboard-style board without seeded pulses."
  ),
  makeWireBlueprintFromPreset(
    WIREWORLD_PRESETS.find((preset) => preset.id === "wireGrandBoard"),
    "wireGrandBoardBlueprint",
    "Grand Board Blueprint",
    "Large balanced board with conductors only."
  ),
  makeWireBlueprintFromPreset(
    WIREWORLD_PRESETS.find((preset) => preset.id === "wireDisplayRig"),
    "wireDisplayRigBlueprint",
    "Display Rig Blueprint",
    "Clock-and-display style blueprint without live pulses."
  ),
];

const WIREWORLD_ALL_PRESETS = [...WIREWORLD_PRESETS, ...WIREWORLD_ORTHO_PRESETS, ...WIREWORLD_BLUEPRINT_PRESETS];

const MODE_DESCRIPTIONS = {
  brian: "Exactly two live neighbors ignite a three-state pulse.",
  conway: "Birth and survival rules shape organic growth.",
  wireworld: "Draw wires, electrons travel through conductors.",
  langton: "Simple turn rules create chaos and highways.",
  boids: "Separation, alignment, and cohesion drive flocking.",
  slime: "Trails diffuse, decay, and steer emergent flow.",
  nbody: "A few gravitating bodies sketch orbital trails.",
};

const PRESET_LIBRARY = Object.fromEntries(
  [...WIREWORLD_ALL_PRESETS, ...LANGTON_PRESETS].map((preset) => [preset.id, preset])
);

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
    { key: "neuronFiring",  label: "Neuron",        color: "violet-500", sub: "Radial pulse" },
    { key: "electricWave",  label: "Wave",          color: "emerald-500",sub: "Lattice ripple" },
    { key: "galaxy",        label: "Galaxy",        color: "pink-500",   sub: "Spiral arms" },
    { key: "pulseRing",     label: "Pulse Ring",    color: "sky-500",    sub: "Concentric echo" },
    { key: "synapseFork",   label: "Synapse Fork",  color: "amber-500",  sub: "Branching impulse" },
    { key: "relayChain",    label: "Relay Chain",   color: "cyan-500",   sub: "Signal repeater" },
    { key: "neuralNetwork", label: "Network",       color: "orange-400", sub: "Neural grid" },
  ],
  wireworld: WIREWORLD_ALL_PRESETS.map((preset, index) => ({
    key: preset.id,
    label: preset.name,
    color: ["amber-500", "cyan-500", "orange-500", "violet-500", "lime-500"][index % 5],
    sub: `${preset.variant === "static" ? "Static Blueprint" : "Live Circuit"}${preset.ruleSet === "orthogonal" ? " · Orthogonal Only" : ""} · ${preset.description}`,
  })),
  langton: LANGTON_PRESETS.map((preset, index) => ({
    key: preset.id,
    label: preset.name,
    color: ["sky-500", "pink-500", "emerald-500", "amber-500", "violet-500"][index % 5],
    sub: preset.description,
  })),
};

// ─── Viewport helpers ──────────────────────────────────────────
// zoom=1 → show BASE_ROWS×BASE_COLS (center of grid)
// visCols/visRows derived from actual window size and zoom level
// zoom=1 → 1 cell per CELL px; zoom=2 → each cell takes 2×CELL px (fewer cells visible)
function getViewport(zoom, windowW, windowH) {
  const w = windowW || window.innerWidth;
  const h = windowH || window.innerHeight;
  const visCols = Math.min(GRID_COLS, Math.max(1, Math.floor(w / CELL / zoom)));
  const visRows = Math.min(GRID_ROWS, Math.max(1, Math.floor(h / CELL / zoom)));
  const rowOff = Math.floor((GRID_ROWS - visRows) / 2);
  const colOff = Math.floor((GRID_COLS - visCols) / 2);
  return { visRows, visCols, rowOff, colOff };
}

// ─── Engine helpers ────────────────────────────────────────────
function makeRandomGrid(mode) {
  return Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => {
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

function rotatePattern(pattern, turns = 0) {
  if (!pattern) return pattern;
  let next = pattern.map((row) => [...row]);
  const normalized = ((turns % 4) + 4) % 4;
  for (let t = 0; t < normalized; t++) {
    const rows = next.length;
    const cols = Math.max(...next.map((row) => row.length));
    const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        rotated[c][rows - 1 - r] = next[r]?.[c] || 0;
      }
    }
    next = rotated;
  }
  return next;
}

function countOn(g, r, c) {
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS && g[nr][nc] === ON) n++;
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

function countWireHeads(g, r, c) {
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS && g[nr][nc] === WIRE_HEAD) n++;
  }
  return n;
}

function countWireHeadsOrthogonal(g, r, c) {
  let n = 0;
  const neighbors = [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ];
  for (const [nr, nc] of neighbors) {
    if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS && g[nr][nc] === WIRE_HEAD) n++;
  }
  return n;
}

function stepWireworld(g, orthogonalOnly = false) {
  return g.map((row, r) => row.map((cell, c) => {
    if (cell === WIRE_EMPTY) return WIRE_EMPTY;
    if (cell === WIRE_HEAD) return WIRE_TAIL;
    if (cell === WIRE_TAIL) return WIRE_CONDUCTOR;
    const heads = orthogonalOnly ? countWireHeadsOrthogonal(g, r, c) : countWireHeads(g, r, c);
    return heads === 1 || heads === 2 ? WIRE_HEAD : WIRE_CONDUCTOR;
  }));
}

function makeLangtonAnt(x, y, dir = 0, color = "#f8fafc") {
  return { x, y, dir, color };
}

function stepLangton(grid, ants, rule) {
  const nextGrid = grid.map((row) => [...row]);
  const turns = sanitizeLangtonRule(rule);
  const stateCount = turns.length;
  const nextAnts = ants.map((ant) => ({ ...ant }));
  for (const ant of nextAnts) {
    const x = ((ant.x % GRID_COLS) + GRID_COLS) % GRID_COLS;
    const y = ((ant.y % GRID_ROWS) + GRID_ROWS) % GRID_ROWS;
    const state = nextGrid[y][x] % stateCount;
    const turn = turns[state];
    ant.dir = turn === "L" ? (ant.dir + 3) % 4 : (ant.dir + 1) % 4;
    nextGrid[y][x] = (state + 1) % stateCount;
    if (ant.dir === 0) ant.y = y - 1;
    else if (ant.dir === 1) ant.x = x + 1;
    else if (ant.dir === 2) ant.y = y + 1;
    else ant.x = x - 1;
    ant.x = ((ant.x % GRID_COLS) + GRID_COLS) % GRID_COLS;
    ant.y = ((ant.y % GRID_ROWS) + GRID_ROWS) % GRID_ROWS;
  }
  return { grid: nextGrid, ants: nextAnts };
}

function makeLangtonGrid(fill = 0) {
  return Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(fill));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function makeBoids(count, w, h, shape = "dart") {
  return Array.from({ length: count }, () => {
    return {};
  }).map((_, i) => {
    return makeBoidAt(rand(0, w), rand(0, h), shape);
  });
}

function makeBoidAt(x, y, shape = "dart") {
  const a = rand(0, Math.PI * 2);
  const speed = rand(0.8, 2.2);
  return {
    x,
    y,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    turn: 0,
    localDensity: 0,
    shape,
  };
}

function makeNBodySystem(count, w, h, config = {}) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const gravity = config.gravity ?? NBODY_DEFAULTS.gravity;
  const radiusMin = config.radiusMin ?? 0.08;
  const radiusMax = config.radiusMax ?? 0.42;
  const jitter = config.jitter ?? 0.08;
  const centerMass = config.centerMass ?? 240;
  const withCentralBody = config.centralBody !== false;
  const orbiterMass = config.orbiterMass ?? 120;
  const bodies = withCentralBody ? [{
    x: cx,
    y: cy,
    vx: 0,
    vy: 0,
    mass: centerMass,
    radius: 6,
    fixed: true,
  }] : [];
  const orbiters = withCentralBody ? Math.max(1, count - 1) : count;
  for (let i = 0; i < orbiters; i++) {
    const angle = rand(0, Math.PI * 2);
    const radius = rand(Math.min(w, h) * radiusMin, Math.min(w, h) * radiusMax);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const mass = rand(orbiterMass * 0.5, orbiterMass * 1.5);
    const orbitalSpeed = Math.sqrt(Math.max(0.001, gravity * centerMass / Math.max(radius, 18))) * 3.6;
    const tangent = angle + Math.PI / 2;
    bodies.push({
      x,
      y,
      vx: Math.cos(tangent) * orbitalSpeed + rand(-jitter, jitter),
      vy: Math.sin(tangent) * orbitalSpeed + rand(-jitter, jitter),
      mass,
      radius: Math.max(3, Math.sqrt(mass) * 0.6),
      fixed: false,
    });
  }
  return bodies;
}

function stepNBodies(bodies, opt, w, h) {
  const next = bodies.map((b) => ({ ...b }));
  const forceSign = opt.repel ? -1 : 1;
  for (let i = 0; i < bodies.length; i++) {
    const me = bodies[i];
    if (me.fixed) continue;
    let ax = 0;
    let ay = 0;
    for (let j = 0; j < bodies.length; j++) {
      if (i === j) continue;
      const other = bodies[j];
      const dx = other.x - me.x;
      const dy = other.y - me.y;
      const d2 = dx * dx + dy * dy + opt.softening * opt.softening;
      const invD = 1 / Math.sqrt(d2);
      const force = forceSign * opt.gravity * other.mass / d2;
      ax += dx * invD * force;
      ay += dy * invD * force;
    }
    const b = next[i];
    b.vx = (b.vx + ax) * opt.damping;
    b.vy = (b.vy + ay) * opt.damping;
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > opt.maxSpeed) {
      b.vx = (b.vx / speed) * opt.maxSpeed;
      b.vy = (b.vy / speed) * opt.maxSpeed;
    }
    b.x += b.vx;
    b.y += b.vy;

    const pad = 8;
    if (b.x < pad || b.x > w - pad) {
      b.vx *= -1;
      b.x = Math.max(pad, Math.min(w - pad, b.x));
    }
    if (b.y < pad || b.y > h - pad) {
      b.vy *= -1;
      b.y = Math.max(pad, Math.min(h - pad, b.y));
    }
  }
  return next;
}

function stepBoids(boids, opt, w, h, mouse, explosion, shark) {
  const visionSq = opt.vision * opt.vision;
  const sepSq = (opt.vision * 0.55) * (opt.vision * 0.55);
  const maxNeighbors = 28;
  const next = boids.map((b) => ({ ...b }));

  for (let i = 0; i < boids.length; i++) {
    const me = boids[i];
    let cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0, n = 0;
    for (let j = 0; j < boids.length; j++) {
      if (i === j) continue;
      const o = boids[j];
      const dx = o.x - me.x;
      const dy = o.y - me.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > visionSq) continue;
      n++;
      cx += o.x;
      cy += o.y;
      ax += o.vx;
      ay += o.vy;
      if (d2 < sepSq && d2 > 0.0001) {
        sx -= dx / d2;
        sy -= dy / d2;
      }
      if (n >= maxNeighbors) break;
    }

    let fx = 0, fy = 0;
    if (n > 0) {
      cx /= n; cy /= n; ax /= n; ay /= n;
      fx += (cx - me.x) * opt.cohesion;
      fy += (cy - me.y) * opt.cohesion;
      fx += (ax - me.vx) * opt.alignment;
      fy += (ay - me.vy) * opt.alignment;
      fx += sx * opt.separation;
      fy += sy * opt.separation;
    }

    if (mouse && mouse.active) {
      const mdx = mouse.x - me.x;
      const mdy = mouse.y - me.y;
      const md2 = mdx * mdx + mdy * mdy;
      if (md2 < mouse.radius * mouse.radius && md2 > 0.0001) {
        const s = mouse.strength / Math.sqrt(md2);
        fx += mdx * s;
        fy += mdy * s;
      }
    }
    if (explosion && explosion.active) {
      const edx = me.x - explosion.x;
      const edy = me.y - explosion.y;
      const ed2 = edx * edx + edy * edy;
      if (ed2 < explosion.radius * explosion.radius && ed2 > 0.0001) {
        const ef = explosion.power * (1 - Math.sqrt(ed2) / explosion.radius);
        fx += (edx / Math.sqrt(ed2)) * ef;
        fy += (edy / Math.sqrt(ed2)) * ef;
      }
    }
    if (shark && shark.active) {
      const sdx = me.x - shark.x;
      const sdy = me.y - shark.y;
      const sd2 = sdx * sdx + sdy * sdy;
      if (sd2 < shark.fearRadius * shark.fearRadius && sd2 > 0.0001) {
        const sf = shark.fearStrength * (1 - Math.sqrt(sd2) / shark.fearRadius);
        fx += (sdx / Math.sqrt(sd2)) * sf;
        fy += (sdy / Math.sqrt(sd2)) * sf;
      }
    }

    fx += rand(-1, 1) * opt.randomness;
    fy += rand(-1, 1) * opt.randomness;
    const fmag = Math.hypot(fx, fy);
    if (fmag > opt.steer) {
      fx = (fx / fmag) * opt.steer;
      fy = (fy / fmag) * opt.steer;
    }

    const b = next[i];
    const prevA = Math.atan2(b.vy, b.vx);
    b.vx = (b.vx + fx) * opt.drag;
    b.vy = (b.vy + fy) * opt.drag;
    let speed = Math.hypot(b.vx, b.vy);
    if (speed > opt.maxSpeed) {
      b.vx = (b.vx / speed) * opt.maxSpeed;
      b.vy = (b.vy / speed) * opt.maxSpeed;
      speed = opt.maxSpeed;
    }
    if (speed < opt.minSpeed) {
      const a = Math.atan2(b.vy, b.vx) || rand(0, Math.PI * 2);
      b.vx = Math.cos(a) * opt.minSpeed;
      b.vy = Math.sin(a) * opt.minSpeed;
    }
    const nextA = Math.atan2(b.vy, b.vx);
    let da = nextA - prevA;
    if (da > Math.PI) da -= Math.PI * 2;
    if (da < -Math.PI) da += Math.PI * 2;
    b.turn = Math.abs(da);
    b.localDensity = n / maxNeighbors;

    b.x += b.vx;
    b.y += b.vy;
    if (opt.bounce) {
      if (b.x < 0 || b.x > w) { b.vx *= -1; b.x = Math.max(0, Math.min(w, b.x)); }
      if (b.y < 0 || b.y > h) { b.vy *= -1; b.y = Math.max(0, Math.min(h, b.y)); }
    } else {
      if (b.x < 0) b.x += w;
      if (b.x > w) b.x -= w;
      if (b.y < 0) b.y += h;
      if (b.y > h) b.y -= h;
    }
  }
  return next;
}

function drawBoidShape(ctx, shape) {
  if (shape === "shark") {
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(1, 4.8);
    ctx.lineTo(-6, 6);
    ctx.lineTo(-3.5, 1.8);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-3.5, -1.8);
    ctx.lineTo(-6, -6);
    ctx.lineTo(1, -4.8);
    ctx.closePath();
    ctx.fill();
    return;
  }
  if (shape === "dot") {
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  if (shape === "diamond") {
    ctx.moveTo(7, 0);
    ctx.lineTo(0, 4.5);
    ctx.lineTo(-6, 0);
    ctx.lineTo(0, -4.5);
  } else if (shape === "kite") {
    ctx.moveTo(8, 0);
    ctx.lineTo(-3, 5);
    ctx.lineTo(-7, 1.5);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-7, -1.5);
    ctx.lineTo(-3, -5);
  } else {
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, 4);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-6, -4);
  }
  ctx.closePath();
  ctx.fill();
}

function samplePalette(palette, t) {
  if (!palette || palette.length === 0) return null;
  const clamped = Math.max(0, Math.min(1, t));
  const idx = Math.round(clamped * (palette.length - 1));
  return palette[idx];
}

function hexToRgb(hex) {
  if (!hex) return null;
  if (hex[0] === "#" && hex.length >= 7) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  }
  const hslMatch = hex.match(/^hsl\(\s*([-\d.]+)\s*,\s*([-\d.]+)%\s*,\s*([-\d.]+)%\s*\)$/i);
  if (hslMatch) {
    const [, h, s, l] = hslMatch;
    return hslToRgb(Number(h), Number(s) / 100, Number(l) / 100);
  }
  return null;
}

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hue < 60) [r1, g1, b1] = [c, x, 0];
  else if (hue < 120) [r1, g1, b1] = [x, c, 0];
  else if (hue < 180) [r1, g1, b1] = [0, c, x];
  else if (hue < 240) [r1, g1, b1] = [0, x, c];
  else if (hue < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function sampleLangtonStateColors(rule, paletteColors) {
  const turns = sanitizeLangtonRule(rule);
  const palette = (paletteColors && paletteColors.length ? paletteColors : LANGTON_COLOR_FALLBACK).map((c) => hexToRgb(c) || hexToRgb("#38bdf8"));
  const out = [];
  for (let i = 0; i < turns.length; i++) {
    const color = palette[Math.round((i / Math.max(1, turns.length - 1)) * (palette.length - 1))];
    out.push(color);
  }
  return out;
}

function applyStructuredPreset(baseGrid, preset, centerRow, centerCol, modeId) {
  const next = baseGrid.map((row) => [...row]);
  const width = preset.width || 1;
  const height = preset.height || 1;
  const rowStart = centerRow - Math.floor(height / 2);
  const colStart = centerCol - Math.floor(width / 2);
  for (const cell of preset.cells || []) {
    const rr = rowStart + cell.y;
    const cc = colStart + cell.x;
    if (rr < 0 || rr >= GRID_ROWS || cc < 0 || cc >= GRID_COLS) continue;
    next[rr][cc] = modeId === "langton" ? cell.state : cell.state;
  }
  return {
    grid: next,
    ants: (preset.ants || []).map((ant) =>
      makeLangtonAnt(
        Math.max(0, Math.min(GRID_COLS - 1, colStart + Math.floor(width / 2) + ant.x)),
        Math.max(0, Math.min(GRID_ROWS - 1, rowStart + Math.floor(height / 2) + ant.y)),
        ant.dir,
        ant.color
      )
    ),
  };
}

function makeRandomWireworldGrid() {
  return Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => {
      const r = Math.random();
      if (r < 0.09) return WIRE_CONDUCTOR;
      if (r < 0.094) return WIRE_HEAD;
      if (r < 0.098) return WIRE_TAIL;
      return WIRE_EMPTY;
    })
  );
}

function makeRandomLangtonAnts(count) {
  return Array.from({ length: count }, (_, i) =>
    makeLangtonAnt(
      Math.floor(rand(0, GRID_COLS)),
      Math.floor(rand(0, GRID_ROWS)),
      Math.floor(rand(0, 4)),
      LANGTON_COLOR_FALLBACK[(i + 1) % LANGTON_COLOR_FALLBACK.length]
    )
  );
}

function deEnergizeWireworldGrid(grid) {
  return grid.map((row) =>
    row.map((cell) => {
      if (cell === WIRE_HEAD || cell === WIRE_TAIL) return WIRE_CONDUCTOR;
      return cell;
    })
  );
}

function makeSlimeAgents(count, w, h) {
  return Array.from({ length: count }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    a: rand(0, Math.PI * 2),
  }));
}

function makeSlimeAgentsAt(count, x, y, spread, w, h) {
  return Array.from({ length: count }, () => {
    const a = rand(0, Math.PI * 2);
    const d = rand(0, spread);
    return {
      x: Math.max(0, Math.min(w - 1, x + Math.cos(a) * d)),
      y: Math.max(0, Math.min(h - 1, y + Math.sin(a) * d)),
      a: rand(0, Math.PI * 2),
    };
  });
}

function makeTrailField(w, h) {
  return new Float32Array(w * h);
}

function trailAt(field, w, h, x, y) {
  const ix = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const iy = Math.max(0, Math.min(h - 1, Math.floor(y)));
  return field[iy * w + ix] || 0;
}

function walkableAt(mask, w, h, x, y) {
  if (!mask) return true;
  const ix = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const iy = Math.max(0, Math.min(h - 1, Math.floor(y)));
  return mask[iy * w + ix] === 1;
}

function advanceSlimeAgentInMaze(ag, speed, turn, mask, w, h) {
  const subSteps = Math.max(1, Math.ceil(speed / 0.6));
  const stepSize = speed / subSteps;
  for (let step = 0; step < subSteps; step++) {
    const forwardX = ag.x + Math.cos(ag.a) * stepSize;
    const forwardY = ag.y + Math.sin(ag.a) * stepSize;
    if (walkableAt(mask, w, h, forwardX, forwardY)) {
      ag.x = forwardX;
      ag.y = forwardY;
      continue;
    }

    let moved = false;
    const probes = [0.45, -0.45, 0.9, -0.9, 1.35, -1.35];
    for (const mul of probes) {
      const nextA = ag.a + turn * mul;
      const nx = ag.x + Math.cos(nextA) * stepSize;
      const ny = ag.y + Math.sin(nextA) * stepSize;
      if (!walkableAt(mask, w, h, nx, ny)) continue;
      ag.a = nextA;
      ag.x = nx;
      ag.y = ny;
      moved = true;
      break;
    }

    if (!moved) {
      ag.a += (Math.random() < 0.5 ? -1 : 1) * turn * 1.8;
      return;
    }
  }
}

function erodeWalkable(mask, w, h, radius) {
  if (radius <= 0) return mask;
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (mask[idx] !== 1) continue;
      let keep = 1;
      for (let oy = -radius; oy <= radius && keep; oy++) {
        for (let ox = -radius; ox <= radius; ox++) {
          const xx = x + ox;
          const yy = y + oy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) { keep = 0; break; }
          if (mask[yy * w + xx] !== 1) { keep = 0; break; }
        }
      }
      out[idx] = keep;
    }
  }
  return out;
}

function generateMazeWorld(w, h, cellSize = 7, wallThickness = 1) {
  const padX = 72;
  const padTop = 92;
  const padBottom = 150;
  const usableW = Math.max(180, w - padX * 2);
  const usableH = Math.max(180, h - padTop - padBottom);
  const gwRaw = Math.max(21, Math.floor(usableW / cellSize));
  const ghRaw = Math.max(21, Math.floor(usableH / cellSize));
  const gw = gwRaw % 2 === 0 ? gwRaw - 1 : gwRaw;
  const gh = ghRaw % 2 === 0 ? ghRaw - 1 : ghRaw;
  const mazePixW = gw * cellSize;
  const mazePixH = gh * cellSize;
  const ox = Math.floor((w - mazePixW) / 2);
  const oy = Math.floor(padTop + (usableH - mazePixH) / 2);

  const grid = new Uint8Array(gw * gh).fill(1);
  for (let y = 1; y < gh; y += 2) for (let x = 1; x < gw; x += 2) grid[y * gw + x] = 0;
  const cw = (gw - 1) / 2;
  const ch = (gh - 1) / 2;
  const vis = new Uint8Array(cw * ch);
  const stack = [[0, 0]];
  vis[0] = 1;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

  while (stack.length) {
    const top = stack[stack.length - 1];
    const cx = top[0];
    const cy = top[1];
    const ns = [];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
      if (!vis[ny * cw + nx]) ns.push([nx, ny, dx, dy]);
    }
    if (!ns.length) { stack.pop(); continue; }
    const pick = ns[Math.floor(Math.random() * ns.length)];
    const nx = pick[0], ny = pick[1], dx = pick[2], dy = pick[3];
    vis[ny * cw + nx] = 1;
    const gx = cx * 2 + 1, gy = cy * 2 + 1;
    const wx = gx + dx, wy = gy + dy;
    const tx = nx * 2 + 1, ty = ny * 2 + 1;
    grid[wy * gw + wx] = 0;
    grid[ty * gw + tx] = 0;
    stack.push([nx, ny]);
  }

  const entry = { x: 0, y: 1 };
  const exit = { x: gw - 1, y: gh - 2 };
  grid[entry.y * gw + entry.x] = 0;
  grid[entry.y * gw + 1] = 0;
  grid[exit.y * gw + exit.x] = 0;
  grid[exit.y * gw + (gw - 2)] = 0;

  const rawMask = new Uint8Array(w * h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const gx = Math.floor((px - ox) / cellSize);
      const gy = Math.floor((py - oy) / cellSize);
      if (gx >= 0 && gy >= 0 && gx < gw && gy < gh) {
        rawMask[py * w + px] = grid[gy * gw + gx] === 0 ? 1 : 0;
      } else {
        rawMask[py * w + px] = 0;
      }
    }
  }
  const maxThickness = Math.max(0, Math.floor((cellSize - 1) / 2));
  const effectiveWallThickness = Math.min(wallThickness, maxThickness);
  let mask = erodeWalkable(rawMask, w, h, effectiveWallThickness);
  let walkableCount = 0;
  for (let i = 0; i < mask.length; i++) walkableCount += mask[i];
  if (walkableCount === 0) {
    mask = erodeWalkable(rawMask, w, h, Math.max(0, effectiveWallThickness - 1));
  }

  const ex = Math.floor(ox + (entry.x + 0.5) * cellSize);
  const ey = Math.floor(oy + (entry.y + 0.5) * cellSize);
  const tx = Math.floor(ox + (exit.x + 0.5) * cellSize);
  const ty = Math.floor(oy + (exit.y + 0.5) * cellSize);
  const carveR = Math.max(2, effectiveWallThickness + 1);
  for (let y = -carveR; y <= carveR; y++) {
    for (let x = -carveR; x <= carveR; x++) {
      if (x * x + y * y > carveR * carveR) continue;
      const aX = ex + x, aY = ey + y;
      const bX = tx + x, bY = ty + y;
      if (aX >= 0 && aY >= 0 && aX < w && aY < h) mask[aY * w + aX] = 1;
      if (bX >= 0 && bY >= 0 && bX < w && bY < h) mask[bY * w + bX] = 1;
    }
  }

  return {
    mask,
    entryPx: { x: ox + (entry.x + 0.5) * cellSize, y: oy + (entry.y + 0.5) * cellSize },
    exitPx: { x: ox + (exit.x + 0.5) * cellSize, y: oy + (exit.y + 0.5) * cellSize },
  };
}

function generateUTestMazeWorld(w, h) {
  const mask = new Uint8Array(w * h);
  const setWalk = (x0, y0, x1, y1) => {
    const ax = Math.max(0, Math.min(w - 1, x0));
    const ay = Math.max(0, Math.min(h - 1, y0));
    const bx = Math.max(0, Math.min(w - 1, x1));
    const by = Math.max(0, Math.min(h - 1, y1));
    for (let y = ay; y <= by; y++) {
      for (let x = ax; x <= bx; x++) mask[y * w + x] = 1;
    }
  };

  const left = Math.floor(w * 0.18);
  const right = Math.floor(w * 0.82);
  const bottom = Math.floor(h * 0.72);
  const top = Math.floor(h * 0.26);
  const ch = Math.max(8, Math.floor(Math.min(w, h) * 0.015));

  // Bottom basin + right vertical shaft + top outlet.
  setWalk(left, bottom - ch, right - ch, bottom + ch);
  setWalk(right - ch, top, right + ch, bottom + ch);
  setWalk(right - ch, top - ch, Math.min(w - 1, right + Math.floor(w * 0.12)), top + ch);

  const entryPx = { x: left + ch + 2, y: bottom };
  const exitPx = { x: Math.min(w - 2, right + Math.floor(w * 0.1)), y: top };
  return { mask, entryPx, exitPx };
}

function findProbeCellNearExit(mask, w, h, exitPx) {
  if (!mask || !exitPx) return null;
  const cx = Math.max(0, Math.min(w - 1, Math.floor(exitPx.x)));
  const cy = Math.max(0, Math.min(h - 1, Math.floor(exitPx.y)));
  const maxR = 28;
  for (let r = 1; r <= maxR; r++) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (x <= 0 || y <= 0 || x >= w - 1 || y >= h - 1) continue;
        if (Math.abs(x - cx) !== r && Math.abs(y - cy) !== r) continue;
        const idx = y * w + x;
        const up = idx - w;
        if (mask[idx] === 1 && mask[up] === 1) return { x, y };
      }
    }
  }
  return null;
}

function findNearestWalkablePoint(mask, w, h, x, y, maxRadius = 18) {
  if (!mask) return null;
  const cx = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const cy = Math.max(0, Math.min(h - 1, Math.floor(y)));
  const centerIdx = cy * w + cx;
  if (mask[centerIdx] === 1) return { x: cx, y: cy };

  let best = null;
  let bestDist2 = Infinity;
  const rMax = Math.max(1, Math.floor(maxRadius));
  for (let r = 1; r <= rMax; r++) {
    for (let py = cy - r; py <= cy + r; py++) {
      if (py < 0 || py >= h) continue;
      for (let px = cx - r; px <= cx + r; px++) {
        if (px < 0 || px >= w) continue;
        if (Math.abs(px - cx) !== r && Math.abs(py - cy) !== r) continue;
        const idx = py * w + px;
        if (mask[idx] !== 1) continue;
        const dx = px - cx;
        const dy = py - cy;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < bestDist2) {
          bestDist2 = dist2;
          best = { x: px, y: py };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

function buildMazeFloodMeta(mask, w, h, entryPx, exitPx = null) {
  if (!mask || !entryPx) return null;
  const startX = Math.max(0, Math.min(w - 1, Math.floor(entryPx.x)));
  const startY = Math.max(0, Math.min(h - 1, Math.floor(entryPx.y)));
  const startIdx = startY * w + startX;
  if (mask[startIdx] !== 1) return null;

  const total = w * h;
  const inf = 1e15;
  const head = new Float32Array(total);
  const dist = new Float32Array(total);
  const arrival = new Float32Array(total);
  head.fill(inf);
  dist.fill(inf);
  arrival.fill(inf);

  const big = total + 1;
  const heap = [];
  const push = (node) => {
    heap.push(node);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p].score <= node.score) break;
      heap[i] = heap[p];
      i = p;
    }
    heap[i] = node;
  };
  const pop = () => {
    if (!heap.length) return null;
    const root = heap[0];
    const last = heap.pop();
    if (heap.length && last) {
      let i = 0;
      while (true) {
        let l = i * 2 + 1;
        let r = l + 1;
        if (l >= heap.length) break;
        let c = l;
        if (r < heap.length && heap[r].score < heap[l].score) c = r;
        if (last.score <= heap[c].score) break;
        heap[i] = heap[c];
        i = c;
      }
      heap[i] = last;
    }
    return root;
  };

  head[startIdx] = 0;
  dist[startIdx] = 0;
  push({ idx: startIdx, head: 0, dist: 0, score: 0 });

  while (heap.length) {
    const node = pop();
    if (!node) break;
    if (node.head !== head[node.idx] || node.dist !== dist[node.idx]) continue;

    const x = node.idx % w;
    const y = Math.floor(node.idx / w);
    const neighbors = [
      [x, y - 1],
      [x + 1, y],
      [x, y + 1],
      [x - 1, y],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (mask[ni] !== 1) continue;
      const nextHead = Math.max(node.head, Math.max(0, startY - ny));
      const nextDist = node.dist + 1;
      if (nextHead < head[ni] || (nextHead === head[ni] && nextDist < dist[ni])) {
        head[ni] = nextHead;
        dist[ni] = nextDist;
        push({ idx: ni, head: nextHead, dist: nextDist, score: nextHead * big + nextDist });
      }
    }
  }

  const riseWeight = Math.max(6, Math.round(Math.min(w, h) * 0.05));
  let maxArrival = 0;
  let reachableCount = 0;
  for (let i = 0; i < total; i++) {
    if (mask[i] !== 1 || !Number.isFinite(head[i]) || head[i] >= inf) continue;
    const cost = head[i] * riseWeight + dist[i];
    arrival[i] = cost;
    if (cost > maxArrival) maxArrival = cost;
    reachableCount += 1;
  }

  const wallDist = new Int16Array(total);
  wallDist.fill(-1);
  const queue = new Int32Array(total);
  let qh = 0;
  let qt = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (mask[idx] !== 1) continue;
      const neighbors = [
        [x, y - 1],
        [x + 1, y],
        [x, y + 1],
        [x - 1, y],
      ];
      let nearWall = false;
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
          nearWall = true;
          break;
        }
        if (mask[ny * w + nx] !== 1) {
          nearWall = true;
          break;
        }
      }
      if (nearWall) {
        wallDist[idx] = 1;
        queue[qt++] = idx;
      }
    }
  }
  while (qh < qt) {
    const idx = queue[qh++];
    const x = idx % w;
    const y = Math.floor(idx / w);
    const base = wallDist[idx];
    const neighbors = [
      [x, y - 1],
      [x + 1, y],
      [x, y + 1],
      [x - 1, y],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (mask[ni] !== 1 || wallDist[ni] !== -1) continue;
      wallDist[ni] = base + 1;
      queue[qt++] = ni;
    }
  }

  const pathMask = new Uint8Array(total);
  const pathFillMask = new Uint8Array(total);
  const pathOrder = [];
  const exitDist = new Int32Array(total);
  exitDist.fill(-1);
  let maxExitDist = 0;
  if (exitPx) {
    const exitX = Math.max(0, Math.min(w - 1, Math.floor(exitPx.x)));
    const exitY = Math.max(0, Math.min(h - 1, Math.floor(exitPx.y)));
    const exitIdx = exitY * w + exitX;
    if (mask[exitIdx] === 1 && Number.isFinite(arrival[exitIdx]) && arrival[exitIdx] < inf) {
      qh = 0;
      qt = 0;
      exitDist[exitIdx] = 0;
      queue[qt++] = exitIdx;
      while (qh < qt) {
        const idx = queue[qh++];
        const x = idx % w;
        const y = Math.floor(idx / w);
        const base = exitDist[idx];
        if (base > maxExitDist) maxExitDist = base;
        const neighbors = [
          [x, y - 1],
          [x + 1, y],
          [x, y + 1],
          [x - 1, y],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (mask[ni] !== 1 || exitDist[ni] !== -1) continue;
          if (!Number.isFinite(arrival[ni]) || arrival[ni] >= inf) continue;
          exitDist[ni] = base + 1;
          queue[qt++] = ni;
        }
      }

      let idx = exitIdx;
      pathMask[idx] = 1;
      pathOrder.push(idx);
      while (idx !== startIdx) {
        const x = idx % w;
        const y = Math.floor(idx / w);
        const score = arrival[idx];
        let bestIdx = -1;
        let bestScore = score;
        const neighbors = [
          [x, y - 1],
          [x + 1, y],
          [x, y + 1],
          [x - 1, y],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (mask[ni] !== 1) continue;
          const ns = arrival[ni];
          if (!Number.isFinite(ns) || ns >= inf) continue;
          const betterByDist = bestIdx === -1 || dist[ni] < dist[bestIdx];
          if (ns < bestScore || (ns === bestScore && betterByDist)) {
            bestScore = ns;
            bestIdx = ni;
          }
        }
        if (bestIdx === -1 || bestIdx === idx) break;
        idx = bestIdx;
        pathMask[idx] = 1;
        pathOrder.push(idx);
      }
    }
  }

  for (let i = 0; i < total; i++) {
    if (pathMask[i] !== 1) continue;
    const cx = i % w;
    const cy = Math.floor(i / w);
    const radius = Math.max(1, (wallDist[i] || 1) - 1);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (mask[ni] === 1) pathFillMask[ni] = 1;
      }
    }
  }

  return {
    arrival,
    head,
    dist,
    wallDist,
    riseWeight,
    maxArrival,
    reachableCount,
    exitDist,
    maxExitDist,
    pathMask,
    pathFillMask,
    pathOrder: pathOrder.reverse(),
  };
}

function stepSlime(agents, field, w, h, opt, scratchA, scratchB) {
  const deposited = scratchA;
  deposited.set(field);
  const sa = opt.sensorAngle;
  const sd = opt.mazeMask ? Math.min(opt.sensorDist, 8) : opt.sensorDist;
  const turn = opt.turnSpeed;

  for (let i = 0; i < agents.length; i++) {
    const ag = agents[i];
    const fx = ag.x + Math.cos(ag.a) * sd, fy = ag.y + Math.sin(ag.a) * sd;
    const lx = ag.x + Math.cos(ag.a - sa) * sd, ly = ag.y + Math.sin(ag.a - sa) * sd;
    const rx = ag.x + Math.cos(ag.a + sa) * sd, ry = ag.y + Math.sin(ag.a + sa) * sd;
    const f = walkableAt(opt.mazeMask, w, h, fx, fy) ? trailAt(deposited, w, h, fx, fy) : -1;
    const l = walkableAt(opt.mazeMask, w, h, lx, ly) ? trailAt(deposited, w, h, lx, ly) : -1;
    const r = walkableAt(opt.mazeMask, w, h, rx, ry) ? trailAt(deposited, w, h, rx, ry) : -1;
    if (f < l && f < r) ag.a += (Math.random() < 0.5 ? -1 : 1) * turn;
    else if (l > r) ag.a -= turn;
    else if (r > l) ag.a += turn;
    ag.a += rand(-1, 1) * opt.wiggle;

    if (opt.mazeMask) {
      advanceSlimeAgentInMaze(ag, opt.speed, turn, opt.mazeMask, w, h);
    } else {
      const nx = ag.x + Math.cos(ag.a) * opt.speed;
      const ny = ag.y + Math.sin(ag.a) * opt.speed;
      ag.x = nx;
      ag.y = ny;
      if (ag.x < 0) ag.x += w;
      if (ag.x >= w) ag.x -= w;
      if (ag.y < 0) ag.y += h;
      if (ag.y >= h) ag.y -= h;
    }

    const ix = Math.floor(ag.x);
    const iy = Math.floor(ag.y);
    if (!opt.mazeMask || walkableAt(opt.mazeMask, w, h, ag.x, ag.y)) {
      deposited[iy * w + ix] += opt.deposit;
    }
  }

  const out = scratchB;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      let n = 0;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const xx = (x + ox + w) % w;
          const yy = (y + oy + h) % h;
          s += deposited[yy * w + xx];
          n++;
        }
      }
      const idx = y * w + x;
      if (opt.mazeMask && opt.mazeMask[idx] !== 1) {
        out[idx] = 0;
        continue;
      }
      const blur = s / n;
      const mixed = deposited[idx] * (1 - opt.diffuse) + blur * opt.diffuse;
      out[idx] = mixed * opt.decay;
    }
  }
  return out;
}

function stepMazeFlow(field, w, h, opt, scratchA, scratchB) {
  const next = scratchA;
  next.fill(0);
  const mask = opt.mazeMask;
  const meta = opt.flowMeta;
  const cap = opt.maxValue ?? 1.35;
  const progress = opt.progress ?? 0;
  const fillSpan = opt.fillSpan ?? 10;
  const debugProbe = opt.debugProbe || null;
  const debugOut = opt.debugOut || null;

  if (!mask || !meta) {
    return next;
  }

  let nonZero = 0;
  let peak = 0;
  let unlocked = 0;
  let filled = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (mask[idx] !== 1) continue;
      const arrival = meta.arrival[idx];
      if (!Number.isFinite(arrival) || arrival > meta.maxArrival + fillSpan) continue;
      const delta = progress - arrival;
      if (delta <= 0) continue;
      unlocked += 1;
      const value = Math.min(cap, (delta / fillSpan) * cap);
      next[idx] = value;
      if (value > 0.0001) nonZero += 1;
      if (value > 0.05) filled += 1;
      if (value > peak) peak = value;

      if (debugProbe && debugOut && x === debugProbe.x && y === debugProbe.y) {
        debugOut.pressure = delta;
        debugOut.moveUp = value;
        debugOut.below = meta.head[idx];
        debugOut.above = arrival;
        debugOut.space = Math.max(0, fillSpan - delta);
      }
    }
  }

  if (debugOut) {
    debugOut.maxMoveUp = peak;
    debugOut.upTransfers = unlocked;
    debugOut.upVolume = filled;
    debugOut.nonZero = nonZero;
    debugOut.peak = peak;
  }
  return next;
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
  const [patternRotation, setPatternRotation] = useState(0);
  const [generation, setGeneration] = useState(0);
  const [sheet, setSheet] = useState(null); // "brush" | "patterns" | "rules" | "color" | null
  const [speedIdx, setSpeedIdx] = useState(2);

  const [colorPaletteId, setColorPaletteId] = useState("heat");
  const [zoom, setZoom] = useState(1);
  const [speedCollapsed, setSpeedCollapsed] = useState(true);
  const [zoomCollapsed, setZoomCollapsed] = useState(true);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [boidCount, setBoidCount] = useState(BOID_DEFAULTS.count);
  const [boidVision, setBoidVision] = useState(BOID_DEFAULTS.vision);
  const [boidSeparation, setBoidSeparation] = useState(BOID_DEFAULTS.separation);
  const [boidAlignment, setBoidAlignment] = useState(BOID_DEFAULTS.alignment);
  const [boidCohesion, setBoidCohesion] = useState(BOID_DEFAULTS.cohesion);
  const [boidSteer, setBoidSteer] = useState(BOID_DEFAULTS.steer);
  const [boidMinSpeed, setBoidMinSpeed] = useState(BOID_DEFAULTS.minSpeed);
  const [boidMaxSpeed, setBoidMaxSpeed] = useState(BOID_DEFAULTS.maxSpeed);
  const [boidDrag, setBoidDrag] = useState(BOID_DEFAULTS.drag);
  const [boidRandomness, setBoidRandomness] = useState(BOID_DEFAULTS.randomness);
  const [boidBounce, setBoidBounce] = useState(BOID_DEFAULTS.bounce);
  const [boidColorMode, setBoidColorMode] = useState("speed");
  const [boidShape, setBoidShape] = useState("dart");
  const [boidSpawnMode, setBoidSpawnMode] = useState(false);
  const [boidSpawnPopupOpen, setBoidSpawnPopupOpen] = useState(false);
  const [nbodyPreset, setNbodyPreset] = useState("solar");
  const [nbodyCount, setNbodyCount] = useState(NBODY_DEFAULTS.count);
  const [nbodyGravity, setNbodyGravity] = useState(NBODY_DEFAULTS.gravity);
  const [nbodyDamping, setNbodyDamping] = useState(NBODY_DEFAULTS.damping);
  const [nbodySoftening, setNbodySoftening] = useState(NBODY_DEFAULTS.softening);
  const [nbodyMaxSpeed, setNbodyMaxSpeed] = useState(NBODY_DEFAULTS.maxSpeed);
  const [nbodyRepel, setNbodyRepel] = useState(false);
  const [nbodyCentralBody, setNbodyCentralBody] = useState(true);
  const [nbodyOrbiterMass, setNbodyOrbiterMass] = useState(120);
  const [sharkEnabled, setSharkEnabled] = useState(true);
  const [slimeCount, setSlimeCount] = useState(9000);
  const [slimeSensorAngle, setSlimeSensorAngle] = useState(0.52);
  const [slimeSensorDist, setSlimeSensorDist] = useState(10);
  const [slimeTurnSpeed, setSlimeTurnSpeed] = useState(0.42);
  const [slimeSpeed, setSlimeSpeed] = useState(1.3);
  const [slimeDeposit, setSlimeDeposit] = useState(1.25);
  const [slimeDecay, setSlimeDecay] = useState(0.965);
  const [slimeDiffuse, setSlimeDiffuse] = useState(0.28);
  const [slimeWiggle, setSlimeWiggle] = useState(0.05);
  const [slimeMazeMode, setSlimeMazeMode] = useState(true);
  const [slimeMazeLevel, setSlimeMazeLevel] = useState("medium");
  const [slimeSolverType, setSlimeSolverType] = useState("flow");
  const [slimeEscaped, setSlimeEscaped] = useState(false);
  const [slimeFillPct, setSlimeFillPct] = useState(0);
  const [slimeCheckpointPct, setSlimeCheckpointPct] = useState(70);
  const [slimeRestartPct, setSlimeRestartPct] = useState(96);
  const [slimeAutoLoop, setSlimeAutoLoop] = useState(false);
  const [slimeCheckpointReady, setSlimeCheckpointReady] = useState(false);
  const [slimeDebugFlow, setSlimeDebugFlow] = useState(false);
  const [slimeDebugStats, setSlimeDebugStats] = useState({ pressure: 0, moveUp: 0, below: 0, above: 0, space: 0, nonZero: 0, peak: 0, maxMoveUp: 0, upTransfers: 0, upVolume: 0 });
  const [slimeAwaitingStart, setSlimeAwaitingStart] = useState(false);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [wireBrush, setWireBrush] = useState(WIRE_CONDUCTOR);
  const [wirePresetId, setWirePresetId] = useState("wireStraight");
  const [wireThemeId, setWireThemeId] = useState("classic");
  const [wireOrthogonalOnly, setWireOrthogonalOnly] = useState(false);
  const [wirePowerOff, setWirePowerOff] = useState(false);
  const [langtonRule, setLangtonRule] = useState(LANGTON_DEFAULT_RULE);
  const [langtonAntCount, setLangtonAntCount] = useState(1);
  const [langtonPresetId, setLangtonPresetId] = useState("antClassic");
  const [langtonShowDirections, setLangtonShowDirections] = useState(true);
  const [langtonShowTrails, setLangtonShowTrails] = useState(true);
  const [patternUndoCount, setPatternUndoCount] = useState(0);

  const SPEED_LABELS = ["½×", "1×", "2×", "4×"];
  const SPEED_FACTORS = [0.5, 1, 2, 4];
  const ZOOM_OPTIONS = [
    { label: "3×",   v: 3 },
    { label: "2×",   v: 2 },
    { label: "1×",   v: 1 },
    { label: "¾×",   v: 0.75 },
    { label: "½×",   v: 0.5 },
  ];

  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!patternBrush) return;
    const allowed = new Set((CATALOG[mode] || []).map((item) => item.key));
    if (!allowed.has(patternBrush)) setPatternBrush(null);
  }, [mode, patternBrush]);

  useEffect(() => {
    if (mode === "brian" && sheet === "rules") setSheet(null);
  }, [mode, sheet]);

  useEffect(() => () => {
    if (patternHoldRef.current.timer) clearTimeout(patternHoldRef.current.timer);
  }, []);

  const canvasRef = useRef(null);
  const gridRef = useRef(makeRandomGrid("brian"));
  const boidsRef = useRef(makeBoids(boidCount, GRID_COLS * CELL, GRID_ROWS * CELL, boidShape));
  const nbodyRef = useRef(makeNBodySystem(NBODY_DEFAULTS.count, GRID_COLS * CELL, GRID_ROWS * CELL));
  const langtonAntsRef = useRef([makeLangtonAnt(Math.floor(GRID_COLS / 2), Math.floor(GRID_ROWS / 2), 0)]);
  const langtonTrailsRef = useRef([]);
  const slimeAgentsRef = useRef([]);
  const slimeFieldRef = useRef(new Float32Array(0));
  const slimeSizeRef = useRef({ w: 0, h: 0 });
  const slimeScratchRef = useRef({ a: new Float32Array(0), b: new Float32Array(0) });
  const slimeImageRef = useRef({ w: 0, h: 0, image: null });
  const slimeMazeRef = useRef({ mask: null, entryPx: null, exitPx: null });
  const slimeFlowMetaRef = useRef(null);
  const slimeFlowProgressRef = useRef(0);
  const slimeFlowPhaseRef = useRef("flood");
  const slimeFlowReplayIndexRef = useRef(0);
  const nbodyTrailsRef = useRef([]);
  const slimeCheckpointRef = useRef(null);
  const slimeLoopCooldownRef = useRef(0);
  const slimeUiTickRef = useRef(0);
  const slimeFillRef = useRef(0);
  const flowProbeRef = useRef({ pressure: 0, space: 0, moveUp: 0, below: 0, above: 0 });
  const drawingRef = useRef(false);
  const brushUndoStrokeRef = useRef(false);
  const patternHoldRef = useRef({ timer: null, fired: false, x: 0, y: 0 });
  const patternPreviewRef = useRef({ active: false, x: 0, y: 0 });
  const patternUndoRef = useRef([]);
  const wirePowerSnapshotRef = useRef(null);
  const colorRef = useRef(null); // null = classic | colors array
  const zoomRef = useRef(1);    // mirror of zoom state for use inside closures
  const speedPressRef = useRef(null);
  const zoomPressRef = useRef(null);
  const boidSpawnTraceRef = useRef({ x: null, y: null });
  const boidSpawnHoldRef = useRef({ timer: null, x: 0, y: 0 });
  const nbodySpawnHoldRef = useRef({ timer: null, x: 0, y: 0 });
  const mouseRef = useRef({ active: false, x: 0, y: 0, strength: 0, radius: 120 });
  const explosionRef = useRef({ active: false, x: 0, y: 0, radius: 0, power: 0, ttl: 0 });
  const sharkRef = useRef({ active: true, x: 180, y: 180, vx: 1.9, vy: 0.4, fearRadius: 150, fearStrength: 1.2 });

  const LIFE_SPEEDS = [240, 90, 45, 22];
  const BOID_SPEEDS = [60, 24, 12, 6];
  const FLOW_SPEEDS = [24, 12, 8, 5];
  const NBODY_SPEEDS = [60, 24, 12, 6];
  const tickMs = mode === "boids"
    ? BOID_SPEEDS[speedIdx]
    : (mode === "slime" && slimeSolverType === "flow")
      ? FLOW_SPEEDS[speedIdx]
      : mode === "nbody"
          ? NBODY_SPEEDS[speedIdx]
        : LIFE_SPEEDS[speedIdx];
  const speedFactor = SPEED_FACTORS[speedIdx] || 1;

  function resetSlimeWorld(randomMaze = slimeMazeMode) {
    const cv = canvasRef.current;
    const w = cv?.width || GRID_COLS * CELL;
    const h = cv?.height || GRID_ROWS * CELL;
    slimeSizeRef.current = { w, h };
    slimeFieldRef.current = makeTrailField(w, h);
    slimeScratchRef.current = { a: new Float32Array(w * h), b: new Float32Array(w * h) };
    slimeImageRef.current = { w: 0, h: 0, image: null };
    if (randomMaze) {
      const cfg = SLIME_MAZE_LEVELS[slimeMazeLevel] ?? SLIME_MAZE_LEVELS.medium;
      const maze = generateMazeWorld(w, h, cfg.cellSize, cfg.wallThickness);
      slimeMazeRef.current = maze;
      slimeFlowMetaRef.current = buildMazeFloodMeta(maze.mask, w, h, maze.entryPx, maze.exitPx);
      slimeFlowProgressRef.current = 0;
      slimeFlowPhaseRef.current = "flood";
      slimeFlowReplayIndexRef.current = 0;
      slimeAgentsRef.current = makeSlimeAgentsAt(slimeCount, maze.entryPx.x, maze.entryPx.y, 10, w, h);
      setSlimeAwaitingStart(true);
      setRunning(false);
    } else {
      slimeMazeRef.current = { mask: null, entryPx: null, exitPx: null };
      slimeFlowMetaRef.current = null;
      slimeFlowProgressRef.current = 0;
      slimeFlowPhaseRef.current = "flood";
      slimeFlowReplayIndexRef.current = 0;
      slimeAgentsRef.current = makeSlimeAgents(slimeCount, w, h);
      setSlimeAwaitingStart(false);
    }
    setSlimeEscaped(false);
    setSlimeFillPct(0);
    slimeCheckpointRef.current = null;
    setSlimeCheckpointReady(false);
    slimeLoopCooldownRef.current = 0;
  }

  function loadUTestMaze() {
    const cv = canvasRef.current;
    const w = cv?.width || GRID_COLS * CELL;
    const h = cv?.height || GRID_ROWS * CELL;
    slimeSizeRef.current = { w, h };
    slimeFieldRef.current = makeTrailField(w, h);
    slimeScratchRef.current = { a: new Float32Array(w * h), b: new Float32Array(w * h) };
    const maze = generateUTestMazeWorld(w, h);
    slimeMazeRef.current = maze;
    slimeFlowMetaRef.current = buildMazeFloodMeta(maze.mask, w, h, maze.entryPx, maze.exitPx);
    slimeFlowProgressRef.current = 0;
    slimeFlowPhaseRef.current = "flood";
    slimeFlowReplayIndexRef.current = 0;
    slimeAgentsRef.current = makeSlimeAgentsAt(slimeCount, maze.entryPx.x, maze.entryPx.y, 8, w, h);
    setSlimeMazeMode(true);
    setSlimeSolverType("flow");
    setSlimeAwaitingStart(true);
    setRunning(false);
    setSlimeEscaped(false);
    setSlimeFillPct(0);
    slimeFillRef.current = 0;
    slimeCheckpointRef.current = null;
    setSlimeCheckpointReady(false);
    slimeLoopCooldownRef.current = 0;
    draw(gridRef.current);
  }

  function placeSlimeStart(x, y) {
    const cv = canvasRef.current;
    const w = cv?.width || GRID_COLS * CELL;
    const h = cv?.height || GRID_ROWS * CELL;
    const maze = slimeMazeRef.current;
    const mask = maze?.mask;
    if (!maze || !mask) return false;
    const snapped = findNearestWalkablePoint(mask, w, h, x, y, 18);
    if (!snapped) return false;
    const entryPx = { x: snapped.x, y: snapped.y };
    slimeMazeRef.current = { ...maze, entryPx };
    slimeFlowMetaRef.current = buildMazeFloodMeta(mask, w, h, entryPx, maze.exitPx);
    slimeFlowProgressRef.current = 0;
    slimeFlowPhaseRef.current = "flood";
    slimeFlowReplayIndexRef.current = 0;
    slimeFieldRef.current = makeTrailField(w, h);
    slimeScratchRef.current = { a: new Float32Array(w * h), b: new Float32Array(w * h) };
    slimeImageRef.current = { w: 0, h: 0, image: null };
    slimeAgentsRef.current = makeSlimeAgentsAt(slimeCount, entryPx.x, entryPx.y, 8, w, h);
    setSlimeEscaped(false);
    setSlimeFillPct(0);
    slimeFillRef.current = 0;
    setSlimeAwaitingStart(true);
    return true;
  }

  function clearSlimeCurrentMazePaths() {
    const cv = canvasRef.current;
    const w = cv?.width || GRID_COLS * CELL;
    const h = cv?.height || GRID_ROWS * CELL;
    slimeSizeRef.current = { w, h };
    slimeFieldRef.current = makeTrailField(w, h);
    slimeScratchRef.current = { a: new Float32Array(w * h), b: new Float32Array(w * h) };
    slimeImageRef.current = { w: 0, h: 0, image: null };
    slimeFlowProgressRef.current = 0;
    slimeFlowPhaseRef.current = "flood";
    slimeFlowReplayIndexRef.current = 0;
    const maze = slimeMazeRef.current;
    if (slimeMazeMode && maze?.entryPx) {
      slimeAgentsRef.current = makeSlimeAgentsAt(slimeCount, maze.entryPx.x, maze.entryPx.y, 8, w, h);
    } else {
      slimeAgentsRef.current = makeSlimeAgents(slimeCount, w, h);
    }
    setSlimeEscaped(false);
    setSlimeFillPct(0);
    slimeFillRef.current = 0;
  }

  function saveSlimeCheckpointNow() {
    slimeCheckpointRef.current = {
      field: new Float32Array(slimeFieldRef.current),
      agents: slimeAgentsRef.current.map((a) => ({ ...a })),
      escaped: slimeEscaped,
      flowProgress: slimeFlowProgressRef.current,
    };
    setSlimeCheckpointReady(true);
  }

  function getPatternPreviewRows() {
    if (!patternBrush) return null;
    if (PRESET_LIBRARY[patternBrush]) {
      const preset = PRESET_LIBRARY[patternBrush];
      const width = preset.width || 1;
      const height = preset.height || 1;
      const rows = Array.from({ length: height }, () => Array(width).fill(0));
      for (const cell of preset.cells || []) {
        if (rows[cell.y] && rows[cell.y][cell.x] != null) rows[cell.y][cell.x] = cell.state;
      }
      return rows;
    }
    return rotatePattern(PATTERNS[patternBrush], patternRotation);
  }

  function replaySlimeCheckpoint() {
    const cp = slimeCheckpointRef.current;
    if (!cp) return;
    slimeFieldRef.current = new Float32Array(cp.field);
    slimeAgentsRef.current = cp.agents.map((a) => ({ ...a }));
    slimeFlowProgressRef.current = cp.flowProgress ?? slimeFlowProgressRef.current;
    setSlimeEscaped(cp.escaped);
    slimeLoopCooldownRef.current = 24;
    draw(gridRef.current);
  }

  function draw(g) {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const drawPatternPreview = () => {
      if (!patternPreviewRef.current.active || !patternBrush) return;
      const rect = cv.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const rows = getPatternPreviewRows();
      if (!rows) return;
      const sx = cv.width / rect.width;
      const sy = cv.height / rect.height;
      const localX = (patternPreviewRef.current.x - rect.left) * sx;
      const localY = (patternPreviewRef.current.y - rect.top) * sy;
      const { visRows, visCols } = getViewport(zoomRef.current);
      const vcol = Math.floor(localX / CELL);
      const vrow = Math.floor(localY / CELL);
      const cols = Math.max(...rows.map((row) => row.length));
      const startCol = vcol - Math.floor(cols / 2);
      const startRow = vrow - Math.floor(rows.length / 2);

      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols; c++) {
          const state = rows[r][c] || 0;
          if (state === 0) continue;
          const dc = startCol + c;
          const dr = startRow + r;
          if (dc < 0 || dr < 0 || dc >= visCols || dr >= visRows) continue;
          let fill = "rgba(148,163,184,0.35)";
          if (mode === "wireworld") {
            const wireTheme = WIREWORLD_THEMES.find((theme) => theme.id === wireThemeId) || WIREWORLD_THEMES[0];
            fill =
              state === WIRE_CONDUCTOR ? `${wireTheme.colors.conductor}88` :
              state === WIRE_HEAD ? `${wireTheme.colors.head}88` :
              `${wireTheme.colors.tail}88`;
          } else if (mode === "langton") {
            fill = state === 0 ? "transparent" : "rgba(236,72,153,0.38)";
          } else {
            fill = state === ON ? "rgba(56,189,248,0.38)" : state === DYING ? "rgba(124,58,237,0.38)" : "rgba(255,255,255,0.18)";
          }
          ctx.fillStyle = fill;
          ctx.fillRect(dc * CELL, dr * CELL, CELL - 1, CELL - 1);
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.strokeRect(dc * CELL + 0.5, dr * CELL + 0.5, CELL - 2, CELL - 2);
        }
      }
    };
    if (mode === "wireworld") {
      const wireTheme = WIREWORLD_THEMES.find((theme) => theme.id === wireThemeId) || WIREWORLD_THEMES[0];
      const { visRows, visCols, rowOff, colOff } = getViewport(zoomRef.current);
      ctx.fillStyle = wireTheme.colors.empty;
      ctx.fillRect(0, 0, cv.width, cv.height);
      for (let r = 0; r < visRows; r++) {
        for (let c = 0; c < visCols; c++) {
          const gr = r + rowOff;
          const gc = c + colOff;
          const s = g[gr][gc];
          if (s === WIRE_EMPTY) continue;
          ctx.fillStyle =
            s === WIRE_CONDUCTOR ? wireTheme.colors.conductor :
            s === WIRE_HEAD ? wireTheme.colors.head :
            wireTheme.colors.tail;
          ctx.fillRect(c * CELL, r * CELL, CELL - 1, CELL - 1);
        }
      }
      drawPatternPreview();
      return;
    }
    if (mode === "langton") {
      const { visRows, visCols, rowOff, colOff } = getViewport(zoomRef.current);
      const stateColors = sampleLangtonStateColors(langtonRule, colorRef.current);
      ctx.fillStyle = "#050816";
      ctx.fillRect(0, 0, cv.width, cv.height);
      for (let r = 0; r < visRows; r++) {
        for (let c = 0; c < visCols; c++) {
          const gr = r + rowOff;
          const gc = c + colOff;
          const s = g[gr][gc];
          if (s === 0) continue;
          const color = stateColors[s % stateColors.length] || hexToRgb("#38bdf8");
          ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
          ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        }
      }
      if (langtonShowTrails) {
        for (const trail of langtonTrailsRef.current) {
          if (!trail || trail.length < 2) continue;
          for (let i = 1; i < trail.length; i++) {
            const prev = trail[i - 1];
            const curr = trail[i];
            if (
              prev.y < rowOff || prev.y >= rowOff + visRows || prev.x < colOff || prev.x >= colOff + visCols ||
              curr.y < rowOff || curr.y >= rowOff + visRows || curr.x < colOff || curr.x >= colOff + visCols
            ) continue;
            const alpha = i / trail.length;
            const rgb = hexToRgb(curr.color || "#f8fafc") || hexToRgb("#f8fafc");
            ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${(alpha * 0.5).toFixed(3)})`;
            ctx.lineWidth = Math.max(1, CELL * 0.35);
            ctx.beginPath();
            ctx.moveTo((prev.x - colOff + 0.5) * CELL, (prev.y - rowOff + 0.5) * CELL);
            ctx.lineTo((curr.x - colOff + 0.5) * CELL, (curr.y - rowOff + 0.5) * CELL);
            ctx.stroke();
          }
        }
      }
      for (const ant of langtonAntsRef.current) {
        if (ant.y < rowOff || ant.y >= rowOff + visRows || ant.x < colOff || ant.x >= colOff + visCols) continue;
        const px = (ant.x - colOff) * CELL;
        const py = (ant.y - rowOff) * CELL;
        const rgb = hexToRgb(ant.color || "#f8fafc") || hexToRgb("#f8fafc");
        ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        ctx.fillRect(px, py, CELL, CELL);
        if (langtonShowDirections) {
          ctx.strokeStyle = "rgba(15,23,42,0.9)";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          const cx = px + CELL / 2;
          const cy = py + CELL / 2;
          ctx.moveTo(cx, cy);
          if (ant.dir === 0) ctx.lineTo(cx, py + 1);
          else if (ant.dir === 1) ctx.lineTo(px + CELL - 1, cy);
          else if (ant.dir === 2) ctx.lineTo(cx, py + CELL - 1);
          else ctx.lineTo(px + 1, cy);
          ctx.stroke();
        }
      }
      drawPatternPreview();
      return;
    }
    if (mode === "boids") {
      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, cv.width, cv.height);
      for (const b of boidsRef.current) {
        const a = Math.atan2(b.vy, b.vx);
        const speed = Math.hypot(b.vx, b.vy);
        let fill = "#38bdf8";
        if (boidColorMode === "speed") {
          const t = Math.min(1, Math.max(0, (speed - boidMinSpeed) / Math.max(0.001, boidMaxSpeed - boidMinSpeed)));
          fill = samplePalette(colorRef.current, t) || `hsl(${210 - t * 210} 95% 58%)`;
        } else if (boidColorMode === "density") {
          const t = Math.min(1, Math.max(0, b.localDensity || 0));
          fill = samplePalette(colorRef.current, t) || `hsl(${200 - t * 150} 90% ${60 - t * 18}%)`;
        } else if (boidColorMode === "turn") {
          const t = Math.min(1, (b.turn || 0) / 0.35);
          fill = samplePalette(colorRef.current, t) || `hsl(${190 + t * 120} 90% ${58 - t * 10}%)`;
        } else {
          fill = samplePalette(colorRef.current, 0.45) || "#38bdf8";
        }
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(a);
        ctx.fillStyle = fill;
        drawBoidShape(ctx, b.shape || "dart");
        ctx.restore();
      }
      if (sharkEnabled && sharkRef.current.active) {
        const s = sharkRef.current;
        const a = Math.atan2(s.vy, s.vx);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(a);
        ctx.fillStyle = "#e2e8f0";
        drawBoidShape(ctx, "shark");
        ctx.restore();
      }
      return;
    }
    if (mode === "nbody") {
      const bg = ctx.createRadialGradient(
        cv.width * 0.52,
        cv.height * 0.48,
        Math.min(cv.width, cv.height) * 0.08,
        cv.width * 0.5,
        cv.height * 0.5,
        Math.max(cv.width, cv.height) * 0.78
      );
      bg.addColorStop(0, "#13203f");
      bg.addColorStop(0.35, "#0c1630");
      bg.addColorStop(0.72, "#08101f");
      bg.addColorStop(1, "#040816");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cv.width, cv.height);

      const hazeA = ctx.createRadialGradient(cv.width * 0.22, cv.height * 0.24, 0, cv.width * 0.22, cv.height * 0.24, cv.width * 0.28);
      hazeA.addColorStop(0, "rgba(56,189,248,0.14)");
      hazeA.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = hazeA;
      ctx.fillRect(0, 0, cv.width, cv.height);

      const hazeB = ctx.createRadialGradient(cv.width * 0.78, cv.height * 0.74, 0, cv.width * 0.78, cv.height * 0.74, cv.width * 0.24);
      hazeB.addColorStop(0, "rgba(168,85,247,0.12)");
      hazeB.addColorStop(1, "rgba(168,85,247,0)");
      ctx.fillStyle = hazeB;
      ctx.fillRect(0, 0, cv.width, cv.height);

      const trails = nbodyTrailsRef.current;
      for (let i = 0; i < trails.length; i++) {
        const points = trails[i];
        if (!points || points.length < 2) continue;
        for (let j = 1; j < points.length; j++) {
          const prev = points[j - 1];
          const curr = points[j];
          const fade = j / points.length;
          ctx.beginPath();
          ctx.strokeStyle = curr.color.replace("__ALPHA__", `${(fade * 0.45).toFixed(3)}`);
          ctx.lineWidth = 1.5;
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.stroke();
        }
      }
      for (let i = 0; i < nbodyRef.current.length; i++) {
        const body = nbodyRef.current[i];
        const speed = Math.hypot(body.vx, body.vy);
        const t = Math.min(1, speed / Math.max(0.001, nbodyMaxSpeed));
        const fill = samplePalette(colorRef.current, t) || `hsl(${210 - t * 200} 90% ${68 - t * 20}%)`;
        ctx.beginPath();
        ctx.fillStyle = body.fixed ? "#f8fafc" : fill;
        ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (mode === "slime") {
      const w = cv.width;
      const h = cv.height;
      if (slimeSizeRef.current.w !== w || slimeSizeRef.current.h !== h || slimeFieldRef.current.length !== w * h) {
        resetSlimeWorld(slimeMazeMode);
      }
      if (!slimeImageRef.current.image || slimeImageRef.current.w !== w || slimeImageRef.current.h !== h) {
        slimeImageRef.current = { w, h, image: ctx.createImageData(w, h) };
      }
      const img = slimeImageRef.current.image;
      const src = slimeFieldRef.current;
      const mazeMask = slimeMazeRef.current.mask;
      const flowMeta = slimeFlowMetaRef.current;
      const solvedPathMask = slimeEscaped && slimeSolverType === "flow" ? slimeFlowMetaRef.current?.pathFillMask : null;
      const paletteRgb = (colorRef.current || []).map(hexToRgb);
      for (let i = 0; i < src.length; i++) {
        if (mazeMask && mazeMask[i] !== 1) {
          img.data[i * 4] = 34;
          img.data[i * 4 + 1] = 38;
          img.data[i * 4 + 2] = 48;
          img.data[i * 4 + 3] = 255;
          continue;
        }
        const tScale = slimeSolverType === "flow" ? 1.2 : 6.5;
        const t = Math.min(1, src[i] / tScale);
        const p = i * 4;
        if (slimeSolverType === "flow" && flowMeta?.exitDist) {
          const raw = flowMeta.exitDist[i];
          const goalT = raw >= 0 && flowMeta.maxExitDist > 0
            ? 1 - Math.min(1, raw / flowMeta.maxExitDist)
            : 0;
          const paletteIdx = Math.round(goalT * Math.max(0, paletteRgb.length - 1));
          const paletteColor = paletteRgb[paletteIdx] || null;
          if (paletteColor) {
            const brighten = solvedPathMask && solvedPathMask[i] === 1 ? 34 : 0;
            const blend = 0.3 + t * 0.7;
            img.data[p] = Math.min(255, Math.round(paletteColor.r * blend + brighten));
            img.data[p + 1] = Math.min(255, Math.round(paletteColor.g * blend + brighten));
            img.data[p + 2] = Math.min(255, Math.round(paletteColor.b * blend + brighten));
          } else {
            const hue = 200 - goalT * 200;
            const sat = 85 + goalT * 10;
            let light = 50 + t * 10 + goalT * 2;
            if (solvedPathMask && solvedPathMask[i] === 1) light += 8;
            const rgb = hslToRgb(hue, sat / 100, Math.min(0.72, light / 100));
            img.data[p] = rgb.r;
            img.data[p + 1] = rgb.g;
            img.data[p + 2] = rgb.b;
          }
        } else {
          const pIdx = Math.round(Math.max(0, Math.min(1, t)) * Math.max(0, paletteRgb.length - 1));
          const c = paletteRgb[pIdx] || null;
          if (c) {
            img.data[p] = c.r;
            img.data[p + 1] = c.g;
            img.data[p + 2] = c.b;
          } else {
            img.data[p] = 15;
            img.data[p + 1] = Math.floor(220 * t);
            img.data[p + 2] = Math.floor(255 * t);
          }
        }
        img.data[p + 3] = Math.min(255, Math.floor(30 + t * 225));
      }
      ctx.putImageData(img, 0, 0);
      if (slimeMazeMode && slimeMazeRef.current.entryPx) {
        const sx = slimeMazeRef.current.entryPx.x;
        const sy = slimeMazeRef.current.entryPx.y;
        ctx.fillStyle = slimeAwaitingStart ? "#34d399" : "#86efac";
        ctx.beginPath();
        ctx.arc(sx, sy, slimeAwaitingStart ? 6 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = slimeAwaitingStart ? "rgba(16,185,129,0.85)" : "rgba(134,239,172,0.8)";
        ctx.stroke();
      }
      if (slimeMazeMode && slimeMazeRef.current.exitPx) {
        const ex = slimeMazeRef.current.exitPx.x;
        const ey = slimeMazeRef.current.exitPx.y;
        ctx.fillStyle = slimeEscaped ? "#22c55e" : "#f59e0b";
        ctx.beginPath();
        ctx.arc(ex, ey, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (slimeDebugFlow && slimeSolverType === "flow" && slimeMazeMode) {
        const p = flowProbeRef.current;
        ctx.fillStyle = "rgba(15,23,42,0.75)";
        ctx.fillRect(10, 10, 270, 64);
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "12px ui-monospace, Menlo, monospace";
        ctx.fillText(`probe pressure: ${p.pressure.toFixed(2)}  moveUp: ${p.moveUp.toFixed(2)}`, 16, 32);
        ctx.fillText(`below: ${p.below.toFixed(2)}  above: ${p.above.toFixed(2)}  space: ${p.space.toFixed(2)}`, 16, 50);
      }
      return;
    }
    const { visRows, visCols, rowOff, colOff } = getViewport(zoomRef.current);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, cv.width, cv.height);
    for (let r = 0; r < visRows; r++) {
      for (let c = 0; c < visCols; c++) {
        const gr = r + rowOff, gc = c + colOff;
        const s = g[gr][gc];
        if (s === ON) ctx.fillStyle = colorRef.current ? colorRef.current[countOn(g, gr, gc)] : "#38bdf8";
        else if (s === DYING) ctx.fillStyle = "#7c3aed";
        else continue;
        ctx.fillRect(c * CELL, r * CELL, CELL - 1, CELL - 1);
      }
    }
    drawPatternPreview();
  }

  useEffect(() => {
    draw(gridRef.current);
    const t = setInterval(() => {
      if (!running) return;
      const subSteps = 1;
      for (let step = 0; step < subSteps; step++) {
        if (mode === "boids") {
          const cv = canvasRef.current;
          if (!cv) return;
          if (sharkEnabled) {
            sharkRef.current.active = true;
            sharkRef.current.x += sharkRef.current.vx;
            sharkRef.current.y += sharkRef.current.vy;
            if (sharkRef.current.x < 0 || sharkRef.current.x > cv.width) {
              sharkRef.current.vx *= -1;
              sharkRef.current.x = Math.max(0, Math.min(cv.width, sharkRef.current.x));
            }
            if (sharkRef.current.y < 0 || sharkRef.current.y > cv.height) {
              sharkRef.current.vy *= -1;
              sharkRef.current.y = Math.max(0, Math.min(cv.height, sharkRef.current.y));
            }
            sharkRef.current.vx += rand(-0.06, 0.06);
            sharkRef.current.vy += rand(-0.06, 0.06);
            const sm = Math.hypot(sharkRef.current.vx, sharkRef.current.vy) || 1;
            const target = 2.4;
            sharkRef.current.vx = (sharkRef.current.vx / sm) * target;
            sharkRef.current.vy = (sharkRef.current.vy / sm) * target;
          } else {
            sharkRef.current.active = false;
          }
          if (explosionRef.current.active) {
            explosionRef.current.ttl -= 1;
            explosionRef.current.radius *= 0.95;
            explosionRef.current.power *= 0.92;
            if (explosionRef.current.ttl <= 0 || explosionRef.current.power < 0.03) {
              explosionRef.current.active = false;
            }
          }
          boidsRef.current = stepBoids(
            boidsRef.current,
            {
              separation: boidSeparation,
              alignment: boidAlignment,
              cohesion: boidCohesion,
              steer: boidSteer,
              vision: boidVision,
              minSpeed: boidMinSpeed,
              maxSpeed: boidMaxSpeed,
              drag: boidDrag,
              randomness: boidRandomness,
              bounce: boidBounce,
            },
            cv.width,
            cv.height,
            mouseRef.current,
            explosionRef.current,
            sharkRef.current
          );
        } else if (mode === "nbody") {
          const cv = canvasRef.current;
          if (!cv) return;
          nbodyRef.current = stepNBodies(nbodyRef.current, {
            gravity: nbodyGravity,
            damping: nbodyDamping,
            softening: nbodySoftening,
            maxSpeed: nbodyMaxSpeed,
            repel: nbodyRepel,
          }, cv.width, cv.height);
          const palette = colorRef.current;
          nbodyTrailsRef.current = nbodyRef.current.map((body, i) => {
            const prev = nbodyTrailsRef.current[i] || [];
            const speed = Math.hypot(body.vx, body.vy);
            const t = Math.min(1, speed / Math.max(0.001, nbodyMaxSpeed));
            const swatch = samplePalette(palette, t);
            const rgb = hexToRgb(swatch || "#38bdf8");
            const color = body.fixed
              ? "rgba(248,250,252,__ALPHA__)"
              : `rgba(${rgb?.r ?? 56},${rgb?.g ?? 189},${rgb?.b ?? 248},__ALPHA__)`;
            return [...prev.slice(-22), { x: body.x, y: body.y, color }];
          });
        } else if (mode === "slime") {
          const cv = canvasRef.current;
          if (!cv) return;
          const w = cv.width;
          const h = cv.height;
          if (slimeSizeRef.current.w !== w || slimeSizeRef.current.h !== h || slimeFieldRef.current.length !== w * h) {
            resetSlimeWorld(slimeMazeMode);
          }
          const mazeMask = slimeMazeMode ? slimeMazeRef.current.mask : null;
          if (slimeMazeMode && slimeSolverType === "flow") {
            if (slimeFlowPhaseRef.current === "flood") {
              const flowMeta = slimeFlowMetaRef.current;
              const flowIters = Math.max(1, Math.round(2 * speedFactor));
              const progressStep = 2.2;
              if (slimeDebugFlow) {
                flowProbeRef.current.pressure = 0;
                flowProbeRef.current.moveUp = 0;
                flowProbeRef.current.below = 0;
                flowProbeRef.current.above = 0;
                flowProbeRef.current.space = 0;
                flowProbeRef.current.maxMoveUp = 0;
                flowProbeRef.current.upTransfers = 0;
                flowProbeRef.current.upVolume = 0;
                flowProbeRef.current.nonZero = 0;
                flowProbeRef.current.peak = 0;
              }
              const probe = findProbeCellNearExit(mazeMask, w, h, slimeMazeRef.current.exitPx);
              for (let fi = 0; fi < flowIters; fi++) {
                slimeFlowProgressRef.current += progressStep;
                if (slimeDebugFlow && fi === 0 && probe) {
                  flowProbeRef.current.x = probe.x;
                  flowProbeRef.current.y = probe.y;
                }
                slimeFieldRef.current = stepMazeFlow(slimeFieldRef.current, w, h, {
                  mazeMask,
                  flowMeta,
                  progress: slimeFlowProgressRef.current,
                  maxValue: 1.2,
                  fillSpan: 12,
                  debugProbe: slimeDebugFlow ? probe : null,
                  debugOut: slimeDebugFlow ? flowProbeRef.current : null,
                }, slimeScratchRef.current.a, slimeScratchRef.current.b);
              }
              if (slimeDebugFlow) {
                setSlimeDebugStats({
                  pressure: flowProbeRef.current.pressure || slimeFlowProgressRef.current,
                  moveUp: flowProbeRef.current.moveUp || 0,
                  below: flowProbeRef.current.below || 0,
                  above: flowProbeRef.current.above || 0,
                  space: flowProbeRef.current.space || 0,
                  nonZero: flowProbeRef.current.nonZero || 0,
                  peak: flowProbeRef.current.peak || 0,
                  maxMoveUp: flowProbeRef.current.maxMoveUp || 0,
                  upTransfers: flowProbeRef.current.upTransfers || 0,
                  upVolume: flowProbeRef.current.upVolume || 0,
                });
              }
            } else if (slimeFlowPhaseRef.current === "replay") {
              const meta = slimeFlowMetaRef.current;
              const field = slimeFieldRef.current;
              const replayTicks = Math.max(1, Math.round(PATH_REPLAY_DURATION_MS / Math.max(1, tickMs) / speedFactor));
              const replayBatch = Math.max(1, Math.ceil((meta?.pathOrder?.length || 1) / replayTicks));
              for (let k = 0; k < replayBatch; k++) {
                const pi = slimeFlowReplayIndexRef.current++;
                if (!meta?.pathOrder || pi >= meta.pathOrder.length) break;
                const idx = meta.pathOrder[pi];
                const cx = idx % w;
                const cy = Math.floor(idx / w);
                const radius = Math.max(1, (meta.wallDist?.[idx] || 1) - 1);
                for (let dy = -radius; dy <= radius; dy++) {
                  for (let dx = -radius; dx <= radius; dx++) {
                    if (dx * dx + dy * dy > radius * radius) continue;
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    const ni = ny * w + nx;
                    if (mazeMask && mazeMask[ni] === 1) field[ni] = 1.2;
                  }
                }
              }
              if (!meta?.pathOrder || slimeFlowReplayIndexRef.current >= meta.pathOrder.length) {
                slimeFlowPhaseRef.current = "done";
                setSlimeEscaped(true);
              }
            }
          } else {
            const slimeIters = Math.max(1, Math.round(speedFactor));
            for (let si = 0; si < slimeIters; si++) {
              const stepped = stepSlime(slimeAgentsRef.current, slimeFieldRef.current, w, h, {
                sensorAngle: slimeSensorAngle,
                sensorDist: slimeSensorDist,
                turnSpeed: slimeTurnSpeed,
                speed: slimeSpeed,
                deposit: slimeDeposit,
                decay: slimeDecay,
                diffuse: slimeDiffuse,
                wiggle: slimeWiggle,
                mazeMask,
              }, slimeScratchRef.current.a, slimeScratchRef.current.b);
              slimeFieldRef.current = stepped;
            }
          }
          if (!(slimeMazeMode && slimeSolverType === "flow")) {
            const s = slimeScratchRef.current;
            slimeScratchRef.current = { a: s.b, b: s.a };
          }
          if (slimeMazeMode && mazeMask) {
            if (slimeLoopCooldownRef.current > 0) slimeLoopCooldownRef.current -= 1;
            slimeUiTickRef.current += 1;
            if (slimeUiTickRef.current % 12 === 0) {
              let covered = 0;
              let total = 0;
              for (let i = 0; i < mazeMask.length; i++) {
                if (mazeMask[i] === 1) {
                  total++;
                  if (slimeFieldRef.current[i] > 0.05) covered++;
                }
              }
              const fill = total > 0 ? (covered / total) * 100 : 0;
              slimeFillRef.current = fill;
              setSlimeFillPct(fill);
              if (slimeSolverType === "flow" && slimeFlowPhaseRef.current === "flood" && fill >= 99.5) {
                slimeFlowPhaseRef.current = "replay";
                slimeFlowReplayIndexRef.current = 0;
                slimeFieldRef.current.fill(0);
                setSlimeEscaped(false);
              }
            }
            const fillForLogic = slimeFillRef.current;
            if (!slimeCheckpointRef.current && fillForLogic >= slimeCheckpointPct) {
              saveSlimeCheckpointNow();
            }
            if (slimeAutoLoop && slimeCheckpointRef.current && slimeLoopCooldownRef.current === 0 && fillForLogic >= slimeRestartPct) {
              replaySlimeCheckpoint();
            }
          }
          if (slimeMazeMode && slimeMazeRef.current.exitPx && !slimeEscaped) {
            const ex = slimeMazeRef.current.exitPx.x;
            const ey = slimeMazeRef.current.exitPx.y;
            let hit = false;
            if (slimeSolverType === "flow") {
              hit = false;
            } else {
              hit = slimeAgentsRef.current.some((ag) => {
                const dx = ag.x - ex;
                const dy = ag.y - ey;
                return dx * dx + dy * dy < 64;
              });
            }
            if (hit) setSlimeEscaped(true);
          }
        } else if (mode === "wireworld") {
          gridRef.current = stepWireworld(gridRef.current, wireOrthogonalOnly);
        } else if (mode === "langton") {
          const langtonSteps = Math.max(1, Math.round(speedFactor));
          for (let li = 0; li < langtonSteps; li++) {
            const stepped = stepLangton(gridRef.current, langtonAntsRef.current, langtonRule);
            gridRef.current = stepped.grid;
            langtonAntsRef.current = stepped.ants;
            if (langtonShowTrails) {
              langtonTrailsRef.current = stepped.ants.map((ant, index) => {
                const prev = langtonTrailsRef.current[index] || [];
                return [...prev.slice(-64), { x: ant.x, y: ant.y, color: ant.color }];
              });
            }
          }
        } else {
          gridRef.current = mode === "conway"
            ? stepLife(gridRef.current, birth, survive)
            : stepBrain(gridRef.current);
        }
      }
      draw(gridRef.current);
      setGeneration((g) => g + subSteps);
    }, tickMs);
    return () => clearInterval(t);
  }, [running, mode, birth, survive, tickMs, boidSeparation, boidAlignment, boidCohesion, boidSteer, boidVision, boidMinSpeed, boidMaxSpeed, boidDrag, boidRandomness, boidBounce, boidColorMode, sharkEnabled, nbodyGravity, nbodyDamping, nbodySoftening, nbodyMaxSpeed, nbodyRepel, slimeCount, slimeSensorAngle, slimeSensorDist, slimeTurnSpeed, slimeSpeed, slimeDeposit, slimeDecay, slimeDiffuse, slimeWiggle, slimeMazeMode, slimeSolverType, slimeEscaped, langtonRule, langtonShowTrails, speedFactor, wireThemeId, wireOrthogonalOnly, patternBrush, patternRotation]);

  // Redraw immediately when zoom changes (canvas dims reset, need sync redraw)
  useLayoutEffect(() => {
    zoomRef.current = zoom;
    draw(gridRef.current);
  }, [zoom]);

  useEffect(() => {
    draw(gridRef.current);
  }, [mode, langtonRule, langtonShowDirections, langtonShowTrails, wireBrush, wireThemeId, patternBrush, patternRotation]);

  useEffect(() => {
    if (mode === "slime") {
      resetSlimeWorld(slimeMazeMode);
      draw(gridRef.current);
    }
  }, [mode, slimeMazeMode, slimeMazeLevel, slimeSolverType]);

  useEffect(() => {
    if (slimeRestartPct < slimeCheckpointPct) setSlimeRestartPct(slimeCheckpointPct);
  }, [slimeCheckpointPct, slimeRestartPct]);

  useEffect(() => {
    if (slimeMazeMode && slimeSolverType !== "flow") {
      setSlimeSolverType("flow");
    } else if (!slimeMazeMode && slimeSolverType !== "slime") {
      setSlimeSolverType("slime");
    }
  }, [slimeMazeMode, slimeSolverType]);

  function randomize() {
    resetPatternUndo();
    if (mode !== "wireworld") resetWirePowerSnapshot();
    if (mode === "boids") {
      stopBoidSpawnHold(); stopNBodySpawnHold();
      const cv = canvasRef.current;
      boidsRef.current = makeBoids(boidCount, cv?.width || GRID_COLS * CELL, cv?.height || GRID_ROWS * CELL, boidShape);
      setBoidSpawnMode(false);
      setBoidSpawnPopupOpen(false);
    } else if (mode === "wireworld") {
      resetWirePowerSnapshot();
      gridRef.current = makeRandomWireworldGrid();
    } else if (mode === "langton") {
      gridRef.current = makeLangtonGrid();
      randomizeLangtonAnts(langtonAntCount);
    } else if (mode === "nbody") {
      const cv = canvasRef.current;
      const preset = NBODY_PRESETS.find((p) => p.id === nbodyPreset) || null;
      nbodyRef.current = makeNBodySystem(nbodyCount, cv?.width || GRID_COLS * CELL, cv?.height || GRID_ROWS * CELL, {
        gravity: nbodyGravity,
        ...(preset || {}),
        centralBody: nbodyCentralBody,
        orbiterMass: nbodyOrbiterMass,
      });
      nbodyTrailsRef.current = [];
    } else if (mode === "slime") {
      resetSlimeWorld(slimeMazeMode);
    } else {
      gridRef.current = makeRandomGrid(mode);
    }
    if (mode !== "slime") setRunning(true);
    draw(gridRef.current);
    setGeneration(0);
  }
  function clearGrid() {
    resetPatternUndo();
    if (mode !== "wireworld") resetWirePowerSnapshot();
    if (mode === "boids") {
      stopBoidSpawnHold(); stopNBodySpawnHold();
      boidsRef.current = [];
      setBoidSpawnMode(false);
      setBoidSpawnPopupOpen(false);
    } else if (mode === "wireworld") {
      resetWirePowerSnapshot();
      gridRef.current = makeLangtonGrid(WIRE_EMPTY);
    } else if (mode === "langton") {
      gridRef.current = makeLangtonGrid();
      langtonAntsRef.current = [];
      langtonTrailsRef.current = [];
    } else if (mode === "nbody") {
      nbodyRef.current = [];
      nbodyTrailsRef.current = [];
    } else if (mode === "slime") {
      clearSlimeCurrentMazePaths();
    } else {
      gridRef.current = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(OFF));
    }
    draw(gridRef.current);
    setGeneration(0);
  }

  function toggleBoidSpawnMode() {
    stopBoidSpawnHold(); stopNBodySpawnHold();
    setBoidSpawnMode((prev) => {
      const next = !prev;
      setBoidSpawnPopupOpen(next);
      return next;
    });
  }

  function cancelPatternHold() {
    if (patternHoldRef.current.timer) {
      clearTimeout(patternHoldRef.current.timer);
      patternHoldRef.current.timer = null;
    }
    patternHoldRef.current.fired = false;
  }

  function startPatternHold(clientX, clientY) {
    cancelPatternHold();
    patternHoldRef.current.x = clientX;
    patternHoldRef.current.y = clientY;
    patternHoldRef.current.fired = false;
    patternHoldRef.current.timer = setTimeout(() => {
      patternHoldRef.current.timer = null;
      patternHoldRef.current.fired = true;
      setPatternRotation((prev) => (prev + 1) % 4);
      draw(gridRef.current);
    }, 320);
  }

  function finishPatternHold() {
    const { timer, fired, x, y } = patternHoldRef.current;
    if (timer) {
      clearTimeout(timer);
      patternHoldRef.current.timer = null;
    }
    patternHoldRef.current.fired = false;
  }

  function startPatternPreview(clientX, clientY) {
    patternPreviewRef.current = { active: true, x: clientX, y: clientY };
    draw(gridRef.current);
    requestAnimationFrame(() => draw(gridRef.current));
  }

  function updatePatternPreview(clientX, clientY) {
    if (!patternPreviewRef.current.active) return;
    patternPreviewRef.current.x = clientX;
    patternPreviewRef.current.y = clientY;
    draw(gridRef.current);
  }

  function clearPatternPreview() {
    if (!patternPreviewRef.current.active) return;
    patternPreviewRef.current.active = false;
    draw(gridRef.current);
  }

  function commitPatternPreview() {
    if (!patternPreviewRef.current.active) return;
    const { x, y } = patternPreviewRef.current;
    patternPreviewRef.current.active = false;
    paintAt(x, y);
  }

  function pushPatternUndoSnapshot() {
    const snapshot = {
      mode,
      grid: gridRef.current.map((row) => [...row]),
      langtonAnts: mode === "langton" ? langtonAntsRef.current.map((ant) => ({ ...ant })) : null,
      langtonTrails: mode === "langton"
        ? langtonTrailsRef.current.map((trail) => trail.map((point) => ({ ...point })))
        : null,
      langtonAntCount: mode === "langton" ? langtonAntCount : null,
    };
    patternUndoRef.current = [...patternUndoRef.current.slice(-49), snapshot];
    setPatternUndoCount(patternUndoRef.current.length);
  }

  function undoPatternPlacement() {
    const snapshot = patternUndoRef.current[patternUndoRef.current.length - 1];
    if (!snapshot) return;
    patternUndoRef.current = patternUndoRef.current.slice(0, -1);
    gridRef.current = snapshot.grid.map((row) => [...row]);
    if (snapshot.mode === "langton") {
      langtonAntsRef.current = (snapshot.langtonAnts || []).map((ant) => ({ ...ant }));
      langtonTrailsRef.current = (snapshot.langtonTrails || []).map((trail) => trail.map((point) => ({ ...point })));
      setLangtonAntCount(snapshot.langtonAntCount ?? langtonAntsRef.current.length);
    }
    setPatternUndoCount(patternUndoRef.current.length);
    draw(gridRef.current);
  }

  function resetPatternUndo() {
    patternUndoRef.current = [];
    setPatternUndoCount(0);
  }

  function resetWirePowerSnapshot() {
    wirePowerSnapshotRef.current = null;
    setWirePowerOff(false);
  }

  function toggleWirePower() {
    if (mode !== "wireworld") return;
    if (!wirePowerOff) {
      wirePowerSnapshotRef.current = gridRef.current.map((row) => [...row]);
      gridRef.current = deEnergizeWireworldGrid(gridRef.current);
      setWirePowerOff(true);
    } else if (wirePowerSnapshotRef.current) {
      gridRef.current = wirePowerSnapshotRef.current.map((row) => [...row]);
      wirePowerSnapshotRef.current = null;
      setWirePowerOff(false);
    } else {
      setWirePowerOff(false);
    }
    draw(gridRef.current);
  }

  function beginBrushUndoStroke() {
    if (brushUndoStrokeRef.current) return;
    pushPatternUndoSnapshot();
    brushUndoStrokeRef.current = true;
  }

  function endBrushUndoStroke() {
    brushUndoStrokeRef.current = false;
  }

  // sr, sc are viewport-relative coordinates
  function stamp(pattern, vsr, vsc) {
    const { rowOff, colOff } = getViewport(zoomRef.current);
    const next = gridRef.current.map((row) => [...row]);
    for (let r = 0; r < pattern.length; r++) {
      for (let c = 0; c < pattern[r].length; c++) {
        const rr = vsr + rowOff + r, cc = vsc + colOff + c;
        if (rr >= 0 && rr < GRID_ROWS && cc >= 0 && cc < GRID_COLS) {
          next[rr][cc] = mode === "conway" && pattern[r][c] === DYING ? OFF : pattern[r][c];
        }
      }
    }
    gridRef.current = next;
    draw(gridRef.current);
  }

  function paintAt(clientX, clientY) {
    if (mode === "boids") return;
    const cv = canvasRef.current;
    if (!cv) return;
    if (patternBrush && PRESET_LIBRARY[patternBrush]) {
      pushPatternUndoSnapshot();
      if (mode === "wireworld") {
        applyWirePreset(patternBrush, "pointer", clientX, clientY, true);
        return;
      }
      if (mode === "langton") {
        applyLangtonPreset(patternBrush, "pointer", clientX, clientY, true);
        return;
      }
    }
    const rect = cv.getBoundingClientRect();
    const sx = cv.width / rect.width, sy = cv.height / rect.height;
    const { visRows, visCols, rowOff, colOff } = getViewport(zoomRef.current);
    const vcol = Math.floor(((clientX - rect.left) * sx) / CELL);
    const vrow = Math.floor(((clientY - rect.top) * sy) / CELL);
    if (vrow < 0 || vrow >= visRows || vcol < 0 || vcol >= visCols) return;
    if (patternBrush) {
      pushPatternUndoSnapshot();
      const p = rotatePattern(PATTERNS[patternBrush], patternRotation);
      stamp(p, vrow - Math.floor(p.length / 2), vcol - Math.floor(p[0].length / 2));
      return;
    }
    const gridRow = vrow + rowOff, gridCol = vcol + colOff;
    const next = gridRef.current.map((r) => [...r]);
    next[gridRow][gridCol] =
      mode === "wireworld"
        ? wireBrush
        : mode === "langton"
          ? (brush === OFF ? 0 : 1)
          : mode === "conway" && brush === DYING
            ? OFF
            : brush;
    gridRef.current = next;
    draw(gridRef.current);
  }

  function selectPalette(palette) {
    colorRef.current = palette ? palette.colors : null;
    setColorPaletteId(palette?.id ?? null);
    draw(gridRef.current);
  }

  function spawnBoidAtPoint(x, y, force = false) {
    if (!force) {
      const last = boidSpawnTraceRef.current;
      if (last.x != null && last.y != null) {
        const dx = x - last.x;
        const dy = y - last.y;
        if (dx * dx + dy * dy < 64) return false;
      }
    }
    boidsRef.current = [...boidsRef.current, makeBoidAt(x, y, boidShape)];
    boidSpawnTraceRef.current = { x, y };
    return true;
  }

  function stopBoidSpawnHold() {
    if (boidSpawnHoldRef.current.timer) {
      clearInterval(boidSpawnHoldRef.current.timer);
      boidSpawnHoldRef.current.timer = null;
    }
    boidSpawnTraceRef.current = { x: null, y: null };
  }

  function startBoidSpawnHold(x, y) {
    boidSpawnHoldRef.current.x = x;
    boidSpawnHoldRef.current.y = y;
    stopBoidSpawnHold();
    boidSpawnHoldRef.current.x = x;
    boidSpawnHoldRef.current.y = y;
    boidSpawnHoldRef.current.timer = setInterval(() => {
      const { x: px, y: py } = boidSpawnHoldRef.current;
      if (spawnBoidAtPoint(px, py, true)) draw(gridRef.current);
    }, 70);
  }

  function stopNBodySpawnHold() {
    if (nbodySpawnHoldRef.current.timer) {
      clearInterval(nbodySpawnHoldRef.current.timer);
      nbodySpawnHoldRef.current.timer = null;
    }
  }

  function startNBodySpawnHold(x, y) {
    stopNBodySpawnHold();
    nbodySpawnHoldRef.current.x = x;
    nbodySpawnHoldRef.current.y = y;
    nbodySpawnHoldRef.current.timer = setInterval(() => {
      const { x: px, y: py } = nbodySpawnHoldRef.current;
      const mass = rand(nbodyOrbiterMass * 0.5, nbodyOrbiterMass * 1.5);
      nbodyRef.current = [...nbodyRef.current, {
        x: px, y: py,
        vx: rand(-1, 1),
        vy: rand(-1, 1),
        mass,
        radius: Math.max(3, Math.sqrt(mass) * 0.6),
        fixed: false,
      }];
      nbodyTrailsRef.current = nbodyRef.current.map((_, i) => nbodyTrailsRef.current[i] || []);
      draw(gridRef.current);
    }, 80);
  }

  function onSpeedDown() {
    speedPressRef.current = setTimeout(() => { speedPressRef.current = "fired"; setSpeedCollapsed(false); }, 400);
  }
  function onSpeedUp() {
    if (speedPressRef.current && speedPressRef.current !== "fired") {
      clearTimeout(speedPressRef.current); speedPressRef.current = null;
      setSpeedIdx(i => (i + 1) % 4);
    } else { speedPressRef.current = null; }
  }
  function onSpeedCancel() {
    if (speedPressRef.current && speedPressRef.current !== "fired") clearTimeout(speedPressRef.current);
    speedPressRef.current = null;
  }

  function onZoomDown() {
    zoomPressRef.current = setTimeout(() => { zoomPressRef.current = "fired"; setZoomCollapsed(false); }, 400);
  }
  function onZoomUp() {
    if (zoomPressRef.current && zoomPressRef.current !== "fired") {
      clearTimeout(zoomPressRef.current); zoomPressRef.current = null;
      const cur = ZOOM_OPTIONS.findIndex(o => o.v === zoom);
      changeZoom(ZOOM_OPTIONS[(cur + 1) % ZOOM_OPTIONS.length].v);
    } else { zoomPressRef.current = null; }
  }
  function onZoomCancel() {
    if (zoomPressRef.current && zoomPressRef.current !== "fired") clearTimeout(zoomPressRef.current);
    zoomPressRef.current = null;
  }

  function changeZoom(v) {
    zoomRef.current = v;
    setZoom(v);
  }

  function selectMode(nextMode) {
    resetPatternUndo();
    if (nextMode !== "wireworld") resetWirePowerSnapshot();
    setModeDropdownOpen(false);
    setMode(nextMode);
    if (nextMode === "boids") {
      const cv = canvasRef.current;
      const heatPalette = PALETTES.find((p) => p.id === "heat") || null;
      colorRef.current = heatPalette ? heatPalette.colors : null;
      setColorPaletteId(heatPalette?.id ?? null);
      setBoidColorMode("speed");
      boidsRef.current = makeBoids(boidCount, cv?.width || GRID_COLS * CELL, cv?.height || GRID_ROWS * CELL, boidShape);
    } else if (nextMode === "nbody") {
      const cv = canvasRef.current;
      const heatPalette = PALETTES.find((p) => p.id === "heat") || null;
      colorRef.current = heatPalette ? heatPalette.colors : null;
      setColorPaletteId(heatPalette?.id ?? null);
      const preset = NBODY_PRESETS.find((p) => p.id === nbodyPreset) || null;
      nbodyRef.current = makeNBodySystem(nbodyCount, cv?.width || GRID_COLS * CELL, cv?.height || GRID_ROWS * CELL, {
        gravity: nbodyGravity,
        ...(preset || {}),
        centralBody: nbodyCentralBody,
        orbiterMass: nbodyOrbiterMass,
      });
      nbodyTrailsRef.current = [];
    } else if (nextMode === "wireworld") {
      resetWirePowerSnapshot();
      colorRef.current = null;
      setColorPaletteId(null);
      applyWirePreset(wirePresetId || "wireStraight");
      setRunning(false);
    } else if (nextMode === "langton") {
      const spectral = PALETTES.find((p) => p.id === "spectral") || PALETTES[0];
      colorRef.current = spectral?.colors || null;
      setColorPaletteId(spectral?.id ?? null);
      applyLangtonPreset(langtonPresetId || "antClassic");
    } else if (nextMode === "slime") {
      resetSlimeWorld(slimeMazeMode);
    } else {
      gridRef.current = makeRandomGrid(nextMode);
    }
    draw(gridRef.current);
    setGeneration(0);
  }
  function applyPreset(p) {
    setMode("conway");
    setPreset(p.id);
    setBirth(p.birth);
    setSurvive(p.survive);
  }

  function resetBoidsDefaults() {
    setBoidCount(BOID_DEFAULTS.count);
    setBoidVision(BOID_DEFAULTS.vision);
    setBoidSeparation(BOID_DEFAULTS.separation);
    setBoidAlignment(BOID_DEFAULTS.alignment);
    setBoidCohesion(BOID_DEFAULTS.cohesion);
    setBoidSteer(BOID_DEFAULTS.steer);
    setBoidMinSpeed(BOID_DEFAULTS.minSpeed);
    setBoidMaxSpeed(BOID_DEFAULTS.maxSpeed);
    setBoidDrag(BOID_DEFAULTS.drag);
    setBoidRandomness(BOID_DEFAULTS.randomness);
    setBoidBounce(BOID_DEFAULTS.bounce);
    setBoidShape("dart");
    const cv = canvasRef.current;
    boidsRef.current = makeBoids(BOID_DEFAULTS.count, cv?.width || GRID_COLS * CELL, cv?.height || GRID_ROWS * CELL, "dart");
    draw(gridRef.current);
    setGeneration(0);
  }

  function resetNBodyDefaults() {
    applyNBodyPreset("solar");
    setGeneration(0);
  }

  function scatterLwssRain() {
    const lwss = PATTERNS.lwss;
    if (!lwss) return;
    const { visRows, visCols, rowOff, colOff } = getViewport(zoomRef.current);
    const next = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(OFF));
    const cellRows = 12;
    const cellCols = 14;
    const rowJitter = 4;
    const colJitter = 5;

    for (let baseRow = 2; baseRow < visRows - 2; baseRow += cellRows) {
      for (let baseCol = 2; baseCol < visCols - 2; baseCol += cellCols) {
        const rotated = rotatePattern(lwss, Math.floor(Math.random() * 4));
        const pr = rotated.length;
        const pc = Math.max(...rotated.map((row) => row.length));
        const vrow = Math.max(0, Math.min(visRows - pr, baseRow + Math.floor(rand(-rowJitter, rowJitter + 1))));
        const vcol = Math.max(0, Math.min(visCols - pc, baseCol + Math.floor(rand(-colJitter, colJitter + 1))));
        const rr0 = rowOff + vrow;
        const cc0 = colOff + vcol;
        for (let r = 0; r < pr; r++) {
          for (let c = 0; c < rotated[r].length; c++) {
            if (rotated[r][c] !== ON) continue;
            const rr = rr0 + r;
            const cc = cc0 + c;
            if (rr >= 0 && rr < GRID_ROWS && cc >= 0 && cc < GRID_COLS) next[rr][cc] = ON;
          }
        }
      }
    }

    gridRef.current = next;
    setPatternBrush(null);
    setBrush(ON);
    setRunning(true);
    draw(gridRef.current);
    setGeneration(0);
  }

  function lineLwssTopEdge() {
    const lwss = PATTERNS.lwss;
    if (!lwss) return;
    const rotated = rotatePattern(lwss, 1);
    const pr = rotated.length;
    const pc = Math.max(...rotated.map((row) => row.length));
    const { visRows, visCols, rowOff, colOff } = getViewport(zoomRef.current);
    const next = gridRef.current.map((row) => [...row]);
    const gap = 4;
    const spacing = pc + gap;
    const topBase = 1;

    for (let baseCol = 1; baseCol <= visCols - pc - 1; baseCol += spacing) {
      const topJitter = Math.floor(rand(0, 9));
      const vrow = Math.max(0, Math.min(visRows - pr, topBase + topJitter));
      const vcol = Math.max(0, Math.min(visCols - pc, baseCol));
      const rr0 = rowOff + vrow;
      const cc0 = colOff + vcol;
      for (let r = 0; r < pr; r++) {
        for (let c = 0; c < rotated[r].length; c++) {
          if (rotated[r][c] !== ON) continue;
          const rr = rr0 + r;
          const cc = cc0 + c;
          if (rr >= 0 && rr < GRID_ROWS && cc >= 0 && cc < GRID_COLS) next[rr][cc] = ON;
        }
      }
    }

    gridRef.current = next;
    setPatternBrush(null);
    setBrush(ON);
    setRunning(true);
    draw(gridRef.current);
    setGeneration(0);
  }

  function applyWirePreset(presetId, placement = "center", clientX = null, clientY = null, additive = false) {
    const preset = PRESET_LIBRARY[presetId];
    if (!preset || preset.modeId !== "wireworld") return;
    let centerRow = Math.floor(GRID_ROWS / 2);
    let centerCol = Math.floor(GRID_COLS / 2);
    if (placement === "pointer" && clientX != null && clientY != null) {
      const cv = canvasRef.current;
      if (cv) {
        const rect = cv.getBoundingClientRect();
        const sx = cv.width / rect.width;
        const sy = cv.height / rect.height;
        const { rowOff, colOff } = getViewport(zoomRef.current);
        centerCol = Math.floor(((clientX - rect.left) * sx) / CELL) + colOff;
        centerRow = Math.floor(((clientY - rect.top) * sy) / CELL) + rowOff;
      }
    }
    const base = additive ? gridRef.current : makeLangtonGrid(WIRE_EMPTY);
    const { grid } = applyStructuredPreset(base, preset, centerRow, centerCol, "wireworld");
    gridRef.current = grid;
    setWirePresetId(presetId);
    setPatternBrush(presetId);
    setBrush(WIRE_CONDUCTOR);
    setRunning(true);
    draw(gridRef.current);
  }

  function applyLangtonPreset(presetId, placement = "center", clientX = null, clientY = null, additive = false) {
    const preset = PRESET_LIBRARY[presetId];
    if (!preset || preset.modeId !== "langton") return;
    let centerRow = Math.floor(GRID_ROWS / 2);
    let centerCol = Math.floor(GRID_COLS / 2);
    if (placement === "pointer" && clientX != null && clientY != null) {
      const cv = canvasRef.current;
      if (cv) {
        const rect = cv.getBoundingClientRect();
        const sx = cv.width / rect.width;
        const sy = cv.height / rect.height;
        const { rowOff, colOff } = getViewport(zoomRef.current);
        centerCol = Math.floor(((clientX - rect.left) * sx) / CELL) + colOff;
        centerRow = Math.floor(((clientY - rect.top) * sy) / CELL) + rowOff;
      }
    }
    const base = additive ? gridRef.current : makeLangtonGrid();
    const { grid, ants } = applyStructuredPreset(base, preset, centerRow, centerCol, "langton");
    gridRef.current = grid;
    const combinedAnts = additive ? [...langtonAntsRef.current, ...ants] : ants;
    langtonAntsRef.current = combinedAnts;
    langtonTrailsRef.current = additive
      ? [...langtonTrailsRef.current, ...ants.map((ant) => [{ x: ant.x, y: ant.y, color: ant.color }])]
      : ants.map((ant) => [{ x: ant.x, y: ant.y, color: ant.color }]);
    setLangtonRule(preset.rule || LANGTON_DEFAULT_RULE);
    setLangtonAntCount(combinedAnts.length || 1);
    setLangtonPresetId(presetId);
    setPatternBrush(presetId);
    setRunning(true);
    draw(gridRef.current);
  }

  function resetLangtonAnts() {
    if (PRESET_LIBRARY[langtonPresetId]) {
      applyLangtonPreset(langtonPresetId);
      return;
    }
    langtonTrailsRef.current = [];
    langtonAntsRef.current = [makeLangtonAnt(Math.floor(GRID_COLS / 2), Math.floor(GRID_ROWS / 2), 0)];
    setLangtonAntCount(1);
    draw(gridRef.current);
  }

  function randomizeLangtonAnts(count = langtonAntCount) {
    const ants = makeRandomLangtonAnts(count);
    langtonAntsRef.current = ants;
    langtonTrailsRef.current = ants.map((ant) => [{ x: ant.x, y: ant.y, color: ant.color }]);
    setLangtonAntCount(ants.length);
    draw(gridRef.current);
  }

  function applyNBodyPreset(presetId) {
    const preset = NBODY_PRESETS.find((p) => p.id === presetId) || NBODY_PRESETS[0];
    setNbodyPreset(preset.id);
    setNbodyCount(preset.count);
    setNbodyGravity(preset.gravity);
    setNbodyDamping(preset.damping);
    setNbodySoftening(preset.softening);
    setNbodyMaxSpeed(preset.maxSpeed);
    const cv = canvasRef.current;
    nbodyRef.current = makeNBodySystem(
      preset.count,
      cv?.width || GRID_COLS * CELL,
      cv?.height || GRID_ROWS * CELL,
      { ...preset, centralBody: nbodyCentralBody, orbiterMass: nbodyOrbiterMass }
    );
    nbodyTrailsRef.current = [];
    draw(gridRef.current);
  }

  const ruleString = mode === "brian"
    ? "Brian's Brain"
    : mode === "wireworld"
      ? (wireOrthogonalOnly ? "Orthogonal-only experimental routing" : "Electron heads propagate through conductors")
    : mode === "langton"
      ? sanitizeLangtonRule(langtonRule)
    : mode === "boids"
      ? "Separation · Alignment · Cohesion"
      : mode === "nbody"
        ? "Gravity · Orbit"
      : mode === "slime"
        ? "Physarum Agents"
      : `B${birth.join("") || "—"}/S${survive.join("") || "—"}`;

  const cat = CATALOG[mode] ?? [];
  const activePatternLabel = cat.find((item) => item.key === patternBrush)?.label || patternBrush;

  // Canvas size = visCols*CELL × visRows*CELL — cells always 5×5px square, no CSS scaling
  const { visRows, visCols } = getViewport(zoom, windowSize.w, windowSize.h);
  const canvasW = visCols * CELL;
  const canvasH = visRows * CELL;

  return (
    <div className="fixed inset-0 bg-slate-950 overflow-hidden text-white font-sans">
      {/* ─── Canvas full-bleed ─── */}
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawingRef.current = true;
          if (mode === "boids") {
            const rect = e.currentTarget.getBoundingClientRect();
            const sx = e.currentTarget.width / rect.width;
            const sy = e.currentTarget.height / rect.height;
            const x = (e.clientX - rect.left) * sx;
            const y = (e.clientY - rect.top) * sy;
            if (boidSpawnMode) {
              if (spawnBoidAtPoint(x, y)) draw(gridRef.current);
              startBoidSpawnHold(x, y);
              return;
            }
            mouseRef.current = {
              active: true,
              x,
              y,
              strength: e.button === 2 ? -0.12 : 0.12,
              radius: 120,
            };
          } else if (mode === "slime") {
            const cv = canvasRef.current;
            if (cv) {
              const rect = e.currentTarget.getBoundingClientRect();
              const sx = e.currentTarget.width / rect.width;
              const sy = e.currentTarget.height / rect.height;
              const x = Math.floor((e.clientX - rect.left) * sx);
              const y = Math.floor((e.clientY - rect.top) * sy);
              if (slimeMazeMode && slimeAwaitingStart) {
                const placed = placeSlimeStart(x, y);
                drawingRef.current = false;
                if (placed) draw(gridRef.current);
                return;
              }
              if (x >= 0 && y >= 0 && x < cv.width && y < cv.height) {
                const idx = y * cv.width + x;
                const mask = slimeMazeRef.current.mask;
                if ((!mask || mask[idx] === 1) && slimeFieldRef.current[idx] !== undefined) slimeFieldRef.current[idx] += 16;
              }
            }
          } else if (mode === "nbody") {
            const rect = e.currentTarget.getBoundingClientRect();
            const sx = e.currentTarget.width / rect.width;
            const sy = e.currentTarget.height / rect.height;
            const x = (e.clientX - rect.left) * sx;
            const y = (e.clientY - rect.top) * sy;
            const mass = rand(nbodyOrbiterMass * 0.5, nbodyOrbiterMass * 1.5);
            nbodyRef.current = [...nbodyRef.current, {
              x, y,
              vx: rand(-1, 1),
              vy: rand(-1, 1),
              mass,
              radius: Math.max(3, Math.sqrt(mass) * 0.6),
              fixed: false,
            }];
            nbodyTrailsRef.current = nbodyRef.current.map((_, i) => nbodyTrailsRef.current[i] || []);
            draw(gridRef.current);
            startNBodySpawnHold(x, y);
          } else {
            if (patternBrush) {
              startPatternPreview(e.clientX, e.clientY);
              if (mode === "conway" || mode === "brian") startPatternHold(e.clientX, e.clientY);
            } else {
              beginBrushUndoStroke();
              paintAt(e.clientX, e.clientY);
            }
          }
        }}
        onPointerMove={(e) => {
          if (!drawingRef.current) return;
          if (mode === "boids") {
            const rect = e.currentTarget.getBoundingClientRect();
            const sx = e.currentTarget.width / rect.width;
            const sy = e.currentTarget.height / rect.height;
            const x = (e.clientX - rect.left) * sx;
            const y = (e.clientY - rect.top) * sy;
            if (boidSpawnMode) {
              boidSpawnHoldRef.current.x = x;
              boidSpawnHoldRef.current.y = y;
              if (spawnBoidAtPoint(x, y)) draw(gridRef.current);
              return;
            }
            mouseRef.current.x = x;
            mouseRef.current.y = y;
          } else if (mode === "nbody") {
            const rect = e.currentTarget.getBoundingClientRect();
            const sx = e.currentTarget.width / rect.width;
            const sy = e.currentTarget.height / rect.height;
            nbodySpawnHoldRef.current.x = (e.clientX - rect.left) * sx;
            nbodySpawnHoldRef.current.y = (e.clientY - rect.top) * sy;
          } else if (patternBrush) {
            updatePatternPreview(e.clientX, e.clientY);
            if (mode === "conway" || mode === "brian") {
              patternHoldRef.current.x = e.clientX;
              patternHoldRef.current.y = e.clientY;
            }
          } else if (mode !== "slime") {
            beginBrushUndoStroke();
            paintAt(e.clientX, e.clientY);
          }
        }}
        onDoubleClick={(e) => {
          if (mode !== "boids") return;
          const rect = e.currentTarget.getBoundingClientRect();
          const sx = e.currentTarget.width / rect.width;
          const sy = e.currentTarget.height / rect.height;
          explosionRef.current = {
            active: true,
            x: (e.clientX - rect.left) * sx,
            y: (e.clientY - rect.top) * sy,
            radius: 180,
            power: 2.8,
            ttl: 26,
          };
        }}
        onPointerUp={() => {
          if (patternBrush) {
            if (mode === "conway" || mode === "brian") finishPatternHold();
            commitPatternPreview();
          }
          drawingRef.current = false;
          endBrushUndoStroke();
          mouseRef.current.active = false;
          stopBoidSpawnHold();
          stopNBodySpawnHold();
        }}
        onPointerCancel={() => {
          cancelPatternHold();
          clearPatternPreview();
          drawingRef.current = false;
          endBrushUndoStroke();
          mouseRef.current.active = false;
          stopBoidSpawnHold();
          stopNBodySpawnHold();
        }}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ cursor: mode === "boids" ? "grab" : mode === "slime" ? "cell" : mode === "nbody" ? "default" : (patternBrush ? "copy" : "crosshair"), imageRendering: "pixelated" }}
      />

      {/* ─── Protection gradients ─── */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-slate-950/80 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-slate-950/90 to-transparent" />

      {/* ─── Top-left: mode dropdown ─── */}
      <div className="absolute top-[max(env(safe-area-inset-top),16px)] left-4 z-[70]">
        <button
          onClick={() => setModeDropdownOpen((v) => !v)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-xl border border-white/10 active:scale-95 transition"
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: mode === "brian" ? "#7c3aed" : mode === "wireworld" ? "#f59e0b" : mode === "langton" ? "#f472b6" : "#38bdf8",
              boxShadow: `0 0 8px ${mode === "brian" ? "#7c3aed" : mode === "wireworld" ? "#f59e0b" : mode === "langton" ? "#f472b6" : "#38bdf8"}`,
            }}
          />
        <span className="text-xs font-bold tracking-wider">{mode === "brian" ? "BRAIN" : mode === "conway" ? "LIFE" : mode === "wireworld" ? "WIREWORLD" : mode === "langton" ? "LANGTON" : mode === "boids" ? "BOIDS" : mode === "slime" ? "SLIME" : "N-BODY"}</span>
        <span className="text-[11px] text-slate-400 font-mono pl-2 ml-1 border-l border-white/10">
          {mode === "brian" ? "·" : mode === "wireworld" ? "WW" : mode === "langton" ? sanitizeLangtonRule(langtonRule) : mode === "boids" ? "SAC" : mode === "slime" ? "PHYS" : mode === "nbody" ? "GRAV" : `${birth.join("")||"—"}/${survive.join("")||"—"}`}
        </span>
          <span className="text-slate-400 text-[10px]">{modeDropdownOpen ? "▲" : "▼"}</span>
        </button>
        {modeDropdownOpen && (
          <div className="mt-2 min-w-[180px] p-1.5 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50">
            {MODE_ORDER.map((modeId) => {
              const label = modeId === "brian" ? "BRAIN" : modeId === "conway" ? "LIFE" : modeId === "wireworld" ? "WIREWORLD" : modeId === "langton" ? "LANGTON" : modeId === "boids" ? "BOIDS" : modeId === "slime" ? "SLIME" : "N-BODY";
              return (
                <button
                  key={`mode-option-${modeId}`}
                  onClick={() => selectMode(modeId)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left text-[12px] font-semibold active:scale-[0.99] transition ${
                    mode === modeId ? "bg-sky-500/90 text-slate-950" : "text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <span>{label}</span>
                  {mode === modeId && <span className="text-[10px]">●</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {(mode === "wireworld" || mode === "langton") && !sheet && (
        <div
          className="absolute left-4 z-20 max-w-[min(34rem,calc(100vw-32px))] px-3 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-xl border border-white/10 text-[11px] text-slate-200"
          style={{ top: "calc(max(env(safe-area-inset-top), 16px) + 46px)" }}
        >
          {MODE_DESCRIPTIONS[mode]}
        </div>
      )}

      {mode === "wireworld" && !sheet && (
        <div
          className="absolute left-4 z-20 flex flex-wrap items-center gap-1.5 max-w-[calc(100vw-32px)]"
          style={{ top: "calc(max(env(safe-area-inset-top), 16px) + 84px)" }}
        >
          <button
            onClick={toggleWirePower}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-xl border active:scale-95 transition ${
              wirePowerOff
                ? "bg-slate-100 border-white/30 text-slate-950"
                : "bg-slate-900/70 border-white/10 text-slate-200"
            }`}
          >{wirePowerOff ? "Restore Power" : "Power Off"}</button>
        </div>
      )}

      {mode === "boids" && !sheet && (
        <div
          className="absolute left-4 z-20 flex flex-wrap items-center gap-1.5 max-w-[calc(100vw-32px)]"
          style={{ top: "calc(max(env(safe-area-inset-top), 16px) + 46px)" }}
        >
          <button
            onClick={toggleBoidSpawnMode}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-xl border active:scale-95 transition ${
              boidSpawnMode
                ? "bg-cyan-500/90 border-cyan-200/40 text-slate-950"
                : "bg-slate-900/70 border-white/10 text-slate-200"
            }`}
          >Spawn Fish</button>
        </div>
      )}

      {mode === "conway" && !sheet && (
        <div
          className="absolute left-4 z-20 flex flex-wrap items-center gap-1.5 max-w-[calc(100vw-32px)]"
          style={{ top: "calc(max(env(safe-area-inset-top), 16px) + 46px)" }}
        >
          <button
            onClick={scatterLwssRain}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-xl border active:scale-95 transition bg-cyan-500/90 border-cyan-200/40 text-slate-950"
          >LWSS Random</button>
          <button
            onClick={lineLwssTopEdge}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-xl border active:scale-95 transition bg-violet-500/90 border-violet-200/40 text-white"
          >LWSS Rain</button>
        </div>
      )}

      {mode === "nbody" && !sheet && (
        <div
          className="absolute left-4 z-20 flex flex-wrap items-center gap-1.5 max-w-[calc(100vw-32px)]"
          style={{ top: "calc(max(env(safe-area-inset-top), 16px) + 46px)" }}
        >
          <button
            onClick={() => setNbodyRepel((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold backdrop-blur-xl border active:scale-95 transition ${
              nbodyRepel
                ? "bg-rose-500/90 border-rose-200/40 text-white"
                : "bg-cyan-500/90 border-cyan-200/40 text-slate-950"
            }`}
          >{nbodyRepel ? "Repel" : "Attract"}</button>
        </div>
      )}

      {mode === "slime" && slimeMazeMode && slimeAwaitingStart && !sheet && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-amber-500/90 text-slate-950 text-[11px] font-semibold backdrop-blur-xl border border-amber-200/40"
          style={{ top: "calc(max(env(safe-area-inset-top), 12px) + 38px)" }}
        >
          Choose a start point in the maze, then press Play
        </div>
      )}

      {mode === "boids" && boidSpawnPopupOpen && !sheet && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-full bg-cyan-500/90 text-slate-950 text-[11px] font-semibold backdrop-blur-xl border border-cyan-200/40"
          style={{ top: "calc(max(env(safe-area-inset-top), 16px) + 48px)" }}
        >
          <span>Hold to spawn fish continuously</span>
          <button
            onClick={() => { setBoidSpawnPopupOpen(false); setBoidSpawnMode(false); stopBoidSpawnHold(); }}
            className="w-5 h-5 rounded-full bg-slate-950/15 hover:bg-slate-950/25 flex items-center justify-center text-[11px]"
          >✕</button>
        </div>
      )}

      {/* ─── Top-right: generation counter ─── */}
      <div className="absolute top-[max(env(safe-area-inset-top),16px)] right-4 z-20 px-3 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-xl border border-white/10 font-mono text-[11px] tracking-wider">
        <span className="text-slate-500">GEN</span>{" "}
        <span className="text-white font-bold">{String(generation).padStart(4, "0")}</span>
      </div>

      {/* ─── Left: speed pill ─── */}
      <div
        className={`absolute left-3 z-30 transition-all duration-300 ${sheet ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        style={{ bottom: "calc(max(env(safe-area-inset-bottom), 24px) + 72px)" }}
      >
        {speedCollapsed ? (
          <div className="flex flex-col items-center p-[3px] rounded-full bg-slate-900/70 backdrop-blur-xl border border-white/10">
            <button
              onPointerDown={onSpeedDown} onPointerUp={onSpeedUp} onPointerCancel={onSpeedCancel}
              className="px-2 py-2 rounded-full text-[11px] font-bold tabular-nums text-white w-8 text-center active:bg-white/10 transition select-none"
            >{SPEED_LABELS[speedIdx]}</button>
          </div>
        ) : (
          <div className="flex flex-col items-center p-[3px] rounded-full bg-slate-900/70 backdrop-blur-xl border border-white/10">
            {["4×", "2×", "1×", "½×"].map((label, i) => {
              const idx = 3 - i;
              return (
                <button
                  key={idx}
                  onClick={() => setSpeedIdx(idx)}
                  className={`px-2 py-1.5 rounded-full text-[11px] font-bold tabular-nums transition w-8 text-center ${
                    speedIdx === idx ? "bg-white/15 text-white" : "text-slate-400 active:bg-white/5"
                  }`}
                >{label}</button>
              );
            })}
            <button
              onClick={() => setSpeedCollapsed(true)}
              className="px-2 py-1 rounded-full text-[9px] text-slate-500 hover:text-slate-300 transition w-8 text-center mt-0.5"
            >✕</button>
          </div>
        )}
      </div>

      {/* ─── Right: zoom pill ─── */}
      <div
        className={`absolute right-3 z-30 transition-all duration-300 ${sheet ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        style={{ bottom: "calc(max(env(safe-area-inset-bottom), 24px) + 72px)" }}
      >
        {zoomCollapsed ? (
          <div className="flex flex-col items-center p-[3px] rounded-full bg-slate-900/70 backdrop-blur-xl border border-white/10">
            <button
              onPointerDown={onZoomDown} onPointerUp={onZoomUp} onPointerCancel={onZoomCancel}
              className="px-2 py-2 rounded-full text-[11px] font-bold tabular-nums text-white w-9 text-center active:bg-white/10 transition select-none"
            >{ZOOM_OPTIONS.find(o => o.v === zoom)?.label ?? "1×"}</button>
          </div>
        ) : (
          <div className="flex flex-col items-center p-[3px] rounded-full bg-slate-900/70 backdrop-blur-xl border border-white/10">
            {ZOOM_OPTIONS.map(({ label, v }) => (
              <button
                key={v}
                onClick={() => changeZoom(v)}
                className={`px-2 py-1.5 rounded-full text-[11px] font-bold tabular-nums transition w-9 text-center ${
                  zoom === v ? "bg-white/15 text-white" : "text-slate-400 active:bg-white/5"
                }`}
              >{label}</button>
            ))}
            <button
              onClick={() => setZoomCollapsed(true)}
              className="px-2 py-1 rounded-full text-[9px] text-slate-500 hover:text-slate-300 transition w-9 text-center mt-0.5"
            >✕</button>
          </div>
        )}
      </div>

      {/* ─── Pattern brush badge ─── */}
      {patternBrush && mode !== "boids" && mode !== "slime" && !sheet && (
        <div className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-600/85 backdrop-blur-xl border border-white/15 shadow-lg shadow-violet-600/40" style={{ top: "max(env(safe-area-inset-top), 12px)" }}>
          <span className="text-xs font-bold">● Press and release to place {activePatternLabel}{mode === "conway" || mode === "brian" ? ` · ${patternRotation * 90}°` : ""}</span>
          <button
            onClick={undoPatternPlacement}
            disabled={patternUndoCount === 0}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
              patternUndoCount > 0 ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/10 text-white/45 cursor-not-allowed"
            }`}
          >Undo {patternUndoCount > 0 ? `(${patternUndoCount})` : ""}</button>
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
        <div className="flex items-center gap-1.5 p-2 rounded-[36px]">
              <HudIcon onClick={clearGrid} title="Clear"><TrashIcon /></HudIcon>
              <HudIcon onClick={randomize} title="Randomize"><DiceIcon /></HudIcon>
              {mode !== "boids" && mode !== "slime" && mode !== "nbody" && <HudIcon onClick={() => setSheet("brush")} title="Brush"
                active={sheet === "brush"} activeColor={brushColor(mode, brush, wireBrush)}
              ><BrushIcon /></HudIcon>}
              <button
                onClick={() => {
                  const nextRunning = !running;
                  if (mode === "slime" && slimeMazeMode && nextRunning) {
                    setSlimeAwaitingStart(false);
                  }
                  setRunning(nextRunning);
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white active:scale-95 transition ${
                  running ? "bg-violet-600 shadow-violet-600/50" : "bg-sky-500 shadow-sky-500/50"
                }`}
                style={{ boxShadow: `0 2px 8px ${running ? "rgba(124,58,237,0.22)" : "rgba(14,165,233,0.22)"}, inset 0 1px 0 rgba(255,255,255,0.14)` }}
              >
                {running ? <PauseIcon /> : <PlayIcon />}
              </button>
              {mode !== "boids" && mode !== "slime" && <HudIcon onClick={() => setSheet("patterns")} title="Patterns"
                active={sheet === "patterns"} activeColor="bg-violet-600"
              ><PatternsIcon /></HudIcon>}
              {mode !== "brian" && <HudIcon onClick={() => setSheet("rules")} title="Rules"
                active={sheet === "rules"} activeColor="bg-yellow-600"
              ><SlidersIcon /></HudIcon>}
              <HudIcon onClick={() => setSheet("color")} title="Color"
                active={sheet === "color"} activeColor="bg-orange-500"
              ><PaletteIcon /></HudIcon>
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
            className="absolute left-1/2 -translate-x-1/2 z-50 w-[min(calc(100vw-20px),34rem)] bg-slate-900/95 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl shadow-black/60 px-5 pt-3 pb-6 max-h-[60vh] overflow-y-auto"
            style={{ bottom: "max(env(safe-area-inset-bottom), 20px)" }}
          >
            <div className="flex justify-center mb-2">
              <div className="w-9 h-1.5 rounded-full bg-white/20" />
            </div>
            {sheet === "brush" && (
              <BrushSheet
                brush={brush} setBrush={setBrush} mode={mode}
                wireBrush={wireBrush} setWireBrush={setWireBrush}
                patternBrush={patternBrush} setPatternBrush={setPatternBrush}
                onClose={() => setSheet(null)}
              />
            )}
            {sheet === "patterns" && (
              <PatternsSheet
                mode={mode} cat={cat}
                patternBrush={patternBrush} setPatternBrush={setPatternBrush}
                patternRotation={patternRotation} setPatternRotation={setPatternRotation}
                onClose={() => setSheet(null)}
              />
            )}
            {sheet === "rules" && (
              <RulesSheet
                mode={mode} preset={preset} applyPreset={applyPreset}
                birth={birth} setBirth={setBirth}
                survive={survive} setSurvive={setSurvive}
                wirePresetId={wirePresetId}
                wireOrthogonalOnly={wireOrthogonalOnly}
                setWireOrthogonalOnly={setWireOrthogonalOnly}
                boidCount={boidCount} setBoidCount={setBoidCount}
                boidVision={boidVision} setBoidVision={setBoidVision}
                boidSeparation={boidSeparation} setBoidSeparation={setBoidSeparation}
                boidAlignment={boidAlignment} setBoidAlignment={setBoidAlignment}
                boidCohesion={boidCohesion} setBoidCohesion={setBoidCohesion}
                boidSteer={boidSteer} setBoidSteer={setBoidSteer}
                boidMinSpeed={boidMinSpeed} setBoidMinSpeed={setBoidMinSpeed}
                boidMaxSpeed={boidMaxSpeed} setBoidMaxSpeed={setBoidMaxSpeed}
                boidDrag={boidDrag} setBoidDrag={setBoidDrag}
                boidRandomness={boidRandomness} setBoidRandomness={setBoidRandomness}
                boidBounce={boidBounce} setBoidBounce={setBoidBounce}
                boidShape={boidShape} setBoidShape={setBoidShape}
                sharkEnabled={sharkEnabled} setSharkEnabled={setSharkEnabled}
                nbodyPreset={nbodyPreset} setNbodyPreset={setNbodyPreset}
                applyNBodyPreset={applyNBodyPreset}
                nbodyCount={nbodyCount} setNbodyCount={setNbodyCount}
                nbodyGravity={nbodyGravity} setNbodyGravity={setNbodyGravity}
                nbodyDamping={nbodyDamping} setNbodyDamping={setNbodyDamping}
                nbodySoftening={nbodySoftening} setNbodySoftening={setNbodySoftening}
                nbodyMaxSpeed={nbodyMaxSpeed} setNbodyMaxSpeed={setNbodyMaxSpeed}
                nbodyCentralBody={nbodyCentralBody}
                nbodyOrbiterMass={nbodyOrbiterMass} setNbodyOrbiterMass={setNbodyOrbiterMass}
                slimeCount={slimeCount} setSlimeCount={setSlimeCount}
                slimeSensorAngle={slimeSensorAngle} setSlimeSensorAngle={setSlimeSensorAngle}
                slimeSensorDist={slimeSensorDist} setSlimeSensorDist={setSlimeSensorDist}
                slimeTurnSpeed={slimeTurnSpeed} setSlimeTurnSpeed={setSlimeTurnSpeed}
                slimeSpeed={slimeSpeed} setSlimeSpeed={setSlimeSpeed}
                slimeDeposit={slimeDeposit} setSlimeDeposit={setSlimeDeposit}
                slimeDecay={slimeDecay} setSlimeDecay={setSlimeDecay}
                slimeDiffuse={slimeDiffuse} setSlimeDiffuse={setSlimeDiffuse}
                slimeWiggle={slimeWiggle} setSlimeWiggle={setSlimeWiggle}
                slimeMazeMode={slimeMazeMode} setSlimeMazeMode={setSlimeMazeMode}
                slimeMazeLevel={slimeMazeLevel} setSlimeMazeLevel={setSlimeMazeLevel}
                slimeSolverType={slimeSolverType} setSlimeSolverType={setSlimeSolverType}
                slimeEscaped={slimeEscaped}
                slimeFillPct={slimeFillPct}
                slimeCheckpointPct={slimeCheckpointPct} setSlimeCheckpointPct={setSlimeCheckpointPct}
                slimeRestartPct={slimeRestartPct} setSlimeRestartPct={setSlimeRestartPct}
                slimeAutoLoop={slimeAutoLoop} setSlimeAutoLoop={setSlimeAutoLoop}
                slimeCheckpointReady={slimeCheckpointReady}
                slimeDebugFlow={slimeDebugFlow} setSlimeDebugFlow={setSlimeDebugFlow}
                slimeDebugStats={slimeDebugStats}
                saveSlimeCheckpointNow={saveSlimeCheckpointNow}
                replaySlimeCheckpoint={replaySlimeCheckpoint}
                loadUTestMaze={loadUTestMaze}
                regenerateSlimeMaze={() => { resetSlimeWorld(true); draw(gridRef.current); }}
                langtonRule={langtonRule} setLangtonRule={setLangtonRule}
                langtonAntCount={langtonAntCount} setLangtonAntCount={setLangtonAntCount}
                langtonShowDirections={langtonShowDirections} setLangtonShowDirections={setLangtonShowDirections}
                langtonShowTrails={langtonShowTrails} setLangtonShowTrails={setLangtonShowTrails}
                langtonPresetId={langtonPresetId}
                applyLangtonPreset={applyLangtonPreset}
                resetLangtonAnts={resetLangtonAnts}
                randomizeLangtonAnts={randomizeLangtonAnts}
                onResetBoids={resetBoidsDefaults}
                onResetNBody={resetNBodyDefaults}
                reinitBoids={() => {
                  const cv = canvasRef.current;
                  boidsRef.current = makeBoids(boidCount, cv?.width || GRID_COLS * CELL, cv?.height || GRID_ROWS * CELL, boidShape);
                  draw(gridRef.current);
                }}
                reinitNBody={() => {
                  const cv = canvasRef.current;
                  const preset = NBODY_PRESETS.find((p) => p.id === nbodyPreset) || null;
                  nbodyRef.current = makeNBodySystem(nbodyCount, cv?.width || GRID_COLS * CELL, cv?.height || GRID_ROWS * CELL, {
                    gravity: nbodyGravity,
                    ...(preset || {}),
                    repel: nbodyRepel,
                    centralBody: nbodyCentralBody,
        orbiterMass: nbodyOrbiterMass,
                  });
                  draw(gridRef.current);
                }}
                toggleNbodyCentralBody={() => {
                  const next = !nbodyCentralBody;
                  setNbodyCentralBody(next);
                  const cv = canvasRef.current;
                  const preset = NBODY_PRESETS.find((p) => p.id === nbodyPreset) || null;
                  nbodyRef.current = makeNBodySystem(nbodyCount, cv?.width || GRID_COLS * CELL, cv?.height || GRID_ROWS * CELL, {
                    gravity: nbodyGravity,
                    ...(preset || {}),
                    repel: nbodyRepel,
                    centralBody: next,
                  });
                  nbodyTrailsRef.current = [];
                  draw(gridRef.current);
                }}
                onClose={() => setSheet(null)}
              />
            )}
            {sheet === "color" && (
              <ColorSheet
                mode={mode}
                boidColorMode={boidColorMode}
                setBoidColorMode={setBoidColorMode}
                colorPaletteId={colorPaletteId}
                wireThemeId={wireThemeId}
                setWireThemeId={setWireThemeId}
                selectPalette={(p) => { selectPalette(p); setSheet(null); }}
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
      className="w-10 h-10 rounded-full flex items-center justify-center text-white active:scale-95 transition"
    >
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
          active ? `${activeColor} ring-1 ring-white/15` : "bg-transparent"
        }`}
      >
        {children}
      </span>
    </button>
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

function brushColor(mode, brush, wireBrush) {
  if (mode === "wireworld") {
    if (wireBrush === WIRE_CONDUCTOR) return "bg-amber-500";
    if (wireBrush === WIRE_HEAD) return "bg-cyan-500";
    if (wireBrush === WIRE_TAIL) return "bg-orange-500";
    return "bg-red-600";
  }
  if (mode === "langton") return brush === OFF ? "bg-slate-300" : "bg-fuchsia-500";
  if (brush === ON) return "bg-sky-500";
  if (brush === DYING) return "bg-violet-600";
  return "bg-red-600";
}

// ─── Sheet bodies ──────────────────────────────────────────────
function BrushSheet({ brush, setBrush, mode, wireBrush, setWireBrush, patternBrush, setPatternBrush, onClose }) {
  if (mode === "wireworld") {
    return (
      <div>
        <SheetHeader title="Brush" onClose={onClose} />
        <div className="grid grid-cols-2 gap-2">
          <BrushCard
            active={!patternBrush && wireBrush === WIRE_CONDUCTOR}
            colorClass="bg-amber-500" shadowClass="shadow-amber-500/50"
            label="Conductor" glyph="═"
            onClick={() => { setPatternBrush(null); setWireBrush(WIRE_CONDUCTOR); }}
          />
          <BrushCard
            active={!patternBrush && wireBrush === WIRE_HEAD}
            colorClass="bg-cyan-500" shadowClass="shadow-cyan-500/50"
            label="Head" glyph="●"
            onClick={() => { setPatternBrush(null); setWireBrush(WIRE_HEAD); }}
          />
          <BrushCard
            active={!patternBrush && wireBrush === WIRE_TAIL}
            colorClass="bg-orange-500" shadowClass="shadow-orange-500/50"
            label="Tail" glyph="◉"
            onClick={() => { setPatternBrush(null); setWireBrush(WIRE_TAIL); }}
          />
          <BrushCard
            active={!patternBrush && wireBrush === WIRE_EMPTY}
            colorClass="bg-red-600" shadowClass="shadow-red-600/50"
            label="Eraser" glyph="○"
            onClick={() => { setPatternBrush(null); setWireBrush(WIRE_EMPTY); }}
          />
        </div>
      </div>
    );
  }
  if (mode === "langton") {
    return (
      <div>
        <SheetHeader title="Brush" onClose={onClose} />
        <div className="grid grid-cols-2 gap-2">
          <BrushCard
            active={!patternBrush && brush === ON}
            colorClass="bg-fuchsia-500" shadowClass="shadow-fuchsia-500/50"
            label="Black Cell" glyph="■"
            onClick={() => { setPatternBrush(null); setBrush(ON); }}
          />
          <BrushCard
            active={!patternBrush && brush === OFF}
            colorClass="bg-slate-500" shadowClass="shadow-slate-500/40"
            label="White Cell" glyph="□"
            onClick={() => { setPatternBrush(null); setBrush(OFF); }}
          />
        </div>
      </div>
    );
  }
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

function PatternsSheet({ mode, cat, patternBrush, setPatternBrush, patternRotation, setPatternRotation, onClose }) {
  const title = mode === "conway" ? "Patterns · Life-like" : mode === "brian" ? "Patterns · Brain" : mode === "wireworld" ? "Patterns · Wireworld" : "Patterns · Langton";
  return (
    <div>
      <SheetHeader title={title} onClose={onClose} />
      <div className="grid grid-cols-2 gap-2">
        {cat.map((p) => {
          const active = patternBrush === p.key;
          const bgClass = `bg-${p.color}`;
          return (
            <button
              key={p.key}
              onClick={() => {
                setPatternBrush(p.key);
                setPatternRotation(0);
                onClose();
              }}
              className={`p-2.5 rounded-2xl text-white text-left flex items-center gap-2.5 active:scale-95 transition ${
                active ? `${bgClass} shadow-lg` : "bg-slate-800"
              }`}
            >
              <PatternThumb mode={mode} patternKey={p.key} pattern={rotatePattern(PATTERNS[p.key], active ? patternRotation : 0)} color={p.color} active={active} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="text-[13px] font-bold">{p.label}</div>
                  {mode === "wireworld" && (
                    <>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                        PRESET_LIBRARY[p.key]?.variant === "static"
                          ? active ? "bg-white/20 text-white" : "bg-slate-700 text-slate-200"
                          : active ? "bg-amber-200/20 text-white" : "bg-amber-500/20 text-amber-200"
                      }`}>
                        {PRESET_LIBRARY[p.key]?.variant === "static" ? "Static Blueprint" : "Live Circuit"}
                      </span>
                      {PRESET_LIBRARY[p.key]?.ruleSet === "orthogonal" && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
                          active ? "bg-cyan-200/20 text-white" : "bg-cyan-500/20 text-cyan-200"
                        }`}>
                          Orthogonal Only
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className={`text-[10px] mt-0.5 ${active ? "text-white/80" : "text-slate-400"}`}>{p.sub}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-[11px] text-slate-400">
        {mode === "wireworld" || mode === "langton"
          ? "Press, drag to preview, then release to place."
          : "Press, drag to preview, release to place. Hold to rotate 90°."}
      </div>
    </div>
  );
}

function PatternThumb({ mode, patternKey, pattern, color, active }) {
  const preset = PRESET_LIBRARY[patternKey];
  const rows = pattern || (() => {
    if (!preset) return null;
    const width = preset.width || 1;
    const height = preset.height || 1;
    const grid = Array.from({ length: height }, () => Array(width).fill(0));
    for (const cell of preset.cells || []) {
      if (grid[cell.y] && grid[cell.y][cell.x] != null) grid[cell.y][cell.x] = cell.state;
    }
    return grid;
  })();
  if (!rows) return null;
  const cols = Math.max(...rows.map((r) => r.length));
  const gap = 1;
  const maxThumb = 30;
  const px = Math.max(1, Math.floor((maxThumb - Math.max(0, cols - 1) * gap) / Math.max(1, cols)));
  const presetWidth = preset?.width || cols;
  const presetHeight = preset?.height || rows.length;
  const getStateColor = (v) => {
    if (mode === "wireworld") {
      if (v === WIRE_CONDUCTOR) return "bg-amber-400";
      if (v === WIRE_HEAD) return "bg-cyan-400";
      if (v === WIRE_TAIL) return "bg-orange-500";
      return "bg-transparent";
    }
    if (mode === "langton") {
      return v === 0 ? "bg-transparent" : "bg-fuchsia-400";
    }
    return `bg-${v === 1 ? color : v === 2 ? "white/50" : "transparent"}`;
  };
  return (
    <div
      className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${
        active ? "bg-black/25" : "bg-slate-950"
      }`}
    >
      <div
        className="relative"
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
                className={`rounded-[1px] ${getStateColor(v)}`}
                style={{ width: px, height: px }}
              />
            );
          })
        )}
        {preset?.ants?.map((ant, idx) => {
          const left = ((presetWidth / 2 + ant.x) / Math.max(1, presetWidth)) * (cols * px + Math.max(0, cols - 1) * gap);
          const top = ((presetHeight / 2 + ant.y) / Math.max(1, presetHeight)) * (rows.length * px + Math.max(0, rows.length - 1) * gap);
          return (
            <div
              key={`ant-${idx}`}
              className="absolute rounded-full border border-slate-950/60"
              style={{
                width: Math.max(2, px),
                height: Math.max(2, px),
                left: Math.max(0, left - px * 0.5),
                top: Math.max(0, top - px * 0.5),
                background: ant.color || "#f8fafc",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function RulesSheet({
  mode, preset, applyPreset, birth, setBirth, survive, setSurvive,
  wirePresetId, wireOrthogonalOnly, setWireOrthogonalOnly,
  boidCount, setBoidCount, boidVision, setBoidVision, boidSeparation, setBoidSeparation,
  boidAlignment, setBoidAlignment, boidCohesion, setBoidCohesion, boidSteer, setBoidSteer,
  boidMinSpeed, setBoidMinSpeed, boidMaxSpeed, setBoidMaxSpeed, boidDrag, setBoidDrag,
  boidRandomness, setBoidRandomness, boidBounce, setBoidBounce,
  boidShape, setBoidShape, sharkEnabled, setSharkEnabled,
  nbodyPreset, setNbodyPreset, applyNBodyPreset,
  nbodyCount, setNbodyCount, nbodyGravity, setNbodyGravity, nbodyDamping, setNbodyDamping, nbodySoftening, setNbodySoftening, nbodyMaxSpeed, setNbodyMaxSpeed,
  nbodyCentralBody, nbodyOrbiterMass, setNbodyOrbiterMass,
  slimeCount, setSlimeCount, slimeSensorAngle, setSlimeSensorAngle, slimeSensorDist, setSlimeSensorDist,
  slimeTurnSpeed, setSlimeTurnSpeed, slimeSpeed, setSlimeSpeed, slimeDeposit, setSlimeDeposit,
  slimeDecay, setSlimeDecay, slimeDiffuse, setSlimeDiffuse, slimeWiggle, setSlimeWiggle,
  slimeMazeMode, setSlimeMazeMode, slimeMazeLevel, setSlimeMazeLevel, slimeSolverType, setSlimeSolverType, slimeEscaped, slimeFillPct,
  slimeCheckpointPct, setSlimeCheckpointPct, slimeRestartPct, setSlimeRestartPct,
  slimeAutoLoop, setSlimeAutoLoop, slimeCheckpointReady, slimeDebugFlow, setSlimeDebugFlow, slimeDebugStats, saveSlimeCheckpointNow, replaySlimeCheckpoint, loadUTestMaze, regenerateSlimeMaze,
  langtonRule, setLangtonRule, langtonAntCount, setLangtonAntCount, langtonShowDirections, setLangtonShowDirections, langtonShowTrails, setLangtonShowTrails, langtonPresetId,
  applyLangtonPreset, resetLangtonAnts, randomizeLangtonAnts,
  onResetBoids, onResetNBody, reinitBoids, reinitNBody, toggleNbodyCentralBody, onClose,
}) {
  return (
    <div>
      <SheetHeader title="Rules" onClose={onClose} />
      {mode === "conway" ? (
        <>
          <div className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-2">Presets</div>
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`min-h-11 px-3 py-2 rounded-xl text-left text-white active:scale-95 transition whitespace-normal leading-tight ${
                  preset === p.id ? "bg-slate-700 ring-1 ring-sky-400/80" : "bg-slate-800"
                }`}
              >
                <div className="text-xs font-bold">{p.label}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.rule}</div>
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-2">Birth</div>
          <div className="grid grid-cols-9 gap-1.5 mb-3.5">
            {[0,1,2,3,4,5,6,7,8].map((n) => (
              <button
                key={`b${n}`}
                onClick={() => setBirth(birth.includes(n) ? birth.filter(x=>x!==n) : [...birth, n].sort())}
                className={`w-full h-[30px] rounded-lg text-[13px] font-bold tabular-nums active:scale-95 transition ${
                  birth.includes(n) ? "bg-sky-500 shadow-md shadow-sky-500/50" : "bg-slate-800"
                }`}
              >{n}</button>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-2">Survival</div>
          <div className="grid grid-cols-9 gap-1.5">
            {[0,1,2,3,4,5,6,7,8].map((n) => (
              <button
                key={`s${n}`}
                onClick={() => setSurvive(survive.includes(n) ? survive.filter(x=>x!==n) : [...survive, n].sort())}
                className={`w-full h-[30px] rounded-lg text-[13px] font-bold tabular-nums active:scale-95 transition ${
                  survive.includes(n) ? "bg-violet-600 shadow-md shadow-violet-600/50" : "bg-slate-800"
                }`}
              >{n}</button>
            ))}
          </div>
        </>
      ) : mode === "brian" ? (
        <div className="p-3.5 rounded-2xl bg-slate-800 text-slate-300 text-xs leading-relaxed">
          <div className="text-white font-bold mb-1.5 text-[13px]">Brian's Brain</div>
          Fixed 3-state rule. To edit B/S rules, switch to <span className="text-sky-400 font-bold">Life</span> mode using the chip at top-left.
        </div>
      ) : mode === "wireworld" ? (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-800 text-slate-300 text-xs leading-relaxed">
            <div className="text-white font-bold mb-1.5 text-[13px]">Wireworld</div>
            Empty stays empty. Heads become tails, tails cool into conductors, and conductors ignite when 1 or 2 neighboring heads touch them.
          </div>
          <button
            onClick={() => setWireOrthogonalOnly(!wireOrthogonalOnly)}
            className={`w-full py-2 rounded-xl text-xs font-semibold active:scale-95 transition ${
              wireOrthogonalOnly ? "bg-slate-100 text-slate-900" : "bg-slate-800 text-slate-200"
            }`}
          >{wireOrthogonalOnly ? "Experimental: Orthogonal Only" : "Standard: 8-Neighborhood"}</button>
          <div className="px-3 py-2 rounded-xl bg-slate-800 text-[11px] text-slate-300">
            {wireOrthogonalOnly
              ? "Only up, down, left, right neighbors can ignite a conductor. Existing presets may behave differently."
              : "Standard Wireworld counts all 8 neighboring cells, including diagonals."}
          </div>
          <div className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-1">Preset Families</div>
          <div className="grid grid-cols-2 gap-1.5">
            {["Basic", "Logic", "Showcase"].map((group) => (
              <div key={group} className="px-3 py-2 rounded-xl bg-slate-800 text-[11px] text-slate-300">
                <div className="font-semibold text-white mb-0.5">{group}</div>
                {group === "Basic" ? "Straight, corner, splitter, loop, pulse generator." : group === "Logic" ? "Diode-like routing, merge, fork, clock." : "Circuit garden and pulse maze."}
              </div>
            ))}
          </div>
          <div className="px-3 py-2 rounded-xl bg-slate-800 text-[11px] text-slate-300">
            Current preset: <span className="text-amber-300 font-semibold">{PRESET_LIBRARY[wirePresetId]?.name || "Custom"}</span>
          </div>
        </div>
      ) : mode === "langton" ? (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-800 text-slate-300 text-xs leading-relaxed">
            <div className="text-white font-bold mb-1.5 text-[13px]">Langton&apos;s Ant</div>
            On each step an ant turns left or right from the current cell state, advances one cell, and cycles that cell to the next color in the rule string.
          </div>
          <label className="block">
            <div className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-2">Rule String</div>
            <input
              value={langtonRule}
              onChange={(e) => setLangtonRule(sanitizeLangtonRule(e.target.value))}
              placeholder="RL"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white text-sm outline-none border border-white/10 focus:border-sky-400/60"
            />
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "RL", label: "Classic RL" },
              { id: "RLLR", label: "Chaotic RLLR" },
              { id: "LLRR", label: "Symmetric LLRR" },
              { id: "LRRRRRLLR", label: "Colorful LRRRRRLLR" },
              { id: "RLR", label: "Experimental RLR" },
              { id: "LLRRRLR", label: "Experimental LLRRRLR" },
            ].map((rule) => (
              <button
                key={rule.id}
                onClick={() => setLangtonRule(rule.id)}
                className={`px-3 py-2 rounded-xl text-[11px] font-semibold text-left transition active:scale-95 ${
                  langtonRule === rule.id ? "bg-fuchsia-500 text-white" : "bg-slate-800 text-slate-300"
                }`}
              >{rule.label}</button>
            ))}
          </div>
          <RangeRow label="Ants" value={langtonAntCount} min={1} max={24} step={1} onChange={setLangtonAntCount} />
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => resetLangtonAnts()}
              className="w-full py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 active:scale-95 transition"
            >Reset Ants</button>
            <button
              onClick={() => randomizeLangtonAnts(langtonAntCount)}
              className="w-full py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 active:scale-95 transition"
            >Random Ants</button>
            <button
              onClick={() => setLangtonShowDirections(!langtonShowDirections)}
              className={`w-full py-2 rounded-xl text-xs font-semibold active:scale-95 transition ${
                langtonShowDirections ? "bg-slate-100 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >{langtonShowDirections ? "Show Directions: On" : "Show Directions: Off"}</button>
            <button
              onClick={() => setLangtonShowTrails(!langtonShowTrails)}
              className={`w-full py-2 rounded-xl text-xs font-semibold active:scale-95 transition ${
                langtonShowTrails ? "bg-slate-100 text-slate-900" : "bg-slate-800 text-slate-200"
              }`}
            >{langtonShowTrails ? "Trails: On" : "Trails: Off"}</button>
          </div>
          <div className="px-3 py-2 rounded-xl bg-slate-800 text-[11px] text-slate-300">
            Current preset: <span className="text-fuchsia-300 font-semibold">{PRESET_LIBRARY[langtonPresetId]?.name || "Custom"}</span>
          </div>
        </div>
      ) : mode === "boids" ? (
        <div className="space-y-3">
          <button
            onClick={onResetBoids}
            className="w-full py-2 rounded-xl bg-slate-700 text-xs font-semibold text-white active:scale-95 transition"
          >Reset Boids Defaults</button>
          <button
            onClick={() => setSharkEnabled(!sharkEnabled)}
            className={`w-full py-2 rounded-xl text-xs font-semibold active:scale-95 transition ${
              sharkEnabled ? "bg-slate-100 text-slate-900" : "bg-slate-800 text-slate-200"
            }`}
          >{sharkEnabled ? "Shark: On" : "Shark: Off"}</button>
          <div>
            <div className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-2">Shapes</div>
            <div className="grid grid-cols-2 gap-1.5">
              {BOID_SHAPES.map((s) => (
                <button
                  key={`shape-${s.id}`}
                  onClick={() => setBoidShape(s.id)}
                  className={`py-2 rounded-lg text-[11px] font-semibold transition active:scale-95 ${
                    boidShape === s.id ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"
                  }`}
                >{s.label}</button>
              ))}
            </div>
          </div>
          <RangeRow label="Count" value={boidCount} min={40} max={700} step={10} onChange={setBoidCount} />
          <button
            onClick={reinitBoids}
            className="w-full py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 active:scale-95 transition"
          >Apply Count</button>
          <RangeRow label="Vision" value={boidVision} min={20} max={110} step={1} onChange={setBoidVision} />
          <RangeRow label="Separation" value={boidSeparation} min={0} max={2} step={0.01} onChange={setBoidSeparation} />
          <RangeRow label="Alignment" value={boidAlignment} min={0} max={0.3} step={0.002} onChange={setBoidAlignment} />
          <RangeRow label="Cohesion" value={boidCohesion} min={0} max={0.06} step={0.001} onChange={setBoidCohesion} />
          <RangeRow label="Steer" value={boidSteer} min={0.02} max={0.5} step={0.005} onChange={setBoidSteer} />
          <RangeRow label="Min speed" value={boidMinSpeed} min={0.2} max={3} step={0.05} onChange={setBoidMinSpeed} />
          <RangeRow label="Max speed" value={boidMaxSpeed} min={0.6} max={6} step={0.05} onChange={setBoidMaxSpeed} />
          <RangeRow label="Drag" value={boidDrag} min={0.93} max={1} step={0.001} onChange={setBoidDrag} />
          <RangeRow label="Randomness" value={boidRandomness} min={0} max={0.09} step={0.001} onChange={setBoidRandomness} />
          <button
            onClick={() => setBoidBounce(!boidBounce)}
            className={`w-full py-2 rounded-xl text-xs font-semibold active:scale-95 transition ${
              boidBounce ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >{boidBounce ? "Bounce Edges: On" : "Bounce Edges: Off (Wrap)"}</button>
        </div>
      ) : mode === "nbody" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5">
            {NBODY_PRESETS.map((preset) => (
              <button
                key={`nbody-preset-${preset.id}`}
                onClick={() => applyNBodyPreset(preset.id)}
                className={`min-h-10 px-2 py-2 rounded-lg text-[11px] leading-tight font-semibold text-center whitespace-normal transition active:scale-95 ${
                  nbodyPreset === preset.id ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300"
                }`}
              >{preset.label}</button>
            ))}
          </div>
          <button
            onClick={onResetNBody}
            className="w-full py-2 rounded-xl bg-slate-700 text-xs font-semibold text-white active:scale-95 transition"
          >Reset N-Body Defaults</button>
          <button
            onClick={toggleNbodyCentralBody}
            className={`w-full py-2 rounded-xl text-xs font-semibold active:scale-95 transition ${
              nbodyCentralBody ? "bg-slate-100 text-slate-900" : "bg-slate-800 text-slate-200"
            }`}
          >{nbodyCentralBody ? "Central Body: On" : "Central Body: Off"}</button>
          <div className="grid grid-cols-3 gap-1.5">
            {NBODY_COUNTS.map((count) => (
              <button
                key={`nbody-count-${count}`}
                onClick={() => setNbodyCount(count)}
                className={`py-2 rounded-lg text-[11px] font-semibold transition active:scale-95 ${
                  nbodyCount === count ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300"
                }`}
              >{count}</button>
            ))}
          </div>
          <button
            onClick={reinitNBody}
            className="w-full py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 active:scale-95 transition"
          >Apply Count</button>
          <RangeRow label="Gravity" value={nbodyGravity} min={0.05} max={1.2} step={0.01} onChange={setNbodyGravity} />
          <RangeRow label="Damping" value={nbodyDamping} min={0.96} max={1} step={0.0005} onChange={setNbodyDamping} />
          <RangeRow label="Softening" value={nbodySoftening} min={4} max={60} step={1} onChange={setNbodySoftening} />
          <RangeRow label="Max speed" value={nbodyMaxSpeed} min={1} max={8} step={0.1} onChange={setNbodyMaxSpeed} />
          <RangeRow label="Body mass" value={nbodyOrbiterMass} min={1} max={300} step={1} onChange={setNbodyOrbiterMass} />
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => {
              const nextMazeMode = !slimeMazeMode;
              setSlimeMazeMode(nextMazeMode);
              setSlimeSolverType(nextMazeMode ? "flow" : "slime");
            }}
            className={`w-full py-2 rounded-xl text-xs font-semibold active:scale-95 transition ${
              slimeMazeMode ? "bg-amber-500 text-slate-900" : "bg-slate-800 text-slate-200"
            }`}
          >{slimeMazeMode ? "Maze Challenge: On" : "Maze Challenge: Off"}</button>
          {slimeMazeMode && (
            <>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(SLIME_MAZE_LEVELS).map(([id, cfg]) => (
                  <button
                    key={id}
                    onClick={() => setSlimeMazeLevel(id)}
                    className={`py-2 rounded-lg text-[11px] font-semibold transition active:scale-95 ${
                      slimeMazeLevel === id ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300"
                    }`}
                  >{cfg.label}</button>
                ))}
              </div>
              <RangeRow label="Decay" value={slimeDecay} min={0.9} max={0.999} step={0.001} onChange={setSlimeDecay} />
              <RangeRow label="Diffuse" value={slimeDiffuse} min={0} max={1} step={0.01} onChange={setSlimeDiffuse} />
            </>
          )}
          {!slimeMazeMode && (
            <>
              <RangeRow label="Agents" value={slimeCount} min={500} max={20000} step={500} onChange={setSlimeCount} />
              <RangeRow label="Sensor angle" value={slimeSensorAngle} min={0.1} max={1.4} step={0.01} onChange={setSlimeSensorAngle} />
              <RangeRow label="Sensor dist" value={slimeSensorDist} min={2} max={24} step={1} onChange={setSlimeSensorDist} />
              <RangeRow label="Turn speed" value={slimeTurnSpeed} min={0.05} max={1.2} step={0.01} onChange={setSlimeTurnSpeed} />
              <RangeRow label="Speed" value={slimeSpeed} min={0.2} max={3} step={0.05} onChange={setSlimeSpeed} />
              <RangeRow label="Deposit" value={slimeDeposit} min={0.2} max={3} step={0.05} onChange={setSlimeDeposit} />
              <RangeRow label="Decay" value={slimeDecay} min={0.9} max={0.999} step={0.001} onChange={setSlimeDecay} />
              <RangeRow label="Diffuse" value={slimeDiffuse} min={0} max={1} step={0.01} onChange={setSlimeDiffuse} />
              <RangeRow label="Wiggle" value={slimeWiggle} min={0} max={0.25} step={0.005} onChange={setSlimeWiggle} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RangeRow({ label, value, min, max, step, onChange }) {
  const pretty = typeof value === "number" && !Number.isInteger(value) ? value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "") : value;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-slate-400">{label}</span>
        <span className="text-[11px] font-mono text-slate-200">{pretty}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sky-500"
      />
    </div>
  );
}

// ─── Icons ─────────────────────────────────────────────────────
function PlayIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l10-5.5z"/></svg>;
}
function PauseIcon() {
  return <svg width="11" height="13" viewBox="0 0 12 14" fill="currentColor"><rect x="0" y="0" width="4" height="14" rx="1"/><rect x="8" y="0" width="4" height="14" rx="1"/></svg>;
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
function PaletteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="9" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="9" cy="15" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="15" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function ColorSheet({ mode, boidColorMode, setBoidColorMode, colorPaletteId, wireThemeId, setWireThemeId, selectPalette, onClose }) {
  if (mode === "wireworld") {
    return (
      <div>
        <SheetHeader title="Wireworld Theme" onClose={onClose} />
        <div className="mb-3 px-3 py-2 rounded-xl bg-slate-800 text-[11px] text-slate-300">
          Keep semantic colors, but swap the circuit theme for conductor, head, and tail states.
        </div>
        <div className="grid grid-cols-2 gap-2">
          {WIREWORLD_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setWireThemeId(theme.id)}
              className={`p-2.5 rounded-2xl bg-slate-800 active:scale-95 transition text-left ${
                wireThemeId === theme.id ? "ring-2 ring-white/40" : ""
              }`}
            >
              <div className="flex gap-1 mb-2">
                <div className="h-5 flex-1 rounded-md" style={{ background: theme.colors.empty }} />
                <div className="h-5 flex-1 rounded-md" style={{ background: theme.colors.conductor }} />
                <div className="h-5 flex-1 rounded-md" style={{ background: theme.colors.head }} />
                <div className="h-5 flex-1 rounded-md" style={{ background: theme.colors.tail }} />
              </div>
              <div className="text-[11px] text-slate-200 font-medium">{theme.label}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <SheetHeader title={mode === "langton" ? "Langton Palette" : "Color Mode"} onClose={onClose} />
      {mode === "boids" && (
        <div className="mb-3">
          <div className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-2">Boids Metric</div>
          <div className="grid grid-cols-2 gap-1.5">
            {BOID_COLOR_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setBoidColorMode(m.id)}
                className={`py-2 rounded-lg text-[11px] font-semibold transition active:scale-95 ${
                  boidColorMode === m.id ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300"
                }`}
              >{m.label}</button>
            ))}
          </div>
        </div>
      )}
      {mode === "langton" && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-slate-800 text-[11px] text-slate-300">
          Cell states cycle through the selected palette in rule-string order.
        </div>
      )}
      <div className="grid grid-cols-3 auto-rows-fr gap-2">
        <button
          onClick={() => selectPalette(null)}
          className={`h-full p-2.5 rounded-2xl bg-slate-800 active:scale-95 transition ${colorPaletteId === null ? "ring-2 ring-white/40" : ""}`}
        >
          <div className="flex gap-0.5 mb-1.5">
            {[0.25, 0.45, 0.65, 0.82, 1].map((op, i) => (
              <div key={i} className="h-4 flex-1 rounded-sm" style={{ background: `rgba(56,189,248,${op})` }} />
            ))}
          </div>
          <div className="text-[11px] text-slate-300 font-medium">Classic</div>
        </button>
        {PALETTES.map(p => (
          <button
            key={p.id}
            onClick={() => selectPalette(p)}
            className={`h-full p-2.5 rounded-2xl bg-slate-800 active:scale-95 transition ${colorPaletteId === p.id ? "ring-2 ring-white/40" : ""}`}
          >
            <div className="flex gap-0.5 mb-1.5">
              {[0, 2, 4, 6, 8].map(i => (
                <div key={i} className="h-4 flex-1 rounded-sm" style={{ background: p.colors[i] }} />
              ))}
            </div>
            <div className="text-[11px] text-slate-300 font-medium">{p.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
