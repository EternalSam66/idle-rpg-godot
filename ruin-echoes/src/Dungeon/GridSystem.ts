export type OccupantType = 'None' | 'Monster' | 'Chest' | 'Boss';

export interface OccupantData {
  type: OccupantType;
  monster?: { hp: number; currentHP: number; atk: number; def: number; spd: number; isBoss: boolean };
  chest?: { level: number };
}

export interface GridCell {
  x: number;
  y: number;
  occupant: OccupantType;
  occupantData: OccupantData | null;
  explored: boolean;
}

export class GridSystem {
  readonly width: number;
  readonly height: number = 10;
  readonly cells: GridCell[] = [];

  constructor(level: number) {
    this.width = 40 + Math.floor(level / 5);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.cells.push({
          x, y,
          occupant: 'None',
          occupantData: null,
          explored: false,
        });
      }
    }
  }

  getCell(x: number, y: number): GridCell | undefined {
    return this.cells.find(c => c.x === x && c.y === y);
  }

  setOccupant(x: number, y: number, data: OccupantData): void {
    const cell = this.getCell(x, y);
    if (cell) {
      cell.occupant = data.type;
      cell.occupantData = data;
    }
  }

  clearOccupant(x: number, y: number): void {
    const cell = this.getCell(x, y);
    if (cell) {
      cell.occupant = 'None';
      cell.occupantData = null;
    }
  }

  explore(x: number, y: number): void {
    const cell = this.getCell(x, y);
    if (cell) cell.explored = true;
  }

  exploreRadius(centerX: number, centerY: number, radius: number = 2): void {
    for (const cell of this.cells) {
      if (Math.abs(cell.x - centerX) <= radius && Math.abs(cell.y - centerY) <= radius) {
        cell.explored = true;
      }
    }
  }
}
