import React, { useEffect } from 'react';
import { Volume2, VolumeX, Settings, Crosshair, Plane } from 'lucide-react';
import {
  MAP_CONFIGS,
  type GameSettings,
  type MapId,
} from '../types/game';

interface TitleLobbyProps {
  selectedMap: MapId;
  settings: GameSettings;
  onSelectMap: (mapId: MapId) => void;
  onTogglePerspective: () => void;
  onToggleDropMode: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onStartMatch: () => void;
}

const MAP_ORDER: MapId[] = ['erangel_valley', 'miramar_mesa', 'vikendi_ridge'];

export const TitleLobby: React.FC<TitleLobbyProps> = ({
  selectedMap,
  settings,
  onSelectMap,
  onTogglePerspective,
  onToggleDropMode,
  onToggleMute,
  onOpenSettings,
  onStartMatch,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        if ((e.target as HTMLElement)?.tagName === 'BUTTON') return;
        e.preventDefault();
        onStartMatch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStartMatch]);

  const currentMap = MAP_CONFIGS[selectedMap];

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-10 pointer-events-none bg-gradient-to-r from-zinc-950/75 via-transparent to-zinc-950/55">
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-6">
        <div className="pointer-events-auto max-w-xl">
          <svg
            viewBox="0 0 420 74"
            className="w-[300px] md:w-[400px] h-auto mb-2"
            aria-label="DROPZONE 84"
          >
            <g fill="none" fillRule="evenodd">
              <path
                d="M2 14 L18 2 L34 14 L34 38 L18 50 L2 38 Z"
                stroke="#f59e0b"
                strokeWidth="2.5"
                fill="rgba(245,158,11,0.12)"
              />
              <circle cx="18" cy="26" r="5" fill="#f59e0b" />
              <path d="M18 8 V16 M18 36 V44 M6 26 H12 M24 26 H30" stroke="#f59e0b" strokeWidth="2" />
              <text
                x="48"
                y="38"
                fill="#fafafa"
                fontFamily="Chakra Petch, sans-serif"
                fontWeight="700"
                fontSize="36"
                letterSpacing="3"
              >
                DROPZONE
              </text>
              <text
                x="272"
                y="38"
                fill="#f59e0b"
                fontFamily="Chakra Petch, sans-serif"
                fontWeight="700"
                fontSize="36"
                letterSpacing="2"
              >
                84
              </text>
              <rect x="48" y="48" width="268" height="2" fill="rgba(245,158,11,0.5)" />
              <text
                x="48"
                y="65"
                fill="#a1a1aa"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="500"
                fontSize="12"
                letterSpacing="1.6"
              >
                BATTLEGROUNDS · C-130 DROP · SCOPES · VEHICLES · GRENADES
              </text>
            </g>
          </svg>
        </div>

        <div className="pointer-events-auto flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={settings.muted ? 'Unmute audio' : 'Mute audio'}
            className="h-10 px-3 flex items-center gap-2 rounded bg-zinc-950/85 border border-zinc-700/80 text-zinc-200 hover:border-amber-500 hover:text-amber-400 transition-colors text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{settings.muted ? 'Muted' : 'Audio On'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="h-10 px-4 flex items-center gap-2 rounded bg-zinc-950/85 border border-zinc-700/80 text-zinc-100 hover:border-amber-500 hover:text-amber-400 transition-colors text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Bottom Launch & Map Dock */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="pointer-events-auto flex flex-col gap-3 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-zinc-300 font-medium">
            <span>Battleground Map</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-400">{currentMap.name}</span>
            <span aria-hidden="true">·</span>
            <span className="text-zinc-400">{currentMap.climate}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {MAP_ORDER.map((mId) => {
              const cfg = MAP_CONFIGS[mId];
              const active = selectedMap === mId;
              return (
                <button
                  key={mId}
                  type="button"
                  onClick={() => onSelectMap(mId)}
                  className={`text-left p-3.5 rounded border transition-colors cursor-pointer ${
                    active
                      ? 'bg-zinc-900/95 border-amber-500 text-zinc-50'
                      : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-display font-bold text-base tracking-wide whitespace-nowrap truncate">
                      {cfg.name}
                    </span>
                    <span
                      className="w-3 h-3 rounded-sm shrink-0 border border-white/20"
                      style={{ backgroundColor: cfg.groundBase }}
                    />
                  </div>
                  <p className="text-xs text-zinc-400 leading-snug">{cfg.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pointer-events-auto flex flex-col sm:items-end gap-3 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onToggleDropMode}
              className="h-11 px-4 rounded bg-zinc-950/85 border border-zinc-700 text-zinc-200 hover:border-amber-500 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plane className="w-4 h-4 text-amber-400" />
              <span>{settings.skipParachute ? 'Hot Drop' : 'C-130 Drop'}</span>
            </button>

            <button
              type="button"
              onClick={onTogglePerspective}
              className="h-11 px-4 rounded bg-zinc-950/85 border border-zinc-700 text-zinc-200 hover:border-amber-500 transition-colors text-sm font-medium flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Crosshair className="w-4 h-4 text-sky-400" />
              <span>View: {settings.perspective}</span>
            </button>

            <button
              type="button"
              onClick={onStartMatch}
              className="h-12 px-8 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-lg tracking-wider transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              START MATCH
            </button>
          </div>

          <p className="text-xs text-zinc-400 tracking-wide">
            WASD Move · T Cycle Scope · Shift Sprint / Hold Breath · Q/E Lean · C Crouch · Z Prone · G Grenade · F Jump / Drive / Loot · Tab Bag · ArrowKeys Look
          </p>
        </div>
      </div>
    </div>
  );
};
