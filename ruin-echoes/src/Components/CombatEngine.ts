import { AdventurerState, GameState } from '../Models/GameState';
import { Adventurer } from './Adventurer';

const BalanceConfig = {
  combat: {
    damageFloor: 1,
    defMitigationCoefficient: 0.3,
  },
  upgrades: {
    guildHallHPMod: 0.05,
    trainingGroundsATKMod: 0.05,
    armorSmithDEFMod: 0.05,
    vitalSpringsFlatHP: 25,
    barracksTrainingFlatATK: 5,
    ironForgingFlatDEF: 2,
  },
  specializations: {
    warriorHPMult1: 1.3,
    warriorHPMult2: 1.6,
    mageATKMult1: 1.3,
    mageATKMult2: 1.6,
    mageSunder1: 0.20,
    mageSunder2: 0.35,
  },
};

export interface Monster {
  hp: number;
  currentHP: number;
  atk: number;
  def: number;
  spd: number;
  isBoss: boolean;
}

export interface CombatResult {
  outcome: 'VICTORY' | 'WIPE';
  updatedParty: AdventurerState[];
  battleLog: string[];
}

export class CombatEngine {
  private static deepCloneParty(party: AdventurerState[]): AdventurerState[] {
    return JSON.parse(JSON.stringify(party));
  }

  static resolveEncounter(
    party: AdventurerState[],
    monster: Monster,
    upgrades: GameState['upgrades'],
    dungeonLevel: number,
  ): CombatResult {
    const battleLog: string[] = [];
    const workingParty = CombatEngine.deepCloneParty(party);

    const living = workingParty.filter(a => a.currentHP > 0);
    if (living.length === 0) {
      return { outcome: 'WIPE', updatedParty: workingParty, battleLog: ['No living adventurers to fight!'] };
    }

    const combatantDefs = living.map(adv => {
      const base = Adventurer.getBaseStats(adv.classType);
      const flatHP = base.hp + upgrades.vitalSprings * BalanceConfig.upgrades.vitalSpringsFlatHP;
      const flatATK = base.atk + upgrades.barracksTraining * BalanceConfig.upgrades.barracksTrainingFlatATK;
      const flatDEF = base.def + upgrades.ironForging * BalanceConfig.upgrades.ironForgingFlatDEF;
      let hp = Math.floor(flatHP * (1 + upgrades.guildHall * BalanceConfig.upgrades.guildHallHPMod));
      let atk = Math.floor(flatATK * (1 + upgrades.trainingGrounds * BalanceConfig.upgrades.trainingGroundsATKMod));
      let def = Math.floor(flatDEF * (1 + upgrades.armorSmith * BalanceConfig.upgrades.armorSmithDEFMod));
      const spd = base.spd;
      const specLevel = adv.specializationLevel;

      if (adv.classType === 'Warrior' && specLevel >= 1) {
        const mult = specLevel >= 2 ? BalanceConfig.specializations.warriorHPMult2 : BalanceConfig.specializations.warriorHPMult1;
        hp = Math.floor(hp * mult);
        battleLog.push(`[Spec] Warrior spec ${specLevel}: HP ×${mult} → ${hp}`);
      }
      if (adv.classType === 'Mage' && specLevel >= 1) {
        const mult = specLevel >= 2 ? BalanceConfig.specializations.mageATKMult2 : BalanceConfig.specializations.mageATKMult1;
        atk = Math.floor(atk * mult);
        battleLog.push(`[Spec] Mage spec ${specLevel}: ATK ×${mult} → ${atk}`);
      }

      return { id: adv.id, classType: adv.classType, hp, atk, def, spd, currentHP: adv.currentHP, specLevel };
    });

    const mageTeam = combatantDefs.filter(c => c.classType === 'Mage');
    const hasMageSunderLevel2 = mageTeam.some(m => m.specLevel >= 2);
    const hasMageSunderLevel1 = mageTeam.some(m => m.specLevel >= 1);

    const avgSPD = combatantDefs.reduce((s, c) => s + c.spd, 0) / combatantDefs.length;
    const partyStrikesFirst = avgSPD > monster.spd;
    let freeRoundEarned = avgSPD > monster.spd * 2;

    if (partyStrikesFirst) {
      battleLog.push(`[Speed] Party SPD (${avgSPD.toFixed(1)}) > Monster SPD (${monster.spd}) → first strike`);
      if (freeRoundEarned) {
        battleLog.push(`[Speed] Party SPD > 2× Monster SPD → free round!`);
      }
    } else {
      battleLog.push(`[Speed] Monster SPD (${monster.spd}) ≥ Party SPD (${avgSPD.toFixed(1)}) → monster first`);
    }

    if (monster.currentHP === undefined) {
      monster.currentHP = monster.hp;
    }
    let roundCounter = 1;

    while (monster.currentHP > 0 && combatantDefs.some(c => c.currentHP > 0)) {
      const liveNow = combatantDefs.filter(c => c.currentHP > 0);

      if (partyStrikesFirst || roundCounter > 1) {
        const totalPartyATK = liveNow.reduce((sum, adv) => sum + adv.atk, 0);
        const mageSunderMult = hasMageSunderLevel2 ? 0.65 : (hasMageSunderLevel1 ? 0.80 : 1.0);
        const adjustedMonsterDEF = monster.def * mageSunderMult;
        const netDamageToMonster = Math.max(1, totalPartyATK - (adjustedMonsterDEF * 0.3));
        monster.currentHP -= Math.round(netDamageToMonster);
        monster.currentHP = Math.max(0, monster.currentHP);
        battleLog.push(`Round ${roundCounter}: Party strikes Monster for ${Math.round(netDamageToMonster)} damage. (Monster HP: ${monster.currentHP})`);

        if (roundCounter === 1) {
          console.log(`[Combat Debug R1] totalPartyATK: ${totalPartyATK}, adjustedMonsterDEF: ${adjustedMonsterDEF}, netDamageToMonster: ${Math.round(netDamageToMonster)}`);
        }

        if (monster.currentHP <= 0) break;
      }

      if (freeRoundEarned && roundCounter === 1) {
        freeRoundEarned = false;
        battleLog.push(`Round ${roundCounter}: Free round — monster cannot counter!`);
        roundCounter++;
        continue;
      }

      const eligible = combatantDefs.filter(c => c.currentHP > 0);
      const civilianWarriorAlive = eligible.some(c => c.classType === 'Warrior' && c.specLevel >= 1);
      const specializedWarriorInstance = eligible.find(c => c.classType === 'Warrior' && c.specLevel >= 1);
      const target = civilianWarriorAlive && specializedWarriorInstance ? specializedWarriorInstance : eligible[Math.floor(Math.random() * eligible.length)];

      const bossATKMULT = 1.5 + Math.floor(dungeonLevel / 20) * 0.25;
      const finalBossATK = monster.isBoss ? (monster.atk * bossATKMULT) : monster.atk;
      const netDamageToPlayer = Math.max(1, finalBossATK - target.def);
      target.currentHP = Math.max(0, target.currentHP - Math.round(netDamageToPlayer));
      battleLog.push(`Round ${roundCounter}: Monster counters ${target.classType} for ${Math.round(netDamageToPlayer)} damage.`);

      if (roundCounter === 1) {
        console.log(`[Combat Debug R1] finalBossATK: ${finalBossATK}, targetDEF: ${target.def}, netDamageToPlayer: ${Math.round(netDamageToPlayer)}, dungeonLevel: ${dungeonLevel}`);
      }

      if (target.currentHP <= 0) {
        battleLog.push(`${target.classType} has fallen!`);
      }

      roundCounter++;
    }

    if (combatantDefs.every(c => c.currentHP <= 0)) {
      CombatEngine.syncHP(workingParty, combatantDefs);
      battleLog.push('Party has been wiped out!');
      return { outcome: 'WIPE', updatedParty: workingParty, battleLog };
    }

    const priest = combatantDefs.find(c => c.classType === 'Priest');
    const priestSpecLevel = priest ? priest.specLevel : 0;
    const recoveryPct = 0.05 + upgrades.rations * 0.03 + priestSpecLevel * 0.10;

    battleLog.push(`[Heal] Post-combat recovery: ${(recoveryPct * 100).toFixed(1)}%`);

    for (const c of combatantDefs) {
      if (c.currentHP <= 0) continue;
      const healAmount = Math.floor(c.hp * recoveryPct);
      c.currentHP = Math.min(c.hp, c.currentHP + healAmount);
    }

    CombatEngine.syncHP(workingParty, combatantDefs);

    const xpPool = monster.isBoss
      ? Math.floor(50 * (1 + dungeonLevel * 0.4))
      : Math.floor(15 * (1 + dungeonLevel * 0.2));
    if (party.length > 0) {
      const xpPerHero = Math.floor(xpPool / party.length);
      battleLog.push(`[XP] Party earned ${xpPool} XP (${xpPerHero} each)`);
      for (const adv of workingParty) {
        if (adv.currentHP <= 0) continue;
        adv.xp += xpPerHero;
        while (adv.xp >= adv.nextLevelXp) {
          adv.xp -= adv.nextLevelXp;
          adv.level += 1;
          adv.nextLevelXp = Math.floor(100 * Math.pow(1.25, adv.level - 1));
          const stats = Adventurer.computeStats(adv, upgrades);
          adv.currentHP = stats.hp;
          battleLog.push(`[Level Up!] ${adv.classType} has reached Level ${adv.level}!`);
        }
      }
    }

    battleLog.push('Victory!');
    return { outcome: 'VICTORY', updatedParty: workingParty, battleLog };
  }

  private static syncHP(party: AdventurerState[], combatants: { id: string; currentHP: number }[]): void {
    for (const c of combatants) {
      const adv = party.find(a => a.id === c.id);
      if (adv) adv.currentHP = c.currentHP;
    }
  }
}
