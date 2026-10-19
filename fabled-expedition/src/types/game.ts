export type ElementType = 'steam' | 'volt' | 'aether' | 'mire';
export type ElementState = 'inert' | 'waning' | 'strong';

export type StatusEffect =
  | 'poison'
  | 'wound'
  | 'immobilize'
  | 'stun'
  | 'muddle'
  | 'strengthen';

export type TerrainType =
  | 'floor'
  | 'difficult'
  | 'hazard'
  | 'obstacle'
  | 'wall'
  | 'door'
  | 'trap'
  | 'lore'
  | 'chest';

export type HeroClassId = 'vanguard' | 'scavenger' | 'lorekeeper' | 'sentinel';
export type EnemyTypeId =
  | 'drowned_construct'
  | 'silt_lurker'
  | 'aether_wisp'
  | 'dredge_overseer'
  | 'corrupted_resonator';

export type AoePattern =
  | 'single'
  | 'cleave'
  | 'cone3'
  | 'triangle3'
  | 'adjacentAll';

export interface HexCoord {
  q: number;
  r: number;
}

export interface HexTile {
  q: number;
  r: number;
  roomId: number;
  revealed: boolean;
  terrain: TerrainType;
  unlocksRoomId?: number; // For 'door' tiles
  loreId?: string;        // For 'lore' tiles
  salvageValue?: number;  // For 'chest' or lootable tiles
  interacted?: boolean;
}

export interface AbilityHalf {
  label: string;
  description: string;
  type: 'attack' | 'move' | 'heal' | 'shield' | 'summon' | 'utility';
  value?: number;
  range?: number;
  targets?: number;
  aoePattern?: AoePattern;
  jump?: boolean;
  pierce?: number;
  push?: number;
  pull?: number;
  retaliate?: number;
  selfHeal?: number;
  recoverDiscarded?: number;
  disarmTrap?: boolean;
  grantAllyMove?: number;
  grantAllyAttackBonus?: number;
  statusApplied?: StatusEffect[];
  infuse?: ElementType;
  consume?: {
    element: ElementType;
    bonusDescription: string;
    bonusAttack?: number;
    bonusMove?: number;
    bonusHeal?: number;
    bonusPierce?: number;
    bonusStatus?: StatusEffect;
  };
  burn?: boolean;
  xp?: number;
}

export interface AbilityCard {
  id: string;
  classId: HeroClassId;
  name: string;
  level: number;
  initiative: number; // 1 - 99
  top: AbilityHalf;
  bottom: AbilityHalf;
}

export interface HeroArchetype {
  id: HeroClassId;
  name: string;
  subtitle: string;
  role: string;
  color: string;
  accentColor: string;
  baseHp: number;
  handSize: number;
  primaryElements: ElementType[];
  starterCards: AbilityCard[];
  level2Cards: AbilityCard[];
}

export interface EnemyIntentCard {
  id: string;
  name: string;
  initiative: number;
  move: number;
  attack: number;
  range: number;
  targets?: number;
  aoeAdjacentAll?: boolean;
  push?: number;
  pull?: number;
  pierce?: number;
  healSelf?: number;
  healAlliesRange2?: number;
  shieldBonus?: number;
  statusApplied?: StatusEffect[];
  infuse?: ElementType;
  spawnEnemyType?: EnemyTypeId;
  createHazardHexes?: number;
  description: string;
}

export interface EnemyArchetype {
  id: EnemyTypeId;
  name: string;
  isBoss?: boolean;
  isObjectiveStructure?: boolean;
  maxHp: number;
  baseMove: number;
  baseAttack: number;
  baseRange: number;
  baseShield: number;
  hover?: boolean;
  immunities?: StatusEffect[];
  color: string;
  intentDeck: EnemyIntentCard[];
}

export interface ModifierCard {
  id: string;
  label: string;
  delta: number;         // e.g. -2, -1, 0, +1, +2
  multiplier?: number;   // 2 for 2x Critical, 0 for Null
  shuffleAtEnd?: boolean;
  temporary?: boolean;   // Bless (2x) or Curse (0x)
  infuse?: ElementType;
}

export interface ModifierDrawResult {
  finalDamage: number;
  drawnCards: ModifierCard[];
  chosenCard: ModifierCard;
  mode: 'normal' | 'advantage' | 'disadvantage';
}

export interface RelicItem {
  id: string;
  name: string;
  cost: number;
  description: string;
  usageType: 'spent' | 'consumed'; // spent refreshes on Long Rest; consumed once per scenario
  effect: 'recover_2_discard' | 'move_plus_2_jump' | 'shield_2_round' | 'infuse_any' | 'heal_3_cleanse';
}

export interface LoreChoiceOption {
  label: string;
  description: string;
  outcomeText: string;
  reputationDelta?: number;
  salvageDelta?: number;
  hpDelta?: number;
  infuseElements?: ElementType[];
  clearDifficultTerrainInRoom?: number;
  spawnEnemyInRoom?: { roomId: number; enemyType: EnemyTypeId; q: number; r: number };
  stripBossPermanentShield?: boolean;
  unlockRelicId?: string;
}

export interface LoreNodeConfig {
  id: string;
  title: string;
  prompt: string;
  options: [LoreChoiceOption, LoreChoiceOption];
}

export interface ScenarioEnemySpawn {
  enemyType: EnemyTypeId;
  q: number;
  r: number;
  roomId: number;
}

export interface ScenarioConfig {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  briefing: string;
  victorySummary: string;
  objectiveType: 'kill_all_and_loot_chest' | 'destroy_resonators' | 'kill_boss';
  roundLimit?: number;
  heroSpawns: HexCoord[];
  tiles: HexTile[];
  enemySpawns: ScenarioEnemySpawn[];
  loreNodes: Record<string, LoreNodeConfig>;
  rewardSalvage: number;
  rewardXp: number;
}

export interface HeroUnitState {
  id: string;
  unitType: 'hero';
  classId: HeroClassId;
  name: string;
  level: number;
  xp: number;
  q: number;
  r: number;
  hp: number;
  maxHp: number;
  shield: number;
  retaliate: number;
  nextAttackBonus: number;
  statuses: StatusEffect[];
  exhausted: boolean;
  hand: AbilityCard[];
  discard: AbilityCard[];
  lost: AbilityCard[];
  selectedCards: [string, string] | null; // [leadCardId, secondCardId]
  longRestDeclared: boolean;
  topUsedThisTurn: boolean;
  bottomUsedThisTurn: boolean;
  equippedRelics: { relicId: string; used: boolean }[];
  perksUnlocked: number;
}

export interface EnemyUnitState {
  id: string;
  unitType: 'enemy';
  enemyType: EnemyTypeId;
  name: string;
  q: number;
  r: number;
  roomId: number;
  hp: number;
  maxHp: number;
  baseShield: number;
  tempShield: number;
  hover: boolean;
  isBoss: boolean;
  isObjectiveStructure: boolean;
  immunities: StatusEffect[];
  statuses: StatusEffect[];
  isSummon?: boolean; // e.g., Sentinel's Coil Turret ally summon
}

export interface TurnOrderEntry {
  id: string;
  isHero: boolean;
  heroId?: string;
  enemyType?: EnemyTypeId;
  name: string;
  initiative: number;
  intentCard?: EnemyIntentCard;
  acted: boolean;
}

export type RoundPhase =
  | 'PHASE_PLANNING'
  | 'PHASE_TURN_EXECUTION'
  | 'PHASE_SCENARIO_VICTORY'
  | 'PHASE_SCENARIO_DEFEAT';

export interface PendingActionSelection {
  heroId: string;
  cardId: string;
  half: 'top' | 'bottom';
  useBasicInstead: boolean;
  consumeElement: boolean;
}

export interface GameState {
  screen: 'outpost' | 'scenario';
  scenarioId: string;
  completedScenarioIds: string[];
  round: number;
  phase: RoundPhase;
  tiles: HexTile[];
  heroes: HeroUnitState[];
  enemies: EnemyUnitState[];
  elements: Record<ElementType, ElementState>;
  enemyIntents: Partial<Record<EnemyTypeId, EnemyIntentCard>>;
  turnOrder: TurnOrderEntry[];
  activeTurnIndex: number;
  pendingAction: PendingActionSelection | null;
  activeLoreModal: { loreNode: LoreNodeConfig; heroId: string; tileCoord: HexCoord } | null;
  heroModifierDeck: ModifierCard[];
  heroModifierDiscard: ModifierCard[];
  enemyModifierDeck: ModifierCard[];
  enemyModifierDiscard: ModifierCard[];
  salvage: number;
  reputation: number; // -5 to +5
  unlockedRelicIds: string[];
  combatLog: string[];
  lastModifierPopup: {
    targetName: string;
    result: ModifierDrawResult;
    timestamp: number;
  } | null;
  chestLootedInScenario: boolean;
  pylonsActivated: number;
}
