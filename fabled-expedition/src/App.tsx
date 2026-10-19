import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GameState,
  HexCoord,
  PendingActionSelection,
  ElementType,
  ModifierCard,
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

function elementIsInfused(state: ElementType | undefined, elements: GameState['elements']): boolean {
  if (!state) return false;
  const infusion = elements[state];
  return infusion === 'strong' || infusion === 'waning';
}

/** Pending selection that belongs to the active hero, with an illegal consume stripped. */
function legalPending(state: GameState): PendingActionSelection | null {
  const pending = state.pendingAction;
  if (!pending || state.phase !== 'PHASE_TURN_EXECUTION') return null;
  const active = state.turnOrder[state.activeTurnIndex];
  if (!active?.isHero || active.heroId !== pending.heroId) return null;
  if (!pending.consumeElement || pending.useBasicInstead) return pending;

  const hero = state.heroes.find((h) => h.id === pending.heroId);
  const card = hero?.hand.find((c) => c.id === pending.cardId);
  const element = card?.[pending.half]?.consume?.element;
  if (elementIsInfused(element, state.elements)) return pending;
  return { ...pending, consumeElement: false };
}

function modifierFace(card: ModifierCard): string {
  if (card.multiplier === 2) return '[2x CRIT!]';
  if (card.multiplier === 0) return '[0x NULL]';
  return `[${card.label}]`;
}

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => createInitialCampaignState());
  const [selectedHeroId, setSelectedHeroId] = useState<string>(
    () => gameState.heroes[0]?.id || 'vanguard'
  );
  const [hiddenModifierStamp, setHiddenModifierStamp] = useState<number | null>(null);
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

  const pendingAction = useMemo(() => legalPending(gameState), [gameState]);

  // Highlights follow the legal pending action, so a stale or inert consume cannot grant range.
  const validTargets = useMemo<HexCoord[]>(() => {
    if (!pendingAction) return [];
    return getValidTargetHexes(gameState, pendingAction);
  }, [gameState, pendingAction]);

  useEffect(() => {
    const popup = gameState.lastModifierPopup;
    if (!popup) return;
    const stamp = popup.timestamp;
    const timer = window.setTimeout(() => setHiddenModifierStamp(stamp), 4500);
    return () => window.clearTimeout(timer);
  }, [gameState.lastModifierPopup]);

  // -------------------------------------------------------------
  // GAME ACTION HANDLERS
  // -------------------------------------------------------------

  const handleTileClick = (coord: HexCoord) => {
    setGameState((prev) => {
      const pending = legalPending(prev);
      if (!pending) return prev;
      const armed = pending === prev.pendingAction ? prev : { ...prev, pendingAction: pending };
      const isValid = getValidTargetHexes(armed, pending).some(
        (vt) => vt.q === coord.q && vt.r === coord.r
      );
      if (!isValid) return prev;
      return executeHeroActionOnHex(armed, coord);
    });
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

  // Fill each hero up to 2 cards. Toggling the first two hand cards deselects a card
  // that was already chosen and can leave the hero on a single card.
  const handleQuickAutoSelect = () => {
    setGameState((prev) => {
      let next = prev;
      for (const heroId of prev.heroes.map((hero) => hero.id)) {
        let hero = next.heroes.find((h) => h.id === heroId);
        if (!hero || hero.exhausted || hero.longRestDeclared) continue;

        const selectedInHand = (current: NonNullable<typeof hero>) =>
          new Set(
            (current.selectedCards ?? []).filter(
              (id) => id && current.hand.some((card) => card.id === id)
            )
          );

        if (selectedInHand(hero).size >= 2) continue;

        for (const card of hero.hand) {
          hero = next.heroes.find((h) => h.id === heroId);
          if (!hero) break;
          const selected = selectedInHand(hero);
          if (selected.size >= 2) break;
          if (selected.has(card.id)) continue;
          next = toggleSelectCard(next, heroId, card.id);
        }
      }
      return next;
    });
  };

  const handleSetPendingAction = (pending: PendingActionSelection | null) => {
    setGameState((prev) => setPendingHeroAction(prev, pending));
  };

  const handleSkipOrEndTurn = () => {
    setGameState((prev) => setPendingHeroAction(skipOrEndActiveTurn(prev), null));
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
                pendingAction={pendingAction}
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
                pendingAction={pendingAction}
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
                  const lower = log.toLowerCase();
                  let logClass = 'combat-log-entry';
                  if (
                    lower.includes('attack') ||
                    lower.includes('damage') ||
                    lower.includes('critical') ||
                    lower.includes('defeated')
                  ) {
                    logClass += ' attack';
                  } else if (lower.includes('heal') || lower.includes('bless')) {
                    logClass += ' heal';
                  } else if (lower.includes('door') || lower.includes('room')) {
                    logClass += ' room';
                  } else if (lower.includes('lore') || lower.includes('pylon')) {
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
          {gameState.lastModifierPopup &&
            gameState.lastModifierPopup.timestamp !== hiddenModifierStamp && (
            <div className="modifier-popup-banner">
              <div style={{ display: 'flex', gap: '6px' }}>
                {gameState.lastModifierPopup.result.drawnCards.map((card, index) => {
                  const chosen = card === gameState.lastModifierPopup?.result.chosenCard;
                  return (
                    <div
                      key={`${card.id}-${index}`}
                      className={`modifier-card-drawn ${
                        card.multiplier === 2 ? 'crit' : card.multiplier === 0 ? 'null' : ''
                      }`}
                      style={{ opacity: chosen ? 1 : 0.45 }}
                      title={chosen ? 'Chosen card' : 'Drawn and discarded'}
                    >
                      {modifierFace(card)}
                    </div>
                  );
                })}
              </div>

              <div className="modifier-details">
                <span className="modifier-target">
                  Target: {gameState.lastModifierPopup.targetName}
                </span>
                <span className="modifier-damage-total">
                  Modifier total {gameState.lastModifierPopup.result.finalDamage}
                </span>
              </div>

              {gameState.lastModifierPopup.result.mode !== 'normal' && (
                <span className="modifier-mode-badge">
                  {gameState.lastModifierPopup.result.mode}
                </span>
              )}
              <button
                className="btn"
                style={{ padding: '2px 8px' }}
                onClick={() => setHiddenModifierStamp(gameState.lastModifierPopup?.timestamp ?? null)}
                aria-label="Dismiss modifier draw"
              >
                ×
              </button>
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
