import { RelicItem } from '../types/game';

export const RELIC_ITEMS: RelicItem[] = [
  {
    id: 'stamina_tonic',
    name: 'Stamina Tonic',
    cost: 15,
    description: 'During your turn, recover up to 2 Discarded cards to Hand.',
    usageType: 'consumed',
    effect: 'recover_2_discard',
  },
  {
    id: 'pneumatic_boots',
    name: 'Pneumatic Boots',
    cost: 20,
    description: 'Add +2 Move and Jump to a single Move action.',
    usageType: 'spent',
    effect: 'move_plus_2_jump',
  },
  {
    id: 'aegis_aether_plate',
    name: 'Aegis Aether-Plate',
    cost: 25,
    description: 'Negate the next 2 Damage from an incoming attack.',
    usageType: 'spent',
    effect: 'shield_2_round',
  },
  {
    id: 'resonance_lens',
    name: 'Resonance Lens',
    cost: 30,
    description: 'Infuse any single Element to Strong on demand.',
    usageType: 'consumed',
    effect: 'infuse_any',
  },
  {
    id: 'overclocked_capacitor',
    name: 'Overclocked Capacitor',
    cost: 25,
    description: 'Heal 3 and cleanse Poison and Wound conditions.',
    usageType: 'spent',
    effect: 'heal_3_cleanse',
  },
];

export const RELIC_BY_ID: Record<string, RelicItem> = RELIC_ITEMS.reduce(
  (acc, relic) => {
    acc[relic.id] = relic;
    return acc;
  },
  {} as Record<string, RelicItem>
);
