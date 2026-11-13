import React from 'react';
import type { HudSnapshot } from '../types/game';

interface MatchEndModalProps {
  victory: boolean;
  hud: HudSnapshot;
  onPlayAgain: () => void;
  onReturnLobby: () => void;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  victory,
  hud,
  onPlayAgain,
  onReturnLobby,
}) => {
  const accuracy =
    hud.shotsFired > 0 ? Math.round((hud.shotsHit / hud.shotsFired) * 100) : 0;
  const mins = Math.floor(hud.survivalTimeSec / 60);
  const secs = hud.survivalTimeSec % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-7">
        <div className="flex items-baseline justify-between gap-4 border-b border-zinc-800 pb-4 mb-5">
          <div>
            <div className={`text-xs font-semibold tracking-wider mb-1 ${victory ? 'text-amber-400' : 'text-red-400'}`}>
              {victory ? 'MATCH VICTORY' : 'ELIMINATED IN ACTION'}
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-zinc-50 tracking-wide">
              {victory ? 'WINNER WINNER CHICKEN DINNER' : 'BETTER LUCK NEXT TIME'}
            </h2>
          </div>
          <div className="text-right shrink-0">
            <span className="font-display font-bold text-3xl text-amber-400 tabular-nums">
              #{hud.placementRank}
            </span>
            <span className="text-sm text-zinc-400 ml-1 tabular-nums">
              / {hud.totalCount}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-zinc-900/70 border border-zinc-800 rounded p-3">
            <div className="text-xs text-zinc-400 mb-1">Eliminations</div>
            <div className="font-display font-bold text-2xl text-zinc-50 tabular-nums">{hud.kills}</div>
          </div>
          <div className="bg-zinc-900/70 border border-zinc-800 rounded p-3">
            <div className="text-xs text-zinc-400 mb-1">Damage Dealt</div>
            <div className="font-display font-bold text-2xl text-zinc-50 tabular-nums">{hud.damageDealt}</div>
          </div>
          <div className="bg-zinc-900/70 border border-zinc-800 rounded p-3">
            <div className="text-xs text-zinc-400 mb-1">Accuracy</div>
            <div className="font-display font-bold text-2xl text-zinc-50 tabular-nums">{accuracy}%</div>
          </div>
          <div className="bg-zinc-900/70 border border-zinc-800 rounded p-3">
            <div className="text-xs text-zinc-400 mb-1">Survival Time</div>
            <div className="font-display font-bold text-2xl text-zinc-50 tabular-nums">{timeStr}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 py-3 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-base tracking-wider cursor-pointer"
          >
            DEPLOY AGAIN
          </button>
          <button
            type="button"
            onClick={onReturnLobby}
            className="flex-1 py-3 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm font-medium cursor-pointer"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
