import React from 'react';
import { LoreNodeConfig, HexCoord } from '../types/game';

interface LoreModalProps {
  modalData: {
    loreNode: LoreNodeConfig;
    heroId: string;
    tileCoord: HexCoord;
  };
  onChooseOption: (optionIndex: 0 | 1) => void;
}

export const LoreModal: React.FC<LoreModalProps> = ({ modalData, onChooseOption }) => {
  const { loreNode } = modalData;

  const renderOutcomeBadges = (option: LoreNodeConfig['options'][0]) => {
    const badges: React.ReactNode[] = [];

    if (option.reputationDelta) {
      badges.push(
        <span
          key="rep"
          style={{
            color: option.reputationDelta > 0 ? '#38bdf8' : '#ef4444',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 6px',
            borderRadius: '3px',
          }}
        >
          ⚖️ Reputation {option.reputationDelta > 0 ? `+${option.reputationDelta}` : option.reputationDelta}
        </span>
      );
    }

    if (option.salvageDelta) {
      badges.push(
        <span
          key="salvage"
          style={{
            color: '#fbbf24',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 6px',
            borderRadius: '3px',
          }}
        >
          ⚙️ Salvage {option.salvageDelta > 0 ? `+${option.salvageDelta}` : option.salvageDelta}
        </span>
      );
    }

    if (option.hpDelta) {
      badges.push(
        <span
          key="hp"
          style={{
            color: '#ef4444',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 6px',
            borderRadius: '3px',
          }}
        >
          ❤️ Damage {option.hpDelta} HP
        </span>
      );
    }

    if (option.infuseElements?.length) {
      badges.push(
        <span
          key="infuse"
          style={{
            color: '#38bdf8',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 6px',
            borderRadius: '3px',
          }}
        >
          ✨ Infuse {option.infuseElements.join(' & ')}
        </span>
      );
    }

    if (option.clearDifficultTerrainInRoom) {
      badges.push(
        <span
          key="clear"
          style={{
            color: '#4ade80',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 6px',
            borderRadius: '3px',
          }}
        >
          🌊 Drain Difficult Water
        </span>
      );
    }

    if (option.stripBossPermanentShield) {
      badges.push(
        <span
          key="shield"
          style={{
            color: '#f59e0b',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 6px',
            borderRadius: '3px',
          }}
        >
          🛡️ Strip Boss Shield
        </span>
      );
    }

    if (option.spawnEnemyInRoom) {
      badges.push(
        <span
          key="spawn"
          style={{
            color: '#ef4444',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 6px',
            borderRadius: '3px',
          }}
        >
          ⚠️ Alerts Patrol Guardian
        </span>
      );
    }

    if (option.unlockRelicId) {
      badges.push(
        <span
          key="relic"
          style={{
            color: '#fbbf24',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 6px',
            borderRadius: '3px',
          }}
        >
          🎁 Unlocks Relic
        </span>
      );
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
        {badges}
      </div>
    );
  };

  return (
    <div className="lore-modal-overlay">
      <div className="lore-modal-box">
        <h2 className="lore-title">📜 {loreNode.title}</h2>
        <div className="lore-prompt">{loreNode.prompt}</div>

        <div className="lore-options-grid">
          {loreNode.options.map((option, idx) => (
            <div
              key={option.label}
              className="lore-option-card"
              onClick={() => onChooseOption(idx as 0 | 1)}
            >
              <div className="lore-option-label">{option.label}</div>
              <div className="lore-option-desc">{option.description}</div>
              <div className="lore-outcome-preview">
                <div>{option.outcomeText}</div>
                {renderOutcomeBadges(option)}
              </div>
              <button
                className="btn btn-bronze"
                style={{ marginTop: 'auto', width: '100%' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onChooseOption(idx as 0 | 1);
                }}
              >
                Choose Path
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
