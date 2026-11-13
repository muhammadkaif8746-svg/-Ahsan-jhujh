import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { InventoryModal } from './components/InventoryModal';
import { MatchEndModal } from './components/MatchEndModal';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { TacticalMapModal } from './components/TacticalMapModal';
import { TitleLobby } from './components/TitleLobby';
import { GameEngine } from './engine/GameEngine';
import {
  DEFAULT_SETTINGS,
  type GamePhase,
  type GameSettings,
  type HudSnapshot,
  type MapId,
} from './types/game';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [selectedMap, setSelectedMap] = useState<MapId>('erangel_valley');
  const [settings, setSettings] = useState<GameSettings>(() => ({ ...DEFAULT_SETTINGS }));
  const [phase, setPhase] = useState<GamePhase>('title');
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [webglLost, setWebglLost] = useState(false);

  const phaseRef = useRef<GamePhase>(phase);
  phaseRef.current = phase;
  const settingsOpenRef = useRef(settingsOpen);
  settingsOpenRef.current = settingsOpen;
  const mapOpenRef = useRef(mapModalOpen);
  mapOpenRef.current = mapModalOpen;
  const invOpenRef = useRef(inventoryOpen);
  invOpenRef.current = inventoryOpen;

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new GameEngine({
      container: mount,
      initialMap: selectedMap,
      initialSettings: settings,
      onHudUpdate: (snapshot) => setHud(snapshot),
      onPhaseChange: (nextPhase) => {
        setPhase(nextPhase);
        if (nextPhase !== 'playing') {
          setMapModalOpen(false);
          setInventoryOpen(false);
        }
      },
      onMapModalToggle: () => {
        setMapModalOpen((prev) => !prev);
      },
      onInventoryToggle: () => {
        setInventoryOpen((prev) => {
          const next = !prev;
          engine.setInventoryOpen(next);
          return next;
        });
      },
    });

    engineRef.current = engine;

    const canvas = mount.querySelector('canvas');
    const onLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const onRestored = () => {
      setWebglLost(false);
    };
    canvas?.addEventListener('webglcontextlost', onLost);
    canvas?.addEventListener('webglcontextrestored', onRestored);

    return () => {
      canvas?.removeEventListener('webglcontextlost', onLost);
      canvas?.removeEventListener('webglcontextrestored', onRestored);
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      if (settingsOpenRef.current) {
        setSettingsOpen(false);
        return;
      }
      if (invOpenRef.current) {
        setInventoryOpen(false);
        engineRef.current?.setInventoryOpen(false);
        return;
      }
      if (mapOpenRef.current) {
        setMapModalOpen(false);
        return;
      }
      if (phaseRef.current === 'playing' && !document.pointerLockElement) {
        engineRef.current?.setPaused(true);
      } else if (phaseRef.current === 'paused') {
        engineRef.current?.setPaused(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSelectMap = useCallback((mapId: MapId) => {
    setSelectedMap(mapId);
    engineRef.current?.loadMap(mapId);
  }, []);

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    engineRef.current?.applySettings(next);
  }, []);

  const handleToggleMute = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, muted: !prev.muted };
      engineRef.current?.applySettings(next);
      return next;
    });
  }, []);

  const handleTogglePerspective = useCallback(() => {
    setSettings((prev) => {
      const next = {
        ...prev,
        perspective: prev.perspective === 'TPP' ? ('FPP' as const) : ('TPP' as const),
      };
      engineRef.current?.applySettings(next);
      return next;
    });
  }, []);

  const handleToggleDropMode = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, skipParachute: !prev.skipParachute };
      engineRef.current?.applySettings(next);
      return next;
    });
  }, []);

  const handleStartMatch = useCallback(() => {
    setSettingsOpen(false);
    setMapModalOpen(false);
    setInventoryOpen(false);
    engineRef.current?.startMatch();
  }, []);

  const handleOpenSettingsInGame = useCallback(() => {
    if (phaseRef.current === 'playing') {
      engineRef.current?.setPaused(true);
    }
    setSettingsOpen(true);
  }, []);

  const handleOpenInventory = useCallback(() => {
    setInventoryOpen(true);
    engineRef.current?.setInventoryOpen(true);
  }, []);

  const handleCloseInventory = useCallback(() => {
    setInventoryOpen(false);
    engineRef.current?.setInventoryOpen(false);
  }, []);

  return (
    <div className="relative w-full h-full bg-zinc-950 overflow-hidden">
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {webglLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 text-zinc-200 p-6 text-center">
          <div>
            <h2 className="font-display text-xl font-bold mb-2">Graphics Context Interrupted</h2>
            <p className="text-sm text-zinc-400">Restoring WebGL renderer...</p>
          </div>
        </div>
      )}

      {phase === 'title' && (
        <TitleLobby
          selectedMap={selectedMap}
          settings={settings}
          onSelectMap={handleSelectMap}
          onTogglePerspective={handleTogglePerspective}
          onToggleDropMode={handleToggleDropMode}
          onToggleMute={handleToggleMute}
          onOpenSettings={() => setSettingsOpen(true)}
          onStartMatch={handleStartMatch}
        />
      )}

      {phase === 'playing' && hud && (
        <GameHUD
          hud={hud}
          muted={settings.muted}
          onToggleMute={handleToggleMute}
          onOpenSettings={handleOpenSettingsInGame}
          onOpenInventory={handleOpenInventory}
          onRequestLock={() => engineRef.current?.requestPointerLock()}
        />
      )}

      {phase === 'playing' && inventoryOpen && hud && (
        <InventoryModal
          hud={hud}
          onLootItem={(id) => engineRef.current?.lootNearbyById(id)}
          onEquipAttachment={(slotIdx, kind, val) =>
            engineRef.current?.equipAttachment(slotIdx, kind, val)
          }
          onUseConsumable={(kind) => engineRef.current?.useConsumable(kind)}
          onClose={handleCloseInventory}
        />
      )}

      {phase === 'playing' && mapModalOpen && hud && (
        <TacticalMapModal
          mapId={selectedMap}
          hud={hud}
          onClose={() => setMapModalOpen(false)}
        />
      )}

      {phase === 'paused' && !settingsOpen && (
        <PauseModal
          onResume={() => engineRef.current?.setPaused(false)}
          onOpenSettings={() => setSettingsOpen(true)}
          onRestart={handleStartMatch}
          onReturnLobby={() => engineRef.current?.returnToTitle()}
        />
      )}

      {(phase === 'victory' || phase === 'gameover') && hud && (
        <MatchEndModal
          victory={phase === 'victory'}
          hud={hud}
          onPlayAgain={handleStartMatch}
          onReturnLobby={() => engineRef.current?.returnToTitle()}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={handleUpdateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
