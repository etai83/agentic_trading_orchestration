import {
  coordKey,
  coordsEqual,
  hexDistance,
  hexNeighbors,
  getTileAt,
  hasLineOfSight,
  getReachableHexes,
  findShortestPath,
  getAoeHexes,
  isFlanked,
  hasCover,
} from './hex';
import { HERO_ARCHETYPES, HERO_LIST } from '../data/classes';
import { ENEMY_ARCHETYPES } from '../data/enemies';
import { RELIC_ITEMS, RELIC_BY_ID } from '../data/relics';
import { SCENARIOS, SCENARIO_BY_ID } from '../data/scenarios';
import type {
  GameState,
  ModifierCard,
  ModifierDrawResult,
  HexCoord,
  PendingActionSelection,
  HeroUnitState,
  EnemyUnitState,
  TurnOrderEntry,
  EnemyIntentCard,
  ElementType,
  ElementState,
  StatusEffect,
  AbilityHalf,
  EnemyTypeId,
  ScenarioConfig,
} from '../types/game';

const EXPIRING_STATUSES: StatusEffect[] = ['immobilize', 'muddle', 'strengthen', 'stun'];
const BOOTS_MARKER = '__boots_jump';
const MOVE_BONUS_PREFIX = '__move_bonus_';
const SUMMON_ATTACK = 2;
const SUMMON_RANGE = 2;

type RuntimeEntry = TurnOrderEntry & {
  prepared?: boolean;
  expireStatuses?: StatusEffect[];
};

interface FightUnit {
  id: string;
  name: string;
  q: number;
  r: number;
  hp: number;
  hover?: boolean;
  immunities?: StatusEffect[];
  statuses: StatusEffect[];
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    completedScenarioIds: [...state.completedScenarioIds],
    tiles: state.tiles.map((t) => ({ ...t })),
    heroes: state.heroes.map((h) => ({
      ...h,
      statuses: [...h.statuses],
      hand: [...h.hand],
      discard: [...h.discard],
      lost: [...h.lost],
      equippedRelics: h.equippedRelics.map((r) => ({ ...r })),
      selectedCards: h.selectedCards ? [h.selectedCards[0], h.selectedCards[1]] : null,
    })),
    enemies: state.enemies.map((e) => ({
      ...e,
      immunities: [...e.immunities],
      statuses: [...e.statuses],
    })),
    elements: { ...state.elements },
    enemyIntents: { ...state.enemyIntents },
    turnOrder: state.turnOrder.map((t) => ({ ...t })),
    heroModifierDeck: [...state.heroModifierDeck],
    heroModifierDiscard: [...state.heroModifierDiscard],
    enemyModifierDeck: [...state.enemyModifierDeck],
    enemyModifierDiscard: [...state.enemyModifierDiscard],
    unlockedRelicIds: [...state.unlockedRelicIds],
    combatLog: [...state.combatLog],
  };
}

function isTerminal(state: GameState): boolean {
  return state.phase === 'PHASE_SCENARIO_VICTORY' || state.phase === 'PHASE_SCENARIO_DEFEAT';
}

function scenarioOf(state: GameState): ScenarioConfig {
  return SCENARIO_BY_ID[state.scenarioId] || SCENARIOS[0];
}

function elementReady(elements: Record<ElementType, ElementState>, element: ElementType): boolean {
  return elements[element] === 'strong' || elements[element] === 'waning';
}

function addStatus(unit: { statuses: StatusEffect[]; immunities?: StatusEffect[] }, status: StatusEffect) {
  if (unit.immunities?.includes(status)) return;
  if (!unit.statuses.includes(status)) unit.statuses.push(status);
}

function expiringNow(statuses: StatusEffect[]): StatusEffect[] {
  return statuses.filter((s) => EXPIRING_STATUSES.includes(s));
}

function expireNoted(unit: { statuses: StatusEffect[] }, noted: StatusEffect[] | undefined) {
  if (!noted || noted.length === 0) return;
  unit.statuses = unit.statuses.filter((s) => !noted.includes(s));
}

function discardSelected(hero: HeroUnitState) {
  if (!hero.selectedCards) return;
  for (const cardId of hero.selectedCards) {
    if (!cardId) continue;
    const idx = hero.hand.findIndex((c) => c.id === cardId);
    if (idx === -1) continue;
    const [card] = hero.hand.splice(idx, 1);
    hero.discard.push(card);
  }
  hero.selectedCards = null;
}

function occupiedKeys(state: GameState, ignoreId?: string): Set<string> {
  const keys = new Set<string>();
  for (const hero of state.heroes) {
    if (!hero.exhausted && hero.hp > 0) keys.add(coordKey(hero));
  }
  for (const enemy of state.enemies) {
    if (enemy.hp > 0 && enemy.id !== ignoreId) keys.add(coordKey(enemy));
  }
  return keys;
}

function canStopOn(state: GameState, coord: HexCoord, hover: boolean, occupied: Set<string>): boolean {
  const tile = getTileAt(state.tiles, coord);
  if (!tile || !tile.revealed || tile.terrain === 'wall') return false;
  if (tile.terrain === 'obstacle' && !hover) return false;
  if (occupied.has(coordKey(coord))) return false;
  return true;
}

function bestForcedStep(from: HexCoord, source: HexCoord, direction: 'push' | 'pull'): HexCoord | null {
  const dq = from.q - source.q;
  const dr = from.r - source.r;
  const ds = -dq - dr;
  const sign = direction === 'push' ? 1 : -1;
  let best: HexCoord | null = null;
  let bestDot = 0;
  for (const neighbor of hexNeighbors(from)) {
    const ndq = neighbor.q - from.q;
    const ndr = neighbor.r - from.r;
    const nds = -ndq - ndr;
    const dot = sign * (ndq * dq + ndr * dr + nds * ds);
    if (dot > bestDot) {
      bestDot = dot;
      best = neighbor;
    }
  }
  return best;
}

function applyHazardAndTrap(state: GameState, unit: FightUnit, coord: HexCoord) {
  const tile = getTileAt(state.tiles, coord);
  if (!tile) return;
  if (tile.terrain === 'trap') {
    unit.hp = Math.max(0, unit.hp - 3);
    addStatus(unit, 'immobilize');
    tile.terrain = 'floor';
    state.combatLog.push(`${unit.name} sprung a trap! Suffered 3 damage and Immobilized.`);
  } else if (tile.terrain === 'hazard' && !unit.hover) {
    unit.hp = Math.max(0, unit.hp - 2);
    state.combatLog.push(`${unit.name} stepped on hazardous terrain! Suffered 2 damage.`);
  }
}

function forceMove(state: GameState, unit: FightUnit, source: HexCoord, amount: number, direction: 'push' | 'pull') {
  if (amount <= 0 || unit.hp <= 0) return;
  for (let step = 0; step < amount && unit.hp > 0; step++) {
    const next = bestForcedStep({ q: unit.q, r: unit.r }, source, direction);
    if (!next) break;
    const occupied = occupiedKeys(state, unit.id);
    if (!canStopOn(state, next, !!unit.hover, occupied)) break;
    unit.q = next.q;
    unit.r = next.r;
    applyHazardAndTrap(state, unit, next);
  }
}

function makeEnemy(
  type: EnemyTypeId,
  coord: HexCoord,
  roomId: number,
  id: string,
  hpOverride?: number
): EnemyUnitState {
  const archetype = ENEMY_ARCHETYPES[type];
  const maxHp = archetype ? archetype.maxHp : 5;
  return {
    id,
    unitType: 'enemy',
    enemyType: type,
    name: archetype ? archetype.name : type,
    q: coord.q,
    r: coord.r,
    roomId,
    hp: hpOverride === undefined ? maxHp : hpOverride,
    maxHp,
    baseShield: archetype ? archetype.baseShield : 0,
    tempShield: 0,
    hover: archetype ? !!archetype.hover : false,
    isBoss: archetype ? !!archetype.isBoss : false,
    isObjectiveStructure: archetype ? !!archetype.isObjectiveStructure : false,
    immunities: archetype?.immunities ? [...archetype.immunities] : [],
    statuses: [],
  };
}

function livingHeroes(state: GameState): HeroUnitState[] {
  return state.heroes.filter((h) => !h.exhausted && h.hp > 0);
}

function heroesInRange(state: GameState, origin: HexCoord, range: number): HeroUnitState[] {
  return livingHeroes(state)
    .filter((hero) => {
      const dist = hexDistance(origin, hero);
      return dist <= range && hasLineOfSight(state.tiles, origin, hero);
    })
    .sort((a, b) => hexDistance(origin, a) - hexDistance(origin, b) || a.id.localeCompare(b.id));
}

function closestHero(state: GameState, origin: HexCoord): HeroUnitState | null {
  const heroes = livingHeroes(state);
  if (heroes.length === 0) return null;
  return heroes.reduce((best, hero) =>
    hexDistance(origin, hero) < hexDistance(origin, best) ? hero : best
  );
}

function readMoveBuff(hero: HeroUnitState): { bonus: number; jump: boolean } {
  let bonus = 0;
  let jump = false;
  for (const relic of hero.equippedRelics) {
    if (relic.relicId === BOOTS_MARKER) {
      bonus += 2;
      jump = true;
    } else if (relic.relicId.startsWith(MOVE_BONUS_PREFIX)) {
      bonus += Number(relic.relicId.slice(MOVE_BONUS_PREFIX.length)) || 0;
    }
  }
  return { bonus, jump };
}

function consumeMoveBuffs(hero: HeroUnitState) {
  hero.equippedRelics = hero.equippedRelics.filter(
    (r) => r.relicId !== BOOTS_MARKER && !r.relicId.startsWith(MOVE_BONUS_PREFIX)
  );
}

function grantMoveBonus(state: GameState, hero: HeroUnitState, amount: number, range: number | undefined) {
  const reach = range && range > 0 ? range : 1;
  for (const ally of state.heroes) {
    if (ally.id === hero.id || ally.exhausted || ally.hp <= 0) continue;
    if (hexDistance(hero, ally) > reach) continue;
    ally.equippedRelics.push({ relicId: `${MOVE_BONUS_PREFIX}${amount}`, used: false });
  }
}

function isPlaceTrap(half: AbilityHalf | null | undefined): boolean {
  if (!half || half.type !== 'utility') return false;
  if (!half.statusApplied?.includes('immobilize')) return false;
  return !half.range && !half.targets && !half.disarmTrap && !half.recoverDiscarded && !half.grantAllyAttackBonus;
}

function openDoor(state: GameState, tileCoord: HexCoord) {
  const tile = getTileAt(state.tiles, tileCoord);
  if (!tile || tile.terrain !== 'door' || tile.interacted || !tile.unlocksRoomId) return;
  const roomId = tile.unlocksRoomId;
  tile.interacted = true;
  for (const other of state.tiles) {
    if (other.roomId === roomId) other.revealed = true;
  }

  const scenario = scenarioOf(state);
  scenario.enemySpawns
    .filter((spawn) => spawn.roomId === roomId)
    .forEach((spawn, idx) => {
      state.enemies.push(
        makeEnemy(
          spawn.enemyType,
          { q: spawn.q, r: spawn.r },
          spawn.roomId,
          `enemy_${spawn.enemyType}_r${roomId}_${idx}`
        )
      );
    });

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 && enemy.id.startsWith(`pending_${roomId}_`)) {
      enemy.hp = enemy.maxHp;
      enemy.id = enemy.id.replace('pending_', 'alive_');
    }
  }

  state.combatLog.push(`Door breached! Room ${roomId} revealed.`);
}

function modifierMode(
  advantage: boolean,
  disadvantage: boolean
): 'normal' | 'advantage' | 'disadvantage' {
  if (advantage && !disadvantage) return 'advantage';
  if (!advantage && disadvantage) return 'disadvantage';
  return 'normal';
}

function strike(params: {
  state: GameState;
  deck: 'hero' | 'enemy';
  base: number;
  poisoned: boolean;
  shield: number;
  pierce: number;
  mode: 'normal' | 'advantage' | 'disadvantage';
  targetName: string;
}): { damage: number; missed: boolean; label: string } {
  const attack = params.base + (params.poisoned ? 1 : 0);
  const deck = params.deck === 'hero' ? params.state.heroModifierDeck : params.state.enemyModifierDeck;
  const discard = params.deck === 'hero' ? params.state.heroModifierDiscard : params.state.enemyModifierDiscard;
  const drawn = drawModifier(deck, discard, attack, params.mode);
  if (params.deck === 'hero') {
    params.state.heroModifierDeck = drawn.nextDeck;
    params.state.heroModifierDiscard = drawn.nextDiscard;
  } else {
    params.state.enemyModifierDeck = drawn.nextDeck;
    params.state.enemyModifierDiscard = drawn.nextDiscard;
  }
  params.state.lastModifierPopup = {
    targetName: params.targetName,
    result: drawn.result,
    timestamp: Date.now(),
  };
  const missed = drawn.result.chosenCard.multiplier === 0;
  const effectiveShield = Math.max(0, params.shield - params.pierce);
  const damage = Math.max(0, drawn.result.finalDamage - effectiveShield);
  return { damage, missed, label: drawn.result.chosenCard.label };
}

function exhaustHero(hero: HeroUnitState, state: GameState) {
  if (hero.hp > 0 || hero.exhausted) return;
  hero.exhausted = true;
  state.combatLog.push(`${hero.name} has exhausted!`);
}

export function createStandardModifierDeck(): ModifierCard[] {
  const cards: ModifierCard[] = [];

  for (let i = 0; i < 6; i++) {
    cards.push({ id: `mod_plus0_${i}`, label: '+0', delta: 0 });
  }
  for (let i = 0; i < 5; i++) {
    cards.push({ id: `mod_plus1_${i}`, label: '+1', delta: 1 });
  }
  for (let i = 0; i < 5; i++) {
    cards.push({ id: `mod_minus1_${i}`, label: '-1', delta: -1 });
  }
  cards.push({ id: 'mod_plus2_0', label: '+2', delta: 2 });
  cards.push({ id: 'mod_minus2_0', label: '-2', delta: -2 });
  cards.push({
    id: 'mod_crit_0',
    label: '2x Critical',
    delta: 0,
    multiplier: 2,
    shuffleAtEnd: true,
  });
  cards.push({
    id: 'mod_null_0',
    label: '0x Null',
    delta: 0,
    multiplier: 0,
    shuffleAtEnd: true,
  });

  return shuffleArray(cards);
}

function calculateCardDamage(card: ModifierCard, baseDamage: number): number {
  if (card.multiplier !== undefined) {
    return Math.max(0, Math.floor(baseDamage * card.multiplier));
  }
  return Math.max(0, baseDamage + card.delta);
}

export function drawModifier(
  deck: ModifierCard[],
  discard: ModifierCard[],
  baseDamage: number,
  mode: 'normal' | 'advantage' | 'disadvantage'
): {
  result: ModifierDrawResult;
  nextDeck: ModifierCard[];
  nextDiscard: ModifierCard[];
} {
  let currentDeck = [...deck];
  let currentDiscard = [...discard];
  const count = mode === 'normal' ? 1 : 2;

  if (currentDeck.length < count && currentDiscard.length > 0) {
    currentDeck = shuffleArray([...currentDeck, ...currentDiscard]);
    currentDiscard = [];
  }

  const drawCount = Math.min(count, currentDeck.length);
  const drawnCards = currentDeck.slice(0, drawCount);
  let nextDeck = currentDeck.slice(drawCount);

  let chosenCard: ModifierCard;
  if (drawnCards.length === 0) {
    chosenCard = { id: 'mod_empty', label: '+0', delta: 0 };
  } else if (drawnCards.length === 1 || mode === 'normal') {
    chosenCard = drawnCards[0];
  } else if (mode === 'advantage') {
    const dmg0 = calculateCardDamage(drawnCards[0], baseDamage);
    const dmg1 = calculateCardDamage(drawnCards[1], baseDamage);
    chosenCard = dmg1 > dmg0 ? drawnCards[1] : drawnCards[0];
  } else {
    const dmg0 = calculateCardDamage(drawnCards[0], baseDamage);
    const dmg1 = calculateCardDamage(drawnCards[1], baseDamage);
    chosenCard = dmg1 < dmg0 ? drawnCards[1] : drawnCards[0];
  }

  const finalDamage =
    drawnCards.length === 0 ? Math.max(0, baseDamage) : calculateCardDamage(chosenCard, baseDamage);

  const nextDiscard = [...currentDiscard];
  for (const card of drawnCards) {
    if (!card.temporary) nextDiscard.push(card);
  }

  // Critical and Null reshuffle the discard into the deck after the draw. Bless/Curse do not.
  if (drawnCards.some((card) => card.shuffleAtEnd && !card.temporary)) {
    nextDeck = shuffleArray([...nextDeck, ...nextDiscard]);
    nextDiscard.length = 0;
  }

  return {
    result: {
      finalDamage,
      drawnCards,
      chosenCard,
      mode,
    },
    nextDeck,
    nextDiscard,
  };
}

export function createInitialCampaignState(): GameState {
  const baseState: GameState = {
    screen: 'scenario',
    scenarioId: 'sunken_lock',
    completedScenarioIds: [],
    round: 1,
    phase: 'PHASE_PLANNING',
    tiles: [],
    heroes: [],
    enemies: [],
    elements: {
      steam: 'inert',
      volt: 'inert',
      aether: 'inert',
      mire: 'inert',
    },
    enemyIntents: {},
    turnOrder: [],
    activeTurnIndex: 0,
    pendingAction: null,
    activeLoreModal: null,
    heroModifierDeck: createStandardModifierDeck(),
    heroModifierDiscard: [],
    enemyModifierDeck: createStandardModifierDeck(),
    enemyModifierDiscard: [],
    salvage: 0,
    reputation: 0,
    unlockedRelicIds: [
      'stamina_tonic',
      'pneumatic_boots',
      'aegis_aether_plate',
      'resonance_lens',
      'overclocked_capacitor',
    ],
    combatLog: ['The expedition has begun. Entering The Sunken Lock of Aethel.'],
    lastModifierPopup: null,
    chestLootedInScenario: false,
    pylonsActivated: 0,
  };

  return startScenario(baseState, 'sunken_lock');
}

export function startScenario(state: GameState, scenarioId: string): GameState {
  const scenario = SCENARIO_BY_ID[scenarioId] || SCENARIOS[0];
  const nextTiles = (scenario.tiles || []).map((t) => ({
    ...t,
    revealed: t.roomId === 1,
    interacted: false,
  }));

  const initialHeroArchetypes = HERO_LIST && HERO_LIST.length > 0
    ? HERO_LIST
    : Object.values(HERO_ARCHETYPES);

  const nextHeroes: HeroUnitState[] = initialHeroArchetypes.map((archetype, idx) => {
    const existing = state.heroes.find((h) => h.classId === archetype.id);
    const level = existing ? existing.level : 1;
    const xp = existing ? existing.xp : 0;
    const perksUnlocked = existing ? existing.perksUnlocked : 0;
    const maxHp = archetype.baseHp + (level - 1) * 2;
    const spawnCoord = scenario.heroSpawns[idx] || { q: 0, r: idx };

    const starterCards = archetype.starterCards ? [...archetype.starterCards] : [];
    const level2Cards = archetype.level2Cards && level >= 2 ? [...archetype.level2Cards] : [];
    const combinedHand = [...starterCards, ...level2Cards].slice(0, archetype.handSize);

    const equippedRelics = existing
      ? existing.equippedRelics
          .filter((r) => r.relicId !== BOOTS_MARKER && !r.relicId.startsWith(MOVE_BONUS_PREFIX))
          .map((r) => ({ ...r, used: false }))
      : [];

    return {
      id: `hero_${archetype.id}`,
      unitType: 'hero',
      classId: archetype.id,
      name: archetype.name,
      level,
      xp,
      q: spawnCoord.q,
      r: spawnCoord.r,
      hp: maxHp,
      maxHp,
      shield: 0,
      retaliate: 0,
      nextAttackBonus: 0,
      statuses: [],
      exhausted: false,
      hand: combinedHand,
      discard: [],
      lost: [],
      selectedCards: null,
      longRestDeclared: false,
      topUsedThisTurn: false,
      bottomUsedThisTurn: false,
      equippedRelics,
      perksUnlocked,
    };
  });

  const nextEnemies: EnemyUnitState[] = (scenario.enemySpawns || [])
    .filter((s) => s.roomId === 1)
    .map((s, idx) => {
      const archetype = ENEMY_ARCHETYPES[s.enemyType];
      return {
        id: `enemy_${s.enemyType}_r1_${idx}`,
        unitType: 'enemy',
        enemyType: s.enemyType,
        name: archetype ? archetype.name : s.enemyType,
        q: s.q,
        r: s.r,
        roomId: s.roomId,
        hp: archetype ? archetype.maxHp : 5,
        maxHp: archetype ? archetype.maxHp : 5,
        baseShield: archetype ? archetype.baseShield : 0,
        tempShield: 0,
        hover: archetype ? !!archetype.hover : false,
        isBoss: archetype ? !!archetype.isBoss : false,
        isObjectiveStructure: archetype ? !!archetype.isObjectiveStructure : false,
        immunities: archetype && archetype.immunities ? [...archetype.immunities] : [],
        statuses: [],
      };
    });

  let heroDeck = createStandardModifierDeck();
  const perkCuts = nextHeroes.reduce((sum, hero) => sum + (hero.perksUnlocked || 0) * 2, 0);
  if (perkCuts > 0) heroDeck = removeMinusOnes(heroDeck, perkCuts).next;
  if (state.reputation >= 2) {
    heroDeck.push({
      id: `bless_rep_${heroDeck.length}`,
      label: 'Bless (2x)',
      delta: 0,
      multiplier: 2,
      temporary: true,
    });
    heroDeck = shuffleArray(heroDeck);
  }

  const extraSalvage = state.reputation <= -2 ? 10 : 0;

  return {
    ...state,
    screen: 'scenario',
    scenarioId,
    round: 1,
    phase: 'PHASE_PLANNING',
    tiles: nextTiles,
    heroes: nextHeroes,
    enemies: nextEnemies,
    elements: {
      steam: 'inert',
      volt: 'inert',
      aether: 'inert',
      mire: 'inert',
    },
    enemyIntents: {},
    turnOrder: [],
    activeTurnIndex: 0,
    pendingAction: null,
    activeLoreModal: null,
    heroModifierDeck: heroDeck,
    heroModifierDiscard: [],
    enemyModifierDeck: createStandardModifierDeck(),
    enemyModifierDiscard: [],
    salvage: state.salvage + extraSalvage,
    chestLootedInScenario: false,
    pylonsActivated: 0,
    combatLog: [
      ...state.combatLog,
      `Entered scenario: ${scenario.title}. Prepare for Phase Planning.`,
    ],
    lastModifierPopup: null,
  };
}

export function toggleSelectCard(
  state: GameState,
  heroId: string,
  cardId: string
): GameState {
  if (state.phase !== 'PHASE_PLANNING') return state;

  const nextHeroes = state.heroes.map((hero) => {
    if (hero.id !== heroId || hero.exhausted) return hero;

    const current = hero.selectedCards ? [...hero.selectedCards].filter(Boolean) : [];
    let nextSelected: [string, string] | null = null;

    if (current.includes(cardId)) {
      const remaining = current.filter((id) => id !== cardId);
      if (remaining.length === 0) {
        nextSelected = null;
      } else {
        nextSelected = [remaining[0], ''] as unknown as [string, string];
      }
    } else {
      if (current.length === 0) {
        nextSelected = [cardId, ''] as unknown as [string, string];
      } else if (current.length === 1) {
        nextSelected = [current[0], cardId];
      } else {
        nextSelected = [current[0], cardId];
      }
    }

    return {
      ...hero,
      selectedCards: nextSelected,
      longRestDeclared: false,
    };
  });

  return {
    ...state,
    heroes: nextHeroes,
  };
}

export function toggleLongRest(state: GameState, heroId: string): GameState {
  if (state.phase !== 'PHASE_PLANNING') return state;

  const nextHeroes = state.heroes.map((hero) => {
    if (hero.id !== heroId || hero.exhausted) return hero;

    if (hero.longRestDeclared) {
      return {
        ...hero,
        longRestDeclared: false,
      };
    }

    if (hero.discard.length >= 2) {
      return {
        ...hero,
        longRestDeclared: true,
        selectedCards: null,
      };
    }

    return hero;
  });

  return {
    ...state,
    heroes: nextHeroes,
  };
}

export function performShortRest(
  state: GameState,
  heroId: string,
  rerollWithDamage?: boolean
): GameState {
  const heroIndex = state.heroes.findIndex((h) => h.id === heroId);
  if (heroIndex === -1) return state;
  const hero = state.heroes[heroIndex];
  if (hero.exhausted || hero.discard.length === 0) return state;

  let lostIndex = Math.floor(Math.random() * hero.discard.length);
  let currentHp = hero.hp;
  if (rerollWithDamage && hero.hp > 1 && hero.discard.length > 1) {
    currentHp -= 1;
    let reroll = Math.floor(Math.random() * (hero.discard.length - 1));
    if (reroll >= lostIndex) reroll += 1;
    lostIndex = reroll;
  }

  const lostCard = hero.discard[lostIndex];
  const recoveredCards = hero.discard.filter((_, idx) => idx !== lostIndex);
  const nextHand = [...hero.hand, ...recoveredCards];

  const updatedHero: HeroUnitState = {
    ...hero,
    hp: currentHp,
    hand: nextHand,
    discard: [],
    lost: [...hero.lost, lostCard],
    exhausted: hero.exhausted || nextHand.length < 2,
  };

  const nextHeroes = [...state.heroes];
  nextHeroes[heroIndex] = updatedHero;

  const log = [`${hero.name} performs Short Rest, losing ${lostCard.name}.`];
  if (updatedHero.exhausted && !hero.exhausted) log.push(`${hero.name} has exhausted!`);

  return {
    ...state,
    heroes: nextHeroes,
    combatLog: [...state.combatLog, ...log],
  };
}

export function canLockInRound(state: GameState): boolean {
  if (state.phase !== 'PHASE_PLANNING') return false;

  const livingHeroes = state.heroes.filter((h) => !h.exhausted);
  if (livingHeroes.length === 0) return false;

  return livingHeroes.every((h) => {
    if (h.longRestDeclared) return true;
    if (h.hand.length < 2 && h.discard.length < 2) return true;
    if (!h.selectedCards) return false;
    const validCards = h.selectedCards.filter(Boolean);
    return validCards.length === 2;
  });
}

function moveEnemyAlong(state: GameState, enemy: EnemyUnitState, focus: HeroUnitState, move: number) {
  if (move <= 0 || enemy.statuses.includes('immobilize') || enemy.hp <= 0) return;
  const path = findShortestPath({
    start: { q: enemy.q, r: enemy.r },
    goal: { q: focus.q, r: focus.r },
    jump: false,
    hover: enemy.hover,
    tiles: state.tiles,
    blockedCoords: [
      ...livingHeroes(state).map((h) => ({ q: h.q, r: h.r })),
      ...state.enemies.filter((e) => e.hp > 0 && e.id !== enemy.id).map((e) => ({ q: e.q, r: e.r })),
    ],
  });

  let steps = 0;
  for (const step of path) {
    if (steps >= move || enemy.hp <= 0) break;
    const occupied = occupiedKeys(state, enemy.id).has(coordKey(step));
    if (occupied && !enemy.hover) break;
    steps += 1;
    if (occupied) continue;
    enemy.q = step.q;
    enemy.r = step.r;
    applyHazardAndTrap(state, enemy, step);
  }
}

function attackHero(
  state: GameState,
  enemy: EnemyUnitState,
  hero: HeroUnitState,
  intent: EnemyIntentCard
) {
  if (enemy.hp <= 0 || hero.hp <= 0 || hero.exhausted) return;
  const dist = hexDistance(enemy, hero);
  const mode = modifierMode(
    enemy.statuses.includes('strengthen'),
    enemy.statuses.includes('muddle') || hasCover(enemy, hero, state.tiles)
  );
  const hit = strike({
    state,
    deck: 'enemy',
    base: intent.attack,
    poisoned: hero.statuses.includes('poison'),
    shield: hero.shield,
    pierce: intent.pierce || 0,
    mode,
    targetName: hero.name,
  });
  hero.hp = Math.max(0, hero.hp - hit.damage);
  state.combatLog.push(
    `${enemy.name} attacks ${hero.name} for ${hit.damage} damage (${hit.label}).`
  );

  if (!hit.missed) {
    for (const status of intent.statusApplied || []) addStatus(hero, status);
    if (intent.push) forceMove(state, hero, enemy, intent.push, 'push');
    if (intent.pull) forceMove(state, hero, enemy, intent.pull, 'pull');
  }

  exhaustHero(hero, state);
  if (hero.hp > 0 && hero.retaliate > 0 && dist <= 1 && enemy.hp > 0) {
    const retaliate = Math.max(0, hero.retaliate - (enemy.baseShield + enemy.tempShield));
    if (retaliate > 0) {
      enemy.hp = Math.max(0, enemy.hp - retaliate);
      state.combatLog.push(
        `${hero.name} retaliates against ${enemy.name} for ${retaliate} damage.`
      );
    }
  }
}

function resolveEnemyAction(state: GameState, enemy: EnemyUnitState, intent: EnemyIntentCard) {
  const focus = closestHero(state, enemy);
  if (!focus) return;

  if (intent.healAlliesRange2 && intent.healAlliesRange2 > 0) {
    for (const ally of state.enemies) {
      if (ally.hp <= 0 || ally.isSummon) continue;
      if (hexDistance(enemy, ally) <= 2) {
        ally.hp = Math.min(ally.maxHp, ally.hp + intent.healAlliesRange2);
      }
    }
  }

  if (intent.createHazardHexes && intent.createHazardHexes > 0) {
    const range = intent.range && intent.range > 0 ? intent.range : 3;
    const floors = state.tiles
      .filter(
        (tile) =>
          tile.revealed &&
          tile.terrain === 'floor' &&
          hexDistance(enemy, tile) > 0 &&
          hexDistance(enemy, tile) <= range
      )
      .sort((a, b) => hexDistance(enemy, a) - hexDistance(enemy, b));
    for (const tile of floors.slice(0, intent.createHazardHexes)) {
      tile.terrain = 'hazard';
    }
    state.combatLog.push(`${enemy.name} floods the chamber with hazardous terrain.`);
  }

  if (intent.spawnEnemyType) {
    const occupied = occupiedKeys(state);
    const spot = hexNeighbors(enemy).find((coord) => {
      const tile = getTileAt(state.tiles, coord);
      return (
        !!tile &&
        tile.revealed &&
        tile.terrain !== 'wall' &&
        tile.terrain !== 'obstacle' &&
        !occupied.has(coordKey(coord))
      );
    });
    if (spot) {
      const tile = getTileAt(state.tiles, spot);
      state.enemies.push(
        makeEnemy(
          intent.spawnEnemyType,
          spot,
          tile?.roomId ?? enemy.roomId,
          `spawn_${intent.spawnEnemyType}_${state.enemies.length}`
        )
      );
      state.combatLog.push(`${enemy.name} spawns a ${ENEMY_ARCHETYPES[intent.spawnEnemyType]?.name || 'foe'}.`);
    }
  }

  moveEnemyAlong(state, enemy, focus, intent.move || 0);
  if (enemy.hp <= 0) return;

  if (intent.attack > 0) {
    const range = intent.range && intent.range > 0 ? intent.range : 1;
    let targets: HeroUnitState[] = [];
    if (intent.aoeAdjacentAll) {
      targets = heroesInRange(state, enemy, range).filter((hero) => hexDistance(enemy, hero) === 1);
    } else {
      const limit = intent.targets && intent.targets > 1 ? intent.targets : 1;
      targets = heroesInRange(state, enemy, range).slice(0, limit);
    }
    for (const hero of targets) attackHero(state, enemy, hero, intent);
    return;
  }

  if (intent.statusApplied && intent.statusApplied.length > 0) {
    const range = intent.range && intent.range > 0 ? intent.range : 1;
    for (const hero of heroesInRange(state, enemy, range)) {
      if (hexDistance(enemy, hero) < 1) continue;
      for (const status of intent.statusApplied) addStatus(hero, status);
    }
  }
}

function executeEnemyGroupTurn(
  state: GameState,
  enemyType: string,
  intent: EnemyIntentCard | undefined
): GameState {
  if (!intent) return state;
  const matching = state.enemies.filter(
    (enemy) =>
      enemy.enemyType === enemyType &&
      enemy.hp > 0 &&
      !enemy.isSummon &&
      !!getTileAt(state.tiles, enemy)?.revealed
  );

  for (const enemy of matching) {
    const noted = expiringNow(enemy.statuses);
    if (enemy.statuses.includes('wound')) {
      enemy.hp = Math.max(0, enemy.hp - 1);
      state.combatLog.push(`${enemy.name} suffers 1 damage from Wound.`);
    }
    if (enemy.hp <= 0) {
      expireNoted(enemy, noted);
      state.combatLog.push(`${enemy.name} was defeated!`);
      continue;
    }
    if (noted.includes('stun')) {
      expireNoted(enemy, noted);
      state.combatLog.push(`${enemy.name} is Stunned and skips their turn.`);
      continue;
    }
    if (intent.healSelf && intent.healSelf > 0) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + intent.healSelf);
    }
    if (intent.shieldBonus && intent.shieldBonus > 0) enemy.tempShield += intent.shieldBonus;
    if (intent.infuse) {
      state.elements = { ...state.elements, [intent.infuse]: 'strong' };
    }
    resolveEnemyAction(state, enemy, intent);
    expireNoted(enemy, noted);
  }

  return state;
}

function roomsRevealed(state: GameState, roomIds: number[]): boolean {
  return roomIds.every((roomId) => state.tiles.some((tile) => tile.roomId === roomId && tile.revealed));
}

function evaluateScenarioObjectives(state: GameState): GameState {
  const scenario = scenarioOf(state);
  if (!scenario) return state;

  if (livingHeroes(state).length === 0) {
    return {
      ...state,
      phase: 'PHASE_SCENARIO_DEFEAT',
      combatLog: [...state.combatLog, 'All heroes have exhausted. Scenario defeated!'],
    };
  }

  const hostiles = state.enemies.filter((enemy) => enemy.hp > 0 && !enemy.isSummon);
  let objectiveMet = false;
  if (scenario.objectiveType === 'kill_all_and_loot_chest') {
    const rooms = Array.from(new Set(scenario.enemySpawns.map((spawn) => spawn.roomId)));
    objectiveMet = roomsRevealed(state, rooms) && hostiles.length === 0 && state.chestLootedInScenario;
  } else if (scenario.objectiveType === 'destroy_resonators') {
    const rooms = Array.from(
      new Set(
        scenario.enemySpawns
          .filter((spawn) => ENEMY_ARCHETYPES[spawn.enemyType]?.isObjectiveStructure)
          .map((spawn) => spawn.roomId)
      )
    );
    const alive = state.enemies.some((enemy) => enemy.isObjectiveStructure && enemy.hp > 0);
    objectiveMet = rooms.length > 0 && roomsRevealed(state, rooms) && !alive;
  } else if (scenario.objectiveType === 'kill_boss') {
    const rooms = Array.from(
      new Set(
        scenario.enemySpawns
          .filter((spawn) => ENEMY_ARCHETYPES[spawn.enemyType]?.isBoss)
          .map((spawn) => spawn.roomId)
      )
    );
    const alive = state.enemies.some((enemy) => enemy.isBoss && enemy.hp > 0);
    objectiveMet = rooms.length > 0 && roomsRevealed(state, rooms) && !alive;
  }

  if (!objectiveMet) return state;

  return {
    ...state,
    phase: 'PHASE_SCENARIO_VICTORY',
    salvage: state.salvage + scenario.rewardSalvage,
    heroes: state.heroes.map((hero) => ({ ...hero, xp: hero.xp + scenario.rewardXp })),
    combatLog: [
      ...state.combatLog,
      `Scenario victory! Earned ${scenario.rewardSalvage} salvage and ${scenario.rewardXp} XP.`,
    ],
  };
}

function refreshSpentRelics(hero: HeroUnitState): HeroUnitState['equippedRelics'] {
  return hero.equippedRelics
    .filter((relic) => relic.relicId !== BOOTS_MARKER && !relic.relicId.startsWith(MOVE_BONUS_PREFIX))
    .map((relic) => {
      const def = RELIC_BY_ID[relic.relicId];
      return def && def.usageType === 'spent' ? { ...relic, used: false } : relic;
    });
}

function performLongRest(state: GameState, hero: HeroUnitState) {
  hero.hp = Math.min(hero.maxHp, hero.hp + 2);
  hero.statuses = hero.statuses.filter((status) => status !== 'poison' && status !== 'wound');
  if (hero.discard.length > 0) {
    hero.lost.push(hero.discard[0]);
    hero.hand.push(...hero.discard.slice(1));
    hero.discard = [];
  }
  hero.equippedRelics = refreshSpentRelics(hero);
  hero.longRestDeclared = false;
  hero.selectedCards = null;
  state.combatLog.push(`${hero.name} completed a Long Rest.`);
}

function endRoundCleanup(state: GameState): GameState {
  const scenario = scenarioOf(state);
  const elements = { ...state.elements };
  (Object.keys(elements) as ElementType[]).forEach((element) => {
    if (elements[element] === 'strong') elements[element] = 'waning';
    else if (elements[element] === 'waning') elements[element] = 'inert';
  });

  const heroes = state.heroes.map((hero) => {
    if (hero.exhausted) return hero;
    const next = {
      ...hero,
      statuses: [...hero.statuses],
      hand: [...hero.hand],
      discard: [...hero.discard],
      lost: [...hero.lost],
      equippedRelics: hero.equippedRelics.map((relic) => ({ ...relic })),
    };
    if (next.longRestDeclared) performLongRest(state, next);
    const exhausted = next.hand.length < 2 && next.discard.length < 2;
    return {
      ...next,
      shield: 0,
      retaliate: 0,
      nextAttackBonus: 0,
      exhausted,
      selectedCards: null,
      longRestDeclared: false,
      topUsedThisTurn: false,
      bottomUsedThisTurn: false,
      equippedRelics: next.equippedRelics.filter(
        (relic) => relic.relicId !== BOOTS_MARKER && !relic.relicId.startsWith(MOVE_BONUS_PREFIX)
      ),
    };
  });

  let nextState: GameState = {
    ...state,
    elements,
    heroes,
    enemies: state.enemies.map((enemy) => ({ ...enemy, tempShield: 0, statuses: [...enemy.statuses] })),
  };

  nextState = evaluateScenarioObjectives(nextState);
  if (isTerminal(nextState)) return nextState;

  if (scenario?.roundLimit && nextState.round >= scenario.roundLimit) {
    return {
      ...nextState,
      phase: 'PHASE_SCENARIO_DEFEAT',
      combatLog: [
        ...nextState.combatLog,
        `Round limit of ${scenario.roundLimit} reached. Scenario defeated!`,
      ],
    };
  }

  nextState.round += 1;
  nextState.phase = 'PHASE_PLANNING';
  nextState.activeTurnIndex = 0;
  nextState.turnOrder = [];
  nextState.enemyIntents = {};
  nextState.pendingAction = null;
  nextState.combatLog = [...nextState.combatLog, `Round ${nextState.round} begins.`];
  return nextState;
}

function activateSummons(state: GameState, hero: HeroUnitState) {
  const prefix = `summon_${hero.id}_`;
  for (const summon of state.enemies) {
    if (!summon.isSummon || summon.hp <= 0 || !summon.id.startsWith(prefix)) continue;
    const foes = state.enemies
      .filter(
        (enemy) =>
          !enemy.isSummon &&
          enemy.hp > 0 &&
          hexDistance(summon, enemy) <= SUMMON_RANGE &&
          hasLineOfSight(state.tiles, summon, enemy)
      )
      .sort((a, b) => hexDistance(summon, a) - hexDistance(summon, b));
    const target = foes[0];
    if (!target) continue;
    const hit = strike({
      state,
      deck: 'hero',
      base: SUMMON_ATTACK,
      poisoned: target.statuses.includes('poison'),
      shield: target.baseShield + target.tempShield,
      pierce: 0,
      mode: 'normal',
      targetName: target.name,
    });
    target.hp = Math.max(0, target.hp - hit.damage);
    state.combatLog.push(`Coil Turret attacks ${target.name} for ${hit.damage} damage (${hit.label}).`);
  }
}

function prepareActiveHero(state: GameState, entry: RuntimeEntry): { autoSkipped: boolean } {
  if (entry.prepared) return { autoSkipped: false };
  entry.prepared = true;
  const hero = state.heroes.find((candidate) => candidate.id === entry.heroId);
  if (!hero || hero.exhausted) return { autoSkipped: true };

  const noted = expiringNow(hero.statuses);
  entry.expireStatuses = noted;
  if (hero.statuses.includes('wound')) {
    hero.hp = Math.max(0, hero.hp - 1);
    state.combatLog.push(`${hero.name} suffers 1 damage from Wound.`);
  }
  activateSummons(state, hero);
  if (hero.hp <= 0) {
    exhaustHero(hero, state);
    return { autoSkipped: true };
  }
  if (noted.includes('stun')) {
    discardSelected(hero);
    expireNoted(hero, noted);
    hero.longRestDeclared = false;
    hero.topUsedThisTurn = true;
    hero.bottomUsedThisTurn = true;
    hero.equippedRelics = hero.equippedRelics.filter((relic) => relic.relicId !== BOOTS_MARKER);
    state.combatLog.push(`${hero.name} is Stunned and loses the turn.`);
    return { autoSkipped: true };
  }
  return { autoSkipped: false };
}

function finishHeroTurn(state: GameState): GameState {
  const entry = state.turnOrder[state.activeTurnIndex] as RuntimeEntry | undefined;
  if (entry?.isHero) {
    const hero = state.heroes.find((candidate) => candidate.id === entry.heroId);
    if (hero) {
      expireNoted(hero, entry.expireStatuses);
      hero.topUsedThisTurn = true;
      hero.bottomUsedThisTurn = true;
      hero.equippedRelics = hero.equippedRelics.filter((relic) => relic.relicId !== BOOTS_MARKER);
    }
  }
  return runTurnFrom(state, state.activeTurnIndex + 1);
}

function runTurnFrom(state: GameState, startIdx: number): GameState {
  let current = state;
  let idx = startIdx;
  while (idx < current.turnOrder.length) {
    const entry = current.turnOrder[idx] as RuntimeEntry;
    current.activeTurnIndex = idx;
    if (entry.isHero) {
      if (prepareActiveHero(current, entry).autoSkipped) {
        current = evaluateScenarioObjectives(current);
        if (isTerminal(current)) return current;
        idx += 1;
        continue;
      }
      return current;
    }
    if (entry.enemyType) {
      current = executeEnemyGroupTurn(current, entry.enemyType, entry.intentCard);
      current = evaluateScenarioObjectives(current);
      if (isTerminal(current)) return current;
      idx += 1;
      continue;
    }
    idx += 1;
  }
  return endRoundCleanup(current);
}

export function lockInRoundAndReveal(state: GameState): GameState {
  if (!canLockInRound(state)) return state;

  const current = cloneState(state);
  const activeTypes = Array.from(
    new Set(current.enemies.filter((enemy) => enemy.hp > 0 && !enemy.isSummon).map((enemy) => enemy.enemyType))
  );
  const enemyIntents: Partial<Record<EnemyTypeId, EnemyIntentCard>> = {};
  for (const type of activeTypes) {
    const archetype = ENEMY_ARCHETYPES[type];
    if (archetype?.intentDeck.length) {
      enemyIntents[type] = archetype.intentDeck[Math.floor(Math.random() * archetype.intentDeck.length)];
    }
  }

  const turnEntries: TurnOrderEntry[] = [];
  for (const hero of current.heroes) {
    if (hero.exhausted) continue;
    if (!hero.longRestDeclared && hero.hand.length < 2 && hero.discard.length < 2) {
      hero.exhausted = true;
      current.combatLog.push(`${hero.name} has exhausted!`);
      continue;
    }
    let initiative = 99;
    if (!hero.longRestDeclared && hero.selectedCards?.[0]) {
      const lead = hero.hand.find((card) => card.id === hero.selectedCards?.[0]);
      if (lead) initiative = lead.initiative;
    }
    turnEntries.push({
      id: hero.id,
      isHero: true,
      heroId: hero.id,
      name: hero.name,
      initiative,
      acted: false,
    });
  }
  for (const type of activeTypes) {
    const intent = enemyIntents[type];
    turnEntries.push({
      id: `enemy_group_${type}`,
      isHero: false,
      enemyType: type,
      name: ENEMY_ARCHETYPES[type]?.name || type,
      initiative: intent ? intent.initiative : 50,
      intentCard: intent,
      acted: false,
    });
  }
  turnEntries.sort((a, b) => {
    if (a.initiative !== b.initiative) return a.initiative - b.initiative;
    if (a.isHero !== b.isHero) return a.isHero ? -1 : 1;
    return 0;
  });

  current.phase = 'PHASE_TURN_EXECUTION';
  current.enemyIntents = enemyIntents;
  current.turnOrder = turnEntries;
  current.activeTurnIndex = 0;
  current.pendingAction = null;
  for (const hero of current.heroes) {
    hero.topUsedThisTurn = false;
    hero.bottomUsedThisTurn = false;
  }
  current.combatLog.push('Initiative revealed. Turn execution phase begins.');
  if (turnEntries.length === 0) return endRoundCleanup(current);
  return runTurnFrom(current, 0);
}

export function setPendingHeroAction(
  state: GameState,
  pending: PendingActionSelection | null
): GameState {
  return {
    ...state,
    pendingAction: pending,
  };
}

function consumeReady(state: GameState, pending: PendingActionSelection, half: AbilityHalf | null): boolean {
  if (!pending.consumeElement || !half?.consume || pending.useBasicInstead) return false;
  return elementReady(state.elements, half.consume.element);
}

function hexesFromKeys(keys: Iterable<string>): HexCoord[] {
  return Array.from(keys).map((key) => {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
  });
}

export function getValidTargetHexes(state: GameState, pending: PendingActionSelection): HexCoord[] {
  const hero = state.heroes.find((candidate) => candidate.id === pending.heroId);
  if (!hero || hero.exhausted || hero.hp <= 0) return [];

  const card = hero.hand.find((candidate) => candidate.id === pending.cardId);
  const half = card ? (pending.half === 'top' ? card.top : card.bottom) : null;
  const activeHalf = pending.useBasicInstead ? null : half;
  const actionType = pending.useBasicInstead
    ? pending.half === 'top'
      ? 'attack'
      : 'move'
    : activeHalf?.type || 'utility';
  const consume = consumeReady(state, pending, activeHalf);
  const heroCoord = { q: hero.q, r: hero.r };

  if (actionType === 'move') {
    if (hero.statuses.includes('immobilize')) return [];
    const buff = readMoveBuff(hero);
    const movePoints = (pending.useBasicInstead ? 2 : activeHalf?.value || 0) + (consume ? activeHalf?.consume?.bonusMove || 0 : 0) + buff.bonus;
    const reachable = getReachableHexes({
      start: heroCoord,
      maxMove: movePoints,
      jump: pending.useBasicInstead ? buff.jump : !!activeHalf?.jump || buff.jump,
      tiles: state.tiles,
      occupiedByAllies: state.heroes
        .filter((ally) => !ally.exhausted && ally.id !== hero.id)
        .map((ally) => ({ q: ally.q, r: ally.r })),
      occupiedByEnemies: state.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => ({ q: enemy.q, r: enemy.r })),
    });
    return hexesFromKeys(reachable.keys()).filter((coord) => !coordsEqual(coord, heroCoord));
  }

  if (actionType === 'attack') {
    const range = pending.useBasicInstead ? 1 : activeHalf?.range || 1;
    return state.enemies
      .filter((enemy) => {
        if (enemy.hp <= 0 || enemy.isSummon) return false;
        const dist = hexDistance(heroCoord, enemy);
        return dist <= range && hasLineOfSight(state.tiles, heroCoord, enemy);
      })
      .map((enemy) => ({ q: enemy.q, r: enemy.r }));
  }

  if (actionType === 'heal' || (actionType === 'shield' && (activeHalf?.range || 0) > 0)) {
    const range = activeHalf?.range || 1;
    return state.heroes
      .filter((ally) => {
        if (ally.exhausted || ally.hp <= 0) return false;
        const dist = hexDistance(heroCoord, ally);
        return dist <= range && hasLineOfSight(state.tiles, heroCoord, ally);
      })
      .map((ally) => ({ q: ally.q, r: ally.r }));
  }

  if (actionType === 'shield') {
    return [heroCoord];
  }

  if (actionType === 'summon' || isPlaceTrap(activeHalf)) {
    const occupied = occupiedKeys(state);
    return hexNeighbors(heroCoord).filter((coord) => {
      const tile = getTileAt(state.tiles, coord);
      if (!tile || !tile.revealed) return false;
      if (tile.terrain === 'wall' || tile.terrain === 'obstacle' || tile.terrain === 'trap') return false;
      return !occupied.has(coordKey(coord));
    });
  }

  if (actionType === 'utility' && activeHalf) {
    const range = activeHalf.range || 1;
    if (activeHalf.disarmTrap) {
      return state.tiles
        .filter((tile) => {
          if (!tile.revealed || (tile.terrain !== 'trap' && tile.terrain !== 'door')) return false;
          const dist = hexDistance(heroCoord, tile);
          return dist <= range && dist > 0 && hasLineOfSight(state.tiles, heroCoord, tile);
        })
        .map((tile) => ({ q: tile.q, r: tile.r }));
    }
    if (activeHalf.recoverDiscarded || activeHalf.grantAllyAttackBonus) {
      return state.heroes
        .filter((ally) => !ally.exhausted && ally.hp > 0 && hexDistance(heroCoord, ally) <= range)
        .map((ally) => ({ q: ally.q, r: ally.r }));
    }
    if (activeHalf.statusApplied?.length) {
      return state.enemies
        .filter((enemy) => enemy.hp > 0 && !enemy.isSummon && hexDistance(heroCoord, enemy) <= range && hasLineOfSight(state.tiles, heroCoord, enemy))
        .map((enemy) => ({ q: enemy.q, r: enemy.r }));
    }
  }

  return hexNeighbors(heroCoord);
}

function applyConsumeBonus(state: GameState, half: AbilityHalf, consume: boolean, actor: HeroUnitState, target?: FightUnit) {
  const bonus = half.consume?.bonusStatus;
  if (!consume || !bonus) return;
  if (bonus === 'strengthen') {
    addStatus(actor, 'strengthen');
    return;
  }
  if (!target) return;
  addStatus(target, bonus);
  if (half.consume?.bonusDescription.toLowerCase().includes('adjacent')) {
    for (const enemy of state.enemies) {
      if (enemy.hp <= 0 || enemy.id === target.id || enemy.isSummon) continue;
      if (hexDistance(target, enemy) === 1) addStatus(enemy, bonus);
    }
  }
}

function heroMove(state: GameState, hero: HeroUnitState, target: HexCoord, half: AbilityHalf | null) {
  hero.q = target.q;
  hero.r = target.r;
  consumeMoveBuffs(hero);
  const tile = getTileAt(state.tiles, target);
  if (!tile) return;
  if (tile.terrain === 'hazard') {
    hero.hp = Math.max(0, hero.hp - 2);
    state.combatLog.push(`${hero.name} stepped into scalding steam! Suffered 2 damage.`);
  } else if (tile.terrain === 'trap') {
    hero.hp = Math.max(0, hero.hp - 3);
    addStatus(hero, 'immobilize');
    tile.terrain = 'floor';
    state.combatLog.push(`${hero.name} triggered a scrap trap! Suffered 3 damage and Immobilized.`);
  } else if (tile.terrain === 'chest') {
    const salvage = tile.salvageValue || 15;
    state.salvage += salvage;
    state.chestLootedInScenario = true;
    tile.terrain = 'floor';
    state.combatLog.push(`${hero.name} looted a Relic Chest! Gained ${salvage} salvage.`);
  } else if (tile.terrain === 'door') {
    openDoor(state, target);
  } else if (tile.terrain === 'lore' && !tile.interacted && tile.loreId) {
    const loreNode = scenarioOf(state).loreNodes?.[tile.loreId];
    if (loreNode) {
      state.activeLoreModal = { loreNode, heroId: hero.id, tileCoord: { q: target.q, r: target.r } };
    }
  }
  if (half?.disarmTrap) {
    const trap = state.tiles.find(
      (candidate) => candidate.terrain === 'trap' && hexNeighbors(hero).some((coord) => coordsEqual(coord, candidate))
    );
    if (trap) {
      trap.terrain = 'floor';
      state.combatLog.push(`${hero.name} disarmed a trap.`);
    }
  }
}

export function executeHeroActionOnHex(state: GameState, target: HexCoord): GameState {
  if (!state.pendingAction) return state;
  const pending = state.pendingAction;
  const current = cloneState(state);
  const hero = current.heroes.find((candidate) => candidate.id === pending.heroId);
  if (!hero || hero.exhausted || hero.hp <= 0) return state;
  if ((pending.half === 'top' && hero.topUsedThisTurn) || (pending.half === 'bottom' && hero.bottomUsedThisTurn)) {
    return state;
  }

  const card = hero.hand.find((candidate) => candidate.id === pending.cardId);
  const printed = card ? (pending.half === 'top' ? card.top : card.bottom) : null;
  const half = pending.useBasicInstead ? null : printed;
  if (!pending.useBasicInstead && !half) return state;
  const actionType = pending.useBasicInstead ? (pending.half === 'top' ? 'attack' : 'move') : half?.type || 'utility';
  const consume = consumeReady(current, pending, half);

  if (consume && half?.consume) {
    current.elements = { ...current.elements, [half.consume.element]: 'inert' };
  }

  if (actionType === 'move') {
    if (hero.statuses.includes('immobilize')) {
      current.combatLog.push(`${hero.name} is Immobilized and cannot move.`);
    } else {
      heroMove(current, hero, target, half);
      if (half?.push || half?.pull) {
        const reach = half.range && half.range > 0 ? half.range : 1;
        const foe = current.enemies
          .filter(
            (enemy) =>
              enemy.hp > 0 &&
              !enemy.isSummon &&
              hexDistance(hero, enemy) > 0 &&
              hexDistance(hero, enemy) <= reach
          )
          .sort((a, b) => hexDistance(hero, a) - hexDistance(hero, b) || a.id.localeCompare(b.id))[0];
        if (foe && half.push) forceMove(current, foe, hero, half.push, 'push');
        if (foe && half.pull) forceMove(current, foe, hero, half.pull, 'pull');
      }
    }
  } else if (actionType === 'attack' && half) {
    const pattern = half.aoePattern && half.aoePattern !== 'single' ? half.aoePattern : null;
    const hexes = pattern ? getAoeHexes({ q: hero.q, r: hero.r }, target, pattern) : [target];
    const base =
      (pending.useBasicInstead ? 2 : half.value || 0) +
      hero.nextAttackBonus +
      (consume ? half.consume?.bonusAttack || 0 : 0);
    hero.nextAttackBonus = 0;
    const allies = current.heroes
      .filter((ally) => !ally.exhausted && ally.id !== hero.id)
      .map((ally) => ({ q: ally.q, r: ally.r }));
    const pierce = (half.pierce || 0) + (consume ? half.consume?.bonusPierce || 0 : 0);

    for (const hex of hexes) {
      const enemy = current.enemies.find((candidate) => candidate.hp > 0 && !candidate.isSummon && coordsEqual(candidate, hex));
      if (!enemy) continue;
      const mode = modifierMode(
        isFlanked(hero, hex, allies) || hero.statuses.includes('strengthen'),
        hasCover(hero, hex, current.tiles) || hero.statuses.includes('muddle')
      );
      const hit = strike({
        state: current,
        deck: 'hero',
        base,
        poisoned: enemy.statuses.includes('poison'),
        shield: enemy.baseShield + enemy.tempShield,
        pierce,
        mode,
        targetName: enemy.name,
      });
      enemy.hp = Math.max(0, enemy.hp - hit.damage);
      current.combatLog.push(`${hero.name} attacks ${enemy.name} for ${hit.damage} damage (${hit.label}).`);
      if (!hit.missed) {
        for (const status of half.statusApplied || []) addStatus(enemy, status);
        applyConsumeBonus(current, half, consume, hero, enemy);
        if (half.push) forceMove(current, enemy, hero, half.push, 'push');
        if (half.pull) forceMove(current, enemy, hero, half.pull, 'pull');
      }
      if (enemy.hp <= 0) current.combatLog.push(`${enemy.name} was defeated!`);
    }
  } else if (actionType === 'attack') {
    const bonus = hero.nextAttackBonus;
    hero.nextAttackBonus = 0;
    const allies = current.heroes
      .filter((ally) => !ally.exhausted && ally.id !== hero.id)
      .map((ally) => ({ q: ally.q, r: ally.r }));
    const enemy = current.enemies.find((candidate) => candidate.hp > 0 && !candidate.isSummon && coordsEqual(candidate, target));
    if (enemy) {
      const mode = modifierMode(
        isFlanked(hero, enemy, allies) || hero.statuses.includes('strengthen'),
        hero.statuses.includes('muddle') || hasCover(hero, enemy, current.tiles)
      );
      const hit = strike({
        state: current,
        deck: 'hero',
        base: 2 + bonus,
        poisoned: enemy.statuses.includes('poison'),
        shield: enemy.baseShield + enemy.tempShield,
        pierce: 0,
        mode,
        targetName: enemy.name,
      });
      enemy.hp = Math.max(0, enemy.hp - hit.damage);
      current.combatLog.push(`${hero.name} attacks ${enemy.name} for ${hit.damage} damage (${hit.label}).`);
      if (enemy.hp <= 0) current.combatLog.push(`${enemy.name} was defeated!`);
    }
  } else if (actionType === 'heal' && half) {
    const amount = (half.value || 0) + (consume ? half.consume?.bonusHeal || 0 : 0);
    const patient = current.heroes.find((ally) => !ally.exhausted && coordsEqual(ally, target));
    if (patient) {
      patient.hp = Math.min(patient.maxHp, patient.hp + amount);
      patient.statuses = patient.statuses.filter((status) => status !== 'poison' && status !== 'wound');
      if (consume && half.consume?.bonusStatus) addStatus(patient, half.consume.bonusStatus);
      current.combatLog.push(`${hero.name} healed ${patient.name} for ${amount} HP.`);
    }
  } else if (actionType === 'shield' && half) {
    const amount = half.value || 1;
    hero.shield += amount;
    if ((half.range || 0) > 0) {
      for (const ally of current.heroes) {
        if (ally.id === hero.id || ally.exhausted || ally.hp <= 0) continue;
        if (hexDistance(hero, ally) <= (half.range || 0)) ally.shield += amount;
      }
    }
    current.combatLog.push(`${hero.name} gained Shield ${amount} this round.`);
  } else if (actionType === 'summon' && half) {
    const tile = getTileAt(current.tiles, target);
    const occupied = occupiedKeys(current);
    if (tile && tile.revealed && tile.terrain !== 'wall' && tile.terrain !== 'obstacle' && !occupied.has(coordKey(target))) {
      const hp = half.value || 4;
      current.enemies.push({
        ...makeEnemy('drowned_construct', target, tile.roomId, `summon_${hero.id}_${current.enemies.length}`, hp),
        name: 'Coil Turret',
        isSummon: true,
        baseShield: 0,
        hover: false,
        isBoss: false,
        isObjectiveStructure: false,
        immunities: [],
        maxHp: hp,
        hp,
      });
      current.combatLog.push(`${hero.name} deployed a Coil Turret.`);
    }
  } else if (actionType === 'utility' && half) {
    if (isPlaceTrap(half)) {
      const tile = getTileAt(current.tiles, target);
      const occupied = occupiedKeys(current);
      if (tile && tile.revealed && tile.terrain === 'floor' && !occupied.has(coordKey(target))) {
        tile.terrain = 'trap';
        current.combatLog.push(`${hero.name} placed a scrap trap.`);
      }
    }
    if (half.disarmTrap) {
      const tile = getTileAt(current.tiles, target);
      if (tile?.terrain === 'trap') {
        tile.terrain = 'floor';
        current.combatLog.push(`${hero.name} disarmed a trap.`);
      } else if (tile?.terrain === 'door') {
        openDoor(current, target);
      }
    }
    if (half.recoverDiscarded) {
      const ally = current.heroes.find((candidate) => !candidate.exhausted && coordsEqual(candidate, target));
      if (ally) {
        const recovered = ally.discard.slice(0, half.recoverDiscarded);
        ally.hand.push(...recovered);
        ally.discard = ally.discard.slice(recovered.length);
        current.combatLog.push(`${hero.name} recovered ${recovered.length} card(s) for ${ally.name}.`);
      }
    }
    if (half.grantAllyAttackBonus) {
      const ally = current.heroes.find((candidate) => !candidate.exhausted && coordsEqual(candidate, target));
      if (ally) {
        ally.nextAttackBonus += half.grantAllyAttackBonus;
        current.combatLog.push(`${ally.name} gains +${half.grantAllyAttackBonus} Attack on their next attack.`);
      }
    }
    if (half.statusApplied?.length && !isPlaceTrap(half)) {
      const enemy = current.enemies.find((candidate) => candidate.hp > 0 && !candidate.isSummon && coordsEqual(candidate, target));
      if (enemy) {
        for (const status of half.statusApplied) addStatus(enemy, status);
        applyConsumeBonus(current, half, consume, hero, enemy);
      }
    }
  }

  if (half?.selfHeal) {
    hero.hp = Math.min(hero.maxHp, hero.hp + half.selfHeal);
    hero.statuses = hero.statuses.filter((status) => status !== 'poison' && status !== 'wound');
    current.combatLog.push(`${hero.name} recovers ${half.selfHeal} HP.`);
  }
  if (half?.retaliate) hero.retaliate += half.retaliate;
  if (half?.grantAllyMove) grantMoveBonus(current, hero, half.grantAllyMove, half.range);
  if (half && consume && (actionType === 'move' || actionType === 'shield')) {
    applyConsumeBonus(current, half, true, hero);
  }
  if (half?.infuse) current.elements = { ...current.elements, [half.infuse]: 'strong' };
  if (half?.xp) hero.xp += half.xp;

  if (pending.half === 'top') hero.topUsedThisTurn = true;
  else hero.bottomUsedThisTurn = true;

  if (card) {
    hero.hand = hero.hand.filter((candidate) => candidate.id !== card.id);
    if (half?.burn) {
      hero.lost.push(card);
      current.combatLog.push(`${hero.name} burned ${card.name}!`);
    } else {
      hero.discard.push(card);
    }
  }

  current.pendingAction = null;
  exhaustHero(hero, current);
  let next = evaluateScenarioObjectives(current);
  if (isTerminal(next)) return next;
  if (hero.hp <= 0 || (hero.topUsedThisTurn && hero.bottomUsedThisTurn && !next.activeLoreModal)) {
    return finishHeroTurn(next);
  }
  return next;
}

export function skipOrEndActiveTurn(state: GameState): GameState {
  if (state.phase !== 'PHASE_TURN_EXECUTION') return state;
  const current = cloneState(state);
  const entry = current.turnOrder[current.activeTurnIndex] as RuntimeEntry | undefined;
  if (!entry || !entry.isHero) return runTurnFrom(current, (current.activeTurnIndex || 0) + 1);

  if (prepareActiveHero(current, entry).autoSkipped) {
    const checked = evaluateScenarioObjectives(current);
    if (isTerminal(checked)) return checked;
    return runTurnFrom(checked, checked.activeTurnIndex + 1);
  }

  const hero = current.heroes.find((candidate) => candidate.id === entry.heroId);
  if (!hero) return runTurnFrom(current, current.activeTurnIndex + 1);
  if (hero.longRestDeclared) performLongRest(current, hero);
  else discardSelected(hero);
  return finishHeroTurn(current);
}

export function useRelicItem(
  state: GameState,
  heroId: string,
  relicId: string,
  elementChoice?: ElementType
): GameState {
  const heroIndex = state.heroes.findIndex((hero) => hero.id === heroId);
  if (heroIndex === -1) return state;
  const current = cloneState(state);
  const hero = current.heroes[heroIndex];
  const relicEntry = hero.equippedRelics.find((relic) => relic.relicId === relicId);
  if (!relicEntry || relicEntry.used) return state;
  const relicDef = RELIC_BY_ID[relicId] || RELIC_ITEMS.find((relic) => relic.id === relicId);
  if (!relicDef) return state;

  if (relicDef.effect === 'recover_2_discard') {
    const recovered = hero.discard.slice(0, 2);
    hero.hand = [...hero.hand, ...recovered];
    hero.discard = hero.discard.slice(recovered.length);
  } else if (relicDef.effect === 'move_plus_2_jump') {
    if (!hero.equippedRelics.some((relic) => relic.relicId === BOOTS_MARKER)) {
      hero.equippedRelics.push({ relicId: BOOTS_MARKER, used: false });
    }
  } else if (relicDef.effect === 'shield_2_round') {
    hero.shield += 2;
  } else if (relicDef.effect === 'infuse_any') {
    const element = elementChoice || 'aether';
    current.elements = { ...current.elements, [element]: 'strong' };
  } else if (relicDef.effect === 'heal_3_cleanse') {
    hero.hp = Math.min(hero.maxHp, hero.hp + 3);
    hero.statuses = hero.statuses.filter((status) => status !== 'poison' && status !== 'wound');
  }

  hero.equippedRelics = hero.equippedRelics.map((relic) =>
    relic.relicId === relicId ? { ...relic, used: true } : relic
  );
  current.combatLog.push(`${hero.name} activated ${relicDef.name}.`);
  return current;
}

export function resolveLoreModalChoice(state: GameState, optionIndex: 0 | 1): GameState {
  if (!state.activeLoreModal) return state;
  const { loreNode, heroId, tileCoord } = state.activeLoreModal;
  const choice = loreNode.options[optionIndex];
  if (!choice) return state;
  const current = cloneState(state);

  current.tiles = current.tiles.map((tile) => (coordsEqual(tile, tileCoord) ? { ...tile, interacted: true } : tile));
  if (choice.reputationDelta) {
    current.reputation = Math.max(-5, Math.min(5, current.reputation + choice.reputationDelta));
  }
  if (choice.salvageDelta) current.salvage = Math.max(0, current.salvage + choice.salvageDelta);
  if (choice.hpDelta) {
    const hero = current.heroes.find((candidate) => candidate.id === heroId);
    if (hero) {
      hero.hp = Math.max(0, Math.min(hero.maxHp, hero.hp + choice.hpDelta));
      exhaustHero(hero, current);
    }
  }
  if (choice.infuseElements) {
    const elements = { ...current.elements };
    for (const element of choice.infuseElements) elements[element] = 'strong';
    current.elements = elements;
  }
  if (choice.clearDifficultTerrainInRoom) {
    const roomId = choice.clearDifficultTerrainInRoom;
    current.tiles = current.tiles.map((tile) =>
      tile.roomId === roomId && tile.terrain === 'difficult' ? { ...tile, terrain: 'floor' } : tile
    );
  }
  if (choice.spawnEnemyInRoom) {
    const spawn = choice.spawnEnemyInRoom;
    const revealed = current.tiles.some((tile) => tile.roomId === spawn.roomId && tile.revealed);
    const id = `${revealed ? 'alive' : 'pending'}_${spawn.roomId}_${spawn.q}_${spawn.r}_${spawn.enemyType}`;
    current.enemies.push(
      makeEnemy(spawn.enemyType, { q: spawn.q, r: spawn.r }, spawn.roomId, id, revealed ? undefined : 0)
    );
  }
  if (choice.stripBossPermanentShield) {
    current.pylonsActivated = (current.pylonsActivated || 0) + 1;
    if (current.pylonsActivated >= 2) {
      current.enemies = current.enemies.map((enemy) => (enemy.isBoss ? { ...enemy, baseShield: 0 } : enemy));
      current.combatLog.push('Ancient Pylons fully activated! Boss shield shattered.');
    }
  }
  if (choice.unlockRelicId && !current.unlockedRelicIds.includes(choice.unlockRelicId)) {
    current.unlockedRelicIds = [...current.unlockedRelicIds, choice.unlockRelicId];
  }

  current.combatLog.push(choice.outcomeText);
  current.activeLoreModal = null;
  let next = evaluateScenarioObjectives(current);
  if (isTerminal(next)) return next;
  const actor = next.heroes.find((hero) => hero.id === heroId);
  if (actor && actor.topUsedThisTurn && actor.bottomUsedThisTurn && !actor.exhausted) {
    return finishHeroTurn(next);
  }
  return next;
}

export function buyRelicInOutpost(state: GameState, heroId: string, relicId: string): GameState {
  if (state.screen !== 'outpost') return state;
  const heroIndex = state.heroes.findIndex((hero) => hero.id === heroId);
  if (heroIndex === -1) return state;
  const relicDef = RELIC_BY_ID[relicId] || RELIC_ITEMS.find((relic) => relic.id === relicId);
  if (!relicDef) return state;
  if (!state.unlockedRelicIds.includes(relicId)) return state;

  const current = cloneState(state);
  const hero = current.heroes[heroIndex];
  if (hero.equippedRelics.some((relic) => relic.relicId === relicId)) return state;

  const discount = current.reputation >= 2 ? 0.8 : 1;
  const finalCost = Math.floor(relicDef.cost * discount);
  if (current.salvage < finalCost) return state;

  hero.equippedRelics = [...hero.equippedRelics, { relicId, used: false }];
  current.salvage -= finalCost;
  current.combatLog.push(`${hero.name} purchased ${relicDef.name} for ${finalCost} salvage.`);
  return current;
}

function removeMinusOnes(cards: ModifierCard[], count: number): { next: ModifierCard[]; removed: number } {
  let removed = 0;
  const next: ModifierCard[] = [];
  for (const card of cards) {
    if (removed < count && card.delta === -1 && card.multiplier === undefined) {
      removed += 1;
      continue;
    }
    next.push(card);
  }
  return { next, removed };
}

export function unlockHeroPerkInOutpost(state: GameState, heroId: string): GameState {
  const heroIndex = state.heroes.findIndex((hero) => hero.id === heroId);
  if (heroIndex === -1) return state;
  const current = cloneState(state);
  const hero = current.heroes[heroIndex];
  if (hero.xp < 15) return state;

  hero.xp -= 15;
  hero.level += 1;
  hero.maxHp += 2;
  hero.hp = hero.maxHp;
  hero.perksUnlocked = (hero.perksUnlocked || 0) + 1;

  const archetype = HERO_ARCHETYPES[hero.classId];
  if (archetype?.level2Cards) {
    const owned = new Set([...hero.hand, ...hero.discard, ...hero.lost].map((card) => card.id));
    const nextCard = archetype.level2Cards.find((card) => !owned.has(card.id));
    if (nextCard) hero.hand = [...hero.hand, nextCard];
  }

  const fromDeck = removeMinusOnes(current.heroModifierDeck, 2);
  const fromDiscard = removeMinusOnes(current.heroModifierDiscard, 2 - fromDeck.removed);
  current.heroModifierDeck = fromDeck.next;
  current.heroModifierDiscard = fromDiscard.next;
  current.combatLog.push(`${hero.name} unlocked a Perk! Level ${hero.level}, Max HP ${hero.maxHp}.`);
  return current;
}
export function returnToOutpost(state: GameState): GameState {
  let completed = [...state.completedScenarioIds];
  if (
    state.phase === 'PHASE_SCENARIO_VICTORY' &&
    !completed.includes(state.scenarioId)
  ) {
    completed.push(state.scenarioId);
  }

  const refreshedHeroes = state.heroes.map((hero) => ({
    ...hero,
    hp: hero.maxHp,
    shield: 0,
    retaliate: 0,
    nextAttackBonus: 0,
    statuses: [],
    exhausted: false,
    discard: [],
    lost: [],
    selectedCards: null,
    longRestDeclared: false,
    topUsedThisTurn: false,
    bottomUsedThisTurn: false,
    equippedRelics: hero.equippedRelics
      .filter((r) => r.relicId !== BOOTS_MARKER && !r.relicId.startsWith(MOVE_BONUS_PREFIX))
      .map((r) => ({ ...r, used: false })),
  }));

  return {
    ...state,
    screen: 'outpost',
    completedScenarioIds: completed,
    tiles: [],
    enemies: [],
    turnOrder: [],
    activeTurnIndex: 0,
    pendingAction: null,
    activeLoreModal: null,
    heroes: refreshedHeroes,
    combatLog: [...state.combatLog, 'Returned to the Outpost.'],
  };
}
