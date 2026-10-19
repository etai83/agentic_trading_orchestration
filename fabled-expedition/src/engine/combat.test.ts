import { describe, it, expect, vi } from 'vitest';
import type {
  HexCoord,
  HexTile,
  HeroArchetype,
  EnemyArchetype,
  RelicItem,
  ScenarioConfig,
  AoePattern,
  PendingActionSelection,
} from '../types/game';

const {
  mockVanguard,
  mockScavenger,
  mockLorekeeper,
  mockSentinel,
  mockConstruct,
  mockLurker,
  mockWisp,
  mockBoss,
  mockResonator,
  mockRelicItems,
  mockScenario1,
} = vi.hoisted(() => {
  const v: HeroArchetype = {
    id: 'vanguard',
    name: 'Vanguard',
    subtitle: 'Ironclad Breacher',
    role: 'Tank',
    color: '#c88a4b',
    accentColor: '#f59e0b',
    baseHp: 10,
    handSize: 10,
    primaryElements: ['steam', 'volt'],
    starterCards: [
      {
        id: 'vg_card_1',
        classId: 'vanguard',
        name: 'Piston Charge',
        level: 1,
        initiative: 18,
        top: {
          label: 'Piston Charge Top',
          description: 'Attack 3',
          type: 'attack',
          value: 3,
          range: 1,
          infuse: 'steam',
        },
        bottom: {
          label: 'Piston Charge Bottom',
          description: 'Move 3, Jump',
          type: 'move',
          value: 3,
          jump: true,
        },
      },
      {
        id: 'vg_card_2',
        classId: 'vanguard',
        name: 'Bulkhead Stance',
        level: 1,
        initiative: 12,
        top: {
          label: 'Bulkhead Top',
          description: 'Shield 2',
          type: 'shield',
          value: 2,
        },
        bottom: {
          label: 'Bulkhead Bottom',
          description: 'Move 2',
          type: 'move',
          value: 2,
        },
      },
      {
        id: 'vg_card_3',
        classId: 'vanguard',
        name: 'Hydraulic Slam',
        level: 1,
        initiative: 72,
        top: {
          label: 'Hydraulic Slam Top',
          description: 'Attack 5 Burn',
          type: 'attack',
          value: 5,
          range: 1,
          burn: true,
          xp: 2,
        },
        bottom: {
          label: 'Hydraulic Slam Bottom',
          description: 'Move 4',
          type: 'move',
          value: 4,
        },
      },
    ],
    level2Cards: [
      {
        id: 'vg_lv2_1',
        classId: 'vanguard',
        name: 'Steam Juggernaut',
        level: 2,
        initiative: 20,
        top: {
          label: 'Top',
          description: 'Attack 4',
          type: 'attack',
          value: 4,
          range: 1,
        },
        bottom: {
          label: 'Bottom',
          description: 'Move 4',
          type: 'move',
          value: 4,
        },
      },
    ],
  };

  const sc: HeroArchetype = {
    id: 'scavenger',
    name: 'Scavenger',
    subtitle: 'Rust-Stalker',
    role: 'Striker',
    color: '#4ade80',
    accentColor: '#10b981',
    baseHp: 8,
    handSize: 9,
    primaryElements: ['volt', 'mire'],
    starterCards: [
      {
        id: 'sc_card_1',
        classId: 'scavenger',
        name: 'Arc Shiv',
        level: 1,
        initiative: 9,
        top: {
          label: 'Arc Shiv Top',
          description: 'Attack 3',
          type: 'attack',
          value: 3,
          range: 1,
        },
        bottom: {
          label: 'Arc Shiv Bottom',
          description: 'Move 4',
          type: 'move',
          value: 4,
        },
      },
      {
        id: 'sc_card_2',
        classId: 'scavenger',
        name: 'Scrap Caltrops',
        level: 1,
        initiative: 34,
        top: {
          label: 'Caltrops Top',
          description: 'Trap',
          type: 'utility',
        },
        bottom: {
          label: 'Caltrops Bottom',
          description: 'Move 3',
          type: 'move',
          value: 3,
        },
      },
    ],
    level2Cards: [],
  };

  const lk: HeroArchetype = {
    id: 'lorekeeper',
    name: 'Lorekeeper',
    subtitle: 'Aether Scholar',
    role: 'Mage',
    color: '#38bdf8',
    accentColor: '#6366f1',
    baseHp: 6,
    handSize: 11,
    primaryElements: ['aether', 'mire'],
    starterCards: [
      {
        id: 'lk_card_1',
        classId: 'lorekeeper',
        name: 'Resonant Bolt',
        level: 1,
        initiative: 38,
        top: {
          label: 'Resonant Bolt Top',
          description: 'Attack 2 Range 4',
          type: 'attack',
          value: 2,
          range: 4,
        },
        bottom: {
          label: 'Resonant Bolt Bottom',
          description: 'Move 2, Heal 2',
          type: 'heal',
          value: 2,
          range: 3,
        },
      },
      {
        id: 'lk_card_2',
        classId: 'lorekeeper',
        name: 'Singularity Collapse',
        level: 1,
        initiative: 67,
        top: {
          label: 'Singularity Top',
          description: 'Attack 4 Burn',
          type: 'attack',
          value: 4,
          range: 3,
          burn: true,
        },
        bottom: {
          label: 'Singularity Bottom',
          description: 'Move 2',
          type: 'move',
          value: 2,
        },
      },
    ],
    level2Cards: [],
  };

  const st: HeroArchetype = {
    id: 'sentinel',
    name: 'Sentinel',
    subtitle: 'Automaton Warden',
    role: 'Support',
    color: '#e2e8f0',
    accentColor: '#94a3b8',
    baseHp: 9,
    handSize: 9,
    primaryElements: ['volt', 'steam'],
    starterCards: [
      {
        id: 'st_card_1',
        classId: 'sentinel',
        name: 'Deploy Coil Turret',
        level: 1,
        initiative: 31,
        top: {
          label: 'Turret Top',
          description: 'Summon',
          type: 'summon',
        },
        bottom: {
          label: 'Turret Bottom',
          description: 'Move 3',
          type: 'move',
          value: 3,
        },
      },
      {
        id: 'st_card_2',
        classId: 'sentinel',
        name: 'Voltaic Lance',
        level: 1,
        initiative: 27,
        top: {
          label: 'Voltaic Lance Top',
          description: 'Attack 3 Range 2',
          type: 'attack',
          value: 3,
          range: 2,
        },
        bottom: {
          label: 'Voltaic Lance Bottom',
          description: 'Move 2',
          type: 'move',
          value: 2,
        },
      },
    ],
    level2Cards: [],
  };

  const c: EnemyArchetype = {
    id: 'drowned_construct',
    name: 'Drowned Construct',
    maxHp: 7,
    baseMove: 1,
    baseAttack: 3,
    baseRange: 1,
    baseShield: 1,
    color: '#94a3b8',
    intentDeck: [
      {
        id: 'intent_dc_1',
        name: 'Rusted Cleave',
        initiative: 40,
        move: 1,
        attack: 3,
        range: 1,
        description: 'Move 1, Attack 3',
      },
    ],
  };

  const l: EnemyArchetype = {
    id: 'silt_lurker',
    name: 'Silt Lurker',
    maxHp: 5,
    baseMove: 3,
    baseAttack: 2,
    baseRange: 1,
    baseShield: 0,
    color: '#10b981',
    intentDeck: [
      {
        id: 'intent_sl_1',
        name: 'Darting Bite',
        initiative: 25,
        move: 3,
        attack: 2,
        range: 1,
        statusApplied: ['poison'],
        description: 'Move 3, Attack 2, Poison',
      },
    ],
  };

  const w: EnemyArchetype = {
    id: 'aether_wisp',
    name: 'Aether Wisp',
    maxHp: 4,
    baseMove: 2,
    baseAttack: 2,
    baseRange: 3,
    baseShield: 1,
    hover: true,
    color: '#38bdf8',
    intentDeck: [
      {
        id: 'intent_aw_1',
        name: 'Void Ray',
        initiative: 55,
        move: 1,
        attack: 2,
        range: 4,
        pierce: 1,
        description: 'Move 1, Attack 2',
      },
    ],
  };

  const b: EnemyArchetype = {
    id: 'dredge_overseer',
    name: 'The Dredge Overseer',
    isBoss: true,
    maxHp: 22,
    baseMove: 2,
    baseAttack: 3,
    baseRange: 2,
    baseShield: 1,
    immunities: ['stun', 'immobilize'],
    color: '#f59e0b',
    intentDeck: [
      {
        id: 'intent_boss_1',
        name: 'Harpoon Reel',
        initiative: 60,
        move: 2,
        attack: 3,
        range: 2,
        description: 'Attack 3',
      },
    ],
  };

  const res: EnemyArchetype = {
    id: 'corrupted_resonator',
    name: 'Corrupted Resonator',
    isObjectiveStructure: true,
    maxHp: 10,
    baseMove: 0,
    baseAttack: 1,
    baseRange: 3,
    baseShield: 0,
    immunities: ['stun', 'immobilize', 'poison'],
    color: '#ef4444',
    intentDeck: [
      {
        id: 'intent_res_1',
        name: 'Resonant Pulse',
        initiative: 80,
        move: 0,
        attack: 1,
        range: 3,
        description: 'Attack 1',
      },
    ],
  };

  const relics: RelicItem[] = [
    {
      id: 'stamina_tonic',
      name: 'Stamina Tonic',
      cost: 15,
      description: 'Recover up to 2 Discarded cards',
      usageType: 'consumed',
      effect: 'recover_2_discard',
    },
    {
      id: 'pneumatic_boots',
      name: 'Pneumatic Boots',
      cost: 20,
      description: 'Add +2 Move and Jump',
      usageType: 'spent',
      effect: 'move_plus_2_jump',
    },
    {
      id: 'aegis_aether_plate',
      name: 'Aegis Aether-Plate',
      cost: 25,
      description: 'Shield 2 this round',
      usageType: 'spent',
      effect: 'shield_2_round',
    },
    {
      id: 'resonance_lens',
      name: 'Resonance Lens',
      cost: 30,
      description: 'Infuse any element',
      usageType: 'consumed',
      effect: 'infuse_any',
    },
    {
      id: 'overclocked_capacitor',
      name: 'Overclocked Capacitor',
      cost: 25,
      description: 'Heal 3 Cleanse',
      usageType: 'spent',
      effect: 'heal_3_cleanse',
    },
  ];

  const s1: ScenarioConfig = {
    id: 'sunken_lock',
    number: 1,
    title: 'The Sunken Lock of Aethel',
    subtitle: 'Introductory Breach',
    briefing: 'Breach the lock and retrieve the conduit.',
    victorySummary: 'The lock was secured.',
    objectiveType: 'kill_all_and_loot_chest',
    heroSpawns: [
      { q: 0, r: 0 },
      { q: 0, r: 1 },
      { q: 1, r: 0 },
      { q: 1, r: 1 },
    ],
    tiles: [
      { q: 0, r: 0, roomId: 1, revealed: true, terrain: 'floor' },
      { q: 0, r: 1, roomId: 1, revealed: true, terrain: 'floor' },
      { q: 1, r: 0, roomId: 1, revealed: true, terrain: 'floor' },
      { q: 1, r: 1, roomId: 1, revealed: true, terrain: 'floor' },
      { q: 2, r: 0, roomId: 1, revealed: true, terrain: 'hazard' },
      { q: 2, r: 1, roomId: 1, revealed: true, terrain: 'trap' },
      {
        q: 4,
        r: 2,
        roomId: 1,
        revealed: true,
        terrain: 'door',
        unlocksRoomId: 2,
      },
      {
        q: 3,
        r: 1,
        roomId: 1,
        revealed: true,
        terrain: 'lore',
        loreId: 'sluice_valve',
      },
      {
        q: 5,
        r: 2,
        roomId: 2,
        revealed: false,
        terrain: 'chest',
        salvageValue: 20,
      },
    ],
    enemySpawns: [
      { enemyType: 'silt_lurker', q: 2, r: 2, roomId: 1 },
      { enemyType: 'drowned_construct', q: 3, r: 2, roomId: 1 },
      { enemyType: 'aether_wisp', q: 6, r: 2, roomId: 2 },
    ],
    loreNodes: {
      sluice_valve: {
        id: 'sluice_valve',
        title: 'Sluice Valve',
        prompt: 'Drain or Siphon?',
        options: [
          {
            label: 'Drain',
            description: 'Clears difficult terrain',
            outcomeText: 'Water drained.',
            reputationDelta: 1,
            clearDifficultTerrainInRoom: 1,
          },
          {
            label: 'Siphon',
            description: 'Siphon power',
            outcomeText: 'Pressure siphoned.',
            salvageDelta: 15,
            hpDelta: -2,
            infuseElements: ['steam', 'volt'],
          },
        ],
      },
    },
    rewardSalvage: 25,
    rewardXp: 5,
  };

  return {
    mockVanguard: v,
    mockScavenger: sc,
    mockLorekeeper: lk,
    mockSentinel: st,
    mockConstruct: c,
    mockLurker: l,
    mockWisp: w,
    mockBoss: b,
    mockResonator: res,
    mockRelicItems: relics,
    mockScenario1: s1,
  };
});

vi.mock('./hex', () => {
  return {
    coordKey: (c: HexCoord) => `${c.q},${c.r}`,
    coordsEqual: (a: HexCoord, b: HexCoord) => a.q === b.q && a.r === b.r,
    hexDistance: (a: HexCoord, b: HexCoord) => {
      const dq = a.q - b.q;
      const dr = a.r - b.r;
      return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
    },
    hexNeighbors: (c: HexCoord): HexCoord[] => [
      { q: c.q + 1, r: c.r },
      { q: c.q + 1, r: c.r - 1 },
      { q: c.q, r: c.r - 1 },
      { q: c.q - 1, r: c.r },
      { q: c.q - 1, r: c.r + 1 },
      { q: c.q, r: c.r + 1 },
    ],
    getTileAt: (tiles: HexTile[], c: HexCoord) =>
      tiles.find((t) => t.q === c.q && t.r === c.r),
    hasLineOfSight: (tiles: HexTile[], from: HexCoord, to: HexCoord) => true,
    getReachableHexes: (params: {
      start: HexCoord;
      maxMove: number;
      jump?: boolean;
      hover?: boolean;
      tiles: HexTile[];
      occupiedByAllies: HexCoord[];
      occupiedByEnemies: HexCoord[];
    }) => {
      const map = new Map<string, { cost: number; path: HexCoord[] }>();
      map.set(`${params.start.q + 1},${params.start.r}`, {
        cost: 1,
        path: [{ q: params.start.q + 1, r: params.start.r }],
      });
      map.set(`${params.start.q},${params.start.r + 1}`, {
        cost: 1,
        path: [{ q: params.start.q, r: params.start.r + 1 }],
      });
      return map;
    },
    findShortestPath: (params: {
      start: HexCoord;
      goal: HexCoord;
      jump?: boolean;
      hover?: boolean;
      tiles: HexTile[];
      blockedCoords: HexCoord[];
    }) => {
      return [{ q: params.start.q + 1, r: params.start.r }];
    },
    getAoeHexes: (origin: HexCoord, target: HexCoord, pattern: AoePattern) => {
      return [target];
    },
    isFlanked: (attacker: HexCoord, target: HexCoord, allyCoords: HexCoord[]) => {
      return allyCoords.length > 0;
    },
    hasCover: (attacker: HexCoord, target: HexCoord, tiles: HexTile[]) => {
      return false;
    },
  };
});

vi.mock('../data/classes', () => ({
  HERO_ARCHETYPES: {
    vanguard: mockVanguard,
    scavenger: mockScavenger,
    lorekeeper: mockLorekeeper,
    sentinel: mockSentinel,
  },
  HERO_LIST: [mockVanguard, mockScavenger, mockLorekeeper, mockSentinel],
}));

vi.mock('../data/enemies', () => ({
  ENEMY_ARCHETYPES: {
    drowned_construct: mockConstruct,
    silt_lurker: mockLurker,
    aether_wisp: mockWisp,
    dredge_overseer: mockBoss,
    corrupted_resonator: mockResonator,
  },
}));

vi.mock('../data/relics', () => ({
  RELIC_ITEMS: mockRelicItems,
  RELIC_BY_ID: Object.fromEntries(mockRelicItems.map((r) => [r.id, r])),
}));

vi.mock('../data/scenarios', () => ({
  SCENARIOS: [mockScenario1],
  SCENARIO_BY_ID: {
    sunken_lock: mockScenario1,
  },
}));

import {
  createStandardModifierDeck,
  drawModifier,
  createInitialCampaignState,
  startScenario,
  toggleSelectCard,
  toggleLongRest,
  performShortRest,
  canLockInRound,
  lockInRoundAndReveal,
  setPendingHeroAction,
  getValidTargetHexes,
  executeHeroActionOnHex,
  skipOrEndActiveTurn,
  useRelicItem,
  resolveLoreModalChoice,
  buyRelicInOutpost,
  unlockHeroPerkInOutpost,
  returnToOutpost,
} from './combat';

describe('Tactical Combat Engine (combat.ts)', () => {
  describe('1. createStandardModifierDeck()', () => {
    it('creates a standard 20-card modifier deck matching Frosthaven ratios', () => {
      const deck = createStandardModifierDeck();
      expect(deck).toHaveLength(20);

      const countPlus0 = deck.filter((c) => c.delta === 0 && c.multiplier === undefined).length;
      const countPlus1 = deck.filter((c) => c.delta === 1).length;
      const countMinus1 = deck.filter((c) => c.delta === -1).length;
      const countPlus2 = deck.filter((c) => c.delta === 2).length;
      const countMinus2 = deck.filter((c) => c.delta === -2).length;
      const crit = deck.find((c) => c.multiplier === 2);
      const nullCard = deck.find((c) => c.multiplier === 0);

      expect(countPlus0).toBe(6);
      expect(countPlus1).toBe(5);
      expect(countMinus1).toBe(5);
      expect(countPlus2).toBe(1);
      expect(countMinus2).toBe(1);
      expect(crit).toBeDefined();
      expect(crit?.shuffleAtEnd).toBe(true);
      expect(nullCard).toBeDefined();
      expect(nullCard?.shuffleAtEnd).toBe(true);
    });
  });

  describe('2. drawModifier()', () => {
    it('draws single card in normal mode and computes final damage', () => {
      const deck = [{ id: '1', label: '+1', delta: 1 }];
      const discard = [{ id: '0', label: '+0', delta: 0 }];

      const { result, nextDeck, nextDiscard } = drawModifier(deck, discard, 3, 'normal');
      expect(result.drawnCards).toHaveLength(1);
      expect(result.finalDamage).toBe(4);
      expect(nextDeck).toHaveLength(0);
      expect(nextDiscard).toHaveLength(2);
    });

    it('handles advantage mode by taking the higher damage card', () => {
      const deck = [
        { id: '1', label: '+1', delta: 1 },
        { id: '2', label: '+2', delta: 2 },
      ];
      const { result } = drawModifier(deck, [], 3, 'advantage');
      expect(result.drawnCards).toHaveLength(2);
      expect(result.chosenCard.delta).toBe(2);
      expect(result.finalDamage).toBe(5);
    });

    it('handles disadvantage mode by taking the lower damage card', () => {
      const deck = [
        { id: '1', label: '+1', delta: 1 },
        { id: '2', label: '-1', delta: -1 },
      ];
      const { result } = drawModifier(deck, [], 3, 'disadvantage');
      expect(result.drawnCards).toHaveLength(2);
      expect(result.chosenCard.delta).toBe(-1);
      expect(result.finalDamage).toBe(2);
    });

    it('removes temporary bless/curse cards from nextDiscard', () => {
      const deck = [{ id: 'bless', label: '2x Bless', delta: 0, multiplier: 2, temporary: true }];
      const { result, nextDiscard } = drawModifier(deck, [], 3, 'normal');
      expect(result.finalDamage).toBe(6);
      expect(nextDiscard).toHaveLength(0);
    });

    it('reshuffles discard if deck is exhausted', () => {
      const deck: any[] = [];
      const discard = [{ id: '1', label: '+1', delta: 1 }];
      const { result, nextDeck } = drawModifier(deck, discard, 2, 'normal');
      expect(result.finalDamage).toBe(3);
      expect(nextDeck).toHaveLength(0);
    });
  });

  describe('3. createInitialCampaignState() & startScenario()', () => {
    it('initializes game in scenario 1 with 4 heroes and Room 1 enemies', () => {
      const state = createInitialCampaignState();
      expect(state.screen).toBe('scenario');
      expect(state.scenarioId).toBe('sunken_lock');
      expect(state.phase).toBe('PHASE_PLANNING');
      expect(state.heroes).toHaveLength(4);
      expect(state.enemies).toHaveLength(2);
      expect(state.round).toBe(1);
      expect(state.elements.steam).toBe('inert');
    });

    it('applies reputation perks on startScenario', () => {
      const base = createInitialCampaignState();
      const highRepState = { ...base, reputation: 3 };
      const started = startScenario(highRepState, 'sunken_lock');
      const hasBless = started.heroModifierDeck.some((c) => c.label.includes('Bless'));
      expect(hasBless).toBe(true);
    });

    it('applies low reputation salvage perk on startScenario', () => {
      const base = createInitialCampaignState();
      const lowRepState = { ...base, reputation: -3, salvage: 10 };
      const started = startScenario(lowRepState, 'sunken_lock');
      expect(started.salvage).toBe(20);
    });
  });

  describe('4. toggleSelectCard() & toggleLongRest()', () => {
    it('selects and deselects cards up to 2 cards during planning phase', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      const card1 = hero.hand[0].id;
      const card2 = hero.hand[1].id;

      state = toggleSelectCard(state, hero.id, card1);
      expect(state.heroes[0].selectedCards?.[0]).toBe(card1);

      state = toggleSelectCard(state, hero.id, card2);
      expect(state.heroes[0].selectedCards).toEqual([card1, card2]);

      state = toggleSelectCard(state, hero.id, card1);
      expect(state.heroes[0].selectedCards?.[0]).toBe(card2);
    });

    it('toggleLongRest toggles long rest declared and clears selected cards', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      hero.discard = [hero.hand[0], hero.hand[1]];
      hero.selectedCards = ['c1', 'c2'];

      state = toggleLongRest(state, hero.id);
      expect(state.heroes[0].longRestDeclared).toBe(true);
      expect(state.heroes[0].selectedCards).toBeNull();

      state = toggleLongRest(state, hero.id);
      expect(state.heroes[0].longRestDeclared).toBe(false);
    });
  });

  describe('5. performShortRest()', () => {
    it('moves 1 card from discard to lost and returns rest to hand', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      const c1 = hero.hand[0];
      const c2 = hero.hand[1];
      hero.discard = [c1, c2];
      hero.hand = hero.hand.slice(2);

      state = performShortRest(state, hero.id, false);
      expect(state.heroes[0].lost).toHaveLength(1);
      expect(state.heroes[0].discard).toHaveLength(0);
      expect(state.heroes[0].hand).toContain(c2.id === state.heroes[0].lost[0].id ? c1 : c2);
    });

    it('deals 1 damage if rerollWithDamage is true', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      hero.discard = [hero.hand[0], hero.hand[1]];
      const initialHp = hero.hp;

      state = performShortRest(state, hero.id, true);
      expect(state.heroes[0].hp).toBe(initialHp - 1);
    });
  });

  describe('6. canLockInRound() & lockInRoundAndReveal()', () => {
    it('canLockInRound returns false until all non-exhausted heroes have 2 cards or rest', () => {
      let state = createInitialCampaignState();
      expect(canLockInRound(state)).toBe(false);

      for (const h of state.heroes) {
        state = toggleLongRest(
          {
            ...state,
            heroes: state.heroes.map((hero) => ({
              ...hero,
              discard: [hero.hand[0], hero.hand[1]],
            })),
          },
          h.id
        );
      }
      expect(canLockInRound(state)).toBe(true);
    });

    it('lockInRoundAndReveal transitions to turn execution and builds turn order', () => {
      let state = createInitialCampaignState();
      state.heroes = state.heroes.map((h) => ({
        ...h,
        selectedCards: [h.hand[0].id, h.hand[1].id],
      }));

      state = lockInRoundAndReveal(state);
      expect(state.phase).toBe('PHASE_TURN_EXECUTION');
      expect(state.turnOrder.length).toBeGreaterThan(0);
      expect(state.turnOrder[0].initiative).toBeLessThanOrEqual(state.turnOrder[state.turnOrder.length - 1].initiative);
    });
  });

  describe('7. Action targeting & execution (getValidTargetHexes & executeHeroActionOnHex)', () => {
    it('sets pending hero action', () => {
      const state = createInitialCampaignState();
      const pending: PendingActionSelection = {
        heroId: state.heroes[0].id,
        cardId: state.heroes[0].hand[0].id,
        half: 'top',
        useBasicInstead: false,
        consumeElement: false,
      };

      const next = setPendingHeroAction(state, pending);
      expect(next.pendingAction).toEqual(pending);
    });

    it('calculates valid target hexes for attack and move', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      const movePending: PendingActionSelection = {
        heroId: hero.id,
        cardId: hero.hand[0].id,
        half: 'bottom',
        useBasicInstead: false,
        consumeElement: false,
      };

      const moveHexes = getValidTargetHexes(state, movePending);
      expect(moveHexes.length).toBeGreaterThan(0);

      const attackPending: PendingActionSelection = {
        heroId: hero.id,
        cardId: hero.hand[0].id,
        half: 'top',
        useBasicInstead: false,
        consumeElement: false,
      };
      state.enemies[0].q = hero.q + 1;
      state.enemies[0].r = hero.r;
      const attackHexes = getValidTargetHexes(state, attackPending);
      expect(attackHexes.length).toBeGreaterThan(0);
    });

    it('executes movement, stepping on hazard deals 2 damage', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      const initialHp = hero.hp;

      state = setPendingHeroAction(state, {
        heroId: hero.id,
        cardId: hero.hand[0].id,
        half: 'bottom',
        useBasicInstead: false,
        consumeElement: false,
      });

      state = executeHeroActionOnHex(state, { q: 2, r: 0 });
      expect(state.heroes[0].q).toBe(2);
      expect(state.heroes[0].r).toBe(0);
      expect(state.heroes[0].hp).toBe(initialHp - 2);
    });

    it('executes movement onto door tile, unlocking Room 2 and spawning enemies', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      const initialEnemyCount = state.enemies.length;

      state = setPendingHeroAction(state, {
        heroId: hero.id,
        cardId: hero.hand[0].id,
        half: 'bottom',
        useBasicInstead: false,
        consumeElement: false,
      });

      state = executeHeroActionOnHex(state, { q: 4, r: 2 });
      expect(state.enemies.length).toBeGreaterThan(initialEnemyCount);
      const room2Tile = state.tiles.find((t) => t.roomId === 2);
      expect(room2Tile?.revealed).toBe(true);
    });

    it('executes attack, dealing damage to enemy and consuming/infusing elements', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      state.enemies[0].q = 1;
      state.enemies[0].r = 0;
      const originalEnemy = state.enemies[0];
      const initialEnemyHp = originalEnemy.hp;
      state.heroModifierDeck = [{ id: 'fixed0', label: '+0', delta: 0 }];
      state.heroModifierDiscard = [];

      state = setPendingHeroAction(state, {
        heroId: hero.id,
        cardId: hero.hand[0].id,
        half: 'top',
        useBasicInstead: false,
        consumeElement: false,
      });

      state = executeHeroActionOnHex(state, { q: 1, r: 0 });
      expect(state.enemies[0].hp).toBe(initialEnemyHp - 3);
      expect(originalEnemy.hp).toBe(initialEnemyHp);
      expect(state.elements.steam).toBe('strong');
      expect(state.heroes[0].topUsedThisTurn).toBe(true);
    });
  });

  describe('8. skipOrEndActiveTurn() & Lore choices', () => {
    it('skipOrEndActiveTurn moves unused selected cards to discard and advances turn', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      state.phase = 'PHASE_TURN_EXECUTION';
      state.turnOrder = [
        {
          id: hero.id,
          isHero: true,
          heroId: hero.id,
          name: hero.name,
          initiative: 10,
          acted: false,
        },
      ];
      state.activeTurnIndex = 0;
      state.heroes[0].selectedCards = [hero.hand[0].id, hero.hand[1].id];

      state = skipOrEndActiveTurn(state);
      expect(state.heroes[0].discard.length).toBeGreaterThanOrEqual(2);
    });

    it('resolveLoreModalChoice applies reputation and element outcomes', () => {
      let state = createInitialCampaignState();
      state.activeLoreModal = {
        loreNode: mockScenario1.loreNodes.sluice_valve,
        heroId: state.heroes[0].id,
        tileCoord: { q: 3, r: 1 },
      };

      state = resolveLoreModalChoice(state, 0);
      expect(state.reputation).toBe(1);
      expect(state.activeLoreModal).toBeNull();
    });
  });

  describe('9. Relics & Outpost progression', () => {
    it('useRelicItem activates equipped relic effect', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      hero.equippedRelics = [{ relicId: 'aegis_aether_plate', used: false }];

      state = useRelicItem(state, hero.id, 'aegis_aether_plate');
      expect(state.heroes[0].shield).toBe(2);
      expect(state.heroes[0].equippedRelics[0].used).toBe(true);
    });

    it('buyRelicInOutpost purchases relic with reputation discount', () => {
      let state = createInitialCampaignState();
      state.screen = 'outpost';
      state.salvage = 50;
      state.reputation = 3;

      state = buyRelicInOutpost(state, state.heroes[0].id, 'stamina_tonic');
      expect(state.salvage).toBe(38);
      expect(state.heroes[0].equippedRelics.some((r) => r.relicId === 'stamina_tonic')).toBe(true);
    });

    it('unlockHeroPerkInOutpost levels up hero and modifies attack deck', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      hero.xp = 18;
      const initialMaxHp = hero.maxHp;

      state = unlockHeroPerkInOutpost(state, hero.id);
      expect(state.heroes[0].level).toBe(2);
      expect(state.heroes[0].maxHp).toBe(initialMaxHp + 2);
      expect(state.heroes[0].xp).toBe(3);
    });

    it('returnToOutpost transitions screen and cleans scenario tiles', () => {
      let state = createInitialCampaignState();
      state.phase = 'PHASE_SCENARIO_VICTORY';

      state = returnToOutpost(state);
      expect(state.screen).toBe('outpost');
      expect(state.tiles).toHaveLength(0);
      expect(state.enemies).toHaveLength(0);
      expect(state.completedScenarioIds).toContain('sunken_lock');
    });

    it('unlockHeroPerkInOutpost removes two -1 modifier cards', () => {
      let state = createInitialCampaignState();
      state.heroes[0].xp = 18;
      const minusOnes = (cards: { delta: number; multiplier?: number }[]) =>
        cards.filter((card) => card.delta === -1 && card.multiplier === undefined).length;
      const before = minusOnes(state.heroModifierDeck) + minusOnes(state.heroModifierDiscard);

      state = unlockHeroPerkInOutpost(state, state.heroes[0].id);
      const after = minusOnes(state.heroModifierDeck) + minusOnes(state.heroModifierDiscard);
      expect(before - after).toBe(2);
    });
  });

  describe('10. Combat edge cases', () => {
    it('reshuffles the deck when a shuffle card is drawn and removes temporary cards', () => {
      const crit = { id: 'crit', label: '2x', delta: 0, multiplier: 2, shuffleAtEnd: true };
      const bless = { id: 'bless', label: 'Bless', delta: 0, multiplier: 2, temporary: true, shuffleAtEnd: true };
      const plus = { id: 'plus', label: '+1', delta: 1 };
      const drawn = drawModifier([crit, bless], [plus], 4, 'advantage');
      expect(drawn.result.finalDamage).toBe(8);
      expect(drawn.nextDiscard).toHaveLength(0);
      expect(drawn.nextDeck.map((card) => card.id).sort()).toEqual(['crit', 'plus']);
    });

    it('does not let poison bypass shield or turn a miss into damage', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      const enemy = state.enemies[0];
      enemy.q = 1;
      enemy.r = 0;
      enemy.hp = 10;
      enemy.baseShield = 5;
      enemy.statuses = ['poison'];
      state.heroModifierDeck = [{ id: 'zero', label: '+0', delta: 0 }];
      state.heroModifierDiscard = [];

      state = setPendingHeroAction(state, {
        heroId: hero.id,
        cardId: hero.hand[0].id,
        half: 'top',
        useBasicInstead: false,
        consumeElement: false,
      });
      state = executeHeroActionOnHex(state, { q: 1, r: 0 });
      expect(state.enemies[0].hp).toBe(10);

      state.enemies[0].baseShield = 0;
      state.heroModifierDeck = [{ id: 'null', label: '0x', delta: 0, multiplier: 0, shuffleAtEnd: true }];
      state.heroModifierDiscard = [];
      state.heroes[0].topUsedThisTurn = false;
      state = setPendingHeroAction(state, {
        heroId: state.heroes[0].id,
        cardId: state.heroes[0].hand[0].id,
        half: 'top',
        useBasicInstead: true,
        consumeElement: false,
      });
      state = executeHeroActionOnHex(state, { q: 1, r: 0 });
      expect(state.enemies[0].hp).toBe(10);
    });

    it('pushes an enemy away and applies hazardous terrain on the destination', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      const source = hero.hand[0];
      hero.hand = [{ ...source, top: { ...source.top, push: 1, infuse: undefined } }, ...hero.hand.slice(1)];
      state.enemies[0].q = 1;
      state.enemies[0].r = 0;
      state.enemies[0].hp = 20;
      state.enemies[0].baseShield = 0;
      state.heroModifierDeck = [{ id: 'zero', label: '+0', delta: 0 }];
      state.heroModifierDiscard = [];

      state = setPendingHeroAction(state, {
        heroId: hero.id,
        cardId: hero.hand[0].id,
        half: 'top',
        useBasicInstead: false,
        consumeElement: false,
      });
      state = executeHeroActionOnHex(state, { q: 1, r: 0 });
      const enemy = state.enemies.find((candidate) => candidate.id === state.enemies[0].id);
      expect(state.enemies[0].q).toBe(2);
      expect(state.enemies[0].r).toBe(0);
      expect(enemy?.hp).toBe(15);
    });

    it('heals the acting hero when the heal target is their own hex', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[2];
      hero.hp = 2;
      hero.statuses = ['poison'];

      state = setPendingHeroAction(state, {
        heroId: hero.id,
        cardId: hero.hand[0].id,
        half: 'bottom',
        useBasicInstead: false,
        consumeElement: false,
      });
      state = executeHeroActionOnHex(state, { q: hero.q, r: hero.r });
      const updated = state.heroes.find((candidate) => candidate.id === hero.id);
      expect(updated?.hp).toBe(4);
      expect(updated?.statuses).not.toContain('poison');
    });

    it('resolves a long rest once when the round then ends', () => {
      // Wound ticks at the start of the turn, then the rest heals 2 and cleanses it.
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      hero.hp = 4;
      hero.longRestDeclared = true;
      hero.statuses = ['poison', 'wound'];
      hero.discard = [hero.hand[0], hero.hand[1]];
      hero.hand = hero.hand.slice(2);
      state.phase = 'PHASE_TURN_EXECUTION';
      state.turnOrder = [
        { id: hero.id, isHero: true, heroId: hero.id, name: hero.name, initiative: 99, acted: false },
      ];
      state.activeTurnIndex = 0;

      state = skipOrEndActiveTurn(state);
      const updated = state.heroes[0];
      expect(updated.hp).toBe(5);
      expect(updated.statuses).not.toContain('poison');
      expect(updated.statuses).not.toContain('wound');
      expect(updated.lost).toHaveLength(1);
      expect(updated.longRestDeclared).toBe(false);
    });

    it('does not award victory while a later room is still sealed', () => {
      let state = createInitialCampaignState();
      state.enemies = state.enemies.map((enemy) => ({ ...enemy, hp: 0 }));
      state.chestLootedInScenario = true;
      state.phase = 'PHASE_TURN_EXECUTION';
      const hero = state.heroes[0];
      state.turnOrder = [
        { id: hero.id, isHero: true, heroId: hero.id, name: hero.name, initiative: 10, acted: false },
      ];
      state.activeTurnIndex = 0;
      state.heroes[0].selectedCards = null;

      state = skipOrEndActiveTurn(state);
      expect(state.phase).not.toBe('PHASE_SCENARIO_VICTORY');
    });

    it('ignores consume when the element is inert and applies it when the element is waning', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      const source = hero.hand[0];
      hero.hand = [
        {
          ...source,
          top: {
            ...source.top,
            infuse: 'steam',
            consume: {
              element: 'volt',
              bonusDescription: '+10 Attack',
              bonusAttack: 10,
            },
          },
        },
        ...hero.hand.slice(1),
      ];
      state.enemies[0].q = 1;
      state.enemies[0].r = 0;
      state.enemies[0].hp = 30;
      state.enemies[0].baseShield = 0;
      state.elements.volt = 'inert';
      state.heroModifierDeck = [{ id: 'zero', label: '+0', delta: 0 }, { id: 'zero2', label: '+0', delta: 0 }];
      state.heroModifierDiscard = [];

      state = setPendingHeroAction(state, {
        heroId: hero.id,
        cardId: hero.hand[0].id,
        half: 'top',
        useBasicInstead: false,
        consumeElement: true,
      });
      state = executeHeroActionOnHex(state, { q: 1, r: 0 });
      expect(state.enemies[0].hp).toBe(27);
      expect(state.elements.volt).toBe('inert');

      state.heroes[0].topUsedThisTurn = false;
      state.heroes[0].hand = [
        state.heroes[0].discard.find((card) => card.id === source.id) || state.heroes[0].hand[0],
        ...state.heroes[0].hand,
      ];
      state.elements.volt = 'waning';
      state.heroModifierDeck = [{ id: 'zero', label: '+0', delta: 0 }];
      state = setPendingHeroAction(state, {
        heroId: state.heroes[0].id,
        cardId: source.id,
        half: 'top',
        useBasicInstead: false,
        consumeElement: true,
      });
      state = executeHeroActionOnHex(state, { q: 1, r: 0 });
      expect(state.enemies[0].hp).toBe(14);
      expect(state.elements.volt).toBe('inert');
    });

    it('holds a lore spawn until the sealed room is opened', () => {
      let state = createInitialCampaignState();
      const base = mockScenario1.loreNodes.sluice_valve;
      state.activeLoreModal = {
        loreNode: {
          ...base,
          options: [
            { ...base.options[0], spawnEnemyInRoom: { roomId: 2, enemyType: 'drowned_construct', q: 7, r: 4 } },
            base.options[1],
          ],
        },
        heroId: state.heroes[0].id,
        tileCoord: { q: 3, r: 1 },
      };

      state = resolveLoreModalChoice(state, 0);
      expect(state.enemies.some((enemy) => enemy.q === 7 && enemy.r === 4 && enemy.hp > 0)).toBe(false);
      expect(state.enemies.some((enemy) => enemy.q === 7 && enemy.r === 4 && enemy.hp === 0)).toBe(true);

      state = setPendingHeroAction(state, {
        heroId: state.heroes[0].id,
        cardId: state.heroes[0].hand[0].id,
        half: 'bottom',
        useBasicInstead: false,
        consumeElement: false,
      });
      state = executeHeroActionOnHex(state, { q: 4, r: 2 });
      expect(state.enemies.some((enemy) => enemy.q === 7 && enemy.r === 4 && enemy.hp > 0)).toBe(true);
    });

    it('exhausts a hero who drops to 0 HP on a trap', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      hero.hp = 3;
      state = setPendingHeroAction(state, {
        heroId: hero.id,
        cardId: hero.hand[0].id,
        half: 'bottom',
        useBasicInstead: false,
        consumeElement: false,
      });
      state = executeHeroActionOnHex(state, { q: 2, r: 1 });
      const updated = state.heroes.find((candidate) => candidate.id === hero.id);
      expect(updated?.hp).toBe(0);
      expect(updated?.exhausted).toBe(true);
      expect(state.tiles.find((tile) => tile.q === 2 && tile.r === 1)?.terrain).toBe('floor');
    });

    it('applies retaliate from a shield action', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      const source = hero.hand[1];
      hero.hand = hero.hand.map((card) =>
        card.id === source.id ? { ...card, top: { ...card.top, retaliate: 3 } } : card
      );
      state = setPendingHeroAction(state, {
        heroId: hero.id,
        cardId: source.id,
        half: 'top',
        useBasicInstead: false,
        consumeElement: false,
      });
      state = executeHeroActionOnHex(state, { q: hero.q, r: hero.r });
      expect(state.heroes[0].shield).toBe(2);
      expect(state.heroes[0].retaliate).toBe(3);
    });

    it('enemy area attacks hit every adjacent hero and stop before occupied hexes', () => {
      let state = createInitialCampaignState();
      const lurker = state.enemies.find((enemy) => enemy.enemyType === 'silt_lurker');
      if (!lurker) throw new Error('missing lurker');
      state.enemies = [{ ...lurker, q: 2, r: 0, hp: 8, baseShield: 0, statuses: [] }];
      state.heroes = state.heroes.map((hero) => ({ ...hero, hp: 10, shield: 0, retaliate: 0 }));
      state.heroes[2].q = 3;
      state.heroes[2].r = 0;
      state.enemyModifierDeck = [{ id: 'zero', label: '+0', delta: 0 }];
      state.enemyModifierDiscard = [];
      state.phase = 'PHASE_TURN_EXECUTION';
      const active = state.heroes[0];
      state.turnOrder = [
        { id: active.id, isHero: true, heroId: active.id, name: active.name, initiative: 5, acted: false },
        {
          id: 'enemy_group_silt_lurker',
          isHero: false,
          enemyType: 'silt_lurker',
          name: 'Silt Lurker',
          initiative: 40,
          acted: false,
          intentCard: {
            id: 'aoe',
            name: 'Pressure Vent',
            initiative: 40,
            move: 1,
            attack: 2,
            range: 1,
            aoeAdjacentAll: true,
            description: 'Attack 2 all adjacent',
          },
        },
      ];
      state.activeTurnIndex = 0;
      state.heroes[0].selectedCards = null;

      state = skipOrEndActiveTurn(state);
      const byId = (id: string) => state.heroes.find((hero) => hero.id === id);
      expect(byId(state.heroes[2].id)?.q).toBe(3);
      const enemy = state.enemies[0];
      expect(enemy.q).toBe(2);
      expect(enemy.r).toBe(0);
      expect(byId('hero_lorekeeper')?.hp).toBe(8);
      expect(byId('hero_sentinel')?.hp).toBe(8);
      expect(byId('hero_vanguard')?.hp).toBe(10);
      expect(byId('hero_scavenger')?.hp).toBe(10);
    });

    it('stun discards the selected cards, applies wound, and ends the turn', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      hero.hp = 8;
      hero.statuses = ['stun', 'wound', 'strengthen'];
      hero.selectedCards = [hero.hand[0].id, hero.hand[1].id];
      state.phase = 'PHASE_TURN_EXECUTION';
      state.turnOrder = [
        { id: hero.id, isHero: true, heroId: hero.id, name: hero.name, initiative: 12, acted: false },
      ];
      state.activeTurnIndex = 0;

      state = skipOrEndActiveTurn(state);
      const updated = state.heroes[0];
      expect(updated.hp).toBe(7);
      expect(updated.statuses).toEqual(['wound']);
      expect(updated.discard.map((card) => card.id)).toEqual(expect.arrayContaining([hero.hand[0].id, hero.hand[1].id]));
    });

    it('exhausts a hero whose short rest leaves fewer than two cards', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      const only = hero.hand[0];
      hero.hand = [];
      hero.discard = [only];

      state = performShortRest(state, hero.id, false);
      expect(state.heroes[0].hand).toHaveLength(0);
      expect(state.heroes[0].lost).toEqual([only]);
      expect(state.heroes[0].exhausted).toBe(true);
    });

    it('exhausts a hero who cannot act when the round locks in', () => {
      let state = createInitialCampaignState();
      const stuck = state.heroes[0];
      stuck.hand = [];
      stuck.discard = [];
      for (const hero of state.heroes.slice(1)) {
        hero.discard = [hero.hand[0], hero.hand[1]];
        hero.longRestDeclared = true;
        hero.selectedCards = null;
      }

      expect(canLockInRound(state)).toBe(true);
      state = lockInRoundAndReveal(state);
      expect(state.heroes[0].exhausted).toBe(true);
      expect(state.turnOrder.some((entry) => entry.heroId === stuck.id)).toBe(false);
    });

    it('keeps perk removals in the deck of the next scenario', () => {
      let state = createInitialCampaignState();
      state.heroes[0].xp = 18;
      state = unlockHeroPerkInOutpost(state, state.heroes[0].id);
      state = startScenario({ ...state, screen: 'outpost' }, 'sunken_lock');
      const minusOnes = state.heroModifierDeck.filter(
        (card) => card.delta === -1 && card.multiplier === undefined
      );
      expect(minusOnes).toHaveLength(3);
      expect(state.heroes[0].level).toBe(2);
    });

    it('applies flanking to a basic attack and still spends the attack bonus on an empty hex', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      state.enemies[0].q = 1;
      state.enemies[0].r = 0;
      state.enemies[0].hp = 20;
      state.enemies[0].baseShield = 0;
      state.heroModifierDeck = [
        { id: 'minus', label: '-1', delta: -1 },
        { id: 'plus', label: '+1', delta: 1 },
      ];
      state.heroModifierDiscard = [];
      hero.nextAttackBonus = 1;

      state = setPendingHeroAction(state, {
        heroId: hero.id,
        cardId: hero.hand[0].id,
        half: 'top',
        useBasicInstead: true,
        consumeElement: false,
      });
      state = executeHeroActionOnHex(state, { q: 1, r: 0 });
      expect(state.enemies[0].hp).toBe(16);
      expect(state.heroes[0].nextAttackBonus).toBe(0);

      state.heroes[0].topUsedThisTurn = false;
      state.heroes[0].nextAttackBonus = 4;
      const played = state.heroes[0].discard[0];
      state.heroes[0].hand = [played, ...state.heroes[0].hand];
      state.heroes[0].discard = [];
      state = setPendingHeroAction(state, {
        heroId: state.heroes[0].id,
        cardId: played.id,
        half: 'top',
        useBasicInstead: true,
        consumeElement: false,
      });
      state = executeHeroActionOnHex(state, { q: 5, r: 5 });
      expect(state.heroes[0].nextAttackBonus).toBe(0);
    });

    it('pulls the nearest enemy after a move with pull', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      const source = hero.hand[0];
      hero.hand = [{ ...source, bottom: { ...source.bottom, pull: 1, range: 2 } }, ...hero.hand.slice(1)];
      state.heroes = state.heroes.map((candidate, index) =>
        index === 0 ? candidate : { ...candidate, exhausted: true }
      );
      state.enemies[0].q = 2;
      state.enemies[0].r = 0;
      state.enemies[0].hp = 12;

      state = setPendingHeroAction(state, {
        heroId: hero.id,
        cardId: hero.hand[0].id,
        half: 'bottom',
        useBasicInstead: false,
        consumeElement: false,
      });
      state = executeHeroActionOnHex(state, { q: 0, r: 0 });
      expect(state.heroes[0].q).toBe(0);
      expect(state.enemies[0].q).toBe(1);
      expect(state.enemies[0].r).toBe(0);
      expect(state.enemies[0].hp).toBe(12);
    });

    it('does not grant a long rest to a stunned hero at the end of the round', () => {
      let state = createInitialCampaignState();
      const hero = state.heroes[0];
      hero.hp = 4;
      hero.statuses = ['stun'];
      hero.longRestDeclared = true;
      hero.discard = [hero.hand[0], hero.hand[1]];
      hero.hand = hero.hand.slice(2);
      state.phase = 'PHASE_TURN_EXECUTION';
      state.turnOrder = [
        { id: hero.id, isHero: true, heroId: hero.id, name: hero.name, initiative: 99, acted: false },
      ];
      state.activeTurnIndex = 0;

      state = skipOrEndActiveTurn(state);
      expect(state.heroes[0].hp).toBe(4);
      expect(state.heroes[0].lost).toHaveLength(0);
      expect(state.heroes[0].longRestDeclared).toBe(false);
    });

    it('drops temporary move markers when returning to the outpost', () => {
      let state = createInitialCampaignState();
      state.phase = 'PHASE_SCENARIO_VICTORY';
      state.heroes[0].equippedRelics = [
        { relicId: 'aegis_aether_plate', used: true },
        { relicId: '__boots_jump', used: false },
        { relicId: '__move_bonus_2', used: false },
      ];

      state = returnToOutpost(state);
      const relics = state.heroes[0].equippedRelics;
      expect(relics.map((relic) => relic.relicId)).toEqual(['aegis_aether_plate']);
      expect(relics[0].used).toBe(false);
    });
  });
});
