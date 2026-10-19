import React, { useState } from 'react';
import { GameState, ElementType, ElementState, TurnOrderEntry } from '../types/game';
import { SCENARIO_BY_ID } from '../data/scenarios';

interface TopHudProps {
  gameState: GameState;
  onReturnToOutpost: () => void;
}

export const TopHud: React.FC<TopHudProps> = ({ gameState, onReturnToOutpost }) => {
  const [hoveredIntentIndex, setHoveredIntentIndex] = useState<number | null>(null);

  const scenario = SCENARIO_BY_ID[gameState.scenarioId];

  // Living enemies count
  const livingEnemies = gameState.enemies.filter((e) => e.hp > 0);

  // Render Objective Tracker Details
  const renderObjectiveTracker = () => {
    if (!scenario) return null;

    switch (scenario.objectiveType) {
      case 'kill_all_and_loot_chest':
        return (
          <div className="scenario-objective">
            <span>⚔️ Guardians Left: {livingEnemies.length}</span>
            <span>•</span>
            <span>
              📦 Relic Chest:{' '}
              <strong style={{ color: gameState.chestLootedInScenario ? '#4ade80' : '#f59e0b' }}>
                {gameState.chestLootedInScenario ? 'Claimed' : 'Unopened'}
              </strong>
            </span>
          </div>
        );

      case 'destroy_resonators': {
        const remainingResonators = gameState.enemies.filter(
          (e) => e.enemyType === 'corrupted_resonator' && e.hp > 0
        ).length;
        const destroyed = 2 - remainingResonators;
        return (
          <div className="scenario-objective">
            <span>
              ⚡ Resonators: <strong>{destroyed} / 2</strong> Destroyed
            </span>
            <span>•</span>
            <span style={{ color: gameState.round > 7 ? '#ef4444' : 'inherit' }}>
              ⏳ Limit: Round {gameState.round} / {scenario.roundLimit || 10}
            </span>
          </div>
        );
      }

      case 'kill_boss': {
        const boss = gameState.enemies.find((e) => e.isBoss);
        return (
          <div className="scenario-objective">
            <span>👑 Boss HP: {boss ? `${boss.hp}/${boss.maxHp}` : 'Defeated'}</span>
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
      <div className="initiative-ribbon">
        {gameState.turnOrder.map((entry, idx) => {
          const isActive = idx === gameState.activeTurnIndex;
          const isActed = entry.acted;
          const isHovered = hoveredIntentIndex === idx;

          return (
            <div
              key={`${entry.id}-${idx}`}
              className={`turn-pill ${entry.isHero ? 'hero' : 'enemy'} ${
                isActive ? 'active' : ''
              } ${isActed ? 'acted' : ''}`}
              onMouseEnter={() => setHoveredIntentIndex(idx)}
              onMouseLeave={() => setHoveredIntentIndex(null)}
            >
              <span className="init-number">{String(entry.initiative).padStart(2, '0')}</span>
              <span>{entry.name}</span>
              {isActive && <span style={{ color: '#fbbf24', fontSize: '9px' }}>●</span>}

              {/* Enemy AI Intent Tooltip on Hover */}
              {!entry.isHero && entry.intentCard && isHovered && (
                <div className="intent-tooltip">
                  <div className="intent-tooltip-title">
                    {entry.intentCard.name} (Init {entry.intentCard.initiative})
                  </div>
                  <div className="intent-tooltip-stats">
                    {entry.intentCard.move > 0 && <span>Move {entry.intentCard.move} </span>}
                    {entry.intentCard.attack > 0 && (
                      <span>
                        Attack {entry.intentCard.attack} (Range {entry.intentCard.range}){' '}
                      </span>
                    )}
                    {entry.intentCard.shieldBonus ? (
                      <span>Shield +{entry.intentCard.shieldBonus} </span>
                    ) : null}
                    {entry.intentCard.healSelf ? (
                      <span>Heal Self {entry.intentCard.healSelf} </span>
                    ) : null}
                    {entry.intentCard.infuse && (
                      <span style={{ color: '#38bdf8' }}>Infuse {entry.intentCard.infuse} </span>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                    {entry.intentCard.description}
                  </div>
                </div>
              )}
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
          title="Return to Camp / Outpost"
        >
          🏕️ Outpost
        </button>
      </div>
    </header>
  );
};
