export class DemandGenerator {
  private pattern: 'stable' | 'increasing' | 'random' | 'custom';
  private customDemand?: number[];
  private baselineDemand: number = 4;

  constructor(pattern: 'stable' | 'increasing' | 'random' | 'custom' = 'stable', customDemand?: number[]) {
    this.pattern = pattern;
    this.customDemand = customDemand;
  }

  generateDemand(round: number, maxRounds: number): number {
    switch (this.pattern) {
      case 'stable':
        return this.generateStableDemand(round);
      
      case 'increasing':
        return this.generateIncreasingDemand(round, maxRounds);
      
      case 'random':
        return this.generateRandomDemand(round);
      
      case 'custom':
        return this.generateCustomDemand(round);
      
      default:
        return this.baselineDemand;
    }
  }

  private generateStableDemand(round: number): number {
    if (round <= 4) {
      return 4;
    } else if (round === 5) {
      return 8;
    } else {
      return 8;
    }
  }

  private generateIncreasingDemand(round: number, maxRounds: number): number {
    if (round <= 4) {
      return 4;
    } else if (round <= 8) {
      return 8;
    } else if (round <= 12) {
      return 12;
    } else if (round <= maxRounds * 0.7) {
      return 16;
    } else {
      return 20;
    }
  }

  private generateRandomDemand(round: number): number {
    const min = 2;
    const max = 12;
    
    if (round <= 4) {
      return 4;
    }
    
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateCustomDemand(round: number): number {
    if (!this.customDemand || this.customDemand.length === 0) {
      return this.baselineDemand;
    }
    
    if (round - 1 < this.customDemand.length) {
      return this.customDemand[round - 1];
    }
    
    return this.customDemand[this.customDemand.length - 1];
  }

  generateFullDemandPattern(maxRounds: number): number[] {
    const pattern: number[] = [];
    for (let round = 1; round <= maxRounds; round++) {
      pattern.push(this.generateDemand(round, maxRounds));
    }
    return pattern;
  }
}