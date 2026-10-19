import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GameState,
  HexCoord,
  PendingActionSelection,
  ElementType,
} from './types/game';
import {
  createInitialCampaignState,
  startScenario,
  toggleSelectCard,
  toggleLongRest,
  performShortRest,
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
} from './engine/combat';
import { SCENARIO_BY_ID } from './data/scenarios';
import { HexBoard } from './components/HexBoard';
import { TopHud } from './components/TopHud';
import { CardHandBar } from './components/CardHandBar';
import { LoreModal } from './components/LoreModal';
import { OutpostView } from './components/OutpostView';

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => createInitialCampaignState());
  const [selectedHeroId, setSelectedHeroId] = useState<string>(
    () => gameState.heroes[0]?.id || 'vanguard'
  );
  const combatLogEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll combat log
  useEffect(() => {
    combatLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.combatLog]);

  // Sync selected hero when active turn index changes in Turn Execution
  useEffect(() => {
    if (gameState.phase === 'PHASE_TURN_EXECUTION') {
      const activeEntry = gameState.turnOrder[gameState.activeTurnIndex];
      if (activeEntry?.isHero && activeEntry.heroId) {
        setSelectedHeroId(activeEntry.heroId);
      }
    }
  }, [gameState.phase, gameState.activeTurnIndex, gameState.turnOrder]);

  // Calculate valid target hexes for currently pending hero action
  const validTargets = useMemo<HexCoord[]>(() => {
    if (!gameState.pendingAction) return [];
    return getValidTargetHexes(gameState, gameState.pendingAction);
  }, [gameState.pendingAction, gameState]);

  // -------------------------------------------------------------
  // GAME ACTION HANDLERS
  // -------------------------------------------------------------

  const handleTileClick = (coord: HexCoord) => {
    if (!gameState.pendingAction) return;

    // Check if clicked tile is a valid target
    const isValid = validTargets.some((vt) => vt.q === coord.q && vt.r === coord.r);
    if (!isValid) return;

    const nextState = executeHeroActionOnHex(gameState, coord);
    setGameState(nextState);
  };

  const handleToggleSelectCard = (heroId: string, cardId: string) => {
    setGameState((prev) => toggleSelectCard(prev, heroId, cardId));
  };

  const handleToggleLongRest = (heroId: string) => {
    setGameState((prev) => toggleLongRest(prev, heroId));
  };

  const handleShortRest = (heroId: string) => {
    setGameState((prev) => performShortRest(prev, heroId));
  };

  const handleLockInRound = () => {
    setGameState((prev) => lockInRoundAndReveal(prev));
  };

  // Quick auto-select cards for all unselected heroes
  const handleQuickAutoSelect = () => {
    let nextState = { ...gameState };
    for (const hero of nextState.heroes) {
      if (hero.exhausted || hero.longRestDeclared) continue;
      const selectedCount = hero.selectedCards ? hero.selectedCards.filter(Boolean).length : 0;
      if (selectedCount < 2 && hero.hand.length >= 2) {
        // Toggle first 2 cards in hand
        const card1 = hero.hand[0];
        const card2 = hero.hand[1];
        nextState = toggleSelectCard(nextState, hero.id, card1.id);
        nextState = toggleSelectCard(nextState, hero.id, card2.id);
      }
    }
    setGameState(nextState);
  };

  const handleSetPendingAction = (pending: PendingActionSelection | null) => {
    setGameState((prev) => setPendingHeroAction(prev, pending));
  };

  const handleSkipOrEndTurn = () => {
    setGameState((prev) => skipOrEndActiveTurn(prev));
  };

  const handleUseRelic = (heroId: string, relicId: string, element?: ElementType) => {
    setGameState((prev) => useRelicItem(prev, heroId, relicId, element));
  };

  const handleChooseLoreOption = (optionIndex: 0 | 1) => {
    setGameState((prev) => resolveLoreModalChoice(prev, optionIndex));
  };

  const handleStartScenario = (scenarioId: string) => {
    setGameState((prev) => startScenario(prev, scenarioId));
  };

  const handleReturnToOutpost = () => {
    setGameState((prev) => returnToOutpost(prev));
  };

  const handleBuyRelic = (heroId: string, relicId: string) => {
    setGameState((prev) => buyRelicInOutpost(prev, heroId, relicId));
  };

  const handleUnlockPerk = (heroId: string) => {
    setGameState((prev) => unlockHeroPerkInOutpost(prev, heroId));
  };

  // Active scenario config
  const currentScenario = SCENARIO_BY_ID[gameState.scenarioId];

  return (
    <div className="app-container">
      {/* If Outpost screen is active, show OutpostView */}
      {gameState.screen === 'outpost' ? (
        <OutpostView
          gameState={gameState}
          onStartScenario={handleStartScenario}
          onBuyRelic={handleBuyRelic}
          onUnlockPerk={handleUnlockPerk}
        />
      ) : (
        /* Scenario Expedition Screen */
        <>
          {/* Top HUD */}
          <TopHud gameState={gameState} onReturnToOutpost={handleReturnToOutpost} />

          {/* Main Tactical Viewport */}
          <div className="main-viewport">
            <div className="game-area">
              {/* Hex Board */}
              <HexBoard
                gameState={gameState}
                onTileClick={handleTileClick}
                validTargets={validTargets}
                pendingAction={gameState.pendingAction}
              />

              {/* Bottom Card Hand & Action Bar */}
              <CardHandBar
                gameState={gameState}
                selectedHeroId={selectedHeroId}
                onSelectHero={setSelectedHeroId}
                onToggleSelectCard={handleToggleSelectCard}
                onToggleLongRest={handleToggleLongRest}
                onShortRest={handleShortRest}
                onLockInRound={handleLockInRound}
                onQuickAutoSelect={handleQuickAutoSelect}
                onSetPendingAction={handleSetPendingAction}
                pendingAction={gameState.pendingAction}
                onUseRelic={handleUseRelic}
                onSkipOrEndTurn={handleSkipOrEndTurn}
              />
            </div>

            {/* Combat Log Sidebar */}
            <aside className="combat-log-sidebar">
              <div className="combat-log-header">
                <span>📜 Expedition Chronicle</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  {gameState.combatLog.length} events
                </span>
              </div>
              <div className="combat-log-list">
                {gameState.combatLog.map((log, index) => {
                  let logClass = 'combat-log-entry';
                  if (log.includes('attacks') || log.includes('Damage') || log.includes('CRITICAL')) {
                    logClass += ' attack';
                  } else if (log.includes('heals') || log.includes('Bless')) {
                    logClass += ' heal';
                  } else if (log.includes('breaches Door') || log.includes('Room')) {
                    logClass += ' room';
                  } else if (log.includes('Lore Node')) {
                    logClass += ' lore';
                  }
                  return (
                    <div key={index} className={logClass}>
                      {log}
                    </div>
                  );
                })}
                <div ref={combatLogEndRef} />
              </div>
            </aside>
          </div>

          {/* Attack Modifier Card Draw Popup Banner */}
          {gameState.lastModifierPopup && (
            <div className="modifier-popup-banner">
              <div
                className={`modifier-card-drawn ${
                  gameState.lastModifierPopup.result.chosenCard.multiplier === 2
                    ? 'crit'
                    : gameState.lastModifierPopup.result.chosenCard.multiplier === 0
                    ? 'null'
                    : ''
                }`}
              >
                {gameState.lastModifierPopup.result.chosenCard.multiplier === 2
                  ? '2x CRIT!'
                  : gameState.lastModifierPopup.result.chosenCard.multiplier === 0
                  ? '0x NULL'
                  : gameState.lastModifierPopup.result.chosenCard.label}
              </div>

              <div className="modifier-details">
                <span className="modifier-target">
                  Target: {gameState.lastModifierPopup.targetName}
                </span>
                <span className="modifier-damage-total">
                  Dealt {gameState.lastModifierPopup.result.finalDamage} Damage
                </span>
              </div>

              {gameState.lastModifierPopup.result.mode !== 'normal' && (
                <span className="modifier-mode-badge">
                  {gameState.lastModifierPopup.result.mode}
                </span>
              )}
            </div>
          )}

          {/* Lore Node Narrative Choice Modal */}
          {gameState.activeLoreModal && (
            <LoreModal
              modalData={gameState.activeLoreModal}
              onChooseOption={handleChooseLoreOption}
            />
          )}

          {/* Scenario Victory Modal */}
          {gameState.phase === 'PHASE_SCENARIO_VICTORY' && (
            <div className="scenario-result-modal">
              <div className="result-card victory">
                <h2 className="result-title">🏆 Expedition Victory!</h2>
                <p style={{ color: '#cbd5e1', fontSize: '13px' }}>
                  {currentScenario?.victorySummary ||
                    'All objectives completed! The ancient ruins yield their secrets.'}
                </p>
                <div style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 700 }}>
                  Rewards Collected: +{currentScenario?.rewardSalvage || 20} Salvage, +
                  {currentScenario?.rewardXp || 10} XP
                </div>
                <button
                  className="btn btn-bronze"
                  style={{ padding: '10px 24px', fontSize: '13px' }}
                  onClick={handleReturnToOutpost}
                >
                  Return to Outpost with Spoils
                </button>
              </div>
            </div>
          )}

          {/* Scenario Defeat Modal */}
          {gameState.phase === 'PHASE_SCENARIO_DEFEAT' && (
            <div className="scenario-result-modal">
              <div className="result-card defeat">
                <h2 className="result-title">☠️ Expedition Overwhelmed</h2>
                <p style={{ color: '#cbd5e1', fontSize: '13px' }}>
                  All heroes have fallen or exhausted their cards. The depths remain unforgiving.
                </p>
                <button
                  className="btn btn-danger"
                  style={{ padding: '10px 24px', fontSize: '13px' }}
                  onClick={handleReturnToOutpost}
                >
                  Regroup at Outpost
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;
