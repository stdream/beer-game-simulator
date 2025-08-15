const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Game state storage
const games = new Map();
const playerSockets = new Map(); // Track which socket belongs to which player

class GameServer {
  constructor(gameId, config, adminId) {
    this.gameId = gameId;
    this.config = config;
    this.adminId = adminId;
    this.players = new Map();
    this.state = {
      id: gameId,
      round: 0,
      maxRounds: config.maxRounds,
      players: [],
      customerDemand: this.generateDemandPattern(config.maxRounds, config.demandPattern),
      isStarted: false,
      isEnded: false,
      inventoryCostPerUnit: config.inventoryCostPerUnit,
      stockoutCostPerUnit: config.stockoutCostPerUnit,
      deliveryDelay: config.deliveryDelay,
      adminId: adminId
    };
    this.roundHistory = [];
  }

  generateDemandPattern(maxRounds, pattern) {
    const demands = [];
    for (let i = 1; i <= maxRounds; i++) {
      if (pattern === 'stable') {
        if (i <= 4) demands.push(4);
        else demands.push(8);
      } else if (pattern === 'increasing') {
        if (i <= 4) demands.push(4);
        else if (i <= 8) demands.push(8);
        else if (i <= 12) demands.push(12);
        else if (i <= maxRounds * 0.7) demands.push(16);
        else demands.push(20);
      } else if (pattern === 'random') {
        if (i <= 4) demands.push(4);
        else demands.push(Math.floor(Math.random() * 11) + 2);
      } else {
        demands.push(4);
      }
    }
    return demands;
  }

  addPlayer(playerId, playerName, role) {
    // Remove existing player with same role
    const existingPlayer = Array.from(this.players.values()).find(p => p.role === role);
    if (existingPlayer) {
      this.players.delete(existingPlayer.id);
    }

    const player = {
      id: playerId,
      name: playerName,
      role: role,
      inventory: 12,
      backlog: 0,
      incomingDelivery: [],
      outgoingOrder: [],
      totalCost: 0,
      currentOrder: 0,
      lastDelivery: 0,
      hasOrdered: false
    };

    this.players.set(playerId, player);
    this.updateState();
    return true;
  }

  updateState() {
    this.state.players = Array.from(this.players.values());
  }

  startGame() {
    if (this.players.size !== 4) return false;
    this.state.isStarted = true;
    this.state.round = 1;
    this.updateState();
    return true;
  }

  placeOrder(playerId, quantity) {
    const player = this.players.get(playerId);
    if (!player || !this.state.isStarted || this.state.isEnded) return false;
    
    player.currentOrder = quantity;
    player.hasOrdered = true;
    player.outgoingOrder.push(quantity);
    this.updateState();
    return true;
  }

  getAllPlayersOrdered() {
    return Array.from(this.players.values()).every(player => player.hasOrdered);
  }

  processRound() {
    if (!this.state.isStarted || this.state.isEnded) return false;

    const currentDemand = this.state.customerDemand[this.state.round - 1] || 0;

    // Process deliveries
    this.players.forEach(player => {
      if (player.incomingDelivery.length > this.config.deliveryDelay) {
        const delivery = player.incomingDelivery.shift();
        player.lastDelivery = delivery;
        player.inventory += delivery;
      }
    });

    // Process demand and orders
    const roleOrder = ['retailer', 'wholesaler', 'distributor', 'factory'];
    
    // Retailer fulfills customer demand
    const retailer = Array.from(this.players.values()).find(p => p.role === 'retailer');
    if (retailer) {
      const totalDemand = retailer.backlog + currentDemand;
      if (retailer.inventory >= totalDemand) {
        retailer.inventory -= totalDemand;
        retailer.backlog = 0;
      } else {
        retailer.backlog = totalDemand - retailer.inventory;
        retailer.inventory = 0;
      }
    }

    // Process orders between players
    for (let i = 0; i < roleOrder.length - 1; i++) {
      const downstreamRole = roleOrder[i];
      const upstreamRole = roleOrder[i + 1];
      
      const downstreamPlayer = Array.from(this.players.values()).find(p => p.role === downstreamRole);
      const upstreamPlayer = Array.from(this.players.values()).find(p => p.role === upstreamRole);
      
      if (downstreamPlayer && upstreamPlayer) {
        const orderQuantity = downstreamPlayer.currentOrder;
        const totalDemand = upstreamPlayer.backlog + orderQuantity;
        
        let delivered;
        if (upstreamPlayer.inventory >= totalDemand) {
          upstreamPlayer.inventory -= totalDemand;
          delivered = totalDemand;
          upstreamPlayer.backlog = 0;
        } else {
          delivered = upstreamPlayer.inventory;
          upstreamPlayer.inventory = 0;
          upstreamPlayer.backlog = totalDemand - delivered;
        }
        
        downstreamPlayer.incomingDelivery.push(delivered);
      }
    }

    // Factory gets its order fulfilled immediately
    const factory = Array.from(this.players.values()).find(p => p.role === 'factory');
    if (factory && factory.currentOrder > 0) {
      factory.incomingDelivery.push(factory.currentOrder);
    }

    // Calculate costs
    this.players.forEach(player => {
      const inventoryCost = player.inventory * this.config.inventoryCostPerUnit;
      const stockoutCost = player.backlog * this.config.stockoutCostPerUnit;
      player.totalCost += inventoryCost + stockoutCost;
    });

    // Record round history
    this.roundHistory.push({
      round: this.state.round,
      playerStates: Array.from(this.players.values()).map(p => ({...p})),
      customerDemand: currentDemand
    });

    // Reset orders for next round
    this.players.forEach(player => {
      player.currentOrder = 0;
      player.hasOrdered = false;
    });

    this.state.round++;
    if (this.state.round > this.state.maxRounds) {
      this.state.isEnded = true;
    }

    this.updateState();
    return true;
  }

  getResults() {
    const finalScores = Array.from(this.players.values()).map(player => ({
      playerId: player.id,
      role: player.role,
      totalCost: player.totalCost
    }));

    // Calculate bullwhip index
    let bullwhipIndex = 0;
    if (this.roundHistory.length >= 10) {
      const getOrderVariance = (role) => {
        const orders = this.roundHistory
          .slice(5)
          .map(round => {
            const player = round.playerStates.find(p => p.role === role);
            return player?.currentOrder || 0;
          });

        const mean = orders.reduce((sum, val) => sum + val, 0) / orders.length;
        return orders.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / orders.length;
      };

      const demands = this.roundHistory.slice(5).map(r => r.customerDemand);
      const demandMean = demands.reduce((sum, val) => sum + val, 0) / demands.length;
      const demandVariance = demands.reduce((sum, val) => sum + Math.pow(val - demandMean, 2), 0) / demands.length;

      if (demandVariance > 0) {
        const factoryVariance = getOrderVariance('factory');
        bullwhipIndex = factoryVariance / demandVariance;
      }
    }

    return {
      gameId: this.gameId,
      rounds: this.roundHistory,
      finalScores,
      bullwhipIndex
    };
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('create-game', (config, callback) => {
    const gameId = `game-${Date.now()}`;
    const adminId = `admin-${Date.now()}`;
    const game = new GameServer(gameId, config, adminId);
    games.set(gameId, game);
    
    socket.join(gameId);
    playerSockets.set(socket.id, { gameId, playerId: adminId, isAdmin: true });
    
    // Broadcast updated games list to all clients
    io.emit('games-list-updated', Array.from(games.values()).map(g => ({
      id: g.gameId,
      round: g.state.round,
      maxRounds: g.state.maxRounds,
      players: g.state.players,
      isStarted: g.state.isStarted,
      isEnded: g.state.isEnded
    })));
    
    callback({ 
      success: true, 
      gameId, 
      adminId,
      gameState: game.state 
    });
  });

  socket.on('join-game', ({ gameId, playerId, playerName, role }, callback) => {
    const game = games.get(gameId);
    if (!game) {
      callback({ success: false, error: 'Game not found' });
      return;
    }

    const success = game.addPlayer(playerId, playerName, role);
    if (success) {
      socket.join(gameId);
      const existingPlayer = playerSockets.get(socket.id);
      playerSockets.set(socket.id, { 
        gameId, 
        playerId,
        isAdmin: existingPlayer?.isAdmin || false 
      });
      
      io.to(gameId).emit('game-updated', game.state);
      callback({ success: true, gameState: game.state });
    } else {
      callback({ success: false, error: 'Failed to join game' });
    }
  });

  socket.on('start-game', ({ gameId }, callback) => {
    const game = games.get(gameId);
    const playerInfo = playerSockets.get(socket.id);
    
    if (!game || !playerInfo?.isAdmin) {
      callback({ success: false, error: 'Unauthorized or game not found' });
      return;
    }

    const success = game.startGame();
    if (success) {
      io.to(gameId).emit('game-started', game.state);
      callback({ success: true });
    } else {
      callback({ success: false, error: 'Need 4 players to start' });
    }
  });

  socket.on('place-order', ({ gameId, playerId, quantity }, callback) => {
    const game = games.get(gameId);
    if (!game) {
      callback({ success: false, error: 'Game not found' });
      return;
    }

    const success = game.placeOrder(playerId, quantity);
    if (success) {
      io.to(gameId).emit('game-updated', game.state);
      
      // Check if all players have ordered
      if (game.getAllPlayersOrdered()) {
        io.to(gameId).emit('all-players-ordered');
      }
      
      callback({ success: true });
    } else {
      callback({ success: false, error: 'Failed to place order' });
    }
  });

  socket.on('process-round', ({ gameId }, callback) => {
    const game = games.get(gameId);
    const playerInfo = playerSockets.get(socket.id);
    
    if (!game || !playerInfo?.isAdmin) {
      callback({ success: false, error: 'Unauthorized or game not found' });
      return;
    }

    const success = game.processRound();
    if (success) {
      io.to(gameId).emit('round-processed', game.state);
      
      if (game.state.isEnded) {
        const results = game.getResults();
        io.to(gameId).emit('game-ended', results);
      }
      
      callback({ success: true });
    } else {
      callback({ success: false, error: 'Failed to process round' });
    }
  });

  socket.on('get-game-state', ({ gameId }, callback) => {
    const game = games.get(gameId);
    if (game) {
      callback({ success: true, gameState: game.state });
    } else {
      callback({ success: false, error: 'Game not found' });
    }
  });

  socket.on('get-games-list', (callback) => {
    const gamesList = Array.from(games.values()).map(game => ({
      id: game.gameId,
      round: game.state.round,
      maxRounds: game.state.maxRounds,
      players: game.state.players,
      isStarted: game.state.isStarted,
      isEnded: game.state.isEnded
    }));
    callback({ success: true, games: gamesList });
  });

  socket.on('update-demand', ({ gameId, roundIndex, newDemand }, callback) => {
    const game = games.get(gameId);
    const playerInfo = playerSockets.get(socket.id);
    
    if (!game || !playerInfo?.isAdmin) {
      callback({ success: false, error: 'Unauthorized or game not found' });
      return;
    }

    if (roundIndex >= 0 && roundIndex < game.state.customerDemand.length) {
      game.state.customerDemand[roundIndex] = newDemand;
      io.to(gameId).emit('game-updated', game.state);
      callback({ success: true });
    } else {
      callback({ success: false, error: 'Invalid round index' });
    }
  });

  socket.on('delete-game', ({ gameId }, callback) => {
    const playerInfo = playerSockets.get(socket.id);
    
    if (!playerInfo?.isAdmin) {
      callback({ success: false, error: 'Unauthorized' });
      return;
    }

    const game = games.get(gameId);
    if (game) {
      games.delete(gameId);
      io.to(gameId).emit('game-deleted');
      io.socketsLeave(gameId);
      
      // Broadcast updated games list
      io.emit('games-list-updated', Array.from(games.values()).map(g => ({
        id: g.gameId,
        round: g.state.round,
        maxRounds: g.state.maxRounds,
        players: g.state.players,
        isStarted: g.state.isStarted,
        isEnded: g.state.isEnded
      })));
      
      callback({ success: true });
    } else {
      callback({ success: false, error: 'Game not found' });
    }
  });

  socket.on('force-end-game', ({ gameId }, callback) => {
    const game = games.get(gameId);
    const playerInfo = playerSockets.get(socket.id);
    
    if (!game || !playerInfo?.isAdmin) {
      callback({ success: false, error: 'Unauthorized or game not found' });
      return;
    }

    game.state.isEnded = true;
    const results = game.getResults();
    io.to(gameId).emit('game-ended', results);
    callback({ success: true });
  });

  socket.on('kick-player', ({ gameId, playerId }, callback) => {
    const game = games.get(gameId);
    const playerInfo = playerSockets.get(socket.id);
    
    if (!game || !playerInfo?.isAdmin) {
      callback({ success: false, error: 'Unauthorized or game not found' });
      return;
    }

    game.players.delete(playerId);
    game.updateState();
    io.to(gameId).emit('game-updated', game.state);
    io.to(gameId).emit('player-kicked', { playerId });
    callback({ success: true });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    playerSockets.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});