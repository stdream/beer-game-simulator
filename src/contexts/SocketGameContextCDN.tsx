import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { GameState, GameConfig, Role, GameResults } from '../types/game.types';

// Socket.IO will be loaded from CDN
declare global {
  interface Window {
    io: any;
  }
}

interface GameContextType {
  socket: any;
  gameState: GameState | null;
  currentPlayerId: string | null;
  currentPlayerRole: Role | null;
  isAdmin: boolean;
  gameResults: GameResults | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  currentGameId: string | null;
  gameMode: 'home' | 'creating' | 'joining';
  
  createGame: (config: GameConfig) => void;
  joinGame: (playerName: string, role: Role) => void;
  joinExistingGame: (gameId: string) => void;
  startGame: () => void;
  placeOrder: (quantity: number) => void;
  processRound: () => void;
  resetGame: () => void;
  setCurrentGameId: (gameId: string | null) => void;
  setGameMode: (mode: 'home' | 'creating' | 'joining') => void;
  updateDemand: (roundIndex: number, newDemand: number) => void;
  deleteGame: () => void;
  forceEndGame: () => void;
  kickPlayer: (playerId: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const SocketGameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<any>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [currentPlayerRole, setCurrentPlayerRole] = useState<Role | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [gameResults, setGameResults] = useState<GameResults | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<'home' | 'creating' | 'joining'>('home');

  // Load Socket.IO from CDN and initialize connection
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.6.1/socket.io.min.js';
    script.async = true;
    
    script.onload = () => {
      if (!window.io) {
        console.error('Socket.IO failed to load');
        setConnectionStatus('disconnected');
        return;
      }

      const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
      const newSocket = window.io(serverUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setConnectionStatus('connected');
        
        // Rejoin game if we have a gameId
        const savedGameId = sessionStorage.getItem('currentGameId');
        if (savedGameId) {
          newSocket.emit('get-game-state', { gameId: savedGameId }, (response: any) => {
            if (response.success) {
              setGameState(response.gameState);
              setCurrentGameId(savedGameId);
            }
          });
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnectionStatus('disconnected');
      });

      newSocket.on('game-updated', (updatedState: GameState) => {
        console.log('Game updated:', updatedState);
        setGameState(updatedState);
      });

      newSocket.on('game-started', (updatedState: GameState) => {
        console.log('Game started:', updatedState);
        setGameState(updatedState);
      });

      newSocket.on('all-players-ordered', () => {
        console.log('All players have placed their orders');
      });

      newSocket.on('round-processed', (updatedState: GameState) => {
        console.log('Round processed:', updatedState);
        setGameState(updatedState);
      });

      newSocket.on('game-ended', (results: GameResults) => {
        console.log('Game ended:', results);
        setGameResults(results);
      });

      newSocket.on('game-deleted', () => {
        console.log('Game was deleted');
        resetGame();
        alert('게임이 관리자에 의해 삭제되었습니다.');
      });

      newSocket.on('player-kicked', ({ playerId }: { playerId: string }) => {
        if (currentPlayerId === playerId) {
          resetGame();
          alert('관리자에 의해 게임에서 퇴장당했습니다.');
        }
      });

      setSocket(newSocket);
    };

    document.body.appendChild(script);

    return () => {
      if (socket) {
        socket.disconnect();
      }
      // Remove script
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const createGame = useCallback((config: GameConfig) => {
    if (!socket) return;

    socket.emit('create-game', config, (response: any) => {
      if (response.success) {
        console.log('Game created:', response);
        setCurrentGameId(response.gameId);
        setGameState(response.gameState);
        setCurrentPlayerId(response.adminId);
        setIsAdmin(true);
        setCurrentPlayerRole(null);
        setGameResults(null);
        setGameMode('joining');
        sessionStorage.setItem('currentGameId', response.gameId);
        sessionStorage.setItem('isAdmin', 'true');
      }
    });
  }, [socket]);

  const joinGame = useCallback((playerName: string, role: Role) => {
    if (!socket || !currentGameId) return;

    const playerId = currentPlayerId || `player-${Date.now()}`;
    
    socket.emit('join-game', {
      gameId: currentGameId,
      playerId,
      playerName,
      role
    }, (response: any) => {
      if (response.success) {
        console.log('Joined game:', response);
        setGameState(response.gameState);
        setCurrentPlayerId(playerId);
        setCurrentPlayerRole(role);
        sessionStorage.setItem('currentPlayerId', playerId);
        sessionStorage.setItem('currentPlayerRole', role);
      }
    });
  }, [socket, currentGameId, currentPlayerId]);

  const startGame = useCallback(() => {
    if (!socket || !currentGameId || !isAdmin) return;

    socket.emit('start-game', { gameId: currentGameId }, (response: any) => {
      if (response.success) {
        console.log('Game started successfully');
      } else {
        console.error('Failed to start game:', response.error);
        alert(response.error || 'Failed to start game');
      }
    });
  }, [socket, currentGameId, isAdmin]);

  const placeOrder = useCallback((quantity: number) => {
    if (!socket || !currentGameId || !currentPlayerId) return;

    socket.emit('place-order', {
      gameId: currentGameId,
      playerId: currentPlayerId,
      quantity
    }, (response: any) => {
      if (!response.success) {
        console.error('Failed to place order:', response.error);
      }
    });
  }, [socket, currentGameId, currentPlayerId]);

  const processRound = useCallback(() => {
    if (!socket || !currentGameId || !isAdmin) return;

    socket.emit('process-round', { gameId: currentGameId }, (response: any) => {
      if (!response.success) {
        console.error('Failed to process round:', response.error);
      }
    });
  }, [socket, currentGameId, isAdmin]);

  const joinExistingGame = useCallback((gameId: string) => {
    if (!socket) return;

    setCurrentGameId(gameId);
    setGameMode('joining');
    sessionStorage.setItem('currentGameId', gameId);
    
    // Fetch the game state
    socket.emit('get-game-state', { gameId }, (response: any) => {
      if (response.success) {
        setGameState(response.gameState);
        // Check if we're already in this game
        const savedPlayerId = sessionStorage.getItem('currentPlayerId');
        if (savedPlayerId && response.gameState.players.some((p: any) => p.id === savedPlayerId)) {
          setCurrentPlayerId(savedPlayerId);
          const player = response.gameState.players.find((p: any) => p.id === savedPlayerId);
          if (player) {
            setCurrentPlayerRole(player.role);
          }
        }
      } else {
        console.error('Failed to join game:', response.error);
        alert('게임을 찾을 수 없습니다.');
        setCurrentGameId(null);
        setGameMode('home');
        sessionStorage.removeItem('currentGameId');
      }
    });
  }, [socket]);

  const resetGame = useCallback(() => {
    sessionStorage.clear();
    setGameState(null);
    setCurrentPlayerId(null);
    setCurrentPlayerRole(null);
    setIsAdmin(false);
    setGameResults(null);
    setCurrentGameId(null);
    setGameMode('home');
  }, []);

  const updateDemand = useCallback((roundIndex: number, newDemand: number) => {
    if (!socket || !currentGameId || !isAdmin) return;

    socket.emit('update-demand', {
      gameId: currentGameId,
      roundIndex,
      newDemand
    }, (response: any) => {
      if (!response.success) {
        console.error('Failed to update demand:', response.error);
      }
    });
  }, [socket, currentGameId, isAdmin]);

  const deleteGame = useCallback(() => {
    if (!socket || !currentGameId || !isAdmin) return;

    socket.emit('delete-game', { gameId: currentGameId }, (response: any) => {
      if (response.success) {
        resetGame();
      } else {
        console.error('Failed to delete game:', response.error);
      }
    });
  }, [socket, currentGameId, isAdmin, resetGame]);

  const forceEndGame = useCallback(() => {
    if (!socket || !currentGameId || !isAdmin) return;

    socket.emit('force-end-game', { gameId: currentGameId }, (response: any) => {
      if (!response.success) {
        console.error('Failed to end game:', response.error);
      }
    });
  }, [socket, currentGameId, isAdmin]);

  const kickPlayer = useCallback((playerId: string) => {
    if (!socket || !currentGameId || !isAdmin) return;

    socket.emit('kick-player', {
      gameId: currentGameId,
      playerId
    }, (response: any) => {
      if (!response.success) {
        console.error('Failed to kick player:', response.error);
      }
    });
  }, [socket, currentGameId, isAdmin]);

  // Load saved session on mount
  useEffect(() => {
    const savedGameId = sessionStorage.getItem('currentGameId');
    const savedPlayerId = sessionStorage.getItem('currentPlayerId');
    const savedRole = sessionStorage.getItem('currentPlayerRole');
    const savedIsAdmin = sessionStorage.getItem('isAdmin') === 'true';

    if (savedGameId) {
      setCurrentGameId(savedGameId);
      setCurrentPlayerId(savedPlayerId);
      setCurrentPlayerRole(savedRole as Role);
      setIsAdmin(savedIsAdmin);
    }
  }, []);

  return (
    <GameContext.Provider
      value={{
        socket,
        gameState,
        currentPlayerId,
        currentPlayerRole,
        isAdmin,
        gameResults,
        connectionStatus,
        currentGameId,
        gameMode,
        createGame,
        joinGame,
        joinExistingGame,
        startGame,
        placeOrder,
        processRound,
        resetGame,
        setCurrentGameId,
        setGameMode,
        updateDemand,
        deleteGame,
        forceEndGame,
        kickPlayer
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useSocketGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useSocketGame must be used within a SocketGameProvider');
  }
  return context;
};