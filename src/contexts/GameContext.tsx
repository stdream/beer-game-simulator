import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameEngine } from '../models/GameEngine';
import { GameState, GameConfig, Role, GameResults } from '../types/game.types';

interface GameContextType {
  gameEngine: GameEngine | null;
  gameState: GameState | null;
  currentPlayerId: string | null;
  currentPlayerRole: Role | null;
  isAdmin: boolean;
  gameResults: GameResults | null;
  
  createGame: (config: GameConfig) => void;
  joinGame: (gameId: string, playerId: string, playerName: string, role: Role) => void;
  startGame: () => void;
  placeOrder: (quantity: number) => void;
  processRound: () => void;
  resetGame: () => void;
  setCurrentPlayer: (playerId: string, role: Role, isAdmin: boolean) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const STORAGE_KEY = 'beer-game-state';

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [currentPlayerRole, setCurrentPlayerRole] = useState<Role | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [gameResults, setGameResults] = useState<GameResults | null>(null);

  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.gameState && parsed.config) {
          const engine = new GameEngine(
            parsed.gameState.id,
            parsed.config,
            parsed.gameState.adminId
          );
          setGameEngine(engine);
          setGameState(engine.getGameState());
        }
      } catch (error) {
        console.error('Error loading saved game state:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (gameState) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        gameState,
        config: {
          maxRounds: gameState.maxRounds,
          initialInventory: 12,
          inventoryCostPerUnit: gameState.inventoryCostPerUnit,
          stockoutCostPerUnit: gameState.stockoutCostPerUnit,
          deliveryDelay: gameState.deliveryDelay,
          demandPattern: 'stable'
        }
      }));
    }
  }, [gameState]);

  const createGame = (config: GameConfig) => {
    const gameId = `game-${Date.now()}`;
    const adminId = `admin-${Date.now()}`;
    const engine = new GameEngine(gameId, config, adminId);
    
    setGameEngine(engine);
    setGameState(engine.getGameState());
    setCurrentPlayerId(adminId);
    setIsAdmin(true);
    setCurrentPlayerRole(null); // Admin needs to select a role too
    setGameResults(null);
  };

  const joinGame = (gameId: string, playerId: string, playerName: string, role: Role) => {
    if (!gameEngine) return;
    
    const success = gameEngine.addPlayer(playerId, playerName, role);
    if (success) {
      setGameState(gameEngine.getGameState());
      // Keep admin status if this is the admin joining
      if (!currentPlayerId || currentPlayerId.startsWith('admin-')) {
        setCurrentPlayerId(playerId);
      }
      setCurrentPlayerRole(role);
    }
  };

  const startGame = () => {
    if (!gameEngine || !isAdmin) return;
    
    const success = gameEngine.startGame();
    if (success) {
      setGameState(gameEngine.getGameState());
    }
  };

  const placeOrder = (quantity: number) => {
    if (!gameEngine || !currentPlayerId) return;
    
    const success = gameEngine.placeOrder(currentPlayerId, quantity);
    if (success) {
      setGameState(gameEngine.getGameState());
    }
  };

  const processRound = () => {
    if (!gameEngine || !isAdmin) return;
    
    const success = gameEngine.processRound();
    if (success) {
      const newState = gameEngine.getGameState();
      setGameState(newState);
      
      if (newState.isEnded) {
        setGameResults(gameEngine.getGameResults());
      }
      
      gameEngine.resetPlayerOrders();
      setGameState(gameEngine.getGameState());
    }
  };

  const resetGame = () => {
    localStorage.removeItem(STORAGE_KEY);
    setGameEngine(null);
    setGameState(null);
    setCurrentPlayerId(null);
    setCurrentPlayerRole(null);
    setIsAdmin(false);
    setGameResults(null);
  };

  const setCurrentPlayer = (playerId: string, role: Role, admin: boolean) => {
    setCurrentPlayerId(playerId);
    setCurrentPlayerRole(role);
    setIsAdmin(admin);
  };

  return (
    <GameContext.Provider
      value={{
        gameEngine,
        gameState,
        currentPlayerId,
        currentPlayerRole,
        isAdmin,
        gameResults,
        createGame,
        joinGame,
        startGame,
        placeOrder,
        processRound,
        resetGame,
        setCurrentPlayer
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};