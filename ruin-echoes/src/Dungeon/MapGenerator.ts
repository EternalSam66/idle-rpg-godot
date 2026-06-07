import { GridSystem, OccupantData } from './GridSystem';

interface Monster {
  hp: number;
  currentHP: number;
  atk: number;
  def: number;
  spd: number;
  isBoss: boolean;
}

export class MapGenerator {
  static generate(grid: GridSystem, level: number, partySize: number): void {
    const monsterCount = Math.min(3 + Math.floor(level / 20), 7);
    const chestCount = 1 + Math.floor(Math.random() * 3);
    const rng = MapGenerator.seededRandom(level + Date.now());

    const startX = 3;
    const endX = grid.width - 6;
    const centerY = Math.floor(grid.height / 2);

    for (let i = 0; i < monsterCount; i++) {
      const x = startX + Math.floor(rng() * (endX - startX));
      if (grid.getCell(x, centerY)!.occupant !== 'None') {
        i--;
        continue;
      }
      const stats = MapGenerator.getEnemyStats(level, false, partySize);
      grid.setOccupant(x, centerY, {
        type: 'Monster',
        monster: stats,
      } as OccupantData);
    }

    for (let i = 0; i < chestCount; i++) {
      const x = startX + Math.floor(rng() * (endX - startX));
      if (grid.getCell(x, centerY)!.occupant !== 'None') {
        i--;
        continue;
      }
      grid.setOccupant(x, centerY, {
        type: 'Chest',
        chest: { level },
      } as OccupantData);
    }

    const bossX = grid.width - 2;
    grid.setOccupant(bossX, centerY, {
      type: 'Boss',
      monster: MapGenerator.getEnemyStats(level, true, partySize),
    } as OccupantData);
  }

  static getEnemyStats(floor: number, isBoss: boolean, partySize: number): Monster {
    const isGateFloor = floor % 5 === 0;
    const gateModifier = isGateFloor ? (isBoss ? 2.0 : 1.65) : (isBoss ? 1.3 : 1.0);
    const partyScaler = 1.0 + (partySize - 1) * 0.70;

    const hp = Math.round(50 * Math.pow(1.32, floor - 1) * gateModifier * partyScaler);
    const atk = Math.round(8 * Math.pow(1.26, floor - 1) * gateModifier * partyScaler);
    const def = Math.floor(Math.floor((floor - 1) * 1.5) * gateModifier);
    const spd = 2 + Math.floor(floor * 0.1);

    return { hp, currentHP: hp, atk, def, spd, isBoss };
  }

  private static seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
}
