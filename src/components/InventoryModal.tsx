import React from 'react';
import { X } from 'lucide-react';
import {
  SCOPE_SPECS,
  WEAPON_SPECS,
  type HudSnapshot,
  type MagType,
  type MuzzleType,
  type ScopeType,
} from '../types/game';

interface InventoryModalProps {
  hud: HudSnapshot;
  onLootItem: (id: string) => void;
  onEquipAttachment: (
    slotIdx: 0 | 1,
    kind: 'scope' | 'muzzle' | 'mag',
    value: ScopeType | MuzzleType | MagType
  ) => void;
  onUseConsumable: (kind: 'medkit' | 'bandage' | 'drink' | 'painkiller') => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  hud,
  onLootItem,
  onEquipAttachment,
  onUseConsumable,
  onClose,
}) => {
  const { inventory } = hud;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <h2 className="font-display font-bold text-lg text-zinc-50 tracking-wider">
              TACTICAL BACKPACK &amp; LOADOUT
            </h2>
            <span className="text-xs text-zinc-400">
              Lv.{hud.backpackLevel} Backpack · Press Tab or Esc to close
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
            aria-label="Close inventory"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800 max-h-[75vh] overflow-y-auto">
          {/* Column 1: Vicinity Ground Loot */}
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-amber-400 tracking-wide">
                VICINITY LOOT
              </h3>
              <span className="text-xs text-zinc-400 tabular-nums">
                {inventory.nearbyLoot.length} items
              </span>
            </div>

            {inventory.nearbyLoot.length === 0 ? (
              <div className="text-xs text-zinc-500 py-8 text-center border border-dashed border-zinc-800 rounded">
                Walk near loot crates or buildings to pick up gear
              </div>
            ) : (
              <div className="space-y-1.5">
                {inventory.nearbyLoot.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onLootItem(item.id)}
                    className="w-full text-left px-3 py-2 rounded bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/60 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-semibold text-zinc-100">{item.label}</div>
                      <div className="text-[11px] text-zinc-400">{item.sublabel}</div>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-400">LOOT</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Column 2: Armor, Meds & Spare Attachments */}
          <div className="p-4 flex flex-col gap-4">
            <div>
              <h3 className="font-display font-bold text-sm text-zinc-200 tracking-wide mb-2">
                ARMOR &amp; GEAR
              </h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                  <div className="text-zinc-400">Helmet</div>
                  <div className="font-display font-bold text-sm text-sky-400">
                    Lv.{hud.helmetLevel}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                  <div className="text-zinc-400">Vest</div>
                  <div className="font-display font-bold text-sm text-sky-400">
                    Lv.{hud.armorLevel}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800">
                  <div className="text-zinc-400">Bag</div>
                  <div className="font-display font-bold text-sm text-amber-400">
                    Lv.{hud.backpackLevel}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display font-bold text-sm text-zinc-200 tracking-wide mb-2">
                MEDICAL &amp; BOOST (CLICK TO USE)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={inventory.medkits <= 0}
                  onClick={() => onUseConsumable('medkit')}
                  className="p-2.5 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-left cursor-pointer"
                >
                  <div className="flex justify-between text-xs font-semibold text-emerald-400">
                    <span>First Aid</span>
                    <span className="tabular-nums">x{inventory.medkits}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">+75 HP [7]</div>
                </button>

                <button
                  type="button"
                  disabled={inventory.bandages <= 0}
                  onClick={() => onUseConsumable('bandage')}
                  className="p-2.5 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-left cursor-pointer"
                >
                  <div className="flex justify-between text-xs font-semibold text-emerald-300">
                    <span>Bandage</span>
                    <span className="tabular-nums">x{inventory.bandages}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">+18 HP [8]</div>
                </button>

                <button
                  type="button"
                  disabled={inventory.energyDrinks <= 0}
                  onClick={() => onUseConsumable('drink')}
                  className="p-2.5 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-left cursor-pointer"
                >
                  <div className="flex justify-between text-xs font-semibold text-sky-400">
                    <span>Energy Drink</span>
                    <span className="tabular-nums">x{inventory.energyDrinks}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">+40 Boost [9]</div>
                </button>

                <button
                  type="button"
                  disabled={inventory.painkillers <= 0}
                  onClick={() => onUseConsumable('painkiller')}
                  className="p-2.5 rounded bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-800 text-left cursor-pointer"
                >
                  <div className="flex justify-between text-xs font-semibold text-cyan-300">
                    <span>Painkillers</span>
                    <span className="tabular-nums">x{inventory.painkillers}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">+60 Boost</div>
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-display font-bold text-sm text-zinc-200 tracking-wide mb-2">
                SPARE ATTACHMENTS (EQUIP TO ACTIVE GUN)
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {inventory.spareScopes.length === 0 &&
                inventory.spareMuzzles.length === 0 &&
                inventory.spareMags.length === 0 ? (
                  <span className="text-xs text-zinc-500">No spare attachments in backpack</span>
                ) : (
                  <>
                    {inventory.spareScopes.map((sc, idx) => (
                      <button
                        key={`sc_${idx}`}
                        type="button"
                        onClick={() => onEquipAttachment(hud.activeSlotIndex, 'scope', sc)}
                        className="px-2.5 py-1 rounded bg-purple-500/15 border border-purple-500/40 text-purple-300 text-xs font-medium hover:bg-purple-500/25 cursor-pointer"
                      >
                        Equip {SCOPE_SPECS[sc].label}
                      </button>
                    ))}
                    {inventory.spareMuzzles.map((mz, idx) => (
                      <button
                        key={`mz_${idx}`}
                        type="button"
                        onClick={() => onEquipAttachment(hud.activeSlotIndex, 'muzzle', mz)}
                        className="px-2.5 py-1 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 text-xs font-medium hover:bg-sky-500/25 capitalize cursor-pointer"
                      >
                        Equip {mz}
                      </button>
                    ))}
                    {inventory.spareMags.map((mg, idx) => (
                      <button
                        key={`mg_${idx}`}
                        type="button"
                        onClick={() => onEquipAttachment(hud.activeSlotIndex, 'mag', mg)}
                        className="px-2.5 py-1 rounded bg-pink-500/15 border border-pink-500/40 text-pink-300 text-xs font-medium hover:bg-pink-500/25 cursor-pointer"
                      >
                        Equip Ext. QuickDraw Mag
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Equipped Weapons & Attachment Slots */}
          <div className="p-4 flex flex-col gap-3">
            <h3 className="font-display font-bold text-sm text-zinc-200 tracking-wide">
              EQUIPPED WEAPONS
            </h3>

            {hud.slots.map((slot, idx) => {
              if (!slot) return null;
              const spec = WEAPON_SPECS[slot.weaponId];
              const isActive = idx === hud.activeSlotIndex;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded border ${
                    isActive ? 'bg-zinc-900 border-amber-500/70' : 'bg-zinc-900/50 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs text-zinc-400 mr-2">Slot {idx + 1}</span>
                      <span className="font-display font-bold text-base text-amber-400">
                        {spec.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono-tabular text-zinc-300">
                      {slot.magAmmo} / {slot.reserveAmmo}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800">
                      <div className="text-zinc-500">Optic</div>
                      <div className="text-zinc-200 font-medium truncate">
                        {SCOPE_SPECS[slot.scope].label}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800">
                      <div className="text-zinc-500">Muzzle</div>
                      <div className="text-zinc-200 font-medium capitalize truncate">
                        {slot.muzzle === 'none' ? 'Standard' : slot.muzzle}
                      </div>
                    </div>
                    <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800">
                      <div className="text-zinc-500">Mag</div>
                      <div className="text-zinc-200 font-medium capitalize truncate">
                        {slot.mag === 'extended' ? 'Ext. QD' : 'Standard'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="p-3 rounded bg-zinc-900/60 border border-zinc-800 text-xs flex items-center justify-between">
              <span className="text-zinc-300">Throwables</span>
              <span className="font-mono-tabular text-zinc-200">
                Frag x{inventory.fragGrenades} · Smoke x{inventory.smokeGrenades}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
