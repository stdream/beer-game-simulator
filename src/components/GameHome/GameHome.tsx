import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import { useSocketGame } from '../../contexts/SocketGameContextCDN';

export const GameHome: React.FC = () => {
  const { socket, connectionStatus, setGameMode, joinExistingGame } = useSocketGame();
  const [availableGames, setAvailableGames] = useState<any[]>([]);
  const [gameIdToJoin, setGameIdToJoin] = useState('');

  useEffect(() => {
    if (!socket || connectionStatus !== 'connected') return;

    // Request list of available games
    socket.emit('get-games-list', (response: any) => {
      if (response.success) {
        setAvailableGames(response.games);
      }
    });

    // Listen for game list updates
    socket.on('games-list-updated', (games: any[]) => {
      setAvailableGames(games);
    });

    return () => {
      socket.off('games-list-updated');
    };
  }, [socket, connectionStatus]);

  const handleJoinGame = (gameId: string) => {
    joinExistingGame(gameId);
  };

  const handleJoinByCode = () => {
    if (gameIdToJoin) {
      joinExistingGame(gameIdToJoin);
    }
  };

  const handleCreateNewGame = () => {
    sessionStorage.removeItem('currentGameId');
    setGameMode('creating');
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            Beer Game Simulator - 멀티플레이어
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleCreateNewGame}
            >
              새 게임 생성하기
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>또는</Divider>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              게임 코드로 참가
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                label="게임 ID 입력"
                value={gameIdToJoin}
                onChange={(e) => setGameIdToJoin(e.target.value)}
                placeholder="예: game-1234567890"
              />
              <Button
                variant="outlined"
                onClick={handleJoinByCode}
                disabled={!gameIdToJoin}
                sx={{ minWidth: 100 }}
              >
                참가
              </Button>
            </Box>
          </Box>

          {availableGames.length > 0 && (
            <>
              <Divider sx={{ my: 3 }}>또는</Divider>
              <Box>
                <Typography variant="h6" gutterBottom>
                  진행 중인 게임
                </Typography>
                <List>
                  {availableGames.map((game) => (
                    <ListItem key={game.id} divider>
                      <ListItemText
                        primary={`게임 ID: ${game.id}`}
                        secondary={
                          <>
                            라운드: {game.round}/{game.maxRounds} | 
                            플레이어: {game.players.length}/4
                            {game.isStarted && (
                              <Chip label="진행 중" size="small" color="primary" sx={{ ml: 1 }} />
                            )}
                          </>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleJoinGame(game.id)}
                          disabled={game.isStarted && game.players.length === 4}
                        >
                          참가
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </>
          )}

          {connectionStatus === 'disconnected' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              서버와 연결이 끊어졌습니다. 서버를 확인해주세요.
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};