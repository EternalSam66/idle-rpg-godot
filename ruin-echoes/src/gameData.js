export const ADVENTURERS = [
  { id: 'warrior', name: '戰士', icon: '⚔️', baseProduction: 1, color: '#e74c3c', unlockCost: 0 },
  { id: 'mage', name: '法師', icon: '🔮', baseProduction: 0.8, color: '#9b59b6', unlockCost: 5000 },
  { id: 'ranger', name: '遊俠', icon: '🏹', baseProduction: 0.6, color: '#2ecc71', unlockCost: 0 },
  { id: 'priest', name: '牧師', icon: '✨', baseProduction: 0.4, color: '#f1c40f', unlockCost: 50000 },
];

export const RARITIES = [
  { key: 'bronze', label: '銅', multiplier: 1 },
  { key: 'silver', label: '銀', multiplier: 2 },
  { key: 'gold', label: '金', multiplier: 5 },
  { key: 'legendary', label: '傳奇', multiplier: 12 },
];

export const BONDS = [
  { id: 'vanguard', name: '先鋒', members: ['warrior', 'priest'], effect: 1.3, desc: '戰士 + 牧師：全隊產出 +30%' },
  { id: 'scout', name: '偵察', members: ['mage', 'ranger'], effect: 1.5, desc: '法師 + 遊俠：能量恢復 +50%' },
  { id: 'legacy', name: '傳承', members: ['warrior', 'mage', 'ranger', 'priest'], effect: 2, desc: '全員到齊：全隊產出 +100%' },
];

export const ZONES = [
  { id: 'entrance', name: '遺跡入口', cost: 0, fragmentCost: 0, description: '遠古遺跡的起點', unlockText: '已解鎖' },
  { id: 'corridor', name: '荊棘走廊', cost: 1000, fragmentCost: 50, description: '佈滿荊棘的狹長通道', unlockText: '需要 50 💎 解鎖' },
  { id: 'hall', name: '石像鬼大廳', cost: 10000, fragmentCost: 500, description: '石像鬼守衛的大殿', unlockText: '需要 500 💎 解鎖' },
  { id: 'abyss', name: '迴響深淵', cost: 100000, fragmentCost: 3000, description: '深不見底的黑暗裂口', unlockText: '需要 3K 💎 解鎖' },
  { id: 'chapel', name: '聖光禮拜堂', cost: 1000000, fragmentCost: 15000, description: '聖光籠罩的古老遺跡', unlockText: '需要 15K 💎 解鎖' },
  { id: 'throne', name: '遠古王座', cost: 10000000, fragmentCost: 80000, description: '遺跡最深處的王座之廳', unlockText: '需要 80K 💎 解鎖' },
];

export const XP_PER_LEVEL = 10;
export const LEVELS_FOR_RARITY = [0, 5, 10, 20]; // bronze, silver, gold, legendary

export const UPGRADES = [
  { id: 'training', name: '訓練場', category: 'base', baseCost: 50, costMultiplier: 1.15, maxLevel: 25, effect: 0.25, desc: '冒險者產出 +25%/級' },
  { id: 'forge', name: '裝備工坊', category: 'base', baseCost: 200, costMultiplier: 1.2, maxLevel: 20, effect: 0.5, desc: '冒險者產出 +50%/級' },
  { id: 'camp', name: '補給營地', category: 'base', baseCost: 500, costMultiplier: 1.25, maxLevel: 15, effect: 1, desc: '冒險者產出 +100%/級' },
  { id: 'shrine', name: '迴響祭壇', category: 'special', baseCost: 5000, costMultiplier: 1.3, maxLevel: 10, effect: 0.1, desc: '轉生獲得迴響石 +10%/級' },
  { id: 'lens', name: '探險望遠鏡', category: 'special', baseCost: 100000, costMultiplier: 1.4, maxLevel: 5, effect: 0.25, desc: '所有金幣產出 +25%/級（獨立乘區）' },
];
