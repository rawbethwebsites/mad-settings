// Chop Chop match-3 rules. Pure functions so the board can be animated one step at a time.

export const SIZE = 8;
export const KINDS = 6;

// row / col: striped snack that clears its line. bomb: clears the 3x3 around it.
// pot: the Jollof pot (made from 5 in a row) clears every snack of one kind.
export type Special = 'none' | 'row' | 'col' | 'bomb' | 'pot';

export interface Tile { id: number; kind: number; special: Special }
export type Board = (Tile | null)[][];
export type Cell = [number, number];

export const POINTS_PER_SNACK = 20;
const MAKE_BONUS: Record<Special, number> = { none: 0, row: 60, col: 60, bomb: 120, pot: 200 };

let nextId = 1;
export const makeTile = (kind: number, special: Special = 'none'): Tile => ({ id: nextId++, kind, special });

const key = (r: number, c: number) => r * SIZE + c;
const at = (k: number): Cell => [Math.floor(k / SIZE), k % SIZE];
const inside = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

export function clone(b: Board): Board {
  return b.map(row => row.map(t => (t ? { ...t } : null)));
}

const matchable = (t: Tile | null) => !!t && t.special !== 'pot';

interface Run { cells: Cell[]; dir: 'h' | 'v' }

function runs(b: Board): Run[] {
  const out: Run[] = [];
  for (let r = 0; r < SIZE; r++) {
    let c = 0;
    while (c < SIZE) {
      const t = b[r][c];
      let end = c + 1;
      if (matchable(t)) while (end < SIZE && matchable(b[r][end]) && b[r][end]!.kind === t!.kind) end++;
      if (matchable(t) && end - c >= 3) out.push({ dir: 'h', cells: Array.from({ length: end - c }, (_, i) => [r, c + i] as Cell) });
      c = end;
    }
  }
  for (let c = 0; c < SIZE; c++) {
    let r = 0;
    while (r < SIZE) {
      const t = b[r][c];
      let end = r + 1;
      if (matchable(t)) while (end < SIZE && matchable(b[end][c]) && b[end][c]!.kind === t!.kind) end++;
      if (matchable(t) && end - r >= 3) out.push({ dir: 'v', cells: Array.from({ length: end - r }, (_, i) => [r + i, c] as Cell) });
      r = end;
    }
  }
  return out;
}

export function hasMatch(b: Board) {
  return runs(b).length > 0;
}

// Runs that share a cell belong to one group (that is how L and T shapes are found).
function groups(rs: Run[]): Run[][] {
  const parent = rs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map<number, number>();
  rs.forEach((run, i) => run.cells.forEach(([r, c]) => {
    const k = key(r, c);
    if (owner.has(k)) parent[find(i)] = find(owner.get(k)!);
    else owner.set(k, i);
  }));
  const byRoot = new Map<number, Run[]>();
  rs.forEach((run, i) => {
    const root = find(i);
    byRoot.set(root, [...(byRoot.get(root) ?? []), run]);
  });
  return [...byRoot.values()];
}

function specialFor(group: Run[]): Special {
  const longest = Math.max(...group.map(g => g.cells.length));
  if (longest >= 5) return 'pot';
  if (group.some(g => g.dir === 'h') && group.some(g => g.dir === 'v')) return 'bomb';
  if (longest === 4) return group[0].dir === 'h' ? 'row' : 'col';
  return 'none';
}

function mostCommonKind(b: Board, skip: Set<number>): number {
  const count = Array(KINDS).fill(0);
  b.forEach((row, r) => row.forEach((t, c) => { if (t && t.special !== 'pot' && !skip.has(key(r, c))) count[t.kind]++; }));
  return count.indexOf(Math.max(...count));
}

function blast(b: Board, r: number, c: number, special: Special, clear: Set<number>) {
  const add = (rr: number, cc: number) => { if (inside(rr, cc) && b[rr][cc]) clear.add(key(rr, cc)); };
  if (special === 'row') for (let i = 0; i < SIZE; i++) add(r, i);
  if (special === 'col') for (let i = 0; i < SIZE; i++) add(i, c);
  if (special === 'bomb') for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) add(r + dr, c + dc);
  if (special === 'pot') {
    const kind = mostCommonKind(b, clear);
    b.forEach((row, rr) => row.forEach((t, cc) => { if (t && t.kind === kind && t.special !== 'pot') add(rr, cc); }));
  }
}

// Every special caught in the clear goes off too, which can catch more specials.
function spread(b: Board, clear: Set<number>, spent: Set<number>) {
  const queue = [...clear];
  while (queue.length) {
    const k = queue.pop()!;
    if (spent.has(k)) continue;
    spent.add(k);
    const [r, c] = at(k);
    const t = b[r][c];
    if (!t || t.special === 'none') continue;
    const before = new Set(clear);
    blast(b, r, c, t.special, clear);
    clear.forEach(n => { if (!before.has(n)) queue.push(n); });
  }
}

export interface Step {
  cleared: { id: number; r: number; c: number }[];
  made: { r: number; c: number; special: Special }[];
  points: number;
  board: Board;
  fell: Map<number, number>; // tile id -> rows it dropped (new snacks start above the board)
}

function settleStep(b: Board, clear: Set<number>, made: Step['made'], points: number, rand: () => number): Step {
  const cleared = [...clear].map(k => { const [r, c] = at(k); return { id: b[r][c]!.id, r, c }; });
  const next = clone(b);
  clear.forEach(k => { const [r, c] = at(k); next[r][c] = null; });
  made.forEach(m => {
    const old = b[m.r][m.c]!;
    next[m.r][m.c] = makeTile(m.special === 'pot' ? -1 : old.kind, m.special);
  });
  const fell = new Map<number, number>();
  for (let c = 0; c < SIZE; c++) {
    let write = SIZE - 1;
    for (let r = SIZE - 1; r >= 0; r--) {
      const t = next[r][c];
      if (!t) continue;
      next[r][c] = null;
      next[write][c] = t;
      if (write !== r) fell.set(t.id, write - r);
      write--;
    }
    const empty = write + 1;
    for (let r = write; r >= 0; r--) {
      const t = makeTile(Math.floor(rand() * KINDS));
      next[r][c] = t;
      fell.set(t.id, empty);
    }
  }
  return { cleared, made, points, board: next, fell };
}

// One round of clearing and dropping. `moved` are the two swapped cells (specials are made there first).
export function resolve(b: Board, chain: number, rand: () => number, moved: Cell[] = []): Step | null {
  const rs = runs(b);
  if (!rs.length) return null;
  const clear = new Set<number>();
  const made: Step['made'] = [];
  for (const group of groups(rs)) {
    const cells = group.flatMap(g => g.cells);
    cells.forEach(([r, c]) => clear.add(key(r, c)));
    const special = specialFor(group);
    if (special === 'none') continue;
    const inGroup = (cell: Cell) => cells.some(([r, c]) => r === cell[0] && c === cell[1]);
    const longest = group.reduce((a, g) => (g.cells.length > a.cells.length ? g : a));
    const spot = [...moved.filter(inGroup), longest.cells[Math.floor(longest.cells.length / 2)], ...cells]
      .find(([r, c]) => b[r][c]!.special === 'none' && !made.some(m => m.r === r && m.c === c));
    if (spot) made.push({ r: spot[0], c: spot[1], special });
  }
  made.forEach(m => clear.delete(key(m.r, m.c)));
  const spent = new Set<number>(made.map(m => key(m.r, m.c)));
  spread(b, clear, spent);
  made.forEach(m => clear.delete(key(m.r, m.c)));
  const points = clear.size * POINTS_PER_SNACK * chain + made.reduce((s, m) => s + MAKE_BONUS[m.special], 0);
  return settleStep(b, clear, made, points, rand);
}

export function swap(b: Board, a: Cell, z: Cell): Board {
  const n = clone(b);
  [n[a[0]][a[1]], n[z[0]][z[1]]] = [n[z[0]][z[1]], n[a[0]][a[1]]];
  return n;
}

const isLine = (s: Special) => s === 'row' || s === 'col';

// Two specials swapped together, or a Jollof pot swapped with anything, go off without a match.
export function isCombo(b: Board, a: Cell, z: Cell) {
  const s1 = b[a[0]][a[1]]!.special;
  const s2 = b[z[0]][z[1]]!.special;
  return s1 === 'pot' || s2 === 'pot' || (s1 !== 'none' && s2 !== 'none');
}

export function canSwap(b: Board, a: Cell, z: Cell) {
  return isCombo(b, a, z) || hasMatch(swap(b, a, z));
}

// `b` is the board after the swap; `z` is where the dragged snack landed, `a` where it came from.
export function combo(b: Board, a: Cell, z: Cell, rand: () => number): Step {
  const board = clone(b);
  const A = board[a[0]][a[1]]!;
  const Z = board[z[0]][z[1]]!;
  const clear = new Set<number>([key(...a), key(...z)]);
  const spent = new Set<number>([key(...a), key(...z)]);
  const [r, c] = z;
  const add = (rr: number, cc: number) => { if (inside(rr, cc)) clear.add(key(rr, cc)); };
  const pot = A.special === 'pot' ? Z : Z.special === 'pot' ? A : null;
  if (A.special === 'pot' && Z.special === 'pot') {
    board.forEach((row, rr) => row.forEach((_, cc) => add(rr, cc)));
  } else if (pot) {
    // Every snack of the other kind turns into the other special, then they all go off.
    const other = pot === A ? Z : A;
    board.forEach((row, rr) => row.forEach((t, cc) => {
      if (!t || t.kind !== other.kind || t.special === 'pot') return;
      if (other.special !== 'none') t.special = isLine(other.special) ? (rand() < 0.5 ? 'row' : 'col') : other.special;
      add(rr, cc);
    }));
  } else if (A.special === 'bomb' && Z.special === 'bomb') {
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) add(r + dr, c + dc);
  } else if (A.special === 'bomb' || Z.special === 'bomb') {
    for (let d = -1; d <= 1; d++) for (let i = 0; i < SIZE; i++) { add(r + d, i); add(i, c + d); }
  } else {
    for (let i = 0; i < SIZE; i++) { add(r, i); add(i, c); }
  }
  spread(board, clear, spent);
  return settleStep(board, clear, [], clear.size * POINTS_PER_SNACK * 2 + 200, rand);
}

export function findMove(b: Board): [Cell, Cell] | null {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (c + 1 < SIZE && canSwap(b, [r, c], [r, c + 1])) return [[r, c], [r, c + 1]];
      if (r + 1 < SIZE && canSwap(b, [r, c], [r + 1, c])) return [[r, c], [r + 1, c]];
    }
  }
  return null;
}

// A fresh board with no ready-made matches and at least one move.
export function newBoard(rand: () => number): Board {
  for (;;) {
    const b: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        let kind: number;
        do kind = Math.floor(rand() * KINDS);
        while (
          (c >= 2 && b[r][c - 1]!.kind === kind && b[r][c - 2]!.kind === kind) ||
          (r >= 2 && b[r - 1][c]!.kind === kind && b[r - 2][c]!.kind === kind)
        );
        b[r][c] = makeTile(kind);
      }
    }
    if (findMove(b)) return b;
  }
}

// Same snacks, new places, keeping any specials.
export function shuffle(b: Board, rand: () => number): Board {
  const tiles = b.flat().filter(Boolean) as Tile[];
  for (let tries = 0; tries < 200; tries++) {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    const n: Board = Array.from({ length: SIZE }, (_, r) => tiles.slice(r * SIZE, r * SIZE + SIZE));
    if (!hasMatch(n) && findMove(n)) return n;
  }
  return newBoard(rand);
}

export interface Level { n: number; goal: number; moves: number }

export function level(n: number): Level {
  return { n, goal: 1500 + (n - 1) * 400, moves: Math.max(15, 21 - n) };
}

export function stars(score: number, l: Level) {
  if (score >= l.goal * 1.8) return 3;
  if (score >= l.goal * 1.4) return 2;
  if (score >= l.goal) return 1;
  return 0;
}
