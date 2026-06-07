# Echoes of the Ruin — Dungeon Auto-Battle Redesign

## 1. Game Concept

Auto-battle dungeon idle game. Guild master hires adventurers, equips them with gear found in dungeons, sends them to auto-fight through progressively harder levels. No clicking. All combat auto-resolved. Levels require multiple attempts — you fail ~5-6 times, grow stronger from loot, then finally clear on attempt ~7. 100 levels. Each level: 3-7 monsters + 1 boss + 1-3 chests.

---

## 2. Engine & Architecture

Vanilla **TypeScript** + **Tailwind CSS**. No canvas. HTML DOM grid matrix with conditional class/text updates. Unity-style OOP with MVC decoupling.

**Structure:**
```
src/
├── main.ts
├── Core/       GameLoop.ts, SaveSystem.ts, EventBus.ts
├── Models/     GameState.ts
├── Components/ Adventurer.ts, EquipmentManager.ts, CombatEngine.ts
├── Dungeon/    GridSystem.ts, DungeonEngine.ts, MapGenerator.ts
└── UI/         UIManager.ts, ViewComponents/DungeonView.ts, GuildView.ts
```

**Lifecycle:** Awake (instantiate modules) → Start (load save, offline resolve, init UI) → FixedUpdate (frame-rate independent loop)

---

## 3. Core Loop

Select level → Send Party → Party enters 50-tile corridor → walks right 1 tile/400ms → auto-combat on monster tiles → auto-loot on chests → boss at far right → wipe (keep loot) or clear → next level.

**Event queue:** `walkStep → encounterMonster → combatResult → walkStep → openChest → ... → encounterBoss → levelCleared/partyWiped`

---

## 4. State Schema

```typescript
interface Equipment {
  id: string;
  slot: 'Weapon' | 'Armor' | 'Accessory';
  name: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  itemLevel: number;
  statValue: number;
  affix?: { type: 'ATK%'|'DEF%'|'Crit%'|'GoldFind%'|'Lifesteal%'; modifier: number };
}

interface AdventurerState {
  id: string;
  classType: 'Warrior'|'Mage'|'Ranger'|'Priest';
  level: number;
  currentHP: number;
  equipment: { Weapon: Equipment|null; Armor: Equipment|null; Accessory: Equipment|null };
  specializationLevel: number;
}

interface GameState {
  coins: number; currentLevel: number; maxClearedLevel: number;
  runCount: number; maxPartySlots: number; // default 1, max 6
  adventurers: AdventurerState[]; inventory: Equipment[];
  upgrades: { trainingGrounds, armorSmith, guildHall, campfireKit, rations, healingSprings, treasureVault, luckyStar, smelter, merchantGuild };
  meta: { version: string; lastTimestamp: number };
}
```

---

## 5. Adventurers

| Class | HP | ATK | DEF | SPD | Cost |
|-------|-----|-----|-----|-----|------|
| Warrior | 120 | 8 | 12 | 3 | Free |
| Mage | 60 | 16 | 4 | 2 | 200 |
| Ranger | 80 | 10 | 6 | 6 | 150 |
| Priest | 75 | 6 | 5 | 4 | 300 |

**Scaling:** HP × 1.12^level, ATK/DEF × 1.06^level

**Specializations (every 5 cleared levels, cycling):** Lv5 Warrior (+30% HP, taunt 50% dmg), Lv10 Mage (+30% dmg, ignore 20% DEF), Lv15 Ranger (double attack, +20% dodge), Lv20 Priest (+50% heal, cleanse), Lv25+ cycle repeats stacking.

---

## 6. Equipment

**Rarity:** Common 1.0× 50% | Uncommon 1.3× 30% | Rare 1.6× 15% | Epic 2.0× 4% | Legendary 2.5× 1%

**Stats:** Weapon ATK = round(2 + itemLevel×1.5) × mult. Armor DEF = round(1 + itemLevel×0.5) × mult. Armor HP = round(10 + itemLevel×3) × mult. Accessory: ATK%/DEF%/Crit%/GoldFind%/Lifesteal%.

---

## 7. Grid System

10 rows height. Width = 40 + floor(level/5). 14×10 viewport, camera scrolls. Pre-settled GridCell matrix.

**GridCell:** { x, y, terrainAsset, occupant: 'None'|'Monster'|'Chest'|'Boss', occupantData }

---

## 8. Combat

**Monster scaling:** HP=50×(1+lv×0.5), ATK=10×(1+lv×0.4), DEF=3×(1+lv×0.3). Boss = 3×.

**Resolution:** EHP = HP + DEF×0.3 → Rounds = ceil(EHP / partyATK) → Dmg = monsterATK × rounds. If Warrior taunt active → Warrior takes 50%, rest split evenly. Otherwise split evenly. Win if dmg < partyHP. Heal: 5% + 3%×Rations + 10%×PriestLevel. Wipe = keep all loot.

---

## 9. Biomes (every 20 levels)

1-20 Grass → 21-40 Dirt → 41-60 Water → 61-80 Stone → 81-100 Crypt. CSS class swap.

---

## 10. Upgrades (all max 25)

**Party slots:** 2(50), 3(200), 4(600), 5(2000), 6(6000)

**Stats (×1.18):** Training Grounds(30, +8%ATK), Armor Smith(30, +8%DEF), Guild Hall(30, +10%HP)

**Survival:** Campfire Kit(100 ×1.50, +1 revive), Rations(50 ×1.20, +3% heal), Healing Springs(80 ×1.25, +10% start HP)

**Economy (×1.20):** Treasure Vault(50, +12% coins), Lucky Star(100 ×1.30, +5% rare+), Smelter(80, +15% salvage), Merchant Guild(60, -5% hire)

---

## 11. UI Layout

3-column split. 14×10 HTML DOM grid on left (60%), guild hub panel on right (40%). Top bar with coins/level/run#.

**Rendering:** font-mono for numbers, fixed-width containers. Disabled = `opacity-50 pointer-events-none`. Numbers <1K = raw int, ≥1K = 1.05K/2.40M/B/T/Qa/Qi.

---

## 12. Save System

localStorage. Save on run completion/wipe only. 20s throttle on manual saves. Deep-merge migration. Offline simulation: batch-resolve runs from time deficit → "Offline Activity Report" modal.

---

## 13. Removed

Gold, fragments, echo stones, rebirth, clicking, bonds, fog zones, canvas rendering.
