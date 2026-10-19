import React, { useState, useMemo } from 'react';
import {
  GameState,
  HexCoord,
  HexTile,
  HeroUnitState,
  EnemyUnitState,
  PendingActionSelection,
  AoePattern,
  StatusEffect,
  HeroClassId,
} from '../types/game';
import {
  axialToPixel,
  hexPolygonPoints,
  coordKey,
  coordsEqual,
  getAoeHexes,
} from '../engine/hex';
import { HERO_ARCHETYPES } from '../data/classes';
import { ENEMY_ARCHETYPES } from '../data/enemies';

interface HexBoardProps {
  gameState: GameState;
  onTileClick: (coord: HexCoord) => void;
  validTargets: HexCoord[];
  pendingAction: PendingActionSelection | null;
}

const HEX_SIZE = 40;

const HERO_EMBLEM: Record<HeroClassId, string> = {
  vanguard: 'VG',
  scavenger: 'SC',
  lorekeeper: 'LK',
  sentinel: 'ST',
};

const STATUS_GLYPH: Record<StatusEffect, string> = {
  poison: 'P',
  wound: 'W',
  immobilize: 'I',
  stun: '!',
  muddle: '~',
  strengthen: '+',
};

function enemyMark(name: string): string {
  const words = name.replace(/^The\s+/i, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const HexBoard: React.FC<HexBoardProps> = ({
  gameState,
  onTileClick,
  validTargets,
  pendingAction,
}) => {
  const [hoveredCoord, setHoveredCoord] = useState<HexCoord | null>(null);

  // Active unit from turn order
  const activeEntry = gameState.turnOrder[gameState.activeTurnIndex];

  // Active hero (if hero turn)
  const activeHero = useMemo(() => {
    if (!activeEntry?.isHero || !activeEntry.heroId) return null;
    return gameState.heroes.find((h) => h.id === activeEntry.heroId) || null;
  }, [activeEntry, gameState.heroes]);

  // Compute pending ability details (to know if attack or move, and AoE pattern)
  const pendingAbilityDetails = useMemo(() => {
    if (!pendingAction || !activeHero) return null;
    const card = activeHero.hand.find((c) => c.id === pendingAction.cardId);
    if (!card) return null;
    const half = card[pendingAction.half];
    const isAttack =
      (pendingAction.useBasicInstead && pendingAction.half === 'top') ||
      (!pendingAction.useBasicInstead && half.type === 'attack');
    const aoePattern: AoePattern =
      !pendingAction.useBasicInstead && half.aoePattern ? half.aoePattern : 'single';
    return { isAttack, aoePattern, half };
  }, [pendingAction, activeHero]);

  // Calculate AoE preview hexes when hovering a valid target
  const aoePreviewHexes = useMemo(() => {
    if (
      !hoveredCoord ||
      !pendingAbilityDetails ||
      !activeHero ||
      pendingAbilityDetails.aoePattern === 'single'
    ) {
      return [];
    }
    const isValid = validTargets.some((vt) => coordsEqual(vt, hoveredCoord));
    if (!isValid) return [];
    return getAoeHexes(
      { q: activeHero.q, r: activeHero.r },
      hoveredCoord,
      pendingAbilityDetails.aoePattern
    );
  }, [hoveredCoord, pendingAbilityDetails, activeHero, validTargets]);

  // Compute board bounds and viewBox
  const { viewBox, minX, minY, width, height } = useMemo(() => {
    if (!gameState.tiles.length) {
      return { viewBox: '0 0 1000 650', minX: 0, minY: 0, width: 1000, height: 650 };
    }
    let minPxX = Infinity;
    let maxPxX = -Infinity;
    let minPxY = Infinity;
    let maxPxY = -Infinity;

    gameState.tiles.forEach((t) => {
      const { x, y } = axialToPixel({ q: t.q, r: t.r }, HEX_SIZE);
      if (x < minPxX) minPxX = x;
      if (x > maxPxX) maxPxX = x;
      if (y < minPxY) minPxY = y;
      if (y > maxPxY) maxPxY = y;
    });

    const padding = 70;
    const boxMinX = minPxX - padding;
    const boxMinY = minPxY - padding;
    const boxW = maxPxX - minPxX + padding * 2;
    const boxH = maxPxY - minPxY + padding * 2;

    return {
      viewBox: `${boxMinX} ${boxMinY} ${boxW} ${boxH}`,
      minX: boxMinX,
      minY: boxMinY,
      width: boxW,
      height: boxH,
    };
  }, [gameState.tiles]);

  // Render terrain graphics inside a hex
  const renderTerrainArtwork = (tile: HexTile, cx: number, cy: number) => {
    if (!tile.revealed) {
      return (
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill="#1e293b"
          fontSize="14"
          fontFamily="monospace"
        >
          ?
        </text>
      );
    }

    switch (tile.terrain) {
      case 'difficult':
        // Water ripples
        return (
          <g opacity={0.85}>
            <circle cx={cx} cy={cy} r="16" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.4" />
            <path
              d={`M ${cx - 14} ${cy - 4} Q ${cx - 7} ${cy - 8} ${cx} ${cy - 4} T ${cx + 14} ${cy - 4}`}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2"
            />
            <path
              d={`M ${cx - 12} ${cy + 4} Q ${cx - 6} ${cy} ${cx} ${cy + 4} T ${cx + 12} ${cy + 4}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.8"
            />
          </g>
        );

      case 'hazard':
        // Glowing steam vents / acid
        return (
          <g>
            <circle cx={cx} cy={cy} r="12" fill="url(#grad-hazard-core)" />
            <circle cx={cx} cy={cy} r="18" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
            <path
              d={`M ${cx - 8} ${cy + 6} L ${cx} ${cy - 10} L ${cx + 8} ${cy + 6} Z`}
              fill="#ef4444"
              opacity="0.8"
            />
            <circle cx={cx} cy={cy - 2} r="2" fill="#fff" />
          </g>
        );

      case 'obstacle':
        // Heavy industrial turbine pillar
        return (
          <g>
            <rect x={cx - 12} y={cy - 12} width="24" height="24" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <circle cx={cx} cy={cy} r="7" fill="#0f172a" stroke="#c88a4b" strokeWidth="1.5" />
            <line x1={cx - 10} y1={cy - 10} x2={cx + 10} y2={cy + 10} stroke="#334155" strokeWidth="1.5" />
            <line x1={cx + 10} y1={cy - 10} x2={cx - 10} y2={cy + 10} stroke="#334155" strokeWidth="1.5" />
          </g>
        );

      case 'wall':
        // Sealed bulkhead
        return (
          <g>
            <rect x={cx - 16} y={cy - 16} width="32" height="32" rx="3" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
            <line x1={cx - 14} y1={cy} x2={cx + 14} y2={cy} stroke="#334155" strokeWidth="2" />
            <line x1={cx} y1={cy - 14} x2={cx} y2={cy + 14} stroke="#334155" strokeWidth="2" />
          </g>
        );

      case 'door':
        // Brass bulkhead door gear
        return (
          <g>
            <circle cx={cx} cy={cy} r="14" fill={tile.interacted ? '#1e293b' : '#78350f'} stroke="#c88a4b" strokeWidth="2" />
            <circle cx={cx} cy={cy} r="6" fill="#0d131a" stroke="#d97706" strokeWidth="1" />
            {tile.interacted ? (
              <text x={cx} y={cy + 3} textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="bold">OPEN</text>
            ) : (
              <path
                d={`M ${cx - 8} ${cy} L ${cx + 8} ${cy} M ${cx} ${cy - 8} L ${cx} ${cy + 8}`}
                stroke="#f59e0b"
                strokeWidth="2"
              />
            )}
          </g>
        );

      case 'trap':
        // Jagged spike trap
        return (
          <g>
            <polygon points={`${cx},${cy - 12} ${cx + 8},${cy + 8} ${cx - 8},${cy + 8}`} fill="#dc2626" opacity="0.85" />
            <polygon points={`${cx - 10},${cy + 4} ${cx - 4},${cy - 8} ${cx + 2},${cy + 4}`} fill="#991b1b" opacity="0.9" />
            <polygon points={`${cx + 10},${cy + 4} ${cx + 4},${cy - 8} ${cx - 2},${cy + 4}`} fill="#b91c1c" opacity="0.9" />
            <circle cx={cx} cy={cy + 2} r="3" fill="#fbbf24" />
          </g>
        );

      case 'lore':
        // Glowing cyan aether rune. Spent nodes stay visible but dim.
        return (
          <g opacity={tile.interacted ? 0.4 : 1}>
            <circle cx={cx} cy={cy} r="15" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
            <polygon
              points={`${cx},${cy - 10} ${cx + 9},${cy + 6} ${cx - 9},${cy + 6}`}
              fill="rgba(56, 189, 248, 0.25)"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            <polygon
              points={`${cx},${cy + 10} ${cx + 9},${cy - 6} ${cx - 9},${cy - 6}`}
              fill="rgba(56, 189, 248, 0.25)"
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
            {tile.interacted ? (
              <text x={cx} y={cy + 3} textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold">
                READ
              </text>
            ) : (
              <circle cx={cx} cy={cy} r="3" fill="#fff" />
            )}
          </g>
        );

      case 'chest':
        // Golden ironbound chest
        return (
          <g>
            <rect x={cx - 12} y={cy - 8} width="24" height="18" rx="2" fill="#b45309" stroke="#fbbf24" strokeWidth="1.5" />
            <rect x={cx - 10} y={cy - 12} width="20" height="6" rx="2" fill="#d97706" stroke="#fbbf24" strokeWidth="1" />
            <circle cx={cx} cy={cy} r="3" fill="#fbbf24" />
            <line x1={cx - 6} y1={cy - 8} x2={cx - 6} y2={cy + 10} stroke="#78350f" strokeWidth="1.5" />
            <line x1={cx + 6} y1={cy - 8} x2={cx + 6} y2={cy + 10} stroke="#78350f" strokeWidth="1.5" />
          </g>
        );

      default:
        // Clear stone floor
        return (
          <g opacity={0.25}>
            <circle cx={cx} cy={cy} r="1" fill="#64748b" />
          </g>
        );
    }
  };

  // Render Status Effect badges for a unit
  const renderStatusBadges = (statuses: StatusEffect[], cx: number, cy: number) => {
    if (!statuses.length) return null;
    const badgeSize = 8;
    const startX = cx - ((statuses.length - 1) * (badgeSize + 3)) / 2;
    const badgeY = cy - 24;

    const statusColors: Record<StatusEffect, string> = {
      poison: '#22c55e',
      wound: '#ef4444',
      immobilize: '#a855f7',
      stun: '#eab308',
      muddle: '#64748b',
      strengthen: '#38bdf8',
    };

    return (
      <g>
        {statuses.map((s, idx) => (
          <g key={s} transform={`translate(${startX + idx * (badgeSize + 3)}, ${badgeY})`}>
            <circle r={badgeSize / 2} fill={statusColors[s] || '#fff'} stroke="#000" strokeWidth="0.8" />
            <title>{s}</title>
            <text textAnchor="middle" y="2.5" fontSize="6" fontWeight="bold" fill="#000">
              {STATUS_GLYPH[s]}
            </text>
          </g>
        ))}
      </g>
    );
  };

  // Render a Hero Token
  const renderHeroToken = (hero: HeroUnitState) => {
    if (hero.exhausted) return null;
    const { x, y } = axialToPixel({ q: hero.q, r: hero.r }, HEX_SIZE);
    const archetype = HERO_ARCHETYPES[hero.classId];
    const color = archetype?.color || '#38bdf8';
    const isActive = activeEntry?.isHero && activeEntry.heroId === hero.id;

    const hpPercent = Math.max(0, Math.min(1, hero.hp / hero.maxHp));
    const hpBarWidth = 30;

    return (
      <g
        key={hero.id}
        transform={`translate(${x}, ${y})`}
        style={{ cursor: 'pointer' }}
        onClick={() => onTileClick({ q: hero.q, r: hero.r })}
      >
        <title>{`${hero.name} ${hero.hp}/${hero.maxHp}`}</title>
        {/* Animated Golden Ring for Active Unit */}
        {isActive && (
          <circle
            r={24}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="3"
            filter="url(#active-unit-glow)"
            opacity="0.9"
          >
            <animate attributeName="r" values="23;26;23" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.7;1;0.7" dur="1.8s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Hero Token Base Circle */}
        <circle r={17} fill="#0d131a" stroke={color} strokeWidth="2.5" />
        <circle r={14} fill={color} opacity="0.35" />

        {/* Hero Class Initial */}
        <text
          textAnchor="middle"
          y="4"
          fill="#ffffff"
          fontSize="10"
          fontWeight="bold"
          fontFamily="var(--font-family)"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          {HERO_EMBLEM[hero.classId]}
        </text>

        {/* Shield Badge */}
        {hero.shield > 0 && (
          <g transform="translate(12, -10)">
            <circle r="7" fill="#0284c7" stroke="#ffffff" strokeWidth="1" />
            <text textAnchor="middle" y="2.5" fill="#fff" fontSize="7" fontWeight="bold">
              {hero.shield}
            </text>
          </g>
        )}

        {/* Retaliate Badge */}
        {hero.retaliate > 0 && (
          <g transform="translate(-12, -10)">
            <circle r="6" fill="#b91c1c" stroke="#ffffff" strokeWidth="1" />
            <text textAnchor="middle" y="2.5" fill="#fff" fontSize="6" fontWeight="bold">
              R{hero.retaliate}
            </text>
          </g>
        )}

        {/* Status Conditions */}
        {renderStatusBadges(hero.statuses, 0, 0)}

        {/* HP Bar */}
        <g transform="translate(0, 20)">
          <rect
            x={-hpBarWidth / 2}
            y={0}
            width={hpBarWidth}
            height={4}
            rx={2}
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="0.8"
          />
          <rect
            x={-hpBarWidth / 2}
            y={0}
            width={hpBarWidth * hpPercent}
            height={4}
            rx={2}
            fill={hpPercent > 0.4 ? '#22c55e' : '#ef4444'}
          />
          <text textAnchor="middle" y="9" fill="#94a3b8" fontSize="7" fontFamily="monospace">
            {hero.hp}/{hero.maxHp}
          </text>
        </g>
      </g>
    );
  };

  // Render an Enemy Token
  const renderEnemyToken = (enemy: EnemyUnitState) => {
    if (enemy.hp <= 0) return null;
    const { x, y } = axialToPixel({ q: enemy.q, r: enemy.r }, HEX_SIZE);
    const archetype = ENEMY_ARCHETYPES[enemy.enemyType];
    const color = archetype?.color || '#ef4444';
    const totalShield = enemy.baseShield + enemy.tempShield;
    const isActive = !activeEntry?.isHero && activeEntry?.enemyType === enemy.enemyType;

    const hpPercent = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
    const hpBarWidth = enemy.isBoss ? 40 : 28;

    return (
      <g
        key={enemy.id}
        transform={`translate(${x}, ${y})`}
        style={{ cursor: 'pointer' }}
        onClick={() => onTileClick({ q: enemy.q, r: enemy.r })}
      >
        <title>{`${enemy.name} ${enemy.hp}/${enemy.maxHp}`}</title>
        {/* Animated Golden Ring if currently active enemy group */}
        {isActive && (
          <circle
            r={enemy.isBoss ? 28 : 22}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.5"
            strokeDasharray="4 2"
            opacity="0.9"
          >
            <animate
              attributeName="r"
              values={enemy.isBoss ? '27;30;27' : '21;24;21'}
              dur="1.8s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* Enemy Token Shape */}
        {enemy.isObjectiveStructure ? (
          // Diamond / Square structure
          <rect
            x={-14}
            y={-14}
            width={28}
            height={28}
            rx={4}
            fill="#1e1b4b"
            stroke="#818cf8"
            strokeWidth="2"
          />
        ) : (
          <circle
            r={enemy.isBoss ? 19 : 15}
            fill="#090d12"
            stroke={color}
            strokeWidth={enemy.isBoss ? '3' : '2'}
          />
        )}

        <circle r={enemy.isBoss ? 15 : 12} fill={color} opacity="0.3" />

        {/* Enemy Label / Boss Icon */}
        <text
          textAnchor="middle"
          y="4"
          fill="#f8fafc"
          fontSize={enemy.isBoss ? '9' : '8'}
          fontWeight="bold"
          fontFamily="var(--font-family)"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          {enemy.isBoss ? '👑' : enemy.isObjectiveStructure ? '◎' : enemyMark(enemy.name)}
        </text>

        {/* Shield Badge */}
        {totalShield > 0 && (
          <g transform="translate(12, -9)">
            <circle r="6" fill="#475569" stroke="#ffffff" strokeWidth="0.8" />
            <text textAnchor="middle" y="2" fill="#fff" fontSize="6" fontWeight="bold">
              {totalShield}
            </text>
          </g>
        )}

        {/* Status Conditions */}
        {renderStatusBadges(enemy.statuses, 0, 0)}

        {/* HP Bar */}
        <g transform="translate(0, 18)">
          <rect
            x={-hpBarWidth / 2}
            y={0}
            width={hpBarWidth}
            height={4}
            rx={2}
            fill="#0f172a"
            stroke="#334155"
            strokeWidth="0.8"
          />
          <rect
            x={-hpBarWidth / 2}
            y={0}
            width={hpBarWidth * hpPercent}
            height={4}
            rx={2}
            fill={hpPercent > 0.4 ? '#ef4444' : '#991b1b'}
          />
          <text textAnchor="middle" y="9" fill="#94a3b8" fontSize="7" fontFamily="monospace">
            {enemy.hp}/{enemy.maxHp}
          </text>
        </g>
      </g>
    );
  };

  return (
    <div className="hex-viewport-wrapper">
      <svg
        viewBox={viewBox}
        style={{ width: '100%', height: '100%', maxHeight: '680px' }}
      >
        <defs>
          {/* Bevel Gradients & Glows */}
          <linearGradient id="grad-floor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1b2533" />
            <stop offset="100%" stopColor="#0d141e" />
          </linearGradient>

          <linearGradient id="grad-fog" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#070a0e" />
            <stop offset="100%" stopColor="#030508" />
          </linearGradient>

          <radialGradient id="grad-hazard-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0" />
          </radialGradient>

          {/* Glow Filters */}
          <filter id="active-unit-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="target-glow-green" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.9  0 0 0 0 0.5  0 0 0 1 0" />
            <feComposite in="SourceGraphic" operator="over" />
          </filter>

          <filter id="target-glow-red" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.95  0 0 0 0 0.25  0 0 0 0 0.25  0 0 0 1 0" />
            <feComposite in="SourceGraphic" operator="over" />
          </filter>
        </defs>

        {/* 1. Base Hex Tiles Layer */}
        <g className="hex-tiles-layer">
          {gameState.tiles.map((tile) => {
            const { x, y } = axialToPixel({ q: tile.q, r: tile.r }, HEX_SIZE);
            const points = hexPolygonPoints(x, y, HEX_SIZE);
            const isValidTarget = validTargets.some((vt) => coordsEqual(vt, tile));
            const isHovered = hoveredCoord && coordsEqual(hoveredCoord, tile);
            const isAoeAffected = aoePreviewHexes.some((ah) => coordsEqual(ah, tile));

            const isAttackAction = pendingAbilityDetails?.isAttack;

            let strokeColor = tile.revealed ? '#233140' : '#0f172a';
            let strokeWidth = 1.2;
            let fillColor = tile.revealed ? 'url(#grad-floor)' : 'url(#grad-fog)';

            if (isValidTarget) {
              strokeColor = isAttackAction ? '#ef4444' : '#38bdf8';
              strokeWidth = 2.5;
            }

            return (
              <g
                key={coordKey(tile)}
                onClick={() => onTileClick({ q: tile.q, r: tile.r })}
                onMouseEnter={() => setHoveredCoord({ q: tile.q, r: tile.r })}
                onMouseLeave={() => setHoveredCoord(null)}
                style={{ cursor: isValidTarget ? 'crosshair' : 'pointer' }}
              >
                {/* Main Hex Polygon */}
                <polygon
                  points={points}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                />

                {/* Inner Bevel Rim */}
                {tile.revealed && (
                  <polygon
                    points={hexPolygonPoints(x, y, HEX_SIZE - 2.5)}
                    fill="none"
                    stroke="#334155"
                    strokeWidth="0.8"
                    opacity="0.35"
                  />
                )}

                {/* Terrain Illustrations */}
                {renderTerrainArtwork(tile, x, y)}

                {/* Valid Target Pulse Highlight */}
                {isValidTarget && (
                  <polygon
                    points={hexPolygonPoints(x, y, HEX_SIZE - 3)}
                    fill={isAttackAction ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.2)'}
                    stroke={isAttackAction ? '#f87171' : '#7dd3fc'}
                    strokeWidth="2"
                    strokeDasharray="5 3"
                  >
                    <animate
                      attributeName="fill-opacity"
                      values="0.15;0.35;0.15"
                      dur="1.5s"
                      repeatCount="indefinite"
                    />
                  </polygon>
                )}

                {/* AoE Hover Preview Arc/Cluster */}
                {isAoeAffected && (
                  <polygon
                    points={hexPolygonPoints(x, y, HEX_SIZE - 2)}
                    fill="rgba(245, 158, 11, 0.45)"
                    stroke="#fbbf24"
                    strokeWidth="2.5"
                    style={{ animation: 'aoePulse 1.2s infinite ease-in-out' }}
                  />
                )}

                {/* Mouse Hover Outline */}
                {isHovered && !isValidTarget && (
                  <polygon
                    points={hexPolygonPoints(x, y, HEX_SIZE - 1)}
                    fill="rgba(255, 255, 255, 0.05)"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* 2. Unit Tokens Layer (Enemies then Heroes) */}
        <g className="hex-units-layer">
          {gameState.enemies.map(renderEnemyToken)}
          {gameState.heroes.map(renderHeroToken)}
        </g>
      </svg>
    </div>
  );
};
