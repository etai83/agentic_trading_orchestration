import type { HexCoord, HexTile, AoePattern } from '../types/game';

/**
 * Returns string key "q,r" for a hex coordinate.
 */
export function coordKey(c: HexCoord): string {
  return `${c.q},${c.r}`;
}

/**
 * Parses "q,r" string key back into HexCoord.
 */
export function parseCoordKey(key: string): HexCoord {
  const [qStr, rStr] = key.split(',');
  return { q: Number(qStr), r: Number(rStr) };
}

/**
 * Checks equality between two hex coordinates.
 */
export function coordsEqual(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

/**
 * Axial hex distance (|dq| + |dq + dr| + |dr|) / 2
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

/**
 * Returns the 6 axial neighbors in clockwise order:
 * [{q: c.q+1, r: c.r}, {q: c.q+1, r: c.r-1}, {q: c.q, r: c.r-1}, {q: c.q-1, r: c.r}, {q: c.q-1, r: c.r+1}, {q: c.q, r: c.r+1}]
 */
export function hexNeighbors(c: HexCoord): HexCoord[] {
  return [
    { q: c.q + 1, r: c.r },
    { q: c.q + 1, r: c.r - 1 },
    { q: c.q, r: c.r - 1 },
    { q: c.q - 1, r: c.r },
    { q: c.q - 1, r: c.r + 1 },
    { q: c.q, r: c.r + 1 },
  ];
}

/**
 * Pointy-top hex layout conversion to pixel coordinates.
 * x = size * Math.sqrt(3) * (c.q + c.r / 2)
 * y = size * (3 / 2) * c.r
 */
export function axialToPixel(c: HexCoord, size: number): { x: number; y: number } {
  return {
    x: size * Math.sqrt(3) * (c.q + c.r / 2),
    y: size * 1.5 * c.r,
  };
}

/**
 * Returns SVG points string "x1,y1 x2,y2 ..." for a pointy-top hexagon.
 */
export function hexPolygonPoints(centerX: number, centerY: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    const x = centerX + size * Math.cos(angleRad);
    const y = centerY + size * Math.sin(angleRad);
    const formattedX = Math.abs(x) < 1e-9 ? 0 : Number(x.toFixed(2));
    const formattedY = Math.abs(y) < 1e-9 ? 0 : Number(y.toFixed(2));
    points.push(`${formattedX},${formattedY}`);
  }
  return points.join(' ');
}

/**
 * Finds tile in array matching coordinate c.
 */
export function getTileAt(tiles: HexTile[], c: HexCoord): HexTile | undefined {
  return tiles.find(t => t.q === c.q && t.r === c.r);
}

/**
 * Rounds cube coordinates to the nearest hex coordinate.
 */
function cubeRound(fracQ: number, fracR: number, fracS: number): HexCoord {
  let q = Math.round(fracQ);
  let r = Math.round(fracR);
  let s = Math.round(fracS);

  const qDiff = Math.abs(q - fracQ);
  const rDiff = Math.abs(r - fracR);
  const sDiff = Math.abs(s - fracS);

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s;
  } else if (rDiff > sDiff) {
    r = -q - s;
  } else {
    s = -q - r;
  }
  return { q, r };
}

/**
 * Checks line of sight between two hexes using cube coordinate interpolation.
 * Returns false if any intermediate tile is unrevealed, missing, 'wall', or unopened 'door'.
 * Note: 'obstacle' does NOT block line of sight.
 */
export function hasLineOfSight(tiles: HexTile[], from: HexCoord, to: HexCoord): boolean {
  const dist = hexDistance(from, to);
  if (dist <= 1) {
    return true;
  }

  const tileMap = new Map<string, HexTile>();
  for (const t of tiles) {
    tileMap.set(coordKey(t), t);
  }

  const q1 = from.q + 1e-6;
  const r1 = from.r + 1e-6;
  const s1 = -from.q - from.r - 2e-6;

  const q2 = to.q;
  const r2 = to.r;
  const s2 = -to.q - to.r;

  const checkedKeys = new Set<string>();

  for (let i = 1; i < dist; i++) {
    const t = i / dist;
    const currQ = q1 + (q2 - q1) * t;
    const currR = r1 + (r2 - r1) * t;
    const currS = s1 + (s2 - s1) * t;

    const hex = cubeRound(currQ, currR, currS);
    const key = coordKey(hex);

    if (checkedKeys.has(key)) continue;
    checkedKeys.add(key);

    if (coordsEqual(hex, from) || coordsEqual(hex, to)) continue;

    const tile = tileMap.get(key);
    if (!tile || !tile.revealed || tile.terrain === 'wall' || (tile.terrain === 'door' && !tile.interacted)) {
      return false;
    }
  }

  return true;
}

/**
 * Computes all hexes reachable within maxMove points using Dijkstra's algorithm.
 */
export function getReachableHexes(params: {
  start: HexCoord;
  maxMove: number;
  jump?: boolean;
  hover?: boolean;
  tiles: HexTile[];
  occupiedByAllies: HexCoord[];
  occupiedByEnemies: HexCoord[];
}): Map<string, { cost: number; path: HexCoord[] }> {
  const { start, maxMove, jump = false, hover = false, tiles, occupiedByAllies, occupiedByEnemies } = params;
  const result = new Map<string, { cost: number; path: HexCoord[] }>();

  if (maxMove < 0) return result;

  const tileMap = new Map<string, HexTile>();
  for (const t of tiles) {
    tileMap.set(coordKey(t), t);
  }

  const enemySet = new Set<string>();
  for (const e of occupiedByEnemies) {
    enemySet.add(coordKey(e));
  }

  const allySet = new Set<string>();
  for (const a of occupiedByAllies) {
    if (!coordsEqual(a, start)) {
      allySet.add(coordKey(a));
    }
  }

  const bestCost = new Map<string, number>();
  const bestPath = new Map<string, HexCoord[]>();

  const startKey = coordKey(start);
  bestCost.set(startKey, 0);
  bestPath.set(startKey, []);

  const frontier: { coord: HexCoord; cost: number; path: HexCoord[] }[] = [
    { coord: start, cost: 0, path: [] },
  ];

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift()!;

    if (current.cost > (bestCost.get(coordKey(current.coord)) ?? Infinity)) {
      continue;
    }

    for (const neighbor of hexNeighbors(current.coord)) {
      const nKey = coordKey(neighbor);
      const tile = tileMap.get(nKey);

      // Unrevealed or missing or wall cannot be entered
      if (!tile || !tile.revealed || tile.terrain === 'wall') {
        continue;
      }

      // Obstacle cannot be entered unless jump or hover
      if (tile.terrain === 'obstacle' && !jump && !hover) {
        continue;
      }

      // Enemy-occupied hexes cannot be entered unless jump or hover
      if (enemySet.has(nKey) && !jump && !hover) {
        continue;
      }

      // Terrain movement cost: 'difficult' costs 2 unless jump or hover; all others cost 1
      const stepCost = (!jump && !hover && tile.terrain === 'difficult') ? 2 : 1;
      const nextCost = current.cost + stepCost;

      if (nextCost > maxMove) {
        continue;
      }

      const prevBest = bestCost.get(nKey);
      if (prevBest === undefined || nextCost < prevBest) {
        const nextPath = [...current.path, neighbor];
        bestCost.set(nKey, nextCost);
        bestPath.set(nKey, nextPath);
        frontier.push({ coord: neighbor, cost: nextCost, path: nextPath });
      }
    }
  }

  // Filter valid end positions
  for (const [key, cost] of bestCost.entries()) {
    const coord = parseCoordKey(key);
    const isStart = coordsEqual(coord, start);

    if (isStart) {
      result.set(key, { cost: 0, path: [] });
      continue;
    }

    // A unit can NEVER end its move on any occupied hex (ally or enemy, except start)
    if (allySet.has(key) || enemySet.has(key)) {
      continue;
    }

    // A unit without hover cannot END its move on an obstacle
    const tile = tileMap.get(key);
    if (tile && tile.terrain === 'obstacle' && !hover) {
      continue;
    }

    result.set(key, { cost, path: bestPath.get(key)! });
  }

  return result;
}

/**
 * Finds shortest path from start to goal for Enemy AI.
 * Returns path of HexCoord[] (excluding start, including goal if reachable).
 */
export function findShortestPath(params: {
  start: HexCoord;
  goal: HexCoord;
  jump?: boolean;
  hover?: boolean;
  tiles: HexTile[];
  blockedCoords: HexCoord[];
}): HexCoord[] {
  const { start, goal, jump = false, hover = false, tiles, blockedCoords } = params;

  if (coordsEqual(start, goal)) {
    return [];
  }

  const tileMap = new Map<string, HexTile>();
  for (const t of tiles) {
    tileMap.set(coordKey(t), t);
  }

  const goalKey = coordKey(goal);
  const goalTile = tileMap.get(goalKey);
  if (!goalTile || !goalTile.revealed || goalTile.terrain === 'wall') {
    return [];
  }
  if (goalTile.terrain === 'obstacle' && !hover) {
    return [];
  }

  const blockedSet = new Set<string>();
  for (const b of blockedCoords) {
    if (!coordsEqual(b, start) && !coordsEqual(b, goal)) {
      blockedSet.add(coordKey(b));
    }
  }

  const bestCost = new Map<string, number>();
  const bestPath = new Map<string, HexCoord[]>();
  const startKey = coordKey(start);

  bestCost.set(startKey, 0);
  bestPath.set(startKey, []);

  const frontier: { coord: HexCoord; cost: number; steps: number; path: HexCoord[] }[] = [
    { coord: start, cost: 0, steps: 0, path: [] },
  ];

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost || a.steps - b.steps);
    const current = frontier.shift()!;

    if (coordsEqual(current.coord, goal)) {
      return current.path;
    }

    if (current.cost > (bestCost.get(coordKey(current.coord)) ?? Infinity)) {
      continue;
    }

    for (const neighbor of hexNeighbors(current.coord)) {
      const nKey = coordKey(neighbor);
      const tile = tileMap.get(nKey);

      if (!tile || !tile.revealed || tile.terrain === 'wall') {
        continue;
      }
      if (tile.terrain === 'obstacle' && !jump && !hover) {
        continue;
      }
      if (blockedSet.has(nKey) && !jump && !hover) {
        continue;
      }

      const stepCost = (!jump && !hover && tile.terrain === 'difficult') ? 2 : 1;
      const nextCost = current.cost + stepCost;
      const nextSteps = current.steps + 1;

      const prevCost = bestCost.get(nKey);
      if (prevCost === undefined || nextCost < prevCost) {
        const nextPath = [...current.path, neighbor];
        bestCost.set(nKey, nextCost);
        bestPath.set(nKey, nextPath);
        frontier.push({ coord: neighbor, cost: nextCost, steps: nextSteps, path: nextPath });
      }
    }
  }

  return [];
}

/**
 * Returns targeted hexes for a given AoE pattern.
 * - 'single': [target]
 * - 'adjacentAll': hexNeighbors(origin)
 * - 'cleave': target plus 1 neighbor of origin adjacent to target (2 hexes total)
 * - 'cone3': target plus 2 neighbors of origin adjacent to target (3-hex arc in front of origin)
 * - 'triangle3': target plus 2 hexes adjacent to target forming a 3-hex cluster
 */
export function getAoeHexes(origin: HexCoord, target: HexCoord, pattern: AoePattern): HexCoord[] {
  if (pattern === 'single') {
    return [target];
  }

  if (pattern === 'adjacentAll') {
    return hexNeighbors(origin);
  }

  const originNeighbors = hexNeighbors(origin);

  if (pattern === 'cleave') {
    const candidates = originNeighbors.filter(n => hexDistance(n, target) === 1);
    if (candidates.length > 0) {
      return [target, candidates[0]];
    }
    return [target];
  }

  if (pattern === 'cone3') {
    const candidates = originNeighbors.filter(n => hexDistance(n, target) === 1);
    return [target, ...candidates];
  }

  if (pattern === 'triangle3') {
    const targetNeighbors = hexNeighbors(target);
    let bestPair: [HexCoord, HexCoord] = [targetNeighbors[0], targetNeighbors[1]];
    let maxDistSum = -1;

    for (let i = 0; i < 6; i++) {
      const n1 = targetNeighbors[i];
      const n2 = targetNeighbors[(i + 1) % 6];
      const distSum = hexDistance(origin, n1) + hexDistance(origin, n2);
      if (distSum > maxDistSum) {
        maxDistSum = distSum;
        bestPair = [n1, n2];
      }
    }

    return [target, bestPair[0], bestPair[1]];
  }

  return [target];
}

/**
 * Returns true if hexDistance(attacker, target) === 1 and at least one ally in allyCoords
 * (different from attacker) is adjacent to target (hexDistance(ally, target) === 1)
 * and has distance >= 2 from attacker.
 */
export function isFlanked(attacker: HexCoord, target: HexCoord, allyCoords: HexCoord[]): boolean {
  if (hexDistance(attacker, target) !== 1) {
    return false;
  }
  return allyCoords.some(
    ally =>
      !coordsEqual(ally, attacker) &&
      hexDistance(ally, target) === 1 &&
      hexDistance(ally, attacker) >= 2
  );
}

/**
 * Returns true if hexDistance(attacker, target) >= 2 and target is adjacent to an 'obstacle' tile
 * that is closer to attacker than target is.
 */
export function hasCover(attacker: HexCoord, target: HexCoord, tiles: HexTile[]): boolean {
  const dist = hexDistance(attacker, target);
  if (dist < 2) {
    return false;
  }
  const neighbors = hexNeighbors(target);
  return neighbors.some(n => {
    const tile = getTileAt(tiles, n);
    return tile !== undefined && tile.terrain === 'obstacle' && hexDistance(attacker, n) < dist;
  });
}
