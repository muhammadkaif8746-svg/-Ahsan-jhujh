import React, { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import {
  DEFAULT_SETTINGS,
  type BotDifficulty,
  type GameSettings,
  type GraphicsPreset,
  type ShadowQuality,
} from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

type SettingsTab = 'graphics' | 'controls' | 'gameplay';

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onChange, onClose }) => {
  const [tab, setTab] = useState<SettingsTab>('graphics');

  const applyPreset = (preset: GraphicsPreset) => {
    const presetMap: Record<
      GraphicsPreset,
      Pick<GameSettings, 'resolutionScale' | 'shadowQuality' | 'drawDistance' | 'antialiasing'>
    > = {
      low: { resolutionScale: 0.75, shadowQuality: 'off', drawDistance: 'near', antialiasing: false },
      medium: { resolutionScale: 1.0, shadowQuality: 'medium', drawDistance: 'balanced', antialiasing: true },
      high: { resolutionScale: 1.0, shadowQuality: 'high', drawDistance: 'far', antialiasing: true },
      ultra: { resolutionScale: 1.25, shadowQuality: 'high', drawDistance: 'far', antialiasing: true },
    };
    onChange({ ...settings, graphicsPreset: preset, ...presetMap[preset] });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="font-display font-bold text-xl text-zinc-50 tracking-wide">
              Match &amp; Engine Settings
            </h2>
            <p className="text-xs text-zinc-400">
              All changes apply immediately to the live 3D renderer and controls
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-zinc-800 bg-zinc-900/40">
          {([
            ['graphics', 'Graphics & Resolution'],
            ['controls', 'Camera & Controls'],
            ['gameplay', 'Gameplay & Audio'],
          ] as Array<[SettingsTab, string]>).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {tab === 'graphics' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-zinc-100">Overall Quality Preset</div>
                  <div className="text-xs text-zinc-400">Balances shadow resolution, pixel scale, and view distance</div>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-800">
                  {(['low', 'medium', 'high', 'ultra'] as GraphicsPreset[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded capitalize transition-colors cursor-pointer ${
                        settings.graphicsPreset === p
                          ? 'bg-amber-500 text-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-zinc-100">Render Resolution Scale</div>
                  <div className="text-xs text-zinc-400">Supersamples terrain &amp; weapon sharpness</div>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-800">
                  {[0.75, 1.0, 1.25, 1.5].map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => onChange({ ...settings, resolutionScale: scale })}
                      className={`px-3 py-1.5 text-xs font-mono-tabular font-semibold rounded transition-colors cursor-pointer ${
                        settings.resolutionScale === scale
                          ? 'bg-amber-500 text-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {Math.round(scale * 100)}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-zinc-100">Dynamic Sun Shadows</div>
                  <div className="text-xs text-zinc-400">Real-time PCF soft shadow mapping</div>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-800">
                  {(['off', 'medium', 'high'] as ShadowQuality[]).map((sq) => (
                    <button
                      key={sq}
                      type="button"
                      onClick={() => onChange({ ...settings, shadowQuality: sq })}
                      className={`px-3 py-1.5 text-xs font-semibold rounded capitalize transition-colors cursor-pointer ${
                        settings.shadowQuality === sq
                          ? 'bg-amber-500 text-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-zinc-100">Draw Distance &amp; Horizon Fog</div>
                  <div className="text-xs text-zinc-400">Controls maximum visible ridge &amp; sniper sightlines</div>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-800">
                  {(['near', 'balanced', 'far'] as const).map((dd) => (
                    <button
                      key={dd}
                      type="button"
                      onClick={() => onChange({ ...settings, drawDistance: dd })}
                      className={`px-3 py-1.5 text-xs font-semibold rounded capitalize transition-colors cursor-pointer ${
                        settings.drawDistance === dd
                          ? 'bg-amber-500 text-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {dd}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'controls' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-zinc-100">Camera Perspective (V)</div>
                  <div className="text-xs text-zinc-400">Switch between Third-Person Over-Shoulder or First-Person</div>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-800">
                  {(['TPP', 'FPP'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onChange({ ...settings, perspective: mode })}
                      className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                        settings.perspective === mode
                          ? 'bg-amber-500 text-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-100">Field of View (FOV)</span>
                  <span className="font-mono-tabular text-amber-400">{settings.fov}°</span>
                </div>
                <input
                  type="range"
                  min={72}
                  max={105}
                  step={1}
                  value={settings.fov}
                  onChange={(e) => onChange({ ...settings, fov: Number(e.target.value) })}
                  className="w-full tactical-slider"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-100">Mouse Look Sensitivity</span>
                  <span className="font-mono-tabular text-amber-400">{settings.mouseSensitivity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.05}
                  value={settings.mouseSensitivity}
                  onChange={(e) => onChange({ ...settings, mouseSensitivity: Number(e.target.value) })}
                  className="w-full tactical-slider"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-100">ADS &amp; Scope Sensitivity</span>
                  <span className="font-mono-tabular text-amber-400">{settings.adsSensitivity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={1.5}
                  step={0.05}
                  value={settings.adsSensitivity}
                  onChange={(e) => onChange({ ...settings, adsSensitivity: Number(e.target.value) })}
                  className="w-full tactical-slider"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-zinc-100">Invert Y-Axis</div>
                  <div className="text-xs text-zinc-400">Flip vertical mouse aim direction</div>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...settings, invertY: !settings.invertY })}
                  className={`px-4 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                    settings.invertY
                      ? 'bg-amber-500 border-amber-500 text-zinc-950'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                  }`}
                >
                  {settings.invertY ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </>
          )}

          {tab === 'gameplay' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-zinc-100">AI Combatant Difficulty</div>
                  <div className="text-xs text-zinc-400">Adjusts bot firing accuracy and burst reaction speed</div>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-800">
                  {(['recruit', 'tactical', 'veteran'] as BotDifficulty[]).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => onChange({ ...settings, botDifficulty: diff })}
                      className={`px-3 py-1.5 text-xs font-semibold rounded capitalize transition-colors cursor-pointer ${
                        settings.botDifficulty === diff
                          ? 'bg-amber-500 text-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-zinc-100">Lobby Enemy Count</div>
                  <div className="text-xs text-zinc-400">Applied on next match deployment</div>
                </div>
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-800">
                  {([16, 24, 32] as const).map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => onChange({ ...settings, enemyCount: cnt })}
                      className={`px-3.5 py-1.5 text-xs font-mono-tabular font-semibold rounded transition-colors cursor-pointer ${
                        settings.enemyCount === cnt
                          ? 'bg-amber-500 text-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-100'
                      }`}
                    >
                      {cnt} Bots
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-zinc-100">Auto-Pickup Supplies</div>
                  <div className="text-xs text-zinc-400">Automatically collect nearby ammo, medkits, and armor upgrades</div>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...settings, autoLoot: !settings.autoLoot })}
                  className={`px-4 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                    settings.autoLoot
                      ? 'bg-amber-500 border-amber-500 text-zinc-950'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                  }`}
                >
                  {settings.autoLoot ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-zinc-100">Match Deployment Mode</div>
                  <div className="text-xs text-zinc-400">Start aboard the C-130 plane with parachute drop or hot-drop directly</div>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...settings, skipParachute: !settings.skipParachute })}
                  className={`px-4 py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                    !settings.skipParachute
                      ? 'bg-amber-500 border-amber-500 text-zinc-950'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                  }`}
                >
                  {settings.skipParachute ? 'Hot Ground Drop' : 'C-130 Parachute Drop'}
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-100">Master Audio Volume</span>
                  <span className="font-mono-tabular text-amber-400">
                    {settings.muted ? 'Muted' : `${Math.round(settings.masterVolume * 100)}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.masterVolume}
                  onChange={(e) => onChange({ ...settings, masterVolume: Number(e.target.value), muted: false })}
                  className="w-full tactical-slider"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/50">
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_SETTINGS })}
            className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display font-bold text-sm tracking-wide cursor-pointer"
          >
            APPLY &amp; CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
