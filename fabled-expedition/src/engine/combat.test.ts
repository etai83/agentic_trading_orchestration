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
      const initialEnemyHp = state.enemies[0].hp;

      state = setPendingHeroAction(state, {
        heroId: hero.id,
        cardId: hero.hand[0].id,
        half: 'top',
        useBasicInstead: false,
        consumeElement: false,
      });

      state = executeHeroActionOnHex(state, { q: 1, r: 0 });
      expect(state.enemies[0].hp).toBeLessThan(initialEnemyHp);
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
  });
});
