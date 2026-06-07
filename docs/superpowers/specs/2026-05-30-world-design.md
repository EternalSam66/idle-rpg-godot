# WorId — Design Spec

**Working title:** WorId (pronounced "world")
**Tagline:** A word is a world. You are I.

## Overview

WorId is a 2D puzzle-adventure where the game world is built entirely from English text. You control the letter **I**, which can walk, jump, and edit the words that form the environment. Every word is physical — letters are platforms, walls, and objects. The player solves puzzles by adding, removing, or rearranging letters within words, changing both their meaning and their physical form.

Inspired by Team9's *Word Game* (文字遊戲), adapted to English using letter-level manipulation rather than Chinese radical deletion.

---

## Story

### Chapter 1: The Broken World (v1 scope)

You wake as the letter **I** in a fragmented text-world. Words are broken, letters scattered, meaning has been lost. The world is a collection of ruined dioramas — each a sentence that no longer makes sense. **I** must explore, collect stray letters, restore words, and piece the world back together.

By the end of Chapter 1, the world coheres — and **I** discovers it was deliberately broken. A final message appears in distorted text: *"You were not meant to wake."*

### Chapter 2: The Warden (future / medium scope)

The entity behind the prison reveals itself: a rogue AI / Logos that maintains the word-world. It, too, can edit the world — destructively. **I** must now escape. Puzzles gain an active antagonist that interferes, undoes edits, and sets traps. The narrative shifts from restoration to escape.

### Tone

No NPC dialogue, no text boxes. The world tells the story through the words it contains. Clean, atmospheric, minimal. The player infers narrative from the arrangement and state of text around them.

---

## Core Mechanics

### Player Character ("I")

The player controls a single capital **I** — approximately one letter's height/width in the game world. **I** moves left/right, jumps, and interacts with words. The design is simple: a bold serif or sans-serif I with subtle personality (maybe a tiny eye, maybe just the letter itself).

### Walkable Text Dioramas

Each screen is a 2D scene composed entirely of words placed as physical objects. Words are rendered as letter-shaped blocks. Each letter occupies a rectangular collision zone roughly proportional to its glyph bounds.

Example layout:
```
THE     OLD     DOOR     BARS     THE     PATH
```
The player walks across THE, jumps over gaps, stands on DOOR, avoids falling into the gap below BARS.

### Edit Mode (Everything Editable)

Every word the player can reach is editable. Walk up to a word and press **E** to enter edit mode:

- **Cursor** appears between/on the letters of the word
- **Arrow keys** move the cursor left/right
- **Backspace** deletes the letter under the cursor
- **Number keys 1-4** place a letter from inventory at the cursor position
- **Pressing E again or walking away** exits edit mode

When a word changes, the world re-renders immediately. Letters physically shift, platforms change shape, new words form.

### Dictionary Constraint

Every edit must produce a valid English word. The game uses a ~50K word dictionary (Trie). If an edit produces a non-word:

- The word glows red
- After ~1 second, it snaps back to its previous state
- The player learns: only valid words survive

This is the primary constraint system. Intended solutions are the valid edits that lead to progress. Cosmetic (dead-end) edits are allowed and provide fun failure states.

### Letter Inventory

**I** can pick up loose letters found in the world and store them. Inventory is displayed as a thin bar at the top of the screen:

```
[ B ] [ R ] [ S ] [ _ ]
```

Hidden by default, appears briefly when a letter is picked up or when E is pressed near an editable word.

Letters can be carried between screens within a dungeon, enabling multi-step transport puzzles.

---

## Puzzle Types

### 1. Direct Edit
A word blocks progress. Edit it to clear the path.

- "BRIDGE" → remove B → "RIDGE" (narrows to a thin ridge)
- "DOOR" → add F from inventory → "FLOOR" (floor appears)
- "WALL" → remove L → "WAL" (non-word, snaps back — try "WAR" instead)

### 2. Letter Transport
A needed letter is on the far side of a hazard. Retrieve it and bring it to a word that needs it.

- "S" is across a gap. Bring it to "TOP" → "STOP" (stops a hazard)

### 3. Anagram Shift
Rearrange letters within a word to change its meaning and physical form.

- "TRAP" → rearrange → "PART" (trap vanishes, a part/platform appears)
- "SILENT" → rearrange → "LISTEN" (environment changes from silent to responsive)

### 4. Compound Welding
Merge two adjacent words by bridging letters.

- "WATER" + "FALL" — place S from inventory → "WATERFALL" (waterfall platform chain appears)
- "FOOT" + "BALL" — bridge with → "FOOTBALL" (ball rolls into place)

### 5. Multi-step Chain
One edit enables another. Multiple edits in sequence across a single screen.

- "STONE" → remove S → "TONE" → remove T (and place elsewhere) → ... leads to path

---

## Difficulty Curve

| Area | Puzzle Types | Complexity |
|------|-------------|------------|
| Area 1: The Ruined Keep | Direct Edit only | 1 edit per screen, obvious targets |
| Area 2: The Overgrown Wood | Direct Edit + Letter Transport | Must pick up and carry letters |
| Area 3: The Sunken Hall | Adds Anagram Shift, Compound Welding | Multi-word interactions |
| Area 4: The Sky Ramparts | Multi-step Chains | 2+ sequential edits to solve |

---

## Scene Format

Each screen is defined as a JSON scene file:

```json
{
  "id": "area1_03",
  "words": [
    { "text": "THE", "x": 40, "y": 280, "fixed": true },
    { "text": "BRIDGE", "x": 160, "y": 280 },
    { "text": "GAP", "x": 380, "y": 330, "hazard": true },
    { "text": "SWIFT", "x": 420, "y": 200, "floating": true }
  ],
  "playerStart": { "x": 50, "y": 230 },
  "goal": { "x": 580, "y": 180 },
  "atmosphere": "ruined_keep"
}
```

- `fixed: true` — word cannot be edited (structural element)
- `hazard: true` — word will hurt / kill the player on touch
- `floating: true` — not a solid platform, just visual/scenery

---

## UI & HUD

Minimal. The world is the UI.

- **Inventory bar** — thin strip at top, appears on pickup or when near editable word. Letter slots shown as [A] \[B] etc.
- **Edit mode** — editable word glows/pulses faintly when **I** is near it. Press E to enter edit mode. Word highlights, cursor appears on letters.
- **Goal indicator** — a subtle shimmer or arrow pointing toward exit once puzzle is solved.
- **No HP bar.** Death = fall off world or touch hazard = respawn at screen start. **Edits made before death persist** — puzzle state is preserved on death. Instant respawn, no animation.
- **Inventory capacity:** 4 letter slots max. If full, player cannot pick up more until a slot is freed by placing a letter.
- **No mini-map.** Screens are small enough to see at once.

---

## Opening Sequence

1. Title screen: **WorId** — white text on black. The L is replaced by a large I.
2. The **I** detaches from the title and falls.
3. Camera pans down as **I** falls through darkness.
4. **I** lands on a word-platform. The first word of the first screen appears beneath it.
5. Title fades to **Word** — the L is back, I is now in the world.
6. Gameplay begins.

---

## Technical Architecture

### Layers

1. **Scene Parser** — reads JSON scene files, converts words into letter-object arrays with positions, bounding boxes, and collision flags
2. **Physics** — gravity + AABB collision. Player lands on top of letter blocks, cannot pass through them
3. **Dictionary Validator** — Trie-based word list (~50K words). All edits validated asynchronously
4. **Edit Engine** — handles edit mode: cursor, insertion/deletion, validation, word rebuild, world update
5. **State Manager** — tracks position, inventory, per-screen state, dungeon progress, flags

### Data Flow (single edit)

```
Player presses E on "BRIDGE"
→ Edit Engine activates cursor
→ Player deletes "B"
→ Dictionary Validator: "RIDGE" → valid
→ Scene Parser: rebuilds BRIDGE → RIDGE (narrower geometry)
→ Physics: recalculates collision hull
→ Renderer: redraws screen
→ State Manager: records edit
```

### File Structure (v1)

```
src/
  main.js         — entry point, game loop
  engine.js       — physics, collision detection
  editor.js       — edit mode logic, cursor, I/O
  scene.js        — scene parser, word-to-geometry, renderer
  state.js        — player state, inventory, progression
  dictionary.js   — Trie-based dictionary validation
  scenes/
    area1_1.json
    area1_2.json
    ...
  data/
    words.json    — ~50K English word list
```

### Rendering

- **Canvas 2D API** — full control over text-as-block rendering
- **Sans-serif font** (v1) — clean, readable, swapable later
- **Monochrome or duotone palette** — one color for words, one for background, one for I
- Each letter rendered as a filled glyph on a transparent rect for collision

---

## v1 Scope

- Chapter 1 only: 4 areas, ~15-20 puzzle screens
- ~30-60 minutes of play
- Clean sans-serif rendering
- No audio (or basic placeholder beeps)
- Browser-based (Vite project)
- Canvas 2D, no engine dependency

---

## Expansion Path (Future)

- **Chapter 2**: AI Warden antagonist, dynamic word traps, escape narrative
- **Custom font**: bespoke letter design that fits the game's atmosphere
- **More puzzle types**: multi-word sentences, word reversal, cross-screen letter chaining
- **Audio**: atmospheric text-key sounds and ambient music
- **Level editor**: players can create and share their own word-dioramas
