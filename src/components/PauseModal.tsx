import React from 'react';

interface PauseModalProps {
  onResume: () => void;
  onOpenSettings: () => void;
  onRestart: () => void;
  onReturnLobby: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onOpenSettings,
  onRestart,
  onReturnLobby,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-lg p-6 text-center">
        <h2 className="font-display font-bold text-2xl text-zinc-50 tracking-wider mb-1">
          MATCH PAUSED
        </h2>
        <p className="text-xs text-zinc-400 mb-6">
          Adjust settings or return to the battleground
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-base tracking-wide cursor-pointer"
          >
            RESUME MATCH
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full py-2.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm font-medium cursor-pointer"
          >
            Settings &amp; Graphics
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-sm font-medium cursor-pointer"
          >
            Restart Match
          </button>
          <button
            type="button"
            onClick={onReturnLobby}
            className="w-full py-2.5 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-sm font-medium cursor-pointer"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};
