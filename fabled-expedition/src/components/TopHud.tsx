import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { GameState, ElementType, ElementState, EnemyIntentCard } from '../types/game';
import { SCENARIO_BY_ID } from '../data/scenarios';
import { ENEMY_ARCHETYPES } from '../data/enemies';

interface TopHudProps {
  gameState: GameState;
  onReturnToOutpost: () => void;
}

function revealedRoomIds(gameState: GameState): Set<number> {
  const rooms = new Set<number>();
  for (const tile of gameState.tiles) {
    if (tile.revealed) rooms.add(tile.roomId);
  }
  return rooms;
}

function intentStatLine(intent: EnemyIntentCard): string {
  const bits: string[] = [];
  if (intent.move > 0) bits.push(`Move ${intent.move}`);
  if (intent.attack > 0) {
    bits.push(`Attack ${intent.attack}${intent.range > 0 ? ` Range ${intent.range}` : ''}`);
  }
  if (intent.aoeAdjacentAll) bits.push('All adjacent');
  if (intent.targets && intent.targets > 1) bits.push(`Targets ${intent.targets}`);
  if (intent.push) bits.push(`Push ${intent.push}`);
  if (intent.pull) bits.push(`Pull ${intent.pull}`);
  if (intent.pierce) bits.push(`Pierce ${intent.pierce}`);
  if (intent.shieldBonus) bits.push(`Shield +${intent.shieldBonus}`);
  if (intent.healSelf) bits.push(`Heal Self ${intent.healSelf}`);
  if (intent.healAlliesRange2) bits.push(`Heal Allies ${intent.healAlliesRange2}`);
  if (intent.statusApplied?.length) bits.push(intent.statusApplied.join(', '));
  if (intent.infuse) bits.push(`Infuse ${intent.infuse}`);
  if (intent.spawnEnemyType) bits.push('Spawns a guardian');
  if (intent.createHazardHexes) bits.push(`Creates ${intent.createHazardHexes} hazards`);
  return bits.join(' · ');
}

export const TopHud: React.FC<TopHudProps> = ({ gameState, onReturnToOutpost }) => {
  const [hoveredIntent, setHoveredIntent] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const scenario = SCENARIO_BY_ID[gameState.scenarioId];
  const openRooms = revealedRoomIds(gameState);

  // Render Objective Tracker Details
  const renderObjectiveTracker = () => {
    if (!scenario) return null;

    switch (scenario.objectiveType) {
      case 'kill_all_and_loot_chest': {
        const living = gameState.enemies.filter((e) => e.hp > 0 && !e.isSummon).length;
        const sealed = scenario.enemySpawns.filter((spawn) => !openRooms.has(spawn.roomId)).length;
        return (
          <div className="scenario-objective">
            <span title="Living guardians plus enemies still sealed in unopened rooms">
              ⚔️ Guardians Left: {living + sealed}
            </span>
            <span>•</span>
            <span>
              📦 Relic Chest:{' '}
              <strong style={{ color: gameState.chestLootedInScenario ? '#4ade80' : '#f59e0b' }}>
                {gameState.chestLootedInScenario ? 'Claimed' : 'Unopened'}
              </strong>
            </span>
          </div>
        );
      }

      case 'destroy_resonators': {
        const spawns = scenario.enemySpawns.filter(
          (spawn) => spawn.enemyType === 'corrupted_resonator'
        );
        const sealed = spawns.filter((spawn) => !openRooms.has(spawn.roomId)).length;
        const living = gameState.enemies.filter(
          (e) => e.enemyType === 'corrupted_resonator' && e.hp > 0
        ).length;
        const destroyed = Math.max(0, spawns.length - sealed - living);
        const limit = scenario.roundLimit ?? 10;
        const urgent = gameState.round >= limit - 2;
        return (
          <div className="scenario-objective">
            <span>
              ⚡ Resonators: <strong>{destroyed} / {spawns.length}</strong> Destroyed
            </span>
            <span>•</span>
            <span style={{ color: urgent ? '#ef4444' : 'inherit' }}>
              ⏳ Limit: Round {gameState.round} / {limit}
            </span>
          </div>
        );
      }

      case 'kill_boss': {
        const boss = gameState.enemies.find((e) => e.isBoss && e.hp > 0);
        const defeatedBoss = gameState.enemies.find((e) => e.isBoss && e.hp <= 0);
        const bossStillSealed = scenario.enemySpawns.some((spawn) => {
          const archetype = ENEMY_ARCHETYPES[spawn.enemyType];
          return archetype?.isBoss && !openRooms.has(spawn.roomId);
        });
        const bossLabel = boss
          ? `${boss.hp}/${boss.maxHp}`
          : bossStillSealed
          ? 'Sealed'
          : defeatedBoss
          ? 'Defeated'
          : 'Sealed';
        return (
          <div className="scenario-objective">
            <span>👑 Boss HP: {bossLabel}</span>
            <span>•</span>
            <span>
              🔮 Pylons Active: <strong>{gameState.pylonsActivated} / 2</strong>
            </span>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // Render 4-Element Resonance Infusion Board
  const elementsList: { id: ElementType; label: string; icon: string }[] = [
    { id: 'steam', label: 'Steam', icon: '💨' },
    { id: 'volt', label: 'Volt', icon: '⚡' },
    { id: 'aether', label: 'Aether', icon: '🔮' },
    { id: 'mire', label: 'Mire', icon: '🌿' },
  ];

  return (
    <header className="top-hud">
      {/* 1. Scenario Info & Objective */}
      <div className="scenario-info-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="round-badge">ROUND {gameState.round}</span>
          <span className="scenario-title">{scenario?.title || 'Expedition'}</span>
        </div>
        {renderObjectiveTracker()}
      </div>

      {/* 2. Initiative Ribbon */}
      <div className="initiative-ribbon" onScroll={() => setHoveredIntent(null)}>
        {gameState.turnOrder.length === 0 && (
          <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
            Initiative locks in with the round
          </span>
        )}
        {gameState.turnOrder.map((entry, idx) => {
          const isActive =
            gameState.phase === 'PHASE_TURN_EXECUTION' && idx === gameState.activeTurnIndex;
          // The engine never flips `acted`; earlier slots in the ribbon have already resolved.
          const isActed =
            entry.acted ||
            (gameState.phase === 'PHASE_TURN_EXECUTION' && idx < gameState.activeTurnIndex);

          return (
            <div
              key={`${entry.id}-${idx}`}
              className={`turn-pill ${entry.isHero ? 'hero' : 'enemy'} ${
                isActive ? 'active' : ''
              } ${isActed ? 'acted' : ''}`}
              onMouseEnter={(event) => {
                if (entry.isHero || !entry.intentCard) {
                  setHoveredIntent(null);
                  return;
                }
                const rect = event.currentTarget.getBoundingClientRect();
                setHoveredIntent({
                  index: idx,
                  x: rect.left + rect.width / 2,
                  y: rect.bottom + 8,
                });
              }}
              onMouseLeave={() => setHoveredIntent(null)}
            >
              <span className="init-number">{String(entry.initiative).padStart(2, '0')}</span>
              <span>{entry.name}</span>
              {isActive && <span style={{ color: '#fbbf24', fontSize: '9px' }}>●</span>}
            </div>
          );
        })}
      </div>

      {/* 3. 4-Element Resonance Infusion Board */}
      <div className="resonance-board">
        {elementsList.map(({ id, label, icon }) => {
          const state: ElementState = gameState.elements[id] || 'inert';
          return (
            <div key={id} className={`element-node ${id} ${state}`}>
              <span>
                {icon} {label}
              </span>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {state}
              </span>
            </div>
          );
        })}
      </div>

      {/* 4. Salvage, Reputation & Outpost Button */}
      <div className="hud-actions">
        <div className="currency-badge" title="Salvage (Party Gold)">
          ⚙️ <strong>{gameState.salvage}</strong>
        </div>
        <div className="reputation-badge" title="Party Reputation (-5 to +5)">
          ⚖️ <strong>{gameState.reputation > 0 ? `+${gameState.reputation}` : gameState.reputation}</strong>
        </div>
        <button
          className="btn btn-bronze"
          onClick={onReturnToOutpost}
          title="Outpost / Campaign Map"
        >
          🏕️ Outpost
        </button>
      </div>
      {hoveredIntent &&
        createPortal(
          (() => {
            const entry = gameState.turnOrder[hoveredIntent.index];
            if (!entry?.intentCard) return null;
            return (
              <div
                className="intent-tooltip"
                style={{
                  position: 'fixed',
                  top: hoveredIntent.y,
                  left: hoveredIntent.x,
                  marginTop: 0,
                  zIndex: 400,
                  maxWidth: 260,
                }}
              >
                <div className="intent-tooltip-title">
                  {entry.intentCard.name} (Init {entry.intentCard.initiative})
                </div>
                <div className="intent-tooltip-stats">{intentStatLine(entry.intentCard)}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                  {entry.intentCard.description}
                </div>
              </div>
            );
          })(),
          document.body
        )}
    </header>
  );
};
