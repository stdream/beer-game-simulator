import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar
} from '@mui/material';
import { Role } from '../../types/game.types';
import { useSocketGame } from '../../contexts/SocketGameContextCDN';

const roleColors: Record<Role, string> = {
  retailer: '#4caf50',
  wholesaler: '#2196f3',
  distributor: '#ff9800',
  factory: '#9c27b0'
};

const roleKorean: Record<Role, string> = {
  retailer: '소매상',
  wholesaler: '도매상',
  distributor: '유통업체',
  factory: '공장'
};

export const GameLobby: React.FC = () => {
  const { gameState, joinGame, startGame, isAdmin, currentPlayerRole } = useSocketGame();
  const [playerName, setPlayerName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | ''>('');

  if (!gameState) return null;

  const handleJoin = () => {
    if (playerName && selectedRole) {
      joinGame(playerName, selectedRole);
      setPlayerName('');
      setSelectedRole('');
    }
  };

  const isRoleTaken = (role: Role) => {
    return gameState.players.some(p => p.role === role);
  };

  const canStartGame = gameState.players.length === 4 && isAdmin;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            게임 대기실
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            게임 ID: {gameState.id}
          </Typography>

          {(!currentPlayerRole || (isAdmin && gameState.players.length < 4)) && (
            <Box sx={{ mt: 3, mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Grid container spacing={2}>
                {/* @ts-ignore */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="플레이어 이름"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                </Grid>
                {/* @ts-ignore */}
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>역할 선택</InputLabel>
                    <Select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as Role)}
                      label="역할 선택"
                    >
                      <MenuItem value="">선택하세요</MenuItem>
                      {(['retailer', 'wholesaler', 'distributor', 'factory'] as Role[]).map(role => (
                        <MenuItem 
                          key={role} 
                          value={role}
                          disabled={isRoleTaken(role)}
                        >
                          {roleKorean[role]} {isRoleTaken(role) && '(선택됨)'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {/* @ts-ignore */}
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleJoin}
                    disabled={!playerName || !selectedRole}
                    sx={{ height: '56px' }}
                  >
                    참가하기
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          {currentPlayerRole && (
            <Box sx={{ mt: 2, mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
              <Typography variant="body1">
                당신의 역할: <Chip 
                  label={roleKorean[currentPlayerRole]} 
                  sx={{ bgcolor: roleColors[currentPlayerRole], color: 'white' }}
                />
              </Typography>
            </Box>
          )}

          <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
            참가자 ({gameState.players.length}/4)
          </Typography>

          <List>
            {(['retailer', 'wholesaler', 'distributor', 'factory'] as Role[]).map(role => {
              const player = gameState.players.find(p => p.role === role);
              return (
                <ListItem key={role}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: roleColors[role] }}>
                      {roleKorean[role][0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={roleKorean[role]}
                    secondary={player ? player.name : '대기 중...'}
                  />
                  {player && (
                    <Chip 
                      label="준비 완료" 
                      color="success" 
                      size="small"
                    />
                  )}
                </ListItem>
              );
            })}
          </List>

          {isAdmin && (
            <Box sx={{ mt: 3 }}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={startGame}
                disabled={!canStartGame}
              >
                {canStartGame ? '게임 시작' : `${4 - gameState.players.length}명 더 필요합니다`}
              </Button>
            </Box>
          )}

          {!isAdmin && gameState.players.length === 4 && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                관리자가 게임을 시작하기를 기다리는 중...
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};