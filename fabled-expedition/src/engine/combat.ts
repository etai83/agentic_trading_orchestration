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
  StatusEffect,
} from '../types/game';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

  if (currentDeck.length < count) {
    if (currentDiscard.length > 0) {
      currentDeck = [...currentDeck, ...shuffleArray(currentDiscard)];
      currentDiscard = [];
    }
    if (currentDeck.length < count) {
      currentDeck = [...currentDeck, ...createStandardModifierDeck()];
    }
  }

  const drawnCards = currentDeck.slice(0, count);
  const nextDeck = currentDeck.slice(count);

  let chosenCard: ModifierCard;
  if (mode === 'normal') {
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

  const finalDamage = calculateCardDamage(chosenCard, baseDamage);

  const nextDiscard = [...currentDiscard];
  for (const card of drawnCards) {
    if (!card.temporary) {
      nextDiscard.push(card);
    }
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
      ? existing.equippedRelics.map((r) => ({ ...r, used: false }))
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
  if (state.reputation >= 2) {
    heroDeck.push({
      id: `bless_rep_${Date.now()}`,
      label: 'Bless (2x)',
      delta: 0,
      multiplier: 2,
      temporary: true,
      shuffleAtEnd: true,
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

  let currentHp = hero.hp;
  if (rerollWithDamage && hero.hp > 1) {
    currentHp -= 1;
  }

  const lostIndex =
    rerollWithDamage && hero.discard.length > 1
      ? 1
      : Math.floor(Math.random() * hero.discard.length);

  const lostCard = hero.discard[lostIndex];
  const recoveredCards = hero.discard.filter((_, idx) => idx !== lostIndex);

  const updatedHero: HeroUnitState = {
    ...hero,
    hp: currentHp,
    hand: [...hero.hand, ...recoveredCards],
    discard: [],
    lost: [...hero.lost, lostCard],
  };

  const nextHeroes = [...state.heroes];
  nextHeroes[heroIndex] = updatedHero;

  return {
    ...state,
    heroes: nextHeroes,
    combatLog: [
      ...state.combatLog,
      `${hero.name} performs Short Rest, losing ${lostCard.name}.`,
    ],
  };
}

export function canLockInRound(state: GameState): boolean {
  if (state.phase !== 'PHASE_PLANNING') return false;

  const livingHeroes = state.heroes.filter((h) => !h.exhausted);
  if (livingHeroes.length === 0) return false;

  return livingHeroes.every((h) => {
    if (h.longRestDeclared) return true;
    if (!h.selectedCards) return false;
    const validCards = h.selectedCards.filter(Boolean);
    return validCards.length === 2;
  });
}

function resolveEnemyMovementAndAttack(
  state: GameState,
  enemy: EnemyUnitState,
  intent: EnemyIntentCard
): GameState {
  let currentState = { ...state };
  let currentEnemy = { ...enemy };

  const livingHeroes = currentState.heroes.filter((h) => !h.exhausted);
  if (livingHeroes.length === 0) return currentState;

  let focusHero = livingHeroes[0];
  let minDistance = hexDistance(
    { q: currentEnemy.q, r: currentEnemy.r },
    { q: focusHero.q, r: focusHero.r }
  );

  for (let i = 1; i < livingHeroes.length; i++) {
    const hero = livingHeroes[i];
    const dist = hexDistance(
      { q: currentEnemy.q, r: currentEnemy.r },
      { q: hero.q, r: hero.r }
    );
    if (dist < minDistance) {
      minDistance = dist;
      focusHero = hero;
    }
  }

  const effectiveMove = intent.move;
  if (effectiveMove > 0 && !currentEnemy.statuses.includes('immobilize')) {
    const path = findShortestPath({
      start: { q: currentEnemy.q, r: currentEnemy.r },
      goal: { q: focusHero.q, r: focusHero.r },
      jump: false,
      hover: currentEnemy.hover,
      tiles: currentState.tiles,
      blockedCoords: [
        ...currentState.heroes.filter((h) => !h.exhausted).map((h) => ({ q: h.q, r: h.r })),
        ...currentState.enemies
          .filter((e) => e.hp > 0 && e.id !== currentEnemy.id)
          .map((e) => ({ q: e.q, r: e.r })),
      ],
    });

    if (path && path.length > 0) {
      const stepsToTake = Math.min(effectiveMove, path.length);
      const destination = path[stepsToTake - 1];

      currentEnemy.q = destination.q;
      currentEnemy.r = destination.r;

      const tile = getTileAt(currentState.tiles, destination);
      if (tile) {
        if (tile.terrain === 'trap') {
          currentEnemy.hp = Math.max(0, currentEnemy.hp - 3);
          if (!currentEnemy.immunities.includes('immobilize')) {
            currentEnemy.statuses.push('immobilize');
          }
          currentState.tiles = currentState.tiles.map((t) =>
            coordsEqual(t, destination) ? { ...t, terrain: 'floor' } : t
          );
          currentState.combatLog.push(`${currentEnemy.name} sprung a trap! Suffered 3 damage.`);
        } else if (tile.terrain === 'hazard' && !currentEnemy.hover) {
          currentEnemy.hp = Math.max(0, currentEnemy.hp - 2);
          currentState.combatLog.push(`${currentEnemy.name} stepped on hazardous terrain! Suffered 2 damage.`);
        }
      }
    }
  }

  if (currentEnemy.hp > 0 && intent.attack > 0) {
    const range = intent.range || 1;
    const distToTarget = hexDistance(
      { q: currentEnemy.q, r: currentEnemy.r },
      { q: focusHero.q, r: focusHero.r }
    );

    if (distToTarget <= range && hasLineOfSight(currentState.tiles, currentEnemy, focusHero)) {
      const isMuddled = currentEnemy.statuses.includes('muddle');
      const isStrengthened = currentEnemy.statuses.includes('strengthen');
      const targetHasCover = hasCover(currentEnemy, focusHero, currentState.tiles);

      let mode: 'normal' | 'advantage' | 'disadvantage' = 'normal';
      const adv = isStrengthened;
      const disadv = isMuddled || targetHasCover;

      if (adv && !disadv) mode = 'advantage';
      else if (!adv && disadv) mode = 'disadvantage';

      const { result, nextDeck, nextDiscard } = drawModifier(
        currentState.enemyModifierDeck,
        currentState.enemyModifierDiscard,
        intent.attack,
        mode
      );

      currentState.enemyModifierDeck = nextDeck;
      currentState.enemyModifierDiscard = nextDiscard;
      currentState.lastModifierPopup = {
        targetName: focusHero.name,
        result,
        timestamp: Date.now(),
      };

      const pierce = intent.pierce || 0;
      const effectiveShield = Math.max(0, focusHero.shield - pierce);
      let incomingDamage = Math.max(0, result.finalDamage - effectiveShield);
      if (focusHero.statuses.includes('poison')) {
        incomingDamage += 1;
      }

      focusHero.hp = Math.max(0, focusHero.hp - incomingDamage);
      currentState.combatLog.push(
        `${currentEnemy.name} attacks ${focusHero.name} for ${incomingDamage} damage (${result.chosenCard.label}).`
      );

      if (intent.statusApplied) {
        for (const st of intent.statusApplied) {
          if (!focusHero.statuses.includes(st)) {
            focusHero.statuses.push(st);
          }
        }
      }

      if (focusHero.retaliate > 0 && distToTarget <= 1) {
        currentEnemy.hp = Math.max(0, currentEnemy.hp - focusHero.retaliate);
        currentState.combatLog.push(
          `${focusHero.name} retaliates against ${currentEnemy.name} for ${focusHero.retaliate} damage.`
        );
      }

      if (focusHero.hp <= 0) {
        focusHero.exhausted = true;
        currentState.combatLog.push(`${focusHero.name} has exhausted!`);
      }
    }
  }

  currentState.enemies = currentState.enemies.map((e) =>
    e.id === currentEnemy.id ? currentEnemy : e
  );
  currentState.heroes = currentState.heroes.map((h) =>
    h.id === focusHero.id ? focusHero : h
  );

  return currentState;
}

function executeEnemyGroupTurn(
  state: GameState,
  enemyType: string,
  intent: EnemyIntentCard | undefined
): GameState {
  if (!intent) return state;

  let current = { ...state };
  const matchingEnemies = current.enemies.filter(
    (e) => e.enemyType === enemyType && e.hp > 0
  );

  for (const enemy of matchingEnemies) {
    if (enemy.statuses.includes('wound')) {
      enemy.hp = Math.max(0, enemy.hp - 1);
      current.combatLog.push(`${enemy.name} suffers 1 damage from Wound.`);
      if (enemy.hp <= 0) continue;
    }

    if (enemy.statuses.includes('stun')) {
      current.combatLog.push(`${enemy.name} is Stunned and skips their turn.`);
      enemy.statuses = enemy.statuses.filter((s) => s !== 'stun');
      continue;
    }

    if (intent.healSelf && intent.healSelf > 0) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + intent.healSelf);
    }
    if (intent.shieldBonus && intent.shieldBonus > 0) {
      enemy.tempShield += intent.shieldBonus;
    }
    if (intent.infuse) {
      current.elements[intent.infuse] = 'strong';
    }

    current = resolveEnemyMovementAndAttack(current, enemy, intent);
  }

  return current;
}

function evaluateScenarioObjectives(state: GameState): GameState {
  const scenario = SCENARIO_BY_ID[state.scenarioId] || SCENARIOS[0];
  const livingHeroes = state.heroes.filter((h) => !h.exhausted);

  if (livingHeroes.length === 0) {
    return {
      ...state,
      phase: 'PHASE_SCENARIO_DEFEAT',
      combatLog: [...state.combatLog, 'All heroes have exhausted. Scenario defeated!'],
    };
  }

  if (scenario.roundLimit && state.round >= scenario.roundLimit) {
    return {
      ...state,
      phase: 'PHASE_SCENARIO_DEFEAT',
      combatLog: [...state.combatLog, `Round limit of ${scenario.roundLimit} reached. Scenario defeated!`],
    };
  }

  let objectiveMet = false;
  if (scenario.objectiveType === 'kill_all_and_loot_chest') {
    const enemiesAlive = state.enemies.filter((e) => e.hp > 0).length;
    objectiveMet = enemiesAlive === 0 && state.chestLootedInScenario;
  } else if (scenario.objectiveType === 'destroy_resonators') {
    const resonatorsAlive = state.enemies.filter(
      (e) => e.isObjectiveStructure && e.hp > 0
    ).length;
    objectiveMet = resonatorsAlive === 0;
  } else if (scenario.objectiveType === 'kill_boss') {
    const bossAlive = state.enemies.filter((e) => e.isBoss && e.hp > 0).length;
    objectiveMet = bossAlive === 0;
  }

  if (objectiveMet) {
    const nextHeroes = state.heroes.map((h) => ({
      ...h,
      xp: h.xp + scenario.rewardXp,
    }));

    return {
      ...state,
      phase: 'PHASE_SCENARIO_VICTORY',
      salvage: state.salvage + scenario.rewardSalvage,
      heroes: nextHeroes,
      combatLog: [
        ...state.combatLog,
        `Scenario victory! Earned ${scenario.rewardSalvage} salvage and ${scenario.rewardXp} XP.`,
      ],
    };
  }

  return state;
}

function endRoundCleanup(state: GameState): GameState {
  let nextState = { ...state };

  const decayedElements = { ...nextState.elements };
  const elementKeys: ElementType[] = ['steam', 'volt', 'aether', 'mire'];
  for (const el of elementKeys) {
    if (decayedElements[el] === 'strong') {
      decayedElements[el] = 'waning';
    } else if (decayedElements[el] === 'waning') {
      decayedElements[el] = 'inert';
    }
  }
  nextState.elements = decayedElements;

  const nextHeroes = nextState.heroes.map((hero) => {
    if (hero.exhausted) return hero;

    let hp = hero.hp;
    let hand = [...hero.hand];
    let discard = [...hero.discard];
    let lost = [...hero.lost];
    let equippedRelics = hero.equippedRelics.map((r) => ({ ...r }));

    if (hero.longRestDeclared) {
      hp = Math.min(hero.maxHp, hp + 2);
      if (discard.length > 0) {
        lost.push(discard[0]);
        hand.push(...discard.slice(1));
        discard = [];
      }
      equippedRelics = equippedRelics.map((r) => {
        const relicDef = RELIC_BY_ID[r.relicId];
        return relicDef && relicDef.usageType === 'spent'
          ? { ...r, used: false }
          : r;
      });
    }

    const statuses = hero.statuses.filter((s) => s !== 'immobilize' && s !== 'muddle' && s !== 'strengthen');

    let exhausted: boolean = hero.exhausted;
    if (!exhausted && hand.length < 2 && discard.length < 2) {
      exhausted = true;
    }

    return {
      ...hero,
      hp,
      shield: 0,
      retaliate: 0,
      nextAttackBonus: 0,
      statuses,
      hand,
      discard,
      lost,
      exhausted,
      selectedCards: null,
      longRestDeclared: false,
      topUsedThisTurn: false,
      bottomUsedThisTurn: false,
      equippedRelics,
    };
  });

  nextState.heroes = nextHeroes;

  const nextEnemies = nextState.enemies.map((e) => ({
    ...e,
    tempShield: 0,
    statuses: e.statuses.filter((s) => s !== 'immobilize' && s !== 'muddle' && s !== 'strengthen'),
  }));
  nextState.enemies = nextEnemies;

  nextState = evaluateScenarioObjectives(nextState);
  if (
    nextState.phase === 'PHASE_SCENARIO_VICTORY' ||
    nextState.phase === 'PHASE_SCENARIO_DEFEAT'
  ) {
    return nextState;
  }

  nextState.round += 1;
  nextState.phase = 'PHASE_PLANNING';
  nextState.activeTurnIndex = 0;
  nextState.turnOrder = [];
  nextState.enemyIntents = {};
  nextState.pendingAction = null;
  nextState.combatLog.push(`Round ${nextState.round} begins.`);

  return nextState;
}

function advanceTurnOrder(state: GameState): GameState {
  let current = { ...state };
  let idx = current.activeTurnIndex + 1;

  while (idx < current.turnOrder.length) {
    const entry = current.turnOrder[idx];
    if (entry.isHero) {
      const hero = current.heroes.find((h) => h.id === entry.heroId);
      if (hero && !hero.exhausted) {
        current.activeTurnIndex = idx;
        if (hero.statuses.includes('wound')) {
          hero.hp = Math.max(0, hero.hp - 1);
          current.combatLog.push(`${hero.name} suffers 1 damage from Wound.`);
          if (hero.hp <= 0) {
            hero.exhausted = true;
            current.combatLog.push(`${hero.name} has exhausted!`);
            current = evaluateScenarioObjectives(current);
            if (
              current.phase === 'PHASE_SCENARIO_VICTORY' ||
              current.phase === 'PHASE_SCENARIO_DEFEAT'
            ) {
              return current;
            }
            idx++;
            continue;
          }
        }
        return current;
      }
      idx++;
    } else if (entry.enemyType) {
      current = executeEnemyGroupTurn(current, entry.enemyType, entry.intentCard);
      current = evaluateScenarioObjectives(current);
      if (
        current.phase === 'PHASE_SCENARIO_VICTORY' ||
        current.phase === 'PHASE_SCENARIO_DEFEAT'
      ) {
        return current;
      }
      idx++;
    } else {
      idx++;
    }
  }

  return endRoundCleanup(current);
}

export function lockInRoundAndReveal(state: GameState): GameState {
  if (!canLockInRound(state)) return state;

  const livingEnemies = state.enemies.filter((e) => e.hp > 0);
  const activeTypes = Array.from(new Set(livingEnemies.map((e) => e.enemyType)));

  const enemyIntents: Partial<Record<string, EnemyIntentCard>> = {};
  for (const type of activeTypes) {
    const archetype = ENEMY_ARCHETYPES[type as keyof typeof ENEMY_ARCHETYPES];
    if (archetype && archetype.intentDeck && archetype.intentDeck.length > 0) {
      const randomCard =
        archetype.intentDeck[Math.floor(Math.random() * archetype.intentDeck.length)];
      enemyIntents[type] = randomCard;
    }
  }

  const turnEntries: TurnOrderEntry[] = [];

  for (const hero of state.heroes) {
    if (hero.exhausted) continue;

    let initiative = 99;
    if (!hero.longRestDeclared && hero.selectedCards && hero.selectedCards[0]) {
      const leadCard = hero.hand.find((c) => c.id === hero.selectedCards![0]);
      if (leadCard) {
        initiative = leadCard.initiative;
      }
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
    const archetype = ENEMY_ARCHETYPES[type as keyof typeof ENEMY_ARCHETYPES];
    const intent = enemyIntents[type];
    turnEntries.push({
      id: `enemy_group_${type}`,
      isHero: false,
      enemyType: type,
      name: archetype ? archetype.name : type,
      initiative: intent ? intent.initiative : 50,
      intentCard: intent,
      acted: false,
    });
  }

  turnEntries.sort((a, b) => {
    if (a.initiative !== b.initiative) {
      return a.initiative - b.initiative;
    }
    if (a.isHero !== b.isHero) {
      return a.isHero ? -1 : 1;
    }
    return 0;
  });

  const nextHeroes = state.heroes.map((h) => ({
    ...h,
    topUsedThisTurn: false,
    bottomUsedThisTurn: false,
  }));

  let nextState: GameState = {
    ...state,
    phase: 'PHASE_TURN_EXECUTION',
    enemyIntents,
    turnOrder: turnEntries,
    activeTurnIndex: 0,
    heroes: nextHeroes,
    combatLog: [
      ...state.combatLog,
      'Initiative revealed. Turn execution phase begins.',
    ],
  };

  const firstEntry = turnEntries[0];
  if (!firstEntry) {
    return endRoundCleanup(nextState);
  }

  if (firstEntry.isHero) {
    const hero = nextState.heroes.find((h) => h.id === firstEntry.heroId);
    if (hero && hero.statuses.includes('wound')) {
      hero.hp = Math.max(0, hero.hp - 1);
      nextState.combatLog.push(`${hero.name} suffers 1 damage from Wound.`);
      if (hero.hp <= 0) {
        hero.exhausted = true;
        return advanceTurnOrder(nextState);
      }
    }
    return nextState;
  }

  nextState = executeEnemyGroupTurn(
    nextState,
    firstEntry.enemyType!,
    firstEntry.intentCard
  );
  nextState = evaluateScenarioObjectives(nextState);
  if (
    nextState.phase === 'PHASE_SCENARIO_VICTORY' ||
    nextState.phase === 'PHASE_SCENARIO_DEFEAT'
  ) {
    return nextState;
  }

  return advanceTurnOrder(nextState);
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

export function getValidTargetHexes(
  state: GameState,
  pending: PendingActionSelection
): HexCoord[] {
  const hero = state.heroes.find((h) => h.id === pending.heroId);
  if (!hero || hero.exhausted) return [];

  const card = hero.hand.find((c) => c.id === pending.cardId);
  const halfDef = card ? (pending.half === 'top' ? card.top : card.bottom) : null;
  const isBasic = pending.useBasicInstead;

  const actionType = isBasic
    ? pending.half === 'top'
      ? 'attack'
      : 'move'
    : halfDef
    ? halfDef.type
    : 'utility';

  if (actionType === 'move') {
    if (hero.statuses.includes('immobilize')) return [];
    let movePoints = isBasic ? 2 : halfDef?.value || 0;
    if (pending.consumeElement && halfDef?.consume?.bonusMove) {
      movePoints += halfDef.consume.bonusMove;
    }

    const reachable = getReachableHexes({
      start: { q: hero.q, r: hero.r },
      maxMove: movePoints,
      jump: isBasic ? false : !!halfDef?.jump,
      tiles: state.tiles,
      occupiedByAllies: state.heroes
        .filter((h) => !h.exhausted && h.id !== hero.id)
        .map((h) => ({ q: h.q, r: h.r })),
      occupiedByEnemies: state.enemies
        .filter((e) => e.hp > 0)
        .map((e) => ({ q: e.q, r: e.r })),
    });

    return Array.from(reachable.keys()).map((key) => {
      const [q, r] = key.split(',').map(Number);
      return { q, r };
    });
  }

  if (actionType === 'attack') {
    const range = isBasic ? 1 : halfDef?.range || 1;
    const heroCoord = { q: hero.q, r: hero.r };

    return state.enemies
      .filter((enemy) => {
        if (enemy.hp <= 0) return false;
        const enemyCoord = { q: enemy.q, r: enemy.r };
        const dist = hexDistance(heroCoord, enemyCoord);
        if (dist > range) return false;
        return hasLineOfSight(state.tiles, heroCoord, enemyCoord);
      })
      .map((enemy) => ({ q: enemy.q, r: enemy.r }));
  }

  if (actionType === 'heal' || actionType === 'shield') {
    const range = halfDef?.range || 1;
    const heroCoord = { q: hero.q, r: hero.r };

    return state.heroes
      .filter((ally) => {
        if (ally.exhausted) return false;
        const allyCoord = { q: ally.q, r: ally.r };
        const dist = hexDistance(heroCoord, allyCoord);
        if (dist > range) return false;
        return hasLineOfSight(state.tiles, heroCoord, allyCoord);
      })
      .map((ally) => ({ q: ally.q, r: ally.r }));
  }

  if (actionType === 'summon') {
    const neighbors = hexNeighbors({ q: hero.q, r: hero.r });
    const allyHexes = new Set(
      state.heroes.filter((h) => !h.exhausted).map((h) => coordKey(h))
    );
    const enemyHexes = new Set(
      state.enemies.filter((e) => e.hp > 0).map((e) => coordKey(e))
    );

    return neighbors.filter((n) => {
      const tile = getTileAt(state.tiles, n);
      if (!tile || !tile.revealed) return false;
      if (tile.terrain === 'wall' || tile.terrain === 'obstacle') return false;
      const key = coordKey(n);
      return !allyHexes.has(key) && !enemyHexes.has(key);
    });
  }

  return hexNeighbors({ q: hero.q, r: hero.r });
}

export function executeHeroActionOnHex(
  state: GameState,
  target: HexCoord
): GameState {
  if (!state.pendingAction) return state;

  const { heroId, cardId, half, useBasicInstead, consumeElement } = state.pendingAction;
  let currentState = { ...state };
  const heroIndex = currentState.heroes.findIndex((h) => h.id === heroId);
  if (heroIndex === -1) return state;

  let hero = { ...currentState.heroes[heroIndex] };
  const card = hero.hand.find((c) => c.id === cardId);
  const halfDef = card ? (half === 'top' ? card.top : card.bottom) : null;

  const actionType = useBasicInstead
    ? half === 'top'
      ? 'attack'
      : 'move'
    : halfDef
    ? halfDef.type
    : 'utility';

  if (consumeElement && halfDef?.consume) {
    currentState.elements = {
      ...currentState.elements,
      [halfDef.consume.element]: 'inert',
    };
  }

  if (actionType === 'move') {
    hero.q = target.q;
    hero.r = target.r;

    const tile = getTileAt(currentState.tiles, target);
    if (tile) {
      if (tile.terrain === 'hazard') {
        hero.hp = Math.max(0, hero.hp - 2);
        currentState.combatLog.push(`${hero.name} stepped into scalding steam! Suffered 2 damage.`);
      } else if (tile.terrain === 'trap') {
        hero.hp = Math.max(0, hero.hp - 3);
        if (!hero.statuses.includes('immobilize')) {
          hero.statuses.push('immobilize');
        }
        currentState.tiles = currentState.tiles.map((t) =>
          coordsEqual(t, target) ? { ...t, terrain: 'floor' } : t
        );
        currentState.combatLog.push(`${hero.name} triggered a scrap trap! Suffered 3 damage and Immobilized.`);
      } else if (tile.terrain === 'chest') {
        const val = tile.salvageValue || 15;
        currentState.salvage += val;
        currentState.chestLootedInScenario = true;
        currentState.tiles = currentState.tiles.map((t) =>
          coordsEqual(t, target) ? { ...t, terrain: 'floor' } : t
        );
        currentState.combatLog.push(`${hero.name} looted a Relic Chest! Gained ${val} salvage.`);
      } else if (tile.terrain === 'door' && !tile.interacted && tile.unlocksRoomId) {
        const nextRoomId = tile.unlocksRoomId;
        currentState.tiles = currentState.tiles.map((t) => {
          if (coordsEqual(t, target)) return { ...t, interacted: true };
          if (t.roomId === nextRoomId) return { ...t, revealed: true };
          return t;
        });

        const scenario = SCENARIO_BY_ID[currentState.scenarioId] || SCENARIOS[0];
        const newEnemies = (scenario.enemySpawns || [])
          .filter((s) => s.roomId === nextRoomId)
          .map((s, idx) => {
            const arch = ENEMY_ARCHETYPES[s.enemyType];
            return {
              id: `enemy_${s.enemyType}_r${nextRoomId}_${idx}`,
              unitType: 'enemy' as const,
              enemyType: s.enemyType,
              name: arch ? arch.name : s.enemyType,
              q: s.q,
              r: s.r,
              roomId: s.roomId,
              hp: arch ? arch.maxHp : 5,
              maxHp: arch ? arch.maxHp : 5,
              baseShield: arch ? arch.baseShield : 0,
              tempShield: 0,
              hover: arch ? !!arch.hover : false,
              isBoss: arch ? !!arch.isBoss : false,
              isObjectiveStructure: arch ? !!arch.isObjectiveStructure : false,
              immunities: arch && arch.immunities ? [...arch.immunities] : [],
              statuses: [] as StatusEffect[],
            };
          });

        currentState.enemies = [...currentState.enemies, ...newEnemies];
        currentState.combatLog.push(`Door breached! Room ${nextRoomId} revealed.`);
      } else if (tile.terrain === 'lore' && !tile.interacted && tile.loreId) {
        const scenario = SCENARIO_BY_ID[currentState.scenarioId] || SCENARIOS[0];
        const loreNode = scenario.loreNodes ? scenario.loreNodes[tile.loreId] : null;
        if (loreNode) {
          currentState.activeLoreModal = {
            loreNode,
            heroId: hero.id,
            tileCoord: target,
          };
        }
      }
    }
  } else if (actionType === 'attack') {
    let affectedHexes: HexCoord[] = [target];
    if (!useBasicInstead && halfDef?.aoePattern && halfDef.aoePattern !== 'single') {
      affectedHexes = getAoeHexes({ q: hero.q, r: hero.r }, target, halfDef.aoePattern);
    }

    const baseVal = useBasicInstead
      ? 2
      : (halfDef?.value || 0) +
        hero.nextAttackBonus +
        (consumeElement && halfDef?.consume?.bonusAttack ? halfDef.consume.bonusAttack : 0);

    hero.nextAttackBonus = 0;

    const allyCoords = currentState.heroes
      .filter((h) => !h.exhausted && h.id !== hero.id)
      .map((h) => ({ q: h.q, r: h.r }));

    for (const hCoord of affectedHexes) {
      const targetEnemy = currentState.enemies.find(
        (e) => e.hp > 0 && coordsEqual({ q: e.q, r: e.r }, hCoord)
      );
      if (!targetEnemy) continue;

      const flanked = isFlanked({ q: hero.q, r: hero.r }, hCoord, allyCoords);
      const covered = hasCover({ q: hero.q, r: hero.r }, hCoord, currentState.tiles);
      const isStrengthened = hero.statuses.includes('strengthen');
      const isMuddled = hero.statuses.includes('muddle');

      let mode: 'normal' | 'advantage' | 'disadvantage' = 'normal';
      const adv = flanked || isStrengthened;
      const disadv = covered || isMuddled;
      if (adv && !disadv) mode = 'advantage';
      else if (!adv && disadv) mode = 'disadvantage';

      const { result, nextDeck, nextDiscard } = drawModifier(
        currentState.heroModifierDeck,
        currentState.heroModifierDiscard,
        baseVal,
        mode
      );

      currentState.heroModifierDeck = nextDeck;
      currentState.heroModifierDiscard = nextDiscard;
      currentState.lastModifierPopup = {
        targetName: targetEnemy.name,
        result,
        timestamp: Date.now(),
      };

      const pierce =
        (halfDef?.pierce || 0) +
        (consumeElement && halfDef?.consume?.bonusPierce ? halfDef.consume.bonusPierce : 0);

      const effectiveShield = Math.max(0, (targetEnemy.baseShield + targetEnemy.tempShield) - pierce);
      let damageDealt = Math.max(0, result.finalDamage - effectiveShield);
      if (targetEnemy.statuses.includes('poison')) {
        damageDealt += 1;
      }

      targetEnemy.hp = Math.max(0, targetEnemy.hp - damageDealt);
      currentState.combatLog.push(
        `${hero.name} attacks ${targetEnemy.name} for ${damageDealt} damage (${result.chosenCard.label}).`
      );

      if (halfDef?.statusApplied) {
        for (const st of halfDef.statusApplied) {
          if (!targetEnemy.immunities.includes(st) && !targetEnemy.statuses.includes(st)) {
            targetEnemy.statuses.push(st);
          }
        }
      }
      if (consumeElement && halfDef?.consume?.bonusStatus) {
        const bStatus = halfDef.consume.bonusStatus;
        if (!targetEnemy.immunities.includes(bStatus) && !targetEnemy.statuses.includes(bStatus)) {
          targetEnemy.statuses.push(bStatus);
        }
      }

      if (targetEnemy.hp <= 0) {
        currentState.combatLog.push(`${targetEnemy.name} was defeated!`);
      }
    }
  } else if (actionType === 'heal') {
    const healVal = (halfDef?.value || 0) + (consumeElement && halfDef?.consume?.bonusHeal ? halfDef.consume.bonusHeal : 0);
    const targetHero = currentState.heroes.find(
      (h) => !h.exhausted && coordsEqual({ q: h.q, r: h.r }, target)
    );
    if (targetHero) {
      targetHero.hp = Math.min(targetHero.maxHp, targetHero.hp + healVal);
      targetHero.statuses = targetHero.statuses.filter((s) => s !== 'poison' && s !== 'wound');
      currentState.combatLog.push(`${hero.name} healed ${targetHero.name} for ${healVal} HP.`);
    }
  } else if (actionType === 'shield') {
    hero.shield += halfDef?.value || 1;
    currentState.combatLog.push(`${hero.name} gained Shield ${halfDef?.value || 1} this round.`);
  }

  if (!useBasicInstead && halfDef?.infuse) {
    currentState.elements = {
      ...currentState.elements,
      [halfDef.infuse]: 'strong',
    };
  }

  if (!useBasicInstead && halfDef?.xp) {
    hero.xp += halfDef.xp;
  }

  if (half === 'top') {
    hero.topUsedThisTurn = true;
  } else {
    hero.bottomUsedThisTurn = true;
  }

  hero.hand = hero.hand.filter((c) => c.id !== cardId);
  if (!useBasicInstead && halfDef?.burn) {
    hero.lost.push(card!);
    currentState.combatLog.push(`${hero.name} burned ${card!.name}!`);
  } else if (card) {
    hero.discard.push(card);
  }

  currentState.heroes[heroIndex] = hero;
  currentState.pendingAction = null;
  currentState = evaluateScenarioObjectives(currentState);

  if (
    currentState.phase === 'PHASE_SCENARIO_VICTORY' ||
    currentState.phase === 'PHASE_SCENARIO_DEFEAT'
  ) {
    return currentState;
  }

  if (
    hero.topUsedThisTurn &&
    hero.bottomUsedThisTurn &&
    !currentState.activeLoreModal
  ) {
    return advanceTurnOrder(currentState);
  }

  return currentState;
}

export function skipOrEndActiveTurn(state: GameState): GameState {
  if (state.phase !== 'PHASE_TURN_EXECUTION') return state;

  const currentEntry = state.turnOrder[state.activeTurnIndex];
  if (!currentEntry || !currentEntry.isHero) {
    return advanceTurnOrder(state);
  }

  let currentState = { ...state };
  const heroIndex = currentState.heroes.findIndex((h) => h.id === currentEntry.heroId);
  if (heroIndex === -1) return advanceTurnOrder(state);

  const hero = { ...currentState.heroes[heroIndex] };

  if (hero.longRestDeclared) {
    hero.hp = Math.min(hero.maxHp, hero.hp + 2);
    hero.statuses = hero.statuses.filter((s) => s !== 'poison' && s !== 'wound');

    if (hero.discard.length > 0) {
      const lostCard = hero.discard[0];
      hero.lost = [...hero.lost, lostCard];
      hero.hand = [...hero.hand, ...hero.discard.slice(1)];
      hero.discard = [];
    }

    hero.equippedRelics = hero.equippedRelics.map((r) => {
      const relic = RELIC_BY_ID[r.relicId];
      return relic && relic.usageType === 'spent' ? { ...r, used: false } : r;
    });

    currentState.combatLog.push(`${hero.name} completed a Long Rest.`);
  } else {
    if (hero.selectedCards) {
      for (const cId of hero.selectedCards.filter(Boolean)) {
        const found = hero.hand.find((c) => c.id === cId);
        if (found) {
          hero.hand = hero.hand.filter((c) => c.id !== cId);
          hero.discard.push(found);
        }
      }
    }
  }

  hero.topUsedThisTurn = true;
  hero.bottomUsedThisTurn = true;
  currentState.heroes[heroIndex] = hero;

  return advanceTurnOrder(currentState);
}

export function useRelicItem(
  state: GameState,
  heroId: string,
  relicId: string,
  elementChoice?: ElementType
): GameState {
  const heroIndex = state.heroes.findIndex((h) => h.id === heroId);
  if (heroIndex === -1) return state;

  let current = { ...state };
  const hero = { ...current.heroes[heroIndex] };
  const relicEntry = hero.equippedRelics.find((r) => r.relicId === relicId);
  if (!relicEntry || relicEntry.used) return state;

  const relicDef = RELIC_BY_ID[relicId];
  if (!relicDef) return state;

  if (relicDef.effect === 'recover_2_discard') {
    const recovered = hero.discard.slice(0, 2);
    hero.hand = [...hero.hand, ...recovered];
    hero.discard = hero.discard.slice(recovered.length);
  } else if (relicDef.effect === 'move_plus_2_jump') {
    hero.nextAttackBonus = (hero.nextAttackBonus || 0) + 2;
  } else if (relicDef.effect === 'shield_2_round') {
    hero.shield += 2;
  } else if (relicDef.effect === 'infuse_any') {
    const el = elementChoice || 'aether';
    current.elements = { ...current.elements, [el]: 'strong' };
  } else if (relicDef.effect === 'heal_3_cleanse') {
    hero.hp = Math.min(hero.maxHp, hero.hp + 3);
    hero.statuses = hero.statuses.filter((s) => s !== 'poison' && s !== 'wound');
  }

  hero.equippedRelics = hero.equippedRelics.map((r) =>
    r.relicId === relicId ? { ...r, used: true } : r
  );

  current.heroes[heroIndex] = hero;
  current.combatLog.push(`${hero.name} activated ${relicDef.name}.`);
  return current;
}

export function resolveLoreModalChoice(
  state: GameState,
  optionIndex: 0 | 1
): GameState {
  if (!state.activeLoreModal) return state;

  const { loreNode, heroId, tileCoord } = state.activeLoreModal;
  const choice = loreNode.options[optionIndex];
  let current = { ...state };

  current.tiles = current.tiles.map((t) =>
    coordsEqual(t, tileCoord) ? { ...t, interacted: true } : t
  );

  if (choice.reputationDelta) {
    current.reputation = Math.max(-5, Math.min(5, current.reputation + choice.reputationDelta));
  }
  if (choice.salvageDelta) {
    current.salvage = Math.max(0, current.salvage + choice.salvageDelta);
  }
  if (choice.hpDelta) {
    const heroIndex = current.heroes.findIndex((h) => h.id === heroId);
    if (heroIndex !== -1) {
      const hero = { ...current.heroes[heroIndex] };
      hero.hp = Math.max(1, Math.min(hero.maxHp, hero.hp + choice.hpDelta));
      current.heroes[heroIndex] = hero;
    }
  }
  if (choice.infuseElements) {
    const nextElements = { ...current.elements };
    for (const el of choice.infuseElements) {
      nextElements[el] = 'strong';
    }
    current.elements = nextElements;
  }
  if (choice.clearDifficultTerrainInRoom) {
    const roomId = choice.clearDifficultTerrainInRoom;
    current.tiles = current.tiles.map((t) =>
      t.roomId === roomId && t.terrain === 'difficult'
        ? { ...t, terrain: 'floor' }
        : t
    );
  }
  if (choice.stripBossPermanentShield) {
    current.pylonsActivated = (current.pylonsActivated || 0) + 1;
    if (current.pylonsActivated >= 2) {
      current.enemies = current.enemies.map((e) =>
        e.isBoss ? { ...e, baseShield: 0 } : e
      );
      current.combatLog.push('Ancient Pylons fully activated! Boss shield shattered.');
    }
  }
  if (choice.unlockRelicId) {
    if (!current.unlockedRelicIds.includes(choice.unlockRelicId)) {
      current.unlockedRelicIds = [...current.unlockedRelicIds, choice.unlockRelicId];
    }
  }

  current.combatLog.push(choice.outcomeText);
  current.activeLoreModal = null;

  const activeHero = current.heroes.find((h) => h.id === heroId);
  if (activeHero && activeHero.topUsedThisTurn && activeHero.bottomUsedThisTurn) {
    return advanceTurnOrder(current);
  }

  return current;
}

export function buyRelicInOutpost(
  state: GameState,
  heroId: string,
  relicId: string
): GameState {
  const heroIndex = state.heroes.findIndex((h) => h.id === heroId);
  if (heroIndex === -1) return state;

  const relicDef = RELIC_BY_ID[relicId];
  if (!relicDef) return state;

  const discount = state.reputation >= 2 ? 0.8 : 1.0;
  const finalCost = Math.floor(relicDef.cost * discount);

  if (state.salvage < finalCost) return state;

  const hero = { ...state.heroes[heroIndex] };
  hero.equippedRelics = [...hero.equippedRelics, { relicId, used: false }];

  const nextHeroes = [...state.heroes];
  nextHeroes[heroIndex] = hero;

  return {
    ...state,
    salvage: state.salvage - finalCost,
    heroes: nextHeroes,
    combatLog: [
      ...state.combatLog,
      `${hero.name} purchased ${relicDef.name} for ${finalCost} salvage.`,
    ],
  };
}

export function unlockHeroPerkInOutpost(
  state: GameState,
  heroId: string
): GameState {
  const heroIndex = state.heroes.findIndex((h) => h.id === heroId);
  if (heroIndex === -1) return state;

  const hero = { ...state.heroes[heroIndex] };
  if (hero.xp < 15) return state;

  hero.xp -= 15;
  hero.level += 1;
  hero.maxHp += 2;
  hero.hp = hero.maxHp;
  hero.perksUnlocked = (hero.perksUnlocked || 0) + 1;

  const archetype = HERO_ARCHETYPES[hero.classId];
  if (archetype && archetype.level2Cards) {
    const existingIds = new Set(hero.hand.map((c) => c.id));
    const nextCard = archetype.level2Cards.find((c) => !existingIds.has(c.id));
    if (nextCard) {
      hero.hand = [...hero.hand, nextCard];
    }
  }

  const nextDeck = [...state.heroModifierDeck];
  const minusOneIdx = nextDeck.findIndex((c) => c.delta === -1);
  if (minusOneIdx !== -1) {
    nextDeck.splice(minusOneIdx, 1);
  }

  const nextHeroes = [...state.heroes];
  nextHeroes[heroIndex] = hero;

  return {
    ...state,
    heroModifierDeck: nextDeck,
    heroes: nextHeroes,
    combatLog: [
      ...state.combatLog,
      `${hero.name} unlocked a Perk! Level ${hero.level}, Max HP ${hero.maxHp}.`,
    ],
  };
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
    equippedRelics: hero.equippedRelics.map((r) => ({ ...r, used: false })),
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
