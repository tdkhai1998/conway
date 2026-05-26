function generateUTestMazeWorld(w, h) {
  const mask = new Uint8Array(w * h);
  const setWalk = (x0, y0, x1, y1) => {
    for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) {
        mask[y * w + x] = 1;
      }
    }
  };

  const left = Math.floor(w * 0.18);
  const right = Math.floor(w * 0.82);
  const bottom = Math.floor(h * 0.72);
  const top = Math.floor(h * 0.26);
  const ch = Math.max(8, Math.floor(Math.min(w, h) * 0.015));

  setWalk(left, bottom - ch, right - ch, bottom + ch);
  setWalk(right - ch, top, right + ch, bottom + ch);
  setWalk(right - ch, top - ch, Math.min(w - 1, right + Math.floor(w * 0.12)), top + ch);

  return {
    mask,
    entryPx: { x: left + ch + 2, y: bottom },
    exitPx: { x: Math.min(w - 2, right + Math.floor(w * 0.1)), y: top },
  };
}

function buildMazeFloodMeta(mask, w, h, entryPx) {
  const startX = Math.max(0, Math.min(w - 1, Math.floor(entryPx.x)));
  const startY = Math.max(0, Math.min(h - 1, Math.floor(entryPx.y)));
  const startIdx = startY * w + startX;
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
  for (let i = 0; i < total; i++) {
    if (mask[i] !== 1 || !Number.isFinite(head[i]) || head[i] >= inf) continue;
    const cost = head[i] * riseWeight + dist[i];
    arrival[i] = cost;
    if (cost > maxArrival) maxArrival = cost;
  }

  return { arrival, head, dist, riseWeight, maxArrival };
}

function stepMazeFlow(w, h, opt, scratch) {
  scratch.fill(0);
  const { mazeMask: mask, flowMeta: meta, progress, maxValue = 1.2, fillSpan = 9 } = opt;
  for (let i = 0; i < scratch.length; i++) {
    if (mask[i] !== 1) continue;
    const arrival = meta.arrival[i];
    if (!Number.isFinite(arrival) || arrival > meta.maxArrival + fillSpan) continue;
    const delta = progress - arrival;
    if (delta <= 0) continue;
    scratch[i] = Math.min(maxValue, (delta / fillSpan) * maxValue);
  }
  return scratch;
}

function stats(field, mask) {
  let nonZero = 0;
  let peak = 0;
  let aboveCount = 0;
  let total = 0;
  for (let i = 0; i < field.length; i++) {
    if (mask[i] !== 1) continue;
    total += 1;
    const v = field[i];
    if (v > 0.0001) nonZero += 1;
    if (v > peak) peak = v;
    if (v > 0.05) aboveCount += 1;
  }
  return { nonZero, peak, fillPct: total ? (aboveCount / total) * 100 : 0 };
}

const w = 240;
const h = 160;
const maze = generateUTestMazeWorld(w, h);
const meta = buildMazeFloodMeta(maze.mask, w, h, maze.entryPx);
let field = new Float32Array(w * h);
let progress = 0;

for (let tick = 1; tick <= 300; tick++) {
  for (let i = 0; i < 2; i++) {
    progress += 2.2;
    field = stepMazeFlow(w, h, {
      mazeMask: maze.mask,
      flowMeta: meta,
      progress,
      maxValue: 1.2,
      fillSpan: 12,
    }, field);
  }
  if (tick % 25 === 0) {
    const s = stats(field, maze.mask);
    const exitIdx = Math.floor(maze.exitPx.y) * w + Math.floor(maze.exitPx.x);
    const topProbeIdx = Math.floor((maze.exitPx.y + 6)) * w + Math.floor(maze.exitPx.x);
    console.log(JSON.stringify({
      tick,
      progress,
      fillPct: Number(s.fillPct.toFixed(2)),
      nonZero: s.nonZero,
      peak: Number(s.peak.toFixed(3)),
      exit: Number((field[exitIdx] || 0).toFixed(3)),
      topProbe: Number((field[topProbeIdx] || 0).toFixed(3)),
    }));
  }
}
