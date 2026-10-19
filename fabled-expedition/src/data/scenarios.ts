import { HexTile, ScenarioConfig } from '../types/game';

function createScenarioTiles(overrides: Record<string, Partial<HexTile>>): HexTile[] {
  const tiles: HexTile[] = [];
  for (let q = 0; q <= 9; q++) {
    for (let r = 0; r <= 5; r++) {
      const key = `${q},${r}`;
      const isRoom1 = q <= 4;
      const roomId = isRoom1 ? 1 : 2;
      const revealed = isRoom1;

      let terrain: HexTile['terrain'] = 'floor';
      let unlocksRoomId: number | undefined;

      if (q === 4) {
        if (r === 2) {
          terrain = 'door';
          unlocksRoomId = 2;
        } else {
          terrain = 'wall';
        }
      }

      const baseTile: HexTile = {
        q,
        r,
        roomId,
        revealed,
        terrain,
        ...(unlocksRoomId ? { unlocksRoomId } : {}),
      };

      if (overrides[key]) {
        Object.assign(baseTile, overrides[key]);
      }

      tiles.push(baseTile);
    }
  }
  return tiles;
}

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: 'sunken_lock',
    number: 1,
    title: 'The Sunken Lock of Aethel',
    subtitle: 'Introductory Breach',
    briefing:
      'Infiltrate the flooded sluiceway of Aethel, breach the submerged turbine bulkhead, and secure the Aethel Conduit before the lower levels drown in mire.',
    victorySummary:
      'The sluice gates groan shut as the ancient turbine hums to life. You retrieve the Aethel Conduit from the sealed vault, paving the way deeper into the forgotten complex.',
    objectiveType: 'kill_all_and_loot_chest',
    rewardSalvage: 25,
    rewardXp: 15,
    heroSpawns: [
      { q: 0, r: 2 },
      { q: 0, r: 3 },
      { q: 1, r: 2 },
      { q: 1, r: 3 },
    ],
    tiles: createScenarioTiles({
      '1,1': { terrain: 'lore', loreId: 'sluice_valve' },
      '2,1': { terrain: 'difficult' },
      '2,2': { terrain: 'difficult' },
      '1,4': { terrain: 'obstacle' },
      '2,0': { terrain: 'obstacle' },
      '3,1': { terrain: 'trap' },
      '3,4': { terrain: 'hazard' },
      '6,1': { terrain: 'obstacle' },
      '6,3': { terrain: 'difficult' },
      '7,2': { terrain: 'difficult' },
      '7,4': { terrain: 'obstacle' },
      '8,2': { terrain: 'chest', salvageValue: 20 },
      '8,4': { terrain: 'hazard' },
    }),
    enemySpawns: [
      { enemyType: 'silt_lurker', q: 2, r: 3, roomId: 1 },
      { enemyType: 'silt_lurker', q: 3, r: 2, roomId: 1 },
      { enemyType: 'drowned_construct', q: 3, r: 5, roomId: 1 },
      { enemyType: 'drowned_construct', q: 6, r: 2, roomId: 2 },
      { enemyType: 'drowned_construct', q: 7, r: 3, roomId: 2 },
      { enemyType: 'aether_wisp', q: 8, r: 1, roomId: 2 },
    ],
    loreNodes: {
      sluice_valve: {
        id: 'sluice_valve',
        title: 'Sluice Valve Mechanism',
        prompt:
          'A rusted pressure wheel controls the water flow through the sluiceway. Releasing the valve could clear the treacherous mire, but the grinding gears will echo down the conduit.',
        options: [
          {
            label: 'Drain the Sluice',
            description: 'Open the bypass to drain standing water in this chamber.',
            outcomeText:
              'Water rushes into the lower grates, clearing the flood. However, distant metallic thuds confirm guardians in the next chamber have been alerted.',
            reputationDelta: 1,
            clearDifficultTerrainInRoom: 1,
            spawnEnemyInRoom: { roomId: 2, enemyType: 'drowned_construct', q: 6, r: 4 },
          },
          {
            label: 'Siphon the Pressure',
            description: 'Overcharge your power cells with high-pressure steam.',
            outcomeText:
              'Scalding steam surges through your conduits! You salvage valuable fuel canisters, but the backlash scorches your armor.',
            reputationDelta: -1,
            salvageDelta: 15,
            hpDelta: -2,
            infuseElements: ['steam', 'volt'],
          },
        ],
      },
    },
  },

  {
    id: 'whispering_foundry',
    number: 2,
    title: 'The Whispering Foundry',
    subtitle: 'Escort & Hazard Control',
    briefing:
      'Rogue acoustic resonance is tearing the foundry apart. Shatter the two Corrupted Resonators within 10 rounds before structural collapse buries the expedition in molten slag.',
    victorySummary:
      'With both resonators shattered, the deafening ultrasonic screech fades into silence. The foundry stabilizes just enough for you to salvage core components.',
    objectiveType: 'destroy_resonators',
    roundLimit: 10,
    rewardSalvage: 35,
    rewardXp: 18,
    heroSpawns: [
      { q: 0, r: 2 },
      { q: 0, r: 3 },
      { q: 1, r: 2 },
      { q: 1, r: 3 },
    ],
    tiles: createScenarioTiles({
      '1,4': { terrain: 'lore', loreId: 'automaton_core' },
      '2,2': { terrain: 'difficult' },
      '2,4': { terrain: 'hazard' },
      '1,0': { terrain: 'obstacle' },
      '2,0': { terrain: 'obstacle' },
      '3,1': { terrain: 'trap' },
      '6,0': { terrain: 'obstacle' },
      '6,2': { terrain: 'hazard' },
      '7,1': { terrain: 'difficult' },
      '7,3': { terrain: 'hazard' },
      '7,4': { terrain: 'trap' },
      '8,4': { terrain: 'obstacle' },
    }),
    enemySpawns: [
      { enemyType: 'corrupted_resonator', q: 3, r: 3, roomId: 1 },
      { enemyType: 'silt_lurker', q: 2, r: 1, roomId: 1 },
      { enemyType: 'aether_wisp', q: 3, r: 0, roomId: 1 },
      { enemyType: 'drowned_construct', q: 3, r: 4, roomId: 1 },
      { enemyType: 'corrupted_resonator', q: 8, r: 2, roomId: 2 },
      { enemyType: 'drowned_construct', q: 6, r: 3, roomId: 2 },
      { enemyType: 'silt_lurker', q: 7, r: 2, roomId: 2 },
      { enemyType: 'aether_wisp', q: 9, r: 1, roomId: 2 },
    ],
    loreNodes: {
      automaton_core: {
        id: 'automaton_core',
        title: 'Trapped Automaton Core',
        prompt:
          'A pinned servitor twitching under fallen steel emits a plaintive synthesized frequency. Its power cell could be salvaged or cleansed.',
        options: [
          {
            label: 'Free the Consciousness',
            description: 'Sever the pain-circuits and grant autonomy to the trapped spark.',
            outcomeText:
              'The automaton shudders with gratitude, purging its memory core and leaving behind an intact Overclocked Capacitor.',
            reputationDelta: 2,
            unlockRelicId: 'overclocked_capacitor',
          },
          {
            label: 'Harvest for Parts',
            description: 'Strip the dense copper coils and lithium fuel cells for market value.',
            outcomeText:
              'You strip the chassis down to raw slag and precious conductors, pocketing 30 salvage.',
            reputationDelta: -1,
            salvageDelta: 30,
          },
        ],
      },
    },
  },

  {
    id: 'sanctum_overseer',
    number: 3,
    title: 'Sanctum of the Dredge Overseer',
    subtitle: 'Climax Boss Fight',
    briefing:
      'At the heart of the sunken complex stands the Dredge Overseer, shielded by ancient energy matrices. Synchronize both resonant pylons to collapse its impenetrable shield and strike down the titan.',
    victorySummary:
      'The Dredge Overseer crashes into the aetheric pool with a deafening groan of buckling titanium. The ancient sanctum is reclaimed, and the secrets of Aethel belong to your expedition.',
    objectiveType: 'kill_boss',
    rewardSalvage: 50,
    rewardXp: 25,
    heroSpawns: [
      { q: 0, r: 2 },
      { q: 0, r: 3 },
      { q: 1, r: 2 },
      { q: 1, r: 3 },
    ],
    tiles: createScenarioTiles({
      '2,1': { terrain: 'lore', loreId: 'pylon_alpha' },
      '2,2': { terrain: 'difficult' },
      '1,4': { terrain: 'hazard' },
      '2,0': { terrain: 'obstacle' },
      '3,0': { terrain: 'obstacle' },
      '3,3': { terrain: 'trap' },
      '6,0': { terrain: 'obstacle' },
      '6,3': { terrain: 'difficult' },
      '7,1': { terrain: 'lore', loreId: 'pylon_beta' },
      '7,3': { terrain: 'trap' },
      '7,4': { terrain: 'hazard' },
      '8,4': { terrain: 'obstacle' },
    }),
    enemySpawns: [
      { enemyType: 'drowned_construct', q: 2, r: 3, roomId: 1 },
      { enemyType: 'aether_wisp', q: 3, r: 1, roomId: 1 },
      { enemyType: 'silt_lurker', q: 3, r: 4, roomId: 1 },
      { enemyType: 'dredge_overseer', q: 8, r: 2, roomId: 2 },
      { enemyType: 'drowned_construct', q: 6, r: 1, roomId: 2 },
      { enemyType: 'aether_wisp', q: 9, r: 3, roomId: 2 },
      { enemyType: 'silt_lurker', q: 8, r: 1, roomId: 2 },
    ],
    loreNodes: {
      pylon_alpha: {
        id: 'pylon_alpha',
        title: 'Resonant Pylon Alpha',
        prompt:
          'The western pylon radiates humming cerulean aether, projecting energy directly into the Overseer barrier.',
        options: [
          {
            label: 'Attune Pylon Frequencies',
            description: 'Harmonize the crystals to disrupt the Overseer shield matrix.',
            outcomeText:
              'Harmonic resonance ripples outward! The Overseer defensive barrier falters and aether charges the air.',
            stripBossPermanentShield: true,
            infuseElements: ['aether'],
            reputationDelta: 1,
          },
          {
            label: 'Overdrive Siphon',
            description: 'Force the pylon to discharge volatile energy into your weapons.',
            outcomeText:
              'Volatile energy arcs through your weapons, granting immediate tactical strength at the cost of chassis stress.',
            stripBossPermanentShield: true,
            salvageDelta: 20,
            hpDelta: -2,
            infuseElements: ['aether', 'volt'],
          },
        ],
      },
      pylon_beta: {
        id: 'pylon_beta',
        title: 'Resonant Pylon Beta',
        prompt:
          'The eastern pylon anchors the core containment field. Overloading it will shatter the Overseer primary defensive harmonics.',
        options: [
          {
            label: 'Trigger Harmonic Collapse',
            description: 'Invert the polarity of the pylon to strip the boss armor.',
            outcomeText:
              'The pylon emits a blinding pulse! The Dredge Overseer permanent shield shatters completely as pure aether saturates the chamber.',
            stripBossPermanentShield: true,
            infuseElements: ['aether'],
            reputationDelta: 1,
          },
          {
            label: 'Drain Shield Matrix for Scrap',
            description: 'Extract the dense platinum emitter rods while shattering the field.',
            outcomeText:
              'You rip out the precious emitter core. The shield shatters, and you secure valuable platinum components.',
            stripBossPermanentShield: true,
            salvageDelta: 25,
            reputationDelta: -1,
          },
        ],
      },
    },
  },
];

export const SCENARIO_BY_ID: Record<string, ScenarioConfig> = SCENARIOS.reduce(
  (acc, scenario) => {
    acc[scenario.id] = scenario;
    return acc;
  },
  {} as Record<string, ScenarioConfig>
);
