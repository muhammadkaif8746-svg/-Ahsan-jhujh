import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { MAP_CONFIGS, type HudSnapshot, type MapId } from '../types/game';

interface TacticalMapModalProps {
  mapId: MapId;
  hud: HudSnapshot;
  onClose: () => void;
}

export const TacticalMapModal: React.FC<TacticalMapModalProps> = ({ mapId, hud, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const half = size / 2;
    const range = hud.worldRadius + 25;
    const scale = half / range;

    ctx.fillStyle = '#14171a';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = MAP_CONFIGS[mapId].groundBase;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(half, half, hud.worldRadius * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 1;
    const step = size / 6;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(size, i * step);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(161, 161, 170, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(half - hud.worldRadius * scale, half);
    ctx.lineTo(half + hud.worldRadius * scale, half);
    ctx.moveTo(half, half - hud.worldRadius * scale);
    ctx.lineTo(half, half + hud.worldRadius * scale);
    ctx.stroke();

    const toMap = (wx: number, wz: number) => ({
      x: half + wx * scale,
      y: half + wz * scale,
    });

    // Parked Vehicles (Cyan dots)
    ctx.fillStyle = '#38bdf8';
    for (const v of hud.vehicles) {
      if (v.occupied) continue;
      const vp = toMap(v.x, v.z);
      ctx.fillRect(vp.x - 3.5, vp.y - 3.5, 7, 7);
    }

    // Compounds
    ctx.font = '600 11px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    for (const c of hud.compounds) {
      const pt = toMap(c.x, c.z);
      ctx.fillStyle = '#e4e4e7';
      ctx.fillRect(pt.x - 5, pt.y - 5, 10, 10);
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 3;
      ctx.strokeText(c.name, pt.x, pt.y - 9);
      ctx.fillStyle = '#fafafa';
      ctx.fillText(c.name, pt.x, pt.y - 9);
    }

    // Red Zone
    if (hud.redZone.active) {
      const rz = toMap(hud.redZone.x, hud.redZone.z);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rz.x, rz.y, hud.redZone.radius * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Blue Zone
    const bz = toMap(hud.blueZoneX, hud.blueZoneZ);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(bz.x, bz.y, hud.blueZoneRadius * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Safe Zone
    const sz = toMap(hud.safeZoneX, hud.safeZoneZ);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(sz.x, sz.y, hud.safeZoneRadius * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Airdrop
    if (hud.airdropPos) {
      const ad = toMap(hud.airdropPos.x, hud.airdropPos.z);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(ad.x - 6, ad.y - 6, 12, 12);
      ctx.fillStyle = '#fca5a5';
      ctx.fillText('Airdrop', ad.x, ad.y + 18);
    }

    // C-130 Cargo Plane
    if (hud.planePos?.active) {
      const pp = toMap(hud.planePos.x, hud.planePos.z);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('C-130', pp.x, pp.y - 10);
    }

    // Player Chevron
    const pl = toMap(hud.playerX, hud.playerZ);
    ctx.save();
    ctx.translate(pl.x, pl.y);
    ctx.rotate((hud.headingDeg * Math.PI) / 180);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [hud, mapId]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 max-w-lg w-full">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display font-bold text-lg text-zinc-50">
              {MAP_CONFIGS[mapId].name} — Tactical Radar
            </h3>
            <p className="text-xs text-zinc-400">
              White: Safe Zone · Blue: Playzone · Cyan: Vehicles · Red: Airdrop / Artillery
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
            aria-label="Close tactical map"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={460}
          height={460}
          className="w-full h-auto rounded border border-zinc-800 block"
        />
      </div>
    </div>
  );
};
