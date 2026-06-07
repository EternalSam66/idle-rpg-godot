# Echoes of the Ruin — Dungeon Auto-Battle Redesign

## 1. Game Concept

Auto-battle dungeon idle game. Guild master hires adventurers, equips them with gear found in dungeons, sends them to auto-fight through progressively harder levels. No clicking. All combat auto-resolved. Levels require multiple attempts — you fail ~5-6 times, grow stronger from loot, then finally clear on attempt ~7.

- 100 levels
- Each level: 3-7 monsters + 1 boss + 1-3 chests
- Fail repeatedly, keep loot, grow stronger, eventually clear
- Random equipment with rarity and stats
- Permanent upgrades between runs
- Class specializations every 5 cleared levels (cycling through classes)

---

## 2. Engine Selection & Architecture

Vanilla TypeScript Modular Architecture styled with **Tailwind CSS**. No canvas rendering. The game board uses a static, pre-calculated coordinate matrix rendered with standard HTML DOM elements via conditional text and class updates.

Strict Unity-inspired Object-Oriented Programming (OOP): decoupled Model-View-Controller (MVC), explicit lifecycle loops, event-driven execution.

### Project Structure

```
echoes-of-the-ruin/
├── index.html
├── assets/
│   ├── sprites/    # LPC sprites, chests, monsters, tile graphics
│   └── audio/      # Sound effects
└── src/
    ├── main.ts                  # Bootstrapping and initialization lifecycles
    ├── Core/
    │   ├── GameLoop.ts          # Fixed tick rate controller (delta time)
    │   ├── SaveSystem.ts        # Serialization with deep-merge protection
    │   └── EventBus.ts          # Global event dispatch
    ├── Models/
    │   └── GameState.ts         # Global serializable state definition
    ├── Components/
    │   ├── Adventurer.ts        # Base stats, levels, specs
    │   ├── EquipmentManager.ts  # Gear generation, affix math, salvaging
    │   └── CombatEngine.ts      # Step-by-step combat auto-resolution
    ├── Dungeon/
    │   ├── GridSystem.ts        # Coordinate settlement matrix, cell tracking
    │   ├── DungeonEngine.ts     # Run loop controller, event queue
    │   └── MapGenerator.ts      # Procedural corridor settlement, biome themes
    └── UI/
        ├── UIManager.ts         # Main UI router, loop sync
        └── ViewComponents/
            ├── DungeonView.ts   # Grid cell display, camera tracking
            └── GuildView.ts     # Equipment slots, upgrade cards, party cards
```

### Lifecycle

1. **Awake**: Instantiate core modules (UIManager, SaveSystem, GameLoop, EventBus)
2. **Start**: Load save data, execute migrations, resolve offline progress, initialize UI
3. **FixedUpdate**: Frame-rate independent physics/logic loop at fixed tick rate

---

## 3. Core Loop

1. Player selects current dungeon level and clicks "Send Party"
2. Party appears at left edge of a wide horizontal corridor (~50 tiles wide, 10 rows tall)
3. Viewport shows 14×10 tiles — camera scrolls right as party walks
4. Party walks right one tile at a time, grid by grid (auto-pilot, 400ms per tile)
5. When party steps on a monster tile → auto-combat resolves (1 sec flash)
6. When party steps on a chest tile → auto-loot (equipment + coins)
7. Party continues walking until they reach the boss at the far right
8. If party wipes at any point → run ends, keep ALL loot found so far
9. If boss defeated → level cleared, next level unlocks
10. Between runs: equip gear, buy upgrades, hire adventurers

### Dungeon Run Event Queue

```
[walk → walk → walk → encounterMonster → combatResult → walk → walk → openChest → ... → encounterBoss → levelClear/wipe]
```

Each step: `walkStep` (~400ms), `encounterMonster`, `combatResult`, `openChest`, `encounterBoss`, `levelCleared`, `partyWiped`.

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
  affix?: {
    type: 'ATK%' | 'DEF%' | 'Crit%' | 'GoldFind%' | 'Lifesteal%';
    modifier: number;
  };
}

interface AdventurerState {
  id: string;
  classType: 'Warrior' | 'Mage' | 'Ranger' | 'Priest';
  level: number;
  currentHP: number;
  equipment: {
    Weapon: Equipment | null;
    Armor: Equipment | null;
    Accessory: Equipment | null;
  };
  specializationLevel: number;
}

interface GameState {
  coins: number;
  currentLevel: number;
  maxClearedLevel: number;
  runCount: number;
  maxPartySlots: number;  // Default 1, max 6 via flat upgrades
  adventurers: AdventurerState[];
  inventory: Equipment[];
  upgrades: {
    trainingGrounds: number;
    armorSmith: number;
    guildHall: number;
    campfireKit: number;
    rations: number;
    healingSprings: number;
    treasureVault: number;
    luckyStar: number;
    smelter: number;
    merchantGuild: number;
  };
  meta: {
    version: string;
    lastTimestamp: number;
  };
}
```

---

## 5. Adventurers

### 5.1 Classes & Base Stats (Level 1, no gear)

| Class | HP | ATK | DEF | SPD | Hire Cost |
|-------|-----|-----|-----|-----|-----------|
| Warrior | 120 | 8 | 12 | 3 | Free |
| Mage | 60 | 16 | 4 | 2 | 200 coins |
| Ranger | 80 | 10 | 6 | 6 | 150 coins |
| Priest | 75 | 6 | 5 | 4 | 300 coins |

### 5.2 Stat Scaling per Level

```
HP_Level  = BaseHP  × (1.12)^(level - 1)
ATK_Level = BaseATK × (1.06)^(level - 1)
DEF_Level = BaseDEF × (1.06)^(level - 1)
```

### 5.3 Class Specializations

Every 5 cleared levels, cycling through classes in order:

| Cleared Level | Class | Effect |
|---------------|-------|--------|
| 5 | Warrior I | +30% Max HP, Taunt (takes 50% incoming party damage) |
| 10 | Mage I | +30% Magic Dmg, ignores 20% target DEF |
| 15 | Ranger I | Double attack, +20% Dodge |
| 20 | Priest I | +50% Healing, cleanses debuffs |
| 25 | Warrior II | +60% HP, upgraded Taunt |
| 30 | Mage II | +60% Dmg, ignores 35% DEF |
| 35 | Ranger II | Triple attack, +30% Dodge |
| 40 | Priest II | +100% Healing, cleanses all |
| 45+ | III+ | Continue cycling, bonuses stack per cycle |

---

## 6. Equipment

### 6.1 Slots (3 per adventurer)

| Slot | statValue meaning |
|------|-------------------|
| Weapon | ATK |
| Armor | DEF (HP bonus derived from itemLevel/rarity) |
| Accessory | Various (affix provides the effect) |

### 6.2 Rarity

| Rarity | Mult | Drop Rate |
|--------|------|-----------|
| Common | 1.0× | 50% |
| Uncommon | 1.3× | 30% |
| Rare | 1.6× | 15% |
| Epic | 2.0× | 4% |
| Legendary | 2.5× | 1% |

### 6.3 Stat Formulas

```
Weapon ATK = round(2 + itemLevel × 1.5) × RarityMultiplier
Armor  DEF = round(1 + itemLevel × 0.5) × RarityMultiplier
Armor  HP = round(10 + itemLevel × 3) × RarityMultiplier
```

Accessory affixes: ATK% +5-12%, DEF% +5-12%, Crit% +2-6%, GoldFind% +10-25%, Lifesteal% +2-5%.

### 6.4 Drops

| Source | Equipment | Coins |
|--------|-----------|-------|
| Monster | 1 | 5 × level |
| Chest | 1-2 | 10-30 × level |
| Boss | 2-3 (1+ Rare) | 50 × level |

Keep all loot on wipe.

---

## 7. Grid System

### 7.1 Grid Cell

```typescript
interface GridCell {
  x: number;
  y: number;
  terrainAsset: string;
  occupant: 'None' | 'Monster' | 'Chest' | 'Boss';
  occupantData: any | null;  // Pre-calculated stats or drop tables
}

interface GridMap {
  width: number;
  height: number;
  matrix: GridCell[][];
}
```

### 7.2 Settlement Protocol

- **Height**: 10 rows (fixed)
- **Width**: `40 + floor(DungeonLevel / 5)` (40-60 columns)
- **Viewport**: 14 columns × 10 rows visible, camera scrolls to follow party
- **Event cells**: 3-7 monsters, 1-3 chests randomly distributed. Boss at max column.
- **Pre-calculation**: All monster stats and chest contents generated at settlement time. No runtime generation.

Rendered as HTML DOM elements (not canvas). DungeonView reads from the immutable matrix.

---

## 8. Combat Engine

### 8.1 Monster Scaling

```
Monster HP  = 50 × (1 + level × 0.5)
Monster ATK = 10 × (1 + level × 0.4)
Monster DEF = 3 × (1 + level × 0.3)
```

Boss: 3× all stats.

### 8.2 Auto-Resolution Protocol

1. **Effective HP**: `Monster EHP = Monster HP + (Monster DEF × 0.3)`
2. **Speed Priority**: If `avgPartySPD > monsterSPD`, party strikes first. If double, party gets a free hit round.
3. **Rounds**: `RoundsToClear = ceil(Monster EHP / sum(ActivePartyATK))`
4. **Damage**: `TotalDamageSuffered = Monster ATK × RoundsToClear`
5. **Distribute damage**:
   - If Warrior with active Taunt specialization is alive → Warrior takes 50% of TotalDamageSuffered, remaining 50% split evenly among other living members
   - Otherwise → damage split evenly among all living members
   - If any adventurer HP hits 0 → marked dead for rest of run
6. **Win condition**: If total damage < total party HP → victory. Party heals: `5% + (3% × RationsLevel) + (10% × PriestLevel)`
7. **Loss condition**: If total damage ≥ total party HP → wipe. All loot kept. Run ends.

---

## 9. Zone Themes (Biomes)

Every 20 levels, visual biome switches via CSS class swap on the grid container:

| Levels | Theme | Terrain |
|--------|-------|---------|
| 1-20 | Sunset Hills | Grass |
| 21-40 | Windvale Village | Dirt |
| 41-60 | Serene Lake | Water/shore |
| 61-80 | Ancient Ruins | Stone |
| 81-100 | Abyss Rift | Crypt |

---

## 10. Upgrades

Cost formula: `floor(BaseCost × Scaler^level)`

### Party Slots (flat milestones)

| Slot | Cost |
|------|------|
| 2 | 50 |
| 3 | 200 |
| 4 | 600 |
| 5 | 2000 |
| 6 | 6000 |

### Stat Upgrades (×1.18 scaler, max 25)

| ID | Base | Effect/level |
|----|------|-------------|
| trainingGrounds | 30 | +8% Party ATK |
| armorSmith | 30 | +8% Party DEF |
| guildHall | 30 | +10% Party Max HP |

### Survival Upgrades (max 25)

| ID | Base | Scaler | Effect/level |
|----|------|--------|-------------|
| campfireKit | 100 | 1.50 | +1 revive per run |
| rations | 50 | 1.20 | +3% inter-combat heal |
| healingSprings | 80 | 1.25 | +10% starting HP |

### Economy Upgrades (×1.20 scaler, max 25)

| ID | Base | Scaler | Effect/level |
|----|------|--------|-------------|
| treasureVault | 50 | 1.20 | +12% coins |
| luckyStar | 100 | 1.30 | +5% rare+ drop rate |
| smelter | 80 | 1.25 | +15% salvage value |
| merchantGuild | 60 | 1.20 | -5% hire cost |

---

## 11. UI Architecture

### Layout

```
+------------------------------------------------------------------+
| TOP BAR: [Coins: 1,234]    [Level 17/100]    [Run #3]            |
+-----------------------------------+------------------------------+
| DUNGEON VIEWPORT (60%)           | GUILD HUB PANEL (40%)        |
|                                   |                              |
| • 14x10 HTML DOM tile grid       | • Party status cards         |
| • Camera tracking/scroll         |   (HP bars + 3 equip slots)  |
| • Biome background theme         | • Live scrolling run log     |
| • Sprite asset display           | • Tabbed upgrade shop        |
|                                   | • "Send Party" button        |
+-----------------------------------+------------------------------+
```

### Rendering Rules

- **HTML DOM elements** for the tile grid (not canvas)
- Conditional text/class updates only when state changes
- **font-mono** wrapping for number values inside fixed-width containers (`min-w-[100px]`) to prevent layout shifts
- Disabled purchase states: `opacity-50 pointer-events-none cursor-not-allowed`
- Number formatting: < 1K = raw int, ≥ 1K = engineering shorthand (1.05K, 2.40M, B, T, Qa, Qi)

---

## 12. Save System

- **localStorage** with save key `ruin-echoes-save`
- **Save trigger**: exclusively on run completion or wipe. No saves during active dungeon run.
- **Manual/shop saves**: throttled to max once per 20 seconds
- **Loading**: recursive deep-merge against default schema — new fields get defaults, no crash from missing props
- **Offline progress**: On load, if `Date.now() - lastTimestamp > 10s`, calculate:
  - Single run duration = `(width × 400ms) + (monsterCount × 1000ms)`
  - Simulated runs = floor(offline seconds / run duration)
  - Batch-resolve each run through combat engine
  - Accumulate all loot/coins
  - Show "Offline Activity Report" modal

---

## 13. Visual Assets

- LPC character sprites for party (goblin sprites)
- LPC monster sprites for enemies (imps, goblins)
- Chest sprite from existing assets
- Terrain colors via CSS classes per biome theme
- All sprites loaded as `<img>` elements positioned via CSS grid cells

---

## 14. Removed Systems

Gold, fragments, echo stones, rebirth, clicking, bonds, fog zones, explore progress, canvas rendering.
