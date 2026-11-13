import React, { useEffect, useRef } from 'react';
import { Volume2, VolumeX, Settings, Backpack } from 'lucide-react';
import { SCOPE_SPECS, WEAPON_SPECS, type HudSnapshot } from '../types/game';

interface GameHUDProps {
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenInventory: () => void;
  onRequestLock: () => void;
}

const COMPASS_LABELS: Array<{ deg: number; text: string }> = [
  { deg: 0, text: 'N' },
  { deg: 45, text: 'NE' },
  { deg: 90, text: 'E' },
  { deg: 135, text: 'SE' },
  { deg: 180, text: 'S' },
  { deg: 225, text: 'SW' },
  { deg: 270, text: 'W' },
  { deg: 315, text: 'NW' },
];

function shortestAngleDiff(a: number, b: number) {
  return ((a - b + 540) % 360) - 180;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  muted,
  onToggleMute,
  onOpenSettings,
  onOpenInventory,
  onRequestLock,
}) => {
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeSlot = hud.slots[hud.activeSlotIndex] ?? hud.slots[0];
  const spec = WEAPON_SPECS[activeSlot.weaponId];
  const isAdsScope = hud.isAds && hud.playerMode === 'combat';
  const scope = activeSlot.scope;

  useEffect(() => {
    const canvas = miniCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const half = size / 2;
    const viewRange = 240;
    const scale = half / viewRange;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#14171a';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    const gridStep = 80 * scale;
    const offsetX = ((-hud.playerX * scale) % gridStep + gridStep) % gridStep;
    const offsetY = ((-hud.playerZ * scale) % gridStep + gridStep) % gridStep;
    for (let x = offsetX; x < size; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = offsetY; y < size; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    const toMini = (wx: number, wz: number) => ({
      x: half + (wx - hud.playerX) * scale,
      y: half + (wz - hud.playerZ) * scale,
    });

    // Compounds
    ctx.fillStyle = 'rgba(228, 228, 231, 0.28)';
    for (const c of hud.compounds) {
      const pt = toMini(c.x, c.z);
      ctx.fillRect(pt.x - 5, pt.y - 5, 10, 10);
    }

    // Parked Vehicles
    ctx.fillStyle = '#38bdf8';
    for (const v of hud.vehicles) {
      if (v.occupied) continue;
      const vp = toMini(v.x, v.z);
      ctx.fillRect(vp.x - 2.5, vp.y - 2.5, 5, 5);
    }

    // Red Zone
    if (hud.redZone.active) {
      const rz = toMini(hud.redZone.x, hud.redZone.z);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(rz.x, rz.y, hud.redZone.radius * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Blue Zone
    const bz = toMini(hud.blueZoneX, hud.blueZoneZ);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bz.x, bz.y, hud.blueZoneRadius * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Safe Zone
    const sz = toMini(hud.safeZoneX, hud.safeZoneZ);
    ctx.strokeStyle = '#fafafa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(sz.x, sz.y, hud.safeZoneRadius * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Airdrop
    if (hud.airdropPos) {
      const ad = toMini(hud.airdropPos.x, hud.airdropPos.z);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(ad.x - 4, ad.y - 4, 8, 8);
      ctx.strokeStyle = '#fef2f2';
      ctx.lineWidth = 1;
      ctx.strokeRect(ad.x - 4, ad.y - 4, 8, 8);
    }

    // Gunfire Pings
    for (const s of hud.recentShots) {
      const sp = toMini(s.x, s.z);
      const alpha = Math.max(0, 1 - s.age / 3.5);
      ctx.fillStyle = `rgba(245, 158, 11, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player Chevron
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate((hud.headingDeg * Math.PI) / 180);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [hud]);

  const gap = Math.max(4, Math.min(34, hud.crosshairSpreadPx));
  const hitColor =
    hud.hitMarkerKind === 'kill'
      ? '#ef4444'
      : hud.hitMarkerKind === 'head'
      ? '#f59e0b'
      : '#ffffff';

  const isMagnified = isAdsScope && (scope === '4x' || scope === '6x' || scope === '8x');
  const isRedDotOr2x = isAdsScope && (scope === 'reddot' || scope === '2x');

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* Damage Vignette */}
      {hud.damageFlashAlpha > 0.02 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, transparent 48%, rgba(220, 38, 38, ${(
              hud.damageFlashAlpha * 0.55
            ).toFixed(2)}) 100%)`,
          }}
        />
      )}

      {/* Blue Zone Warning */}
      {hud.outsideZone && (
        <div
          className="absolute inset-0 pointer-events-none border-4 border-blue-500/50"
          style={{ boxShadow: 'inset 0 0 48px rgba(37, 99, 235, 0.35)' }}
        />
      )}

      {/* Magnified Scopes (4x ACOG Chevron / 6x / 8x CQBSS Precision Mildot) */}
      {isMagnified && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background:
              'radial-gradient(circle at center, transparent 36%, rgba(6,8,10,0.88) 49%, rgba(2,3,5,0.97) 68%)',
          }}
        >
          <div className="relative w-[min(78vh,78vw)] h-[min(78vh,78vw)] rounded-full border-[5px] border-zinc-900 shadow-[0_0_0_2px_rgba(56,189,248,0.18)] overflow-hidden bg-transparent">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {/* Outer optical bezel + coated glass rim */}
              <circle cx="100" cy="100" r="97.5" fill="none" stroke="#09090b" strokeWidth="6" />
              <circle cx="100" cy="100" r="94.5" fill="none" stroke="rgba(56,189,248,0.22)" strokeWidth="0.7" />
              {/* Subtle scope turret tick marks around perimeter */}
              <line x1="100" y1="3" x2="100" y2="9" stroke="rgba(228,228,231,0.4)" strokeWidth="0.9" />
              <line x1="100" y1="191" x2="100" y2="197" stroke="rgba(228,228,231,0.4)" strokeWidth="0.9" />
              <line x1="3" y1="100" x2="9" y2="100" stroke="rgba(228,228,231,0.4)" strokeWidth="0.9" />
              <line x1="191" y1="100" x2="197" y2="100" stroke="rgba(228,228,231,0.4)" strokeWidth="0.9" />

              {scope === '4x' ? (
                <>
                  {/* 4x ACOG Illuminated Chevron & BDC Drop Ladder */}
                  <line x1="18" y1="100" x2="82" y2="100" stroke="#09090b" strokeWidth="1.6" />
                  <line x1="118" y1="100" x2="182" y2="100" stroke="#09090b" strokeWidth="1.6" />
                  <line x1="100" y1="104" x2="100" y2="182" stroke="#09090b" strokeWidth="1.2" />
                  {/* Windage stadia ticks */}
                  {[42, 56, 70, 130, 144, 158].map((wx) => (
                    <line key={wx} x1={wx} y1="97.5" x2={wx} y2="102.5" stroke="#09090b" strokeWidth="0.8" />
                  ))}
                  {/* BDC range drops: 200m, 300m, 400m, 500m */}
                  <line x1="94" y1="115" x2="106" y2="115" stroke="#09090b" strokeWidth="1.0" />
                  <text x="108" y="116.5" fill="rgba(24,24,27,0.8)" fontSize="4.2" fontFamily="monospace">2</text>
                  <line x1="95.5" y1="127" x2="104.5" y2="127" stroke="#09090b" strokeWidth="1.0" />
                  <text x="107" y="128.5" fill="rgba(24,24,27,0.8)" fontSize="4.2" fontFamily="monospace">3</text>
                  <line x1="96.5" y1="139" x2="103.5" y2="139" stroke="#09090b" strokeWidth="1.0" />
                  <text x="106" y="140.5" fill="rgba(24,24,27,0.8)" fontSize="4.2" fontFamily="monospace">4</text>
                  <line x1="97.5" y1="151" x2="102.5" y2="151" stroke="#09090b" strokeWidth="1.0" />
                  {/* Glowing fiber-optic crimson chevron */}
                  <path d="M94.5 104.5 L100 99 L105.5 104.5" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="100" cy="100" r="0.8" fill="#fca5a5" />
                </>
              ) : (
                <>
                  {/* 6x / 8x CQBSS Precision Mil-Dot Reticle */}
                  <line x1="6" y1="100" x2="194" y2="100" stroke="rgba(12,12,15,0.88)" strokeWidth="0.65" />
                  <line x1="100" y1="6" x2="100" y2="194" stroke="rgba(12,12,15,0.88)" strokeWidth="0.65" />
                  {/* Heavy outer posts */}
                  <line x1="6" y1="100" x2="46" y2="100" stroke="#09090b" strokeWidth="2.6" />
                  <line x1="154" y1="100" x2="194" y2="100" stroke="#09090b" strokeWidth="2.6" />
                  <line x1="100" y1="154" x2="100" y2="194" stroke="#09090b" strokeWidth="2.6" />
                  {/* Precision Mil-Dots */}
                  {[56, 67, 78, 89, 111, 122, 133, 144].map((pos) => (
                    <React.Fragment key={pos}>
                      <circle cx={pos} cy="100" r="1.05" fill="#18181b" />
                      <circle cx="100" cy={pos} r="1.05" fill="#18181b" />
                    </React.Fragment>
                  ))}
                  {/* Windage Christmas-tree holdover ticks */}
                  {[111, 122, 133].map((wy, idx) => (
                    <React.Fragment key={wy}>
                      <line x1={100 - (idx + 1) * 8} y1={wy - 1.5} x2={100 - (idx + 1) * 8} y2={wy + 1.5} stroke="rgba(15,15,18,0.75)" strokeWidth="0.65" />
                      <line x1={100 + (idx + 1) * 8} y1={wy - 1.5} x2={100 + (idx + 1) * 8} y2={wy + 1.5} stroke="rgba(15,15,18,0.75)" strokeWidth="0.65" />
                    </React.Fragment>
                  ))}
                  {/* Illuminated center reticle ring + precision red dot */}
                  <circle cx="100" cy="100" r="8" fill="none" stroke="rgba(239,68,68,0.55)" strokeWidth="0.6" strokeDasharray="3 2" />
                  <circle cx="100" cy="100" r="1.25" fill="#ef4444" />
                </>
              )}
            </svg>

            {/* Digital Rangefinder & Optic Telemetry inside bottom bezel */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-zinc-950/85 border border-zinc-800 px-3 py-1 rounded text-[11px] font-mono-tabular">
              <span className="text-amber-400 font-bold">{scope.toUpperCase()}</span>
              <span className="text-zinc-600">|</span>
              <span className="text-emerald-400 font-semibold">RNG {hud.rangefinderM}m</span>
              {hud.holdingBreath && (
                <>
                  <span className="text-zinc-600">|</span>
                  <span className="text-sky-400 font-semibold">STEADY</span>
                </>
              )}
            </div>
          </div>

          {/* Hold Breath Stamina Bar below scope */}
          <div className="absolute bottom-[8vh] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <div className="w-40 h-1.5 bg-zinc-900 border border-zinc-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  hud.holdingBreath ? 'bg-sky-400' : hud.breathPercent < 25 ? 'bg-red-400' : 'bg-zinc-300'
                }`}
                style={{ width: `${hud.breathPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-mono-tabular text-zinc-300 bg-zinc-950/80 px-2 py-0.5 rounded">
              [Shift] {hud.holdingBreath ? 'HOLDING BREATH' : 'Hold Breath'} · [T] Switch Scope
            </span>
          </div>
        </div>
      )}

      {/* Red Dot / 2x Holographic Sight Reticle */}
      {isRedDotOr2x && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="relative w-36 h-36 rounded-full border-2 border-zinc-900/90 shadow-[0_0_0_2px_rgba(255,255,255,0.08)] flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="48" fill="rgba(12, 22, 32, 0.08)" stroke="#09090b" strokeWidth="3" />
              {scope === '2x' ? (
                <>
                  <circle cx="50" cy="50" r="16" fill="none" stroke="rgba(52,211,153,0.75)" strokeWidth="1.2" />
                  <line x1="26" y1="50" x2="38" y2="50" stroke="rgba(52,211,153,0.75)" strokeWidth="1.1" />
                  <line x1="62" y1="50" x2="74" y2="50" stroke="rgba(52,211,153,0.75)" strokeWidth="1.1" />
                  <line x1="50" y1="62" x2="50" y2="74" stroke="rgba(52,211,153,0.75)" strokeWidth="1.1" />
                  <circle cx="50" cy="50" r="1.7" fill="#ef4444" />
                </>
              ) : (
                <>
                  <path d="M36 50 H43 M57 50 H64 M50 36 V43 M50 57 V64" stroke="rgba(239,68,68,0.65)" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="50" cy="50" r="1.9" fill="#ef4444" />
                  <circle cx="50" cy="50" r="0.8" fill="#fecaca" />
                </>
              )}
            </svg>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800 px-2.5 py-0.5 rounded text-[10px] font-mono-tabular text-emerald-400">
            {scope.toUpperCase()} · RNG {hud.rangefinderM}m
          </div>
        </div>
      )}

      {/* Dynamic Center Crosshair (Combat only when not in scope overlay) */}
      {hud.playerMode === 'combat' && !isMagnified && !isRedDotOr2x && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-white/90" />
            <div className="absolute w-0.5 h-2.5 bg-white/90" style={{ transform: `translateY(-${gap}px)` }} />
            <div className="absolute w-0.5 h-2.5 bg-white/90" style={{ transform: `translateY(${gap}px)` }} />
            <div className="absolute h-0.5 w-2.5 bg-white/90" style={{ transform: `translateX(-${gap}px)` }} />
            <div className="absolute h-0.5 w-2.5 bg-white/90" style={{ transform: `translateX(${gap}px)` }} />

            {hud.hitMarkerKind !== 'none' && (
              <svg viewBox="0 0 36 36" className="w-9 h-9 absolute">
                <g stroke={hitColor} strokeWidth="2.2" strokeLinecap="round">
                  <line x1="7" y1="7" x2="13" y2="13" />
                  <line x1="29" y1="7" x2="23" y2="13" />
                  <line x1="7" y1="29" x2="13" y2="23" />
                  <line x1="29" y1="29" x2="23" y2="23" />
                </g>
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Hitmarker while scoped */}
      {(isMagnified || isRedDotOr2x) && hud.hitMarkerKind !== 'none' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 36 36" className="w-9 h-9">
            <g stroke={hitColor} strokeWidth="2.2" strokeLinecap="round">
              <line x1="7" y1="7" x2="13" y2="13" />
              <line x1="29" y1="7" x2="23" y2="13" />
              <line x1="7" y1="29" x2="13" y2="23" />
              <line x1="29" y1="29" x2="23" y2="23" />
            </g>
          </svg>
        </div>
      )}

      {/* Top Row: Minimap, Compass, Alive/Kills */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="relative w-[152px] h-[152px] rounded border border-zinc-700/90 bg-zinc-950/90 overflow-hidden">
            <canvas ref={miniCanvasRef} width={152} height={152} className="block w-full h-full" />
            <div className="absolute bottom-1 right-1.5 text-[10px] font-mono-tabular text-zinc-300 bg-zinc-950/80 px-1 rounded">
              M · MAP
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono-tabular text-zinc-200 bg-zinc-950/85 border border-zinc-800 px-2.5 py-1 rounded">
            <span className={hud.zoneShrinking ? 'text-blue-400 font-semibold' : 'text-zinc-300'}>
              {hud.zoneShrinking
                ? `ZONE CLOSING · ${hud.zoneTimerSec}s`
                : `PHASE ${hud.zonePhase} · ${hud.zoneTimerSec}s`}
            </span>
          </div>
          {hud.redZone.active && (
            <div className="text-xs font-semibold text-red-400 bg-zinc-950/90 border border-red-500/60 px-2.5 py-1 rounded">
              RED ZONE ARTILLERY ACTIVE
            </div>
          )}
        </div>

        {/* Top-Center Compass */}
        <div className="hidden sm:flex flex-col items-center gap-1">
          <div className="relative w-80 h-8 bg-zinc-950/85 border border-zinc-800 rounded overflow-hidden flex items-center justify-center">
            <div className="w-0.5 h-2.5 bg-amber-400 absolute top-0 left-1/2 -translate-x-1/2 z-10" />
            {COMPASS_LABELS.map((item) => {
              const diff = shortestAngleDiff(item.deg, hud.headingDeg);
              if (Math.abs(diff) > 75) return null;
              return (
                <span
                  key={item.text}
                  className={`absolute font-display text-xs font-bold tracking-wider ${
                    item.text === 'N' ? 'text-amber-400' : 'text-zinc-200'
                  }`}
                  style={{ transform: `translateX(${diff * 2.1}px)` }}
                >
                  {item.text}
                </span>
              );
            })}
            {(() => {
              const diff = shortestAngleDiff(hud.safeZoneBearingDeg, hud.headingDeg);
              if (Math.abs(diff) > 75) return null;
              return (
                <span
                  className="absolute bottom-0.5 text-[10px] text-sky-400 font-bold"
                  style={{ transform: `translateX(${diff * 2.1}px)` }}
                >
                  ▲
                </span>
              );
            })()}
          </div>
          <span className="font-mono-tabular text-[11px] text-zinc-300 bg-zinc-950/75 px-2 py-0.5 rounded">
            {Math.round(hud.headingDeg)}° · {hud.perspective} · Alt: Free-Look
          </span>
        </div>

        {/* Top-Right Telemetry & Quick Buttons */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-950/90 border border-zinc-800 rounded overflow-hidden">
              <div className="px-3 py-1.5 flex items-baseline gap-1.5 border-r border-zinc-800">
                <span className="font-display font-bold text-xl text-zinc-50 tabular-nums">
                  {hud.aliveCount}
                </span>
                <span className="text-[11px] text-zinc-400 font-medium">ALIVE</span>
              </div>
              <div className="px-3 py-1.5 flex items-baseline gap-1.5 border-r border-zinc-800">
                <span className="font-display font-bold text-xl text-amber-400 tabular-nums">
                  {hud.kills}
                </span>
                <span className="text-[11px] text-zinc-400 font-medium">KILLS</span>
              </div>
              <div className="px-2.5 py-1.5 text-xs font-mono-tabular text-zinc-400">
                {hud.fps} FPS
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenInventory}
              className="pointer-events-auto w-9 h-9 flex items-center justify-center rounded bg-zinc-950/90 border border-zinc-800 text-zinc-300 hover:border-amber-500 hover:text-amber-400 cursor-pointer"
              aria-label="Open backpack inventory"
            >
              <Backpack className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              className="pointer-events-auto w-9 h-9 flex items-center justify-center rounded bg-zinc-950/90 border border-zinc-800 text-zinc-300 hover:border-amber-500 hover:text-amber-400 cursor-pointer"
              aria-label="Toggle sound"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="pointer-events-auto w-9 h-9 flex items-center justify-center rounded bg-zinc-950/90 border border-zinc-800 text-zinc-300 hover:border-amber-500 hover:text-amber-400 cursor-pointer"
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col items-end gap-1 max-w-xs">
            {hud.killFeed.slice(0, 4).map((kf) => (
              <div
                key={kf.id}
                className={`px-2.5 py-1 rounded text-xs font-medium bg-zinc-950/85 border ${
                  kf.isPlayerInvolved
                    ? 'border-amber-500/60 text-zinc-100'
                    : 'border-zinc-800 text-zinc-300'
                }`}
              >
                <span className={kf.killer === 'YOU' ? 'text-amber-400 font-semibold' : ''}>
                  {kf.killer}
                </span>
                <span className="text-zinc-500 mx-1.5">
                  [{kf.weapon}
                  {kf.headshot ? ' HS' : ''}]
                </span>
                <span className={kf.victim === 'YOU' ? 'text-red-400 font-semibold' : ''}>
                  {kf.victim}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pointer Lock Helper */}
      {!hud.pointerLocked && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            type="button"
            onClick={onRequestLock}
            className="px-4 py-1.5 rounded bg-zinc-950/90 border border-amber-500/70 text-amber-300 text-xs font-medium hover:bg-zinc-900 cursor-pointer"
          >
            Click arena to lock mouse · Drag or Arrow Keys also aim · [T] Scope · [Tab] Bag
          </button>
        </div>
      )}

      {/* Plane / Skydive / Parachute Prompts */}
      {(hud.playerMode === 'plane' || hud.playerMode === 'skydive' || hud.playerMode === 'parachute') && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-12 flex flex-col items-center gap-2">
          <div className="bg-zinc-950/90 border border-amber-500/70 rounded px-5 py-3 flex items-center gap-4">
            <span className="px-2.5 py-1 rounded bg-amber-500 text-zinc-950 font-display font-bold text-sm">
              {hud.playerMode === 'parachute' ? 'WASD' : 'F'}
            </span>
            <div>
              <div className="font-display font-bold text-base text-zinc-50 tracking-wide">
                {hud.playerMode === 'plane'
                  ? 'PRESS F TO JUMP FROM C-130'
                  : hud.playerMode === 'skydive'
                  ? 'SKYDIVING · PRESS F TO DEPLOY PARACHUTE'
                  : 'PARACHUTING · STEER TOWARD COMPOUND'}
              </div>
              <div className="text-xs font-mono-tabular text-zinc-300">
                Altitude: {hud.altitudeM}m · Fall Speed: {hud.fallSpeedKmh} km/h
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PUBG Elimination Banner */}
      {hud.eliminationBanner && (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-amber-500 rounded px-6 py-2.5 text-center shadow-xl">
          <div className="font-display font-bold text-lg text-amber-400 tracking-wider">
            YOU KILLED {hud.eliminationBanner.victim}
          </div>
          <div className="text-xs font-mono-tabular text-zinc-200">
            {hud.eliminationBanner.weapon}
            {hud.eliminationBanner.headshot ? ' · HEADSHOT' : ''} · {hud.eliminationBanner.distanceM}m ·{' '}
            {hud.eliminationBanner.totalKills} {hud.eliminationBanner.totalKills === 1 ? 'KILL' : 'KILLS'}
          </div>
        </div>
      )}

      {/* Vehicle Driving Telemetry */}
      {hud.playerMode === 'driving' && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-zinc-700 rounded px-5 py-2.5 flex items-center gap-5">
          <div>
            <div className="text-[11px] text-zinc-400">{hud.vehicleName}</div>
            <div className="font-display font-bold text-2xl text-amber-400 tabular-nums">
              {hud.vehicleSpeedKmh} <span className="text-xs text-zinc-400">km/h</span>
            </div>
          </div>
          <div className="w-28">
            <div className="text-[11px] text-zinc-400 mb-1">Vehicle HP</div>
            <div className="w-full h-2 bg-zinc-800 rounded overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: `${hud.vehicleHealth}%` }} />
            </div>
          </div>
          <div className="text-xs text-zinc-300">
            <span className="text-amber-400 font-semibold">[F]</span> Exit ·{' '}
            <span className="text-amber-400 font-semibold">[Shift]</span> Boost
          </div>
        </div>
      )}

      {/* Context Loot / Vehicle Prompt */}
      {hud.lootPrompt && hud.playerMode === 'combat' && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-amber-500/70 rounded px-4 py-2 flex items-center gap-3">
          <span className="w-6 h-6 rounded bg-amber-500 text-zinc-950 font-display font-bold text-sm flex items-center justify-center">
            F
          </span>
          <div>
            <div className="text-sm font-semibold text-zinc-100 leading-tight">
              {hud.lootPrompt.label}
            </div>
            <div className="text-xs text-zinc-400">{hud.lootPrompt.sublabel}</div>
          </div>
        </div>
      )}

      {/* Reload / Healing Channel Progress */}
      {(hud.isReloading || hud.isHealing) && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-52 bg-zinc-950/90 border border-zinc-700 rounded p-1.5">
          <div className="text-[11px] font-mono-tabular text-amber-400 text-center mb-1">
            {hud.isHealing ? hud.healLabel.toUpperCase() : 'RELOADING...'}
          </div>
          <div className="w-full h-1.5 bg-zinc-800 rounded overflow-hidden">
            <div
              className={`h-full ${hud.isHealing ? 'bg-emerald-400' : 'bg-amber-500'}`}
              style={{
                width: `${Math.round((hud.isHealing ? hud.healProgress : hud.reloadProgress) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom-Center Compact Vitals & Arsenal Deck */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-2.5 w-max max-w-[96vw]">
        {/* Gear & Quick Meds */}
        <div className="bg-zinc-950/90 border border-zinc-800 rounded px-3 py-2 hidden md:flex items-center gap-3">
          <div className="flex flex-col text-xs font-mono-tabular">
            <span className="text-zinc-400">VEST</span>
            <span className={hud.armorLevel >= 3 ? 'text-amber-400 font-bold' : 'text-zinc-100 font-semibold'}>
              Lv.{hud.armorLevel}
            </span>
          </div>
          <div className="flex flex-col text-xs font-mono-tabular">
            <span className="text-zinc-400">HELM</span>
            <span className={hud.helmetLevel >= 3 ? 'text-amber-400 font-bold' : 'text-zinc-100 font-semibold'}>
              Lv.{hud.helmetLevel}
            </span>
          </div>
          <div className="flex flex-col text-xs font-mono-tabular">
            <span className="text-zinc-400">BAG</span>
            <span className={hud.backpackLevel >= 3 ? 'text-amber-400 font-bold' : 'text-zinc-100 font-semibold'}>
              Lv.{hud.backpackLevel}
            </span>
          </div>
          <div className="h-7 w-px bg-zinc-800" />
          <div className="flex items-center gap-2 text-xs font-mono-tabular">
            <div className="flex flex-col items-center">
              <span className="text-emerald-400 font-bold">{hud.inventory.medkits}</span>
              <span className="text-[10px] text-zinc-400">[7] MED</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-emerald-300 font-bold">{hud.inventory.bandages}</span>
              <span className="text-[10px] text-zinc-400">[8] BAND</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sky-400 font-bold">
                {hud.inventory.energyDrinks + hud.inventory.painkillers}
              </span>
              <span className="text-[10px] text-zinc-400">[9] BOOST</span>
            </div>
          </div>
        </div>

        {/* Health & Stance Bar */}
        <div className="bg-zinc-950/90 border border-zinc-800 rounded px-4 py-2 w-56 sm:w-64">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-zinc-300 font-medium uppercase">
              {hud.stance}
              {hud.leanDir === -1 ? ' · LEAN L' : hud.leanDir === 1 ? ' · LEAN R' : ''}
            </span>
            <span
              className={`font-mono-tabular font-bold text-sm ${
                hud.health <= 25 ? 'text-red-400' : 'text-zinc-100'
              }`}
            >
              {hud.health} HP
            </span>
          </div>
          <div className="w-full h-3 bg-zinc-800 rounded-sm overflow-hidden mb-1">
            <div
              className={`h-full transition-all duration-100 ${
                hud.health <= 25 ? 'bg-red-500' : hud.health <= 55 ? 'bg-amber-500' : 'bg-zinc-100'
              }`}
              style={{ width: `${Math.max(0, Math.min(100, hud.health))}%` }}
            />
          </div>
          <div className="w-full h-1 bg-zinc-800 rounded-sm overflow-hidden">
            <div
              className="h-full bg-sky-400 transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, hud.boost))}%` }}
            />
          </div>
        </div>

        {/* Active Weapon, Scope, Fire Mode & Grenades */}
        <div className="bg-zinc-950/90 border border-zinc-800 rounded px-3.5 py-2 flex items-center gap-3.5">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base text-amber-400 tracking-wide">
                {spec.name}
              </span>
              <span className="text-[11px] font-mono-tabular px-1.5 rounded bg-zinc-800 text-zinc-200">
                {activeSlot.fireMode.toUpperCase()} [B]
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400">
              <span className="text-purple-300 font-medium">
                {SCOPE_SPECS[activeSlot.scope].label} [T]
              </span>
              {activeSlot.muzzle !== 'none' && (
                <>
                  <span>·</span>
                  <span className="text-sky-300 capitalize">{activeSlot.muzzle}</span>
                </>
              )}
              {activeSlot.mag === 'extended' && (
                <>
                  <span>·</span>
                  <span className="text-pink-300">Ext.Mag</span>
                </>
              )}
            </div>
          </div>

          <div className="text-right font-mono-tabular">
            <span className={`text-2xl font-bold ${activeSlot.magAmmo <= 5 ? 'text-red-400' : 'text-zinc-50'}`}>
              {activeSlot.magAmmo}
            </span>
            <span className="text-sm text-zinc-400 ml-1">/ {activeSlot.reserveAmmo}</span>
          </div>

          <div className="h-7 w-px bg-zinc-800 hidden sm:block" />

          <div className="hidden sm:flex flex-col text-[11px] font-mono-tabular">
            <span className={hud.selectedThrowable === 'frag' ? 'text-amber-400 font-bold' : 'text-zinc-400'}>
              [4] FRAG: {hud.inventory.fragGrenades}
            </span>
            <span className={hud.selectedThrowable === 'smoke' ? 'text-sky-400 font-bold' : 'text-zinc-400'}>
              [5] SMOKE: {hud.inventory.smokeGrenades}
            </span>
            <span className="text-zinc-500">[G] Throw · [Tab] Bag</span>
          </div>
        </div>
      </div>
    </div>
  );
};
