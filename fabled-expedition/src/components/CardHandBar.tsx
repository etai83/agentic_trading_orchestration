import React, { useState } from 'react';
import {
  GameState,
  AbilityCard,
  AbilityHalf,
  PendingActionSelection,
  ElementType,
} from '../types/game';
import { canLockInRound } from '../engine/combat';
import { HERO_ARCHETYPES } from '../data/classes';
import { RELIC_BY_ID } from '../data/relics';

interface CardHandBarProps {
  gameState: GameState;
  selectedHeroId: string;
  onSelectHero: (heroId: string) => void;
  onToggleSelectCard: (heroId: string, cardId: string) => void;
  onToggleLongRest: (heroId: string) => void;
  onShortRest: (heroId: string) => void;
  onLockInRound: () => void;
  onQuickAutoSelect: () => void;
  onSetPendingAction: (pending: PendingActionSelection | null) => void;
  pendingAction: PendingActionSelection | null;
  onUseRelic: (heroId: string, relicId: string, element?: ElementType) => void;
  onSkipOrEndTurn: () => void;
}

export const CardHandBar: React.FC<CardHandBarProps> = ({
  gameState,
  selectedHeroId,
  onSelectHero,
  onToggleSelectCard,
  onToggleLongRest,
  onShortRest,
  onLockInRound,
  onQuickAutoSelect,
  onSetPendingAction,
  pendingAction,
  onUseRelic,
  onSkipOrEndTurn,
}) => {
  const [activePileTab, setActivePileTab] = useState<'hand' | 'discard' | 'lost'>('hand');
  const [infuseChoice, setInfuseChoice] = useState<ElementType>('aether');

  // Currently inspected hero in planning phase
  const inspectedHero =
    gameState.heroes.find((h) => h.id === selectedHeroId) || gameState.heroes[0];

  // Turn execution: find active unit
  const activeEntry = gameState.turnOrder[gameState.activeTurnIndex];
  const isExecutionPhase = gameState.phase === 'PHASE_TURN_EXECUTION';
  const isHeroTurn = isExecutionPhase && activeEntry?.isHero;
  const activeHero = isHeroTurn
    ? gameState.heroes.find((h) => h.id === activeEntry.heroId) || null
    : null;

  // Render Tactical Card in Planning view
  const renderPlanningCard = (card: AbilityCard, pileType: 'hand' | 'discard' | 'lost') => {
    const isSelectedLead = inspectedHero.selectedCards?.[0] === card.id;
    const isSelectedSecond = inspectedHero.selectedCards?.[1] === card.id;

    let cardClasses = 'tactical-card';
    if (isSelectedLead) cardClasses += ' selected-lead';
    if (isSelectedSecond) cardClasses += ' selected-second';
    if (pileType === 'lost') cardClasses += ' burned';

    return (
      <div
        key={card.id}
        className={cardClasses}
        onClick={() => {
          if (pileType === 'hand' && !inspectedHero.exhausted) {
            onToggleSelectCard(inspectedHero.id, card.id);
          }
        }}
      >
        {/* Selection Indicators */}
        {isSelectedLead && (
          <div className="selection-overlay-label">Lead [{card.initiative}]</div>
        )}
        {isSelectedSecond && (
          <div className="selection-overlay-label second">2nd CARD</div>
        )}

        {/* Card Header */}
        <div className="card-header">
          <span className="card-title">{card.name}</span>
          <span className="card-level">Lv {card.level}</span>
        </div>

        {/* Top Half */}
        <div className="card-half top">
          <div className="card-half-title">
            <span>{card.top.label}</span>
            {card.top.burn && <span className="burn-icon">🔥 BURN</span>}
          </div>
          <div className="card-half-desc">{card.top.description}</div>
          <div className="card-badge-row">
            {card.top.infuse && <span className="infuse-tag">+{card.top.infuse}</span>}
            {card.top.consume && <span className="consume-tag">-{card.top.consume.element}</span>}
          </div>
        </div>

        {/* Center Initiative Badge */}
        <div className="card-init-badge">{card.initiative}</div>

        {/* Bottom Half */}
        <div className="card-half bottom">
          <div className="card-half-title">
            <span>{card.bottom.label}</span>
            {card.bottom.burn && <span className="burn-icon">🔥 BURN</span>}
          </div>
          <div className="card-half-desc">{card.bottom.description}</div>
          <div className="card-badge-row">
            {card.bottom.infuse && <span className="infuse-tag">+{card.bottom.infuse}</span>}
            {card.bottom.consume && (
              <span className="consume-tag">-{card.bottom.consume.element}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const elementReady = (element: ElementType) => {
    const infusion = gameState.elements[element];
    return infusion === 'strong' || infusion === 'waning';
  };

  const armAction = (
    heroId: string,
    cardId: string,
    half: 'top' | 'bottom',
    useBasicInstead: boolean,
    alreadyArmed: boolean
  ) => {
    onSetPendingAction(
      alreadyArmed
        ? null
        : {
            heroId,
            cardId,
            half,
            useBasicInstead,
            consumeElement: false,
          }
    );
  };

  // -------------------------------------------------------------
  // RENDER PLANNING PHASE BAR
  // -------------------------------------------------------------
  if (!inspectedHero) return null;

  if (!isExecutionPhase) {
    const readyToLock = canLockInRound(gameState);

    return (
      <div className="card-hand-bar">
        {/* Header: Hero Tabs + Piles + Action Buttons */}
        <div className="hand-bar-header" style={{ flexWrap: 'wrap', rowGap: 8 }}>
          {/* Hero Tabs */}
          <div className="hero-selector-tabs">
            {gameState.heroes.map((hero) => {
              const isSelected = hero.id === inspectedHero.id;
              const hasTwoCards = hero.selectedCards && hero.selectedCards[0] && hero.selectedCards[1];

              let statusLabel = 'Need 2 Cards';
              let statusClass = '';
              if (hero.exhausted) {
                statusLabel = 'Exhausted';
              } else if (hero.longRestDeclared) {
                statusLabel = 'Long Rest (99)';
                statusClass = 'rest';
              } else if (hasTwoCards) {
                statusLabel = 'Ready [2]';
                statusClass = 'ready';
              }

              return (
                <div
                  key={hero.id}
                  className={`hero-tab ${isSelected ? 'active' : ''} ${
                    hero.exhausted ? 'exhausted' : ''
                  }`}
                  onClick={() => onSelectHero(hero.id)}
                >
                  <span>{hero.name}</span>
                  <span className={`hero-badge-status ${statusClass}`}>{statusLabel}</span>
                </div>
              );
            })}
          </div>

          {/* Pile Tabs */}
          <div className="card-pile-tabs">
            <button
              className={`pile-tab ${activePileTab === 'hand' ? 'active' : ''}`}
              onClick={() => setActivePileTab('hand')}
            >
              Hand ({inspectedHero.hand.length})
            </button>
            <button
              className={`pile-tab ${activePileTab === 'discard' ? 'active' : ''}`}
              onClick={() => setActivePileTab('discard')}
            >
              Discard ({inspectedHero.discard.length})
            </button>
            <button
              className={`pile-tab ${activePileTab === 'lost' ? 'active' : ''}`}
              onClick={() => setActivePileTab('lost')}
            >
              Lost ({inspectedHero.lost.length})
            </button>
          </div>

          {/* Planning Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-bronze"
              onClick={() => onToggleLongRest(inspectedHero.id)}
              disabled={
                inspectedHero.exhausted ||
                (!inspectedHero.longRestDeclared && inspectedHero.discard.length < 2)
              }
              title="Declare Long Rest (Initiative 99, heal 2, lose 1 discard)"
            >
              {inspectedHero.longRestDeclared ? 'Cancel Long Rest' : '💤 Long Rest'}
            </button>
            <button
              className="btn"
              onClick={() => onShortRest(inspectedHero.id)}
              disabled={inspectedHero.discard.length < 1 || inspectedHero.exhausted}
              title="Short Rest: lose 1 random discarded card and return the rest to hand"
            >
              ⚡ Short Rest
            </button>
            <button
              className="btn btn-accent"
              onClick={onQuickAutoSelect}
              title="Automatically pick 2 cards for every hero who still needs them"
            >
              ✨ Quick Auto-Select Cards
            </button>
            <button
              className="btn btn-bronze"
              style={{
                background: readyToLock
                  ? 'linear-gradient(180deg, #d97706 0%, #92400e 100%)'
                  : undefined,
                fontWeight: 700,
              }}
              onClick={onLockInRound}
              disabled={!readyToLock}
            >
              🔒 Lock In Cards & Begin Round
            </button>
          </div>
        </div>

        {/* Cards Scroll Container */}
        <div className="cards-scroll-container">
          {activePileTab === 'hand' &&
            inspectedHero.hand.map((c) => renderPlanningCard(c, 'hand'))}
          {activePileTab === 'discard' &&
            inspectedHero.discard.map((c) => renderPlanningCard(c, 'discard'))}
          {activePileTab === 'lost' &&
            inspectedHero.lost.map((c) => renderPlanningCard(c, 'lost'))}
          {activePileTab === 'hand' && inspectedHero.hand.length === 0 && (
            <div style={{ margin: 'auto', color: '#64748b', fontSize: '13px' }}>
              No cards in hand. Declare a rest to recover discarded cards!
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER TURN EXECUTION PHASE BAR
  // -------------------------------------------------------------
  if (!isHeroTurn || !activeHero) {
    // Enemy group turn notice
    return (
      <div className="card-hand-bar" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>
            ⚔️ Enemy Turn: {activeEntry?.name}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '13px' }}>
            Enemy figures execute their revealed AI Intent Card automatically...
          </p>
        </div>
      </div>
    );
  }

  // Active Hero Turn: Show their 2 selected cards side-by-side
  const selectedCardObjects = activeHero.selectedCards
    ? (activeHero.selectedCards
        .map((cid) => activeHero.hand.find((c) => c.id === cid))
        .filter(Boolean) as AbilityCard[])
    : [];
  const immobilized = activeHero.statuses.includes('immobilize');

  const renderConsume = (card: AbilityCard, half: 'top' | 'bottom', halfDef: AbilityHalf, used: boolean) => {
    if (!halfDef.consume) return null;
    const ready = elementReady(halfDef.consume.element);
    const armed =
      pendingAction?.cardId === card.id &&
      pendingAction.half === half &&
      !pendingAction.useBasicInstead;
    return (
      <label className="consume-toggle-label" style={{ opacity: ready ? 1 : 0.45 }}>
        <input
          type="checkbox"
          disabled={!ready || used}
          checked={Boolean(armed && pendingAction?.consumeElement && ready)}
          onChange={(event) => {
            if (!ready || used) return;
            onSetPendingAction({
              heroId: activeHero.id,
              cardId: card.id,
              half,
              useBasicInstead: false,
              consumeElement: event.target.checked,
            });
          }}
        />
        <span>
          Consume {halfDef.consume.element}
          {ready ? ` (${halfDef.consume.bonusDescription})` : ' (inert)'}
        </span>
      </label>
    );
  };

  return (
    <div className="card-hand-bar" style={{ maxHeight: 360, overflowY: 'auto' }}>
      <div className="execution-controls-bar" style={{ height: 'auto', alignItems: 'flex-start' }}>
        {/* Active Hero Summary */}
        <div className="active-hero-summary">
          <div className="active-hero-name">
            {activeHero.name} (Lv {activeHero.level})
          </div>
          <div className="active-hero-stats">
            <span>
              ❤️ HP: {activeHero.hp} / {activeHero.maxHp}
            </span>
            <span>🛡️ Shield: {activeHero.shield}</span>
            {activeHero.statuses.length > 0 && (
              <span>Status: {activeHero.statuses.join(', ')}</span>
            )}
            <span>
              Actions Used:{' '}
              {activeHero.topUsedThisTurn && activeHero.bottomUsedThisTurn
                ? 'Both Used'
                : activeHero.topUsedThisTurn
                ? 'Top Used'
                : activeHero.bottomUsedThisTurn
                ? 'Bottom Used'
                : 'None'}
            </span>
          </div>

          {/* Relics strip */}
          <div className="relics-strip" style={{ marginTop: '4px' }}>
            {activeHero.equippedRelics.map((rel) => {
              const item = RELIC_BY_ID[rel.relicId];
              if (!item) return null;
              const choosesElement = item.effect === 'infuse_any';
              return (
                <span key={rel.relicId} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  {choosesElement && !rel.used && (
                    <select
                      value={infuseChoice}
                      aria-label={`Element for ${item.name}`}
                      onChange={(event) => setInfuseChoice(event.target.value as ElementType)}
                      style={{
                        background: '#0d131a',
                        color: '#f1f5f9',
                        border: '1px solid #233140',
                        borderRadius: 4,
                        fontSize: 10,
                      }}
                    >
                      <option value="steam">Steam</option>
                      <option value="volt">Volt</option>
                      <option value="aether">Aether</option>
                      <option value="mire">Mire</option>
                    </select>
                  )}
                  <button
                    className="btn"
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                    disabled={rel.used}
                    onClick={() =>
                      onUseRelic(
                        activeHero.id,
                        rel.relicId,
                        choosesElement ? infuseChoice : undefined
                      )
                    }
                    title={item.description}
                  >
                    🎒 {item.name} {rel.used ? '(Used)' : ''}
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* Selected Cards Action Boxes */}
        <div className="execution-cards-container">
          {selectedCardObjects.length > 0 ? (
            selectedCardObjects.map((card, cardIndex) => {
              const isTopPending =
                pendingAction?.cardId === card.id &&
                pendingAction?.half === 'top' &&
                !pendingAction?.useBasicInstead;
              const isBasicTopPending =
                pendingAction?.cardId === card.id &&
                pendingAction?.half === 'top' &&
                pendingAction?.useBasicInstead;

              const isBottomPending =
                pendingAction?.cardId === card.id &&
                pendingAction?.half === 'bottom' &&
                !pendingAction?.useBasicInstead;
              const isBasicBottomPending =
                pendingAction?.cardId === card.id &&
                pendingAction?.half === 'bottom' &&
                pendingAction?.useBasicInstead;

              return (
                <div key={card.id} className="execution-card-box">
                  <div className="exec-card-title">
                    <span>
                      {cardIndex === 0 ? 'Lead' : 'Second'}: {card.name}
                    </span>
                    <span style={{ color: '#fbbf24' }}>Init {card.initiative}</span>
                  </div>

                  {/* Top Action Selection */}
                  <div style={{ opacity: activeHero.topUsedThisTurn ? 0.35 : 1 }}>
                    <div style={{ fontSize: '11px', color: '#e6a86c', fontWeight: 600 }}>
                      Top: {card.top.label} {card.top.burn ? '🔥' : ''}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {card.top.description}
                    </div>
                    <div className="action-button-row" style={{ flexWrap: 'wrap' }}>
                      <button
                        className={`btn ${isTopPending ? 'btn-accent' : ''}`}
                        disabled={
                          activeHero.topUsedThisTurn ||
                          (immobilized && card.top.type === 'move')
                        }
                        title={
                          immobilized && card.top.type === 'move'
                            ? 'Immobilized — cannot move'
                            : 'Click again to cancel targeting'
                        }
                        onClick={() =>
                          armAction(activeHero.id, card.id, 'top', false, isTopPending)
                        }
                      >
                        Top Action
                      </button>
                      <button
                        className={`btn ${isBasicTopPending ? 'btn-accent' : ''}`}
                        disabled={activeHero.topUsedThisTurn}
                        onClick={() =>
                          armAction(activeHero.id, card.id, 'top', true, isBasicTopPending)
                        }
                        title="Basic Attack 2 (Range 1 Melee). Click again to cancel."
                      >
                        Basic Attack 2
                      </button>
                    </div>

                    {renderConsume(card, 'top', card.top, activeHero.topUsedThisTurn)}
                  </div>

                  {/* Bottom Action Selection */}
                  <div
                    style={{
                      opacity: activeHero.bottomUsedThisTurn ? 0.35 : 1,
                      marginTop: '6px',
                      borderTop: '1px dashed #233140',
                      paddingTop: '6px',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#e6a86c', fontWeight: 600 }}>
                      Bottom: {card.bottom.label} {card.bottom.burn ? '🔥' : ''}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {card.bottom.description}
                    </div>
                    <div className="action-button-row" style={{ flexWrap: 'wrap' }}>
                      <button
                        className={`btn ${isBottomPending ? 'btn-accent' : ''}`}
                        disabled={
                          activeHero.bottomUsedThisTurn ||
                          (immobilized && card.bottom.type === 'move')
                        }
                        title={
                          immobilized && card.bottom.type === 'move'
                            ? 'Immobilized — cannot move'
                            : 'Click again to cancel targeting'
                        }
                        onClick={() =>
                          armAction(activeHero.id, card.id, 'bottom', false, isBottomPending)
                        }
                      >
                        Bottom Action
                      </button>
                      <button
                        className={`btn ${isBasicBottomPending ? 'btn-accent' : ''}`}
                        disabled={activeHero.bottomUsedThisTurn || immobilized}
                        onClick={() =>
                          armAction(activeHero.id, card.id, 'bottom', true, isBasicBottomPending)
                        }
                        title={immobilized ? 'Immobilized — cannot move' : 'Basic Move 2. Click again to cancel.'}
                      >
                        Basic Move 2
                      </button>
                    </div>

                    {renderConsume(card, 'bottom', card.bottom, activeHero.bottomUsedThisTurn)}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
              {activeHero.longRestDeclared
                ? 'Hero declared Long Rest. End turn to perform rest recovery.'
                : 'No cards selected for this hero.'}
            </div>
          )}
        </div>

        {pendingAction && pendingAction.heroId === activeHero.id && (
          <div style={{ fontSize: 11, color: '#38bdf8', alignSelf: 'center' }}>
            Click a highlighted hex. Click the armed action again to cancel.
          </div>
        )}

        {/* End Turn Button */}
        <div>
          <button
            className="btn btn-bronze"
            style={{ padding: '10px 18px', fontWeight: 700 }}
            onClick={onSkipOrEndTurn}
          >
            ⏭️ End Turn
          </button>
        </div>
      </div>
    </div>
  );
};
