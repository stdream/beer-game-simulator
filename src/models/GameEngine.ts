import { Player } from './Player';
import { DemandGenerator } from './DemandGenerator';
import { GameState, GameConfig, Role, RoundResult, GameResults } from '../types/game.types';

export class GameEngine {
  private players: Map<string, Player>;
  private demandGenerator: DemandGenerator;
  private gameState: GameState;
  private roundHistory: RoundResult[] = [];
  
  private readonly roleOrder: Role[] = ['retailer', 'wholesaler', 'distributor', 'factory'];

  constructor(gameId: string, config: GameConfig, adminId: string) {
    this.players = new Map();
    this.demandGenerator = new DemandGenerator(config.demandPattern, config.customDemand);
    
    this.gameState = {
      id: gameId,
      round: 0,
      maxRounds: config.maxRounds,
      players: [],
      customerDemand: this.demandGenerator.generateFullDemandPattern(config.maxRounds),
      isStarted: false,
      isEnded: false,
      inventoryCostPerUnit: config.inventoryCostPerUnit,
      stockoutCostPerUnit: config.stockoutCostPerUnit,
      deliveryDelay: config.deliveryDelay,
      adminId: adminId
    };

    // Don't auto-create players - let them join manually
    this.updateGameState();
  }

  addPlayer(playerId: string, playerName: string, role: Role): boolean {
    const existingPlayer = Array.from(this.players.values()).find(p => p.role === role);
    if (existingPlayer) {
      this.players.delete(existingPlayer.id);
    }

    const player = new Player(playerId, playerName, role, 12);
    this.players.set(playerId, player);
    this.updateGameState();
    return true;
  }

  startGame(): boolean {
    if (this.players.size !== 4) {
      return false;
    }

    this.gameState.isStarted = true;
    this.gameState.round = 1;
    this.updateGameState();
    return true;
  }

  placeOrder(playerId: string, quantity: number): boolean {
    const player = this.players.get(playerId);
    if (!player || !this.gameState.isStarted || this.gameState.isEnded) {
      return false;
    }

    player.placeOrder(quantity);
    this.updateGameState();
    return true;
  }

  processRound(): boolean {
    if (!this.gameState.isStarted || this.gameState.isEnded) {
      return false;
    }

    const currentDemand = this.gameState.customerDemand[this.gameState.round - 1] || 0;

    this.processDeliveries();

    this.processDemand(currentDemand);

    this.processOrders();

    this.calculateCosts();

    this.recordRoundHistory(currentDemand);

    this.gameState.round++;
    
    if (this.gameState.round > this.gameState.maxRounds) {
      this.endGame();
    }

    this.updateGameState();
    return true;
  }

  private processDeliveries(): void {
    this.players.forEach(player => {
      player.processIncomingDeliveries(this.gameState.deliveryDelay);
    });
  }

  private processDemand(customerDemand: number): void {
    const retailer = this.getPlayerByRole('retailer');
    if (retailer) {
      retailer.fulfillOrder(customerDemand);
    }
  }

  private processOrders(): void {
    for (let i = 0; i < this.roleOrder.length - 1; i++) {
      const downstreamRole = this.roleOrder[i];
      const upstreamRole = this.roleOrder[i + 1];
      
      const downstreamPlayer = this.getPlayerByRole(downstreamRole);
      const upstreamPlayer = this.getPlayerByRole(upstreamRole);
      
      if (downstreamPlayer && upstreamPlayer) {
        const orderQuantity = downstreamPlayer.currentOrder;
        const delivered = upstreamPlayer.fulfillOrder(orderQuantity);
        downstreamPlayer.addIncomingDelivery(delivered);
      }
    }

    const factory = this.getPlayerByRole('factory');
    if (factory && factory.currentOrder > 0) {
      factory.addIncomingDelivery(factory.currentOrder);
    }
  }

  private calculateCosts(): void {
    this.players.forEach(player => {
      player.calculateRoundCost(
        this.gameState.inventoryCostPerUnit,
        this.gameState.stockoutCostPerUnit
      );
    });
  }

  private recordRoundHistory(customerDemand: number): void {
    const roundResult: RoundResult = {
      round: this.gameState.round,
      playerStates: Array.from(this.players.values()).map(p => p.toState()),
      customerDemand: customerDemand
    };
    this.roundHistory.push(roundResult);
  }

  private getPlayerByRole(role: Role): Player | undefined {
    return Array.from(this.players.values()).find(p => p.role === role);
  }

  private updateGameState(): void {
    this.gameState.players = Array.from(this.players.values()).map(p => p.toState());
  }

  private endGame(): void {
    this.gameState.isEnded = true;
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  getGameResults(): GameResults {
    const finalScores = Array.from(this.players.values()).map(player => ({
      playerId: player.id,
      role: player.role,
      totalCost: player.totalCost
    }));

    const bullwhipIndex = this.calculateBullwhipIndex();

    return {
      gameId: this.gameState.id,
      rounds: this.roundHistory,
      finalScores,
      bullwhipIndex
    };
  }

  private calculateBullwhipIndex(): number {
    if (this.roundHistory.length < 10) return 0;

    const getOrderVariance = (role: Role): number => {
      const orders = this.roundHistory
        .slice(5)
        .map(round => {
          const player = round.playerStates.find(p => p.role === role);
          return player?.currentOrder || 0;
        });

      const mean = orders.reduce((sum, val) => sum + val, 0) / orders.length;
      const variance = orders.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / orders.length;
      return variance;
    };

    const demandVariance = (() => {
      const demands = this.roundHistory.slice(5).map(r => r.customerDemand);
      const mean = demands.reduce((sum, val) => sum + val, 0) / demands.length;
      return demands.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / demands.length;
    })();

    if (demandVariance === 0) return 0;

    const factoryVariance = getOrderVariance('factory');
    return factoryVariance / demandVariance;
  }

  getAllPlayersOrdered(): boolean {
    return Array.from(this.players.values()).every(player => player.currentOrder > 0);
  }

  resetPlayerOrders(): void {
    this.players.forEach(player => {
      player.currentOrder = 0;
    });
    this.updateGameState();
  }
}