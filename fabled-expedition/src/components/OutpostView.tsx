import React, { useState } from 'react';
import { GameState } from '../types/game';
import { SCENARIOS } from '../data/scenarios';
import { RELIC_ITEMS } from '../data/relics';
import { HERO_ARCHETYPES } from '../data/classes';

interface OutpostViewProps {
  gameState: GameState;
  onStartScenario: (scenarioId: string) => void;
  onBuyRelic: (heroId: string, relicId: string) => void;
  onUnlockPerk: (heroId: string) => void;
}

export const OutpostView: React.FC<OutpostViewProps> = ({
  gameState,
  onStartScenario,
  onBuyRelic,
  onUnlockPerk,
}) => {
  const [selectedRelicHero, setSelectedRelicHero] = useState<string>(
    gameState.heroes[0]?.id || ''
  );

  // Shop discount if reputation >= 2
  const hasDiscount = gameState.reputation >= 2;

  // Calculate pin percentage on -5 to +5 scale
  const repPercent = Math.max(0, Math.min(100, ((gameState.reputation + 5) / 10) * 100));

  return (
    <div className="outpost-view">
      {/* 1. Header & Reputation Track */}
      <div className="outpost-header">
        <div>
          <h1 className="outpost-title">🏕️ The Forgotten Outpost</h1>
          <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>
            Base camp of the lost expedition. Repair automatons, forge relics, and map deeper ruins.
          </p>
        </div>

        <div className="currency-badge" style={{ fontSize: '16px', padding: '8px 16px' }}>
          ⚙️ Party Salvage: <strong>{gameState.salvage}</strong>
        </div>
      </div>

      {/* Reputation Meter */}
      <div className="reputation-meter-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          <span style={{ color: '#ef4444' }}>-5 Ruthless Scavengers</span>
          <span style={{ color: '#fbbf24', fontWeight: 700 }}>
            Reputation: {gameState.reputation > 0 ? `+${gameState.reputation}` : gameState.reputation}
          </span>
          <span style={{ color: '#38bdf8' }}>+5 Revered Preservationists</span>
        </div>

        <div className="reputation-track-bar">
          <div
            className="reputation-pin"
            style={{ left: `clamp(0px, calc(${repPercent}% - 7px), calc(100% - 14px))` }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
          <span>≤ -2: +10 Starting Salvage & +1 Pierce</span>
          <span>≥ +2: 20% Relic Discount & Bonus Bless (2x)</span>
        </div>
      </div>

      {/* 2. Grid Sections: Scenarios + Relic Market & Perks */}
      <div className="outpost-grid-sections">
        {/* Scenarios Panel */}
        <div className="outpost-panel">
          <h2 className="panel-title">🗺️ Available Expeditions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {SCENARIOS.map((sc) => {
              const isCompleted = gameState.completedScenarioIds.includes(sc.id);

              return (
                <div
                  key={sc.id}
                  className={`scenario-card-item ${isCompleted ? 'completed' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#e6a86c' }}>
                      Scenario {sc.number}: {sc.title}
                    </div>
                    {isCompleted && (
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#4ade80',
                          border: '1px solid #4ade80',
                          padding: '1px 6px',
                          borderRadius: '3px',
                        }}
                      >
                        ✓ Cleared
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{sc.subtitle}</div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', fontStyle: 'italic' }}>
                    "{sc.briefing}"
                  </div>
                  <div style={{ fontSize: '10px', color: '#fbbf24' }}>
                    Rewards: +{sc.rewardSalvage} Salvage, +{sc.rewardXp} XP
                  </div>

                  <button
                    className="btn btn-bronze"
                    style={{ marginTop: '6px', alignSelf: 'flex-start' }}
                    onClick={() => onStartScenario(sc.id)}
                  >
                    {isCompleted ? 'Replay Scenario' : 'Embark'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Relic Workshop & Hero Roster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Relic Workshop */}
          <div className="outpost-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="panel-title">🎒 Relic Workshop</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                <span>Equip to:</span>
                <select
                  value={selectedRelicHero}
                  onChange={(e) => setSelectedRelicHero(e.target.value)}
                  style={{
                    background: '#0d131a',
                    color: '#f1f5f9',
                    border: '1px solid #233140',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                  }}
                >
                  {gameState.heroes.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {RELIC_ITEMS.map((item) => {
                const finalCost = hasDiscount ? Math.floor(item.cost * 0.8) : item.cost;
                const canAfford = gameState.salvage >= finalCost;
                const targetHero = gameState.heroes.find((h) => h.id === selectedRelicHero);
                const alreadyEquipped = targetHero?.equippedRelics.some(
                  (r) => r.relicId === item.id
                );

                return (
                  <div key={item.id} className="relic-shop-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9' }}>
                        {item.name}{' '}
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                          ({item.usageType})
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {item.description}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#fbbf24',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                        }}
                      >
                        {hasDiscount && finalCost !== item.cost && (
                          <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                            {item.cost}
                          </span>
                        )}
                        ⚙️ {finalCost}
                      </span>
                      <button
                        className="btn"
                        disabled={!canAfford || alreadyEquipped}
                        onClick={() => onBuyRelic(selectedRelicHero, item.id)}
                      >
                        {alreadyEquipped ? 'Equipped' : 'Buy'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hero Roster & Perks */}
          <div className="outpost-panel">
            <h2 className="panel-title">🛡️ Hero Barracks & Perks</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {gameState.heroes.map((hero) => {
                const archetype = HERO_ARCHETYPES[hero.classId];
                const canPerk = hero.xp >= 15;

                return (
                  <div key={hero.id} className="hero-roster-row">
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: archetype?.color }}>
                        {hero.name} ({archetype?.subtitle})
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                        Level {hero.level} • {hero.xp} XP • {hero.perksUnlocked} Perks Unlocked
                      </div>
                    </div>

                    <button
                      className="btn btn-bronze"
                      disabled={!canPerk}
                      onClick={() => onUnlockPerk(hero.id)}
                      title="Spend 15 XP to upgrade Attack Modifier Deck"
                    >
                      {canPerk ? 'Upgrade Perk (−15 XP)' : `${hero.xp}/15 XP`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
