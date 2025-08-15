import { PlayerState, Role } from '../types/game.types';

export class Player implements PlayerState {
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

  constructor(id: string, name: string, role: Role, initialInventory: number = 12) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.inventory = initialInventory;
    this.backlog = 0;
    this.incomingDelivery = [];
    this.outgoingOrder = [];
    this.totalCost = 0;
    this.currentOrder = 0;
    this.lastDelivery = 0;
  }

  placeOrder(quantity: number): void {
    this.currentOrder = quantity;
    this.outgoingOrder.push(quantity);
  }

  receiveDelivery(quantity: number): void {
    this.lastDelivery = quantity;
    this.inventory += quantity;
  }

  fulfillOrder(orderQuantity: number): number {
    const availableInventory = this.inventory;
    const totalDemand = this.backlog + orderQuantity;
    
    if (availableInventory >= totalDemand) {
      this.inventory -= totalDemand;
      const delivered = totalDemand;
      this.backlog = 0;
      return delivered;
    } else {
      const delivered = availableInventory;
      this.inventory = 0;
      this.backlog = totalDemand - availableInventory;
      return delivered;
    }
  }

  calculateRoundCost(inventoryCost: number, stockoutCost: number): number {
    const inventoryCostTotal = this.inventory * inventoryCost;
    const stockoutCostTotal = this.backlog * stockoutCost;
    const roundCost = inventoryCostTotal + stockoutCostTotal;
    this.totalCost += roundCost;
    return roundCost;
  }

  addIncomingDelivery(quantity: number): void {
    this.incomingDelivery.push(quantity);
  }

  processIncomingDeliveries(deliveryDelay: number): void {
    if (this.incomingDelivery.length >= deliveryDelay) {
      const delivery = this.incomingDelivery.shift();
      if (delivery !== undefined) {
        this.receiveDelivery(delivery);
      }
    }
  }

  reset(initialInventory: number = 12): void {
    this.inventory = initialInventory;
    this.backlog = 0;
    this.incomingDelivery = [];
    this.outgoingOrder = [];
    this.totalCost = 0;
    this.currentOrder = 0;
    this.lastDelivery = 0;
  }

  toState(): PlayerState {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      inventory: this.inventory,
      backlog: this.backlog,
      incomingDelivery: [...this.incomingDelivery],
      outgoingOrder: [...this.outgoingOrder],
      totalCost: this.totalCost,
      currentOrder: this.currentOrder,
      lastDelivery: this.lastDelivery
    };
  }
}