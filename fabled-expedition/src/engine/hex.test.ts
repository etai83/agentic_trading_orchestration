import { describe, it, expect } from 'vitest';
import type { HexCoord, HexTile } from '../types/game';
import {
  coordKey,
  parseCoordKey,
  coordsEqual,
  hexDistance,
  hexNeighbors,
  axialToPixel,
  hexPolygonPoints,
  getTileAt,
  hasLineOfSight,
  getReachableHexes,
  findShortestPath,
  getAoeHexes,
  isFlanked,
  hasCover,
} from './hex';

function makeTile(q: number, r: number, overrides: Partial<HexTile> = {}): HexTile {
  return {
    q,
    r,
    roomId: 1,
    revealed: true,
    terrain: 'floor',
    ...overrides,
  };
}

describe('Hex & Spatial Engine', () => {
  describe('Coordinate manipulation', () => {
    it('coordKey and parseCoordKey roundtrip', () => {
      const c: HexCoord = { q: -3, r: 7 };
      const key = coordKey(c);
      expect(key).toBe('-3,7');
      expect(parseCoordKey(key)).toEqual({ q: -3, r: 7 });
    });

    it('coordsEqual compares correctly', () => {
      expect(coordsEqual({ q: 1, r: 2 }, { q: 1, r: 2 })).toBe(true);
      expect(coordsEqual({ q: 1, r: 2 }, { q: 1, r: 3 })).toBe(false);
      expect(coordsEqual({ q: 0, r: 2 }, { q: 1, r: 2 })).toBe(false);
    });

    it('hexDistance calculates correct axial distances', () => {
      expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
      expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
      expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1);
      expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: -1 })).toBe(1);
      expect(hexDistance({ q: 0, r: 0 }, { q: -1, r: 0 })).toBe(1);
      expect(hexDistance({ q: 0, r: 0 }, { q: -1, r: 1 })).toBe(1);
      expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
      expect(hexDistance({ q: -2, r: 3 }, { q: 2, r: -1 })).toBe(4);
      expect(hexDistance({ q: 1, r: 2 }, { q: -2, r: -1 })).toBe(6);
    });

    it('hexNeighbors returns 6 axial neighbors in clockwise order', () => {
      const c: HexCoord = { q: 2, r: 3 };
      const neighbors = hexNeighbors(c);
      expect(neighbors).toEqual([
        { q: 3, r: 3 },
        { q: 3, r: 2 },
        { q: 2, r: 2 },
        { q: 1, r: 3 },
        { q: 1, r: 4 },
        { q: 2, r: 4 },
      ]);
      // All neighbors must be distance 1 from center
      for (const n of neighbors) {
        expect(hexDistance(c, n)).toBe(1);
      }
      // Consecutive neighbors must be adjacent to each other
      for (let i = 0; i < 6; i++) {
        expect(hexDistance(neighbors[i], neighbors[(i + 1) % 6])).toBe(1);
      }
    });

    it('axialToPixel calculates pointy-top coordinates', () => {
      const size = 30;
      const originPixel = axialToPixel({ q: 0, r: 0 }, size);
      expect(originPixel.x).toBe(0);
      expect(originPixel.y).toBe(0);

      const rPixel = axialToPixel({ q: 0, r: 2 }, size);
      expect(rPixel.x).toBeCloseTo(size * Math.sqrt(3) * 1);
      expect(rPixel.y).toBeCloseTo(size * 1.5 * 2);

      const qPixel = axialToPixel({ q: 2, r: 0 }, size);
      expect(qPixel.x).toBeCloseTo(size * Math.sqrt(3) * 2);
      expect(qPixel.y).toBe(0);
    });

    it('hexPolygonPoints returns valid 6-point SVG string', () => {
      const pointsStr = hexPolygonPoints(100, 100, 40);
      const points = pointsStr.split(' ');
      expect(points).toHaveLength(6);
      const parsed = points.map((pt) => pt.split(',').map(Number));
      for (const [x, y] of parsed) {
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
      }
      // Pointy-top: one vertex sits directly above the center, a full size away.
      const top = parsed.reduce((best, p) => (p[1] < best[1] ? p : best));
      expect(top[0]).toBeCloseTo(100);
      expect(top[1]).toBeCloseTo(60);
    });
  });

  describe('Tile querying', () => {
    it('getTileAt retrieves matching tile or undefined', () => {
      const t1 = makeTile(0, 0);
      const t2 = makeTile(1, 2, { terrain: 'hazard' });
      const tiles = [t1, t2];

      expect(getTileAt(tiles, { q: 0, r: 0 })).toBe(t1);
      expect(getTileAt(tiles, { q: 1, r: 2 })).toBe(t2);
      expect(getTileAt(tiles, { q: 2, r: 2 })).toBeUndefined();
    });
  });

  describe('Line of sight', () => {
    it('returns true for same or adjacent hexes', () => {
      const tiles = [makeTile(0, 0), makeTile(1, 0)];
      expect(hasLineOfSight(tiles, { q: 0, r: 0 }, { q: 0, r: 0 })).toBe(true);
      expect(hasLineOfSight(tiles, { q: 0, r: 0 }, { q: 1, r: 0 })).toBe(true);
    });

    it('returns true across open floor, hazards, traps, and chests', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0, { terrain: 'hazard' }),
        makeTile(2, 0, { terrain: 'trap' }),
        makeTile(3, 0),
      ];
      expect(hasLineOfSight(tiles, { q: 0, r: 0 }, { q: 3, r: 0 })).toBe(true);
    });

    it('obstacle does NOT block line of sight', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0, { terrain: 'obstacle' }),
        makeTile(2, 0),
      ];
      expect(hasLineOfSight(tiles, { q: 0, r: 0 }, { q: 2, r: 0 })).toBe(true);
    });

    it('wall blocks line of sight', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0, { terrain: 'wall' }),
        makeTile(2, 0),
      ];
      expect(hasLineOfSight(tiles, { q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);
    });

    it('unopened door blocks line of sight, opened door does not', () => {
      const tilesClosedDoor = [
        makeTile(0, 0),
        makeTile(1, 0, { terrain: 'door', interacted: false }),
        makeTile(2, 0),
      ];
      expect(hasLineOfSight(tilesClosedDoor, { q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);

      const tilesOpenDoor = [
        makeTile(0, 0),
        makeTile(1, 0, { terrain: 'door', interacted: true }),
        makeTile(2, 0),
      ];
      expect(hasLineOfSight(tilesOpenDoor, { q: 0, r: 0 }, { q: 2, r: 0 })).toBe(true);
    });

    it('unrevealed or missing intermediate tile blocks line of sight', () => {
      const tilesUnrevealed = [
        makeTile(0, 0),
        makeTile(1, 0, { revealed: false }),
        makeTile(2, 0),
      ];
      expect(hasLineOfSight(tilesUnrevealed, { q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);

      const tilesMissing = [
        makeTile(0, 0),
        // (1, 0) missing
        makeTile(2, 0),
      ];
      expect(hasLineOfSight(tilesMissing, { q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);
    });

    it('is symmetric, and a diagonal wall or closed door blocks both ways', () => {
      const tiles: HexTile[] = [];
      for (let q = -3; q <= 3; q++) {
        for (let r = -3; r <= 3; r++) {
          if (hexDistance({ q: 0, r: 0 }, { q, r }) > 3) continue;
          const terrain =
            q === 0 && r === 0 ? 'wall'
            : q === 2 && r === -2 ? 'door'
            : 'floor';
          tiles.push(makeTile(q, r, terrain === 'door' ? { terrain, interacted: false } : { terrain }));
        }
      }

      const coords = tiles.map((t) => ({ q: t.q, r: t.r }));
      for (const a of coords) {
        for (const b of coords) {
          expect(hasLineOfSight(tiles, a, b)).toBe(hasLineOfSight(tiles, b, a));
        }
      }

      // Straight line through the center wall.
      expect(hasLineOfSight(tiles, { q: -2, r: 0 }, { q: 2, r: 0 })).toBe(false);
      // Parallel line that misses the wall.
      expect(hasLineOfSight(tiles, { q: -2, r: -1 }, { q: 2, r: -1 })).toBe(true);
      // Cube-axis diagonal through the closed door at (2, -2).
      expect(hasLineOfSight(tiles, { q: 0, r: 0 }, { q: 3, r: -3 })).toBe(false);
      expect(hasLineOfSight(tiles, { q: 3, r: -3 }, { q: 0, r: 0 })).toBe(false);
    });

    it('obstacle on a diagonal does not block either direction', () => {
      const tiles: HexTile[] = [];
      for (let q = -3; q <= 3; q++) {
        for (let r = -3; r <= 3; r++) {
          if (hexDistance({ q: 0, r: 0 }, { q, r }) > 3) continue;
          tiles.push(makeTile(q, r, q === 1 && r === -1 ? { terrain: 'obstacle' } : {}));
        }
      }
      expect(hasLineOfSight(tiles, { q: 0, r: 0 }, { q: 3, r: -3 })).toBe(true);
      expect(hasLineOfSight(tiles, { q: 3, r: -3 }, { q: 0, r: 0 })).toBe(true);
    });
  });

  describe('getReachableHexes', () => {
    it('returns start hex with cost 0 and empty path', () => {
      const tiles = [makeTile(0, 0)];
      const res = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 2,
        tiles,
        occupiedByAllies: [],
        occupiedByEnemies: [],
      });

      expect(res.has('0,0')).toBe(true);
      expect(res.get('0,0')).toEqual({ cost: 0, path: [] });
    });

    it('handles movement over standard floor', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0),
        makeTile(2, 0),
      ];
      const res = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 2,
        tiles,
        occupiedByAllies: [],
        occupiedByEnemies: [],
      });

      expect(res.has('1,0')).toBe(true);
      expect(res.get('1,0')?.cost).toBe(1);
      expect(res.get('1,0')?.path).toEqual([{ q: 1, r: 0 }]);

      expect(res.has('2,0')).toBe(true);
      expect(res.get('2,0')?.cost).toBe(2);
      expect(res.get('2,0')?.path).toEqual([{ q: 1, r: 0 }, { q: 2, r: 0 }]);
    });

    it('difficult terrain costs 2 without jump or hover, 1 with jump or hover', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0, { terrain: 'difficult' }),
        makeTile(2, 0),
      ];

      // Without jump/hover: maxMove 2 can reach (1, 0) with cost 2, but cannot reach (2, 0) (would cost 3)
      const normalRes = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 2,
        tiles,
        occupiedByAllies: [],
        occupiedByEnemies: [],
      });
      expect(normalRes.has('1,0')).toBe(true);
      expect(normalRes.get('1,0')?.cost).toBe(2);
      expect(normalRes.has('2,0')).toBe(false);

      // With jump: difficult terrain costs 1, so (2, 0) is reachable with cost 2
      const jumpRes = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 2,
        jump: true,
        tiles,
        occupiedByAllies: [],
        occupiedByEnemies: [],
      });
      expect(jumpRes.has('1,0')).toBe(true);
      expect(jumpRes.get('1,0')?.cost).toBe(1);
      expect(jumpRes.has('2,0')).toBe(true);
      expect(jumpRes.get('2,0')?.cost).toBe(2);
    });

    it('obstacle cannot be entered without jump or hover', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0, { terrain: 'obstacle' }),
        makeTile(2, 0),
      ];
      const res = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 2,
        tiles,
        occupiedByAllies: [],
        occupiedByEnemies: [],
      });
      expect(res.has('1,0')).toBe(false);
      expect(res.has('2,0')).toBe(false);
    });

    it('jump allows moving through obstacle but cannot END on obstacle', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0, { terrain: 'obstacle' }),
        makeTile(2, 0),
      ];
      const res = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 2,
        jump: true,
        tiles,
        occupiedByAllies: [],
        occupiedByEnemies: [],
      });
      // Obstacle cannot be ended on
      expect(res.has('1,0')).toBe(false);
      // Can land on (2, 0)
      expect(res.has('2,0')).toBe(true);
      expect(res.get('2,0')?.cost).toBe(2);
    });

    it('hover allows moving through and ENDING on obstacle', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0, { terrain: 'obstacle' }),
      ];
      const res = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 2,
        hover: true,
        tiles,
        occupiedByAllies: [],
        occupiedByEnemies: [],
      });
      expect(res.has('1,0')).toBe(true);
      expect(res.get('1,0')?.cost).toBe(1);
    });

    it('ally-occupied hexes can be moved THROUGH, but cannot be ended on', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0),
        makeTile(2, 0),
      ];
      const res = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 2,
        tiles,
        occupiedByAllies: [{ q: 1, r: 0 }],
        occupiedByEnemies: [],
      });
      expect(res.has('1,0')).toBe(false);
      expect(res.has('2,0')).toBe(true);
      expect(res.get('2,0')?.cost).toBe(2);
    });

    it('enemy-occupied hexes cannot be entered without jump/hover, and NEVER ended on', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0),
        makeTile(2, 0),
      ];

      // Blocked without jump
      const blockedRes = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 2,
        tiles,
        occupiedByAllies: [],
        occupiedByEnemies: [{ q: 1, r: 0 }],
      });
      expect(blockedRes.has('1,0')).toBe(false);
      expect(blockedRes.has('2,0')).toBe(false);

      // Passed through with jump, but not ended on
      const jumpRes = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 2,
        jump: true,
        tiles,
        occupiedByAllies: [],
        occupiedByEnemies: [{ q: 1, r: 0 }],
      });
      expect(jumpRes.has('1,0')).toBe(false);
      expect(jumpRes.has('2,0')).toBe(true);
    });

    it('maxMove 0 can stay and cannot leave', () => {
      const tiles = [makeTile(0, 0), makeTile(1, 0)];
      const res = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 0,
        tiles,
        occupiedByAllies: [],
        occupiedByEnemies: [],
      });
      expect([...res.keys()]).toEqual(['0,0']);
    });

    it('cannot enter walls or unrevealed tiles; a closed door still costs 1', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0, { terrain: 'wall' }),
        makeTile(0, 1, { revealed: false }),
        makeTile(1, -1, { terrain: 'door', interacted: false }),
      ];
      const res = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 2,
        tiles,
        occupiedByAllies: [],
        occupiedByEnemies: [],
      });
      expect(res.has('1,0')).toBe(false);
      expect(res.has('0,1')).toBe(false);
      expect(res.get('1,-1')).toEqual({ cost: 1, path: [{ q: 1, r: -1 }] });
    });

    it('routes around difficult terrain when that costs less movement', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0, { terrain: 'difficult' }),
        makeTile(2, 0, { terrain: 'difficult' }),
        makeTile(3, 0),
        makeTile(0, 1),
        makeTile(1, 1),
        makeTile(2, 1),
        makeTile(3, 1),
        makeTile(0, -1),
        makeTile(1, -1),
        makeTile(2, -1),
        makeTile(3, -1),
      ];
      const res = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 4,
        tiles,
        occupiedByAllies: [],
        occupiedByEnemies: [],
      });
      const dest = res.get('3,0');
      expect(dest?.cost).toBe(4);
      expect(dest?.path).toHaveLength(4);
      expect(dest?.path.some((c) => c.q === 1 && c.r === 0)).toBe(false);
      expect(dest?.path.some((c) => c.q === 2 && c.r === 0)).toBe(false);
    });

    it('hover can pass an enemy but can never end on an occupied hex', () => {
      const tiles = [makeTile(0, 0), makeTile(1, 0), makeTile(2, 0)];
      const res = getReachableHexes({
        start: { q: 0, r: 0 },
        maxMove: 2,
        hover: true,
        tiles,
        occupiedByAllies: [],
        occupiedByEnemies: [{ q: 1, r: 0 }],
      });
      expect(res.has('1,0')).toBe(false);
      expect(res.get('2,0')).toEqual({
        cost: 2,
        path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
      });
    });
  });

  describe('findShortestPath', () => {
    it('returns empty array if start is goal', () => {
      const tiles = [makeTile(0, 0)];
      const path = findShortestPath({
        start: { q: 0, r: 0 },
        goal: { q: 0, r: 0 },
        tiles,
        blockedCoords: [],
      });
      expect(path).toEqual([]);
    });

    it('returns direct path excluding start and including goal', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0),
        makeTile(2, 0),
      ];
      const path = findShortestPath({
        start: { q: 0, r: 0 },
        goal: { q: 2, r: 0 },
        tiles,
        blockedCoords: [],
      });
      expect(path).toEqual([{ q: 1, r: 0 }, { q: 2, r: 0 }]);
    });

    it('navigates around blocked coords', () => {
      // 0,0 -> 1,0 (blocked) -> 2,0
      // alternative route: 0,0 -> 0,1 -> 1,1 -> 2,0
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0),
        makeTile(2, 0),
        makeTile(0, 1),
        makeTile(1, 1),
      ];
      const path = findShortestPath({
        start: { q: 0, r: 0 },
        goal: { q: 2, r: 0 },
        tiles,
        blockedCoords: [{ q: 1, r: 0 }],
      });
      expect(path.some(c => coordsEqual(c, { q: 1, r: 0 }))).toBe(false);
      expect(coordsEqual(path[path.length - 1], { q: 2, r: 0 })).toBe(true);
    });

    it('reaches goal even if goal is in blockedCoords (e.g. focusing on a hero)', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0),
      ];
      const path = findShortestPath({
        start: { q: 0, r: 0 },
        goal: { q: 1, r: 0 },
        tiles,
        blockedCoords: [{ q: 1, r: 0 }],
      });
      expect(path).toEqual([{ q: 1, r: 0 }]);
    });

    it('jump allows passing through intermediate blockedCoords', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0),
        makeTile(2, 0),
      ];
      const path = findShortestPath({
        start: { q: 0, r: 0 },
        goal: { q: 2, r: 0 },
        jump: true,
        tiles,
        blockedCoords: [{ q: 1, r: 0 }],
      });
      expect(path).toEqual([{ q: 1, r: 0 }, { q: 2, r: 0 }]);
    });

    it('prefers a longer route that spends fewer movement points on difficult terrain', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0, { terrain: 'difficult' }),
        makeTile(2, 0, { terrain: 'difficult' }),
        makeTile(3, 0),
        makeTile(1, -1),
        makeTile(2, -1),
        makeTile(3, -1),
      ];
      const path = findShortestPath({
        start: { q: 0, r: 0 },
        goal: { q: 3, r: 0 },
        tiles,
        blockedCoords: [],
      });
      expect(path).toEqual([
        { q: 1, r: -1 },
        { q: 2, r: -1 },
        { q: 3, r: -1 },
        { q: 3, r: 0 },
      ]);
    });

    it('returns empty array if goal is unreachable', () => {
      const tiles = [
        makeTile(0, 0),
        makeTile(1, 0, { terrain: 'wall' }),
        makeTile(2, 0),
      ];
      const path = findShortestPath({
        start: { q: 0, r: 0 },
        goal: { q: 2, r: 0 },
        tiles,
        blockedCoords: [],
      });
      expect(path).toEqual([]);
    });
  });

  describe('getAoeHexes', () => {
    const origin: HexCoord = { q: 0, r: 0 };
    const target: HexCoord = { q: 1, r: 0 };

    it('single returns [target]', () => {
      expect(getAoeHexes(origin, target, 'single')).toEqual([target]);
    });

    it('adjacentAll returns all 6 neighbors of origin', () => {
      expect(getAoeHexes(origin, target, 'adjacentAll')).toEqual(hexNeighbors(origin));
    });

    it('cleave returns target plus 1 neighbor of origin adjacent to target (2 hexes total)', () => {
      const hexes = getAoeHexes(origin, target, 'cleave');
      expect(hexes).toHaveLength(2);
      expect(coordsEqual(hexes[0], target)).toBe(true);
      expect(hexDistance(origin, hexes[1])).toBe(1);
      expect(hexDistance(target, hexes[1])).toBe(1);
    });

    it('cone3 returns target plus 2 neighbors of origin adjacent to target (3 hexes total)', () => {
      const hexes = getAoeHexes(origin, target, 'cone3');
      expect(hexes).toHaveLength(3);
      expect(coordsEqual(hexes[0], target)).toBe(true);
      for (const h of hexes) {
        expect(hexDistance(origin, h)).toBe(1);
      }
      expect(hexDistance(target, hexes[1])).toBe(1);
      expect(hexDistance(target, hexes[2])).toBe(1);
    });

    it('cone3 stays a 3-hex arc when the target is the origin', () => {
      const hexes = getAoeHexes(origin, origin, 'cone3');
      expect(hexes).toHaveLength(3);
      expect(coordsEqual(hexes[0], origin)).toBe(true);
      expect(hexDistance(origin, hexes[1])).toBe(1);
      expect(hexDistance(origin, hexes[2])).toBe(1);
      expect(hexDistance(hexes[1], hexes[2])).toBe(1);
    });

    it('triangle3 returns target plus 2 hexes forming 3-hex cluster directed away from origin', () => {
      const hexes = getAoeHexes(origin, target, 'triangle3');
      expect(hexes).toHaveLength(3);
      expect(coordsEqual(hexes[0], target)).toBe(true);
      // All 3 must be mutually adjacent
      expect(hexDistance(hexes[0], hexes[1])).toBe(1);
      expect(hexDistance(hexes[0], hexes[2])).toBe(1);
      expect(hexDistance(hexes[1], hexes[2])).toBe(1);
      // Extends away from origin (distances should be >= distance to target)
      expect(hexDistance(origin, hexes[1])).toBeGreaterThanOrEqual(1);
      expect(hexDistance(origin, hexes[2])).toBeGreaterThanOrEqual(1);
    });
  });

  describe('isFlanked', () => {
    const target: HexCoord = { q: 1, r: 1 };
    const attacker: HexCoord = { q: 1, r: 0 }; // distance 1 to target

    it('returns true when an ally is adjacent to target and distance >= 2 from attacker', () => {
      // Opposite side neighbor of target: (1, 2) has distance 1 to target, distance 2 to attacker
      const ally: HexCoord = { q: 1, r: 2 };
      expect(hexDistance(attacker, target)).toBe(1);
      expect(hexDistance(ally, target)).toBe(1);
      expect(hexDistance(ally, attacker)).toBe(2);

      expect(isFlanked(attacker, target, [ally])).toBe(true);
    });

    it('returns false when ally is adjacent to attacker (distance < 2 from attacker)', () => {
      // Mutual neighbor of attacker and target: (2, 0)
      const ally: HexCoord = { q: 2, r: 0 };
      expect(hexDistance(ally, target)).toBe(1);
      expect(hexDistance(ally, attacker)).toBe(1);

      expect(isFlanked(attacker, target, [ally])).toBe(false);
    });

    it('returns false when attacker is not adjacent to target', () => {
      const distantAttacker: HexCoord = { q: 1, r: -1 };
      const ally: HexCoord = { q: 1, r: 2 };
      expect(isFlanked(distantAttacker, target, [ally])).toBe(false);
    });
  });

  describe('hasCover', () => {
    const attacker: HexCoord = { q: 0, r: 0 };
    const target: HexCoord = { q: 3, r: 0 }; // distance 3

    it('returns false if attacker is adjacent (distance < 2)', () => {
      const adjacentTarget: HexCoord = { q: 1, r: 0 };
      const tiles = [
        makeTile(1, 0),
        makeTile(2, 0, { terrain: 'obstacle' }),
      ];
      expect(hasCover(attacker, adjacentTarget, tiles)).toBe(false);
    });

    it('returns true when target is adjacent to obstacle that is closer to attacker', () => {
      // Target is at (3, 0). Obstacle at (2, 0) is adjacent to target, and distance to attacker is 2 (< 3)
      const tiles = [
        makeTile(3, 0),
        makeTile(2, 0, { terrain: 'obstacle' }),
      ];
      expect(hasCover(attacker, target, tiles)).toBe(true);
    });

    it('returns false when obstacle is farther or equal distance to attacker', () => {
      // Target is at (3, 0). Obstacle at (4, 0) is adjacent to target, but distance to attacker is 4 (> 3)
      const tiles = [
        makeTile(3, 0),
        makeTile(4, 0, { terrain: 'obstacle' }),
      ];
      expect(hasCover(attacker, target, tiles)).toBe(false);
    });
  });
});
