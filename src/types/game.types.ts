export type Role = 'retailer' | 'wholesaler' | 'distributor' | 'factory';

export interface PlayerState {
  id: string;
  name: string;
  role: Role;
  inventory: number;
  backlog: number;
  incomingDelivery: number[];
  outgoingOrder: number[];
  totalCost: number;
  currentOrder: number;
  lastDelivery: number;
  hasOrdered?: boolean;
}

export interface GameState {
  id: string;
  round: number;
  maxRounds: number;
  players: PlayerState[];
  customerDemand: number[];
  isStarted: boolean;
  isEnded: boolean;
  inventoryCostPerUnit: number;
  stockoutCostPerUnit: number;
  deliveryDelay: number;
  adminId: string;
}

export interface GameConfig {
  maxRounds: number;
  initialInventory: number;
  inventoryCostPerUnit: number;
  stockoutCostPerUnit: number;
  deliveryDelay: number;
  demandPattern: 'stable' | 'increasing' | 'random' | 'custom';
  customDemand?: number[];
}

export interface RoundResult {
  round: number;
  playerStates: PlayerState[];
  customerDemand: number;
}

export interface GameResults {
  gameId: string;
  rounds: RoundResult[];
  finalScores: { playerId: string; role: Role; totalCost: number }[];
  bullwhipIndex: number;
}