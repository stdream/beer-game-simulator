import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  LinearProgress,
  TextField,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { useSocketGame } from '../../contexts/SocketGameContextCDN';
import { Role } from '../../types/game.types';

const roleKorean: Record<Role, string> = {
  retailer: '소매상',
  wholesaler: '도매상',
  distributor: '유통업체',
  factory: '공장'
};

export const AdminPanel: React.FC = () => {
  const { gameState, processRound, updateDemand, deleteGame, forceEndGame, kickPlayer } = useSocketGame();
  const [demandOverride, setDemandOverride] = useState<{ [key: number]: string }>({});
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: string; data?: any }>({ open: false, action: '' });

  if (!gameState) return null;

  const allPlayersOrdered = gameState.players.every(p => p.hasOrdered || p.currentOrder > 0);
  const progressPercent = (gameState.round / gameState.maxRounds) * 100;
  const currentDemand = gameState.customerDemand[gameState.round - 1] || 0;

  const handleProcessRound = () => {
    processRound();
  };

  const handleDemandChange = (roundIndex: number) => {
    const newDemand = parseInt(demandOverride[roundIndex]);
    if (!isNaN(newDemand) && newDemand >= 0) {
      updateDemand(roundIndex, newDemand);
      setDemandOverride({ ...demandOverride, [roundIndex]: '' });
    }
  };

  const handleDeleteGame = () => {
    setConfirmDialog({ open: true, action: 'delete' });
  };

  const handleForceEnd = () => {
    setConfirmDialog({ open: true, action: 'end' });
  };

  const handleKickPlayer = (playerId: string) => {
    setConfirmDialog({ open: true, action: 'kick', data: playerId });
  };

  const handleConfirm = () => {
    switch (confirmDialog.action) {
      case 'delete':
        deleteGame();
        break;
      case 'end':
        forceEndGame();
        break;
      case 'kick':
        kickPlayer(confirmDialog.data);
        break;
    }
    setConfirmDialog({ open: false, action: '' });
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', mt: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          관리자 패널
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Chip label={`라운드 ${gameState.round}/${gameState.maxRounds}`} color="primary" />
          <Chip label={`고객 수요: ${currentDemand}`} color="warning" />
          <Chip label="관리자" color="secondary" />
        </Box>
        <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 8, borderRadius: 1 }} />
      </Box>

      <Grid container spacing={3}>
        {/* @ts-ignore */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                라운드 진행 관리
              </Typography>
              
              {!allPlayersOrdered ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  모든 플레이어가 주문을 완료하기를 기다리는 중입니다...
                </Alert>
              ) : (
                <Alert severity="success" sx={{ mb: 2 }}>
                  모든 플레이어가 주문을 완료했습니다. 라운드를 진행할 수 있습니다.
                </Alert>
              )}

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleProcessRound}
                disabled={!allPlayersOrdered || gameState.isEnded}
              >
                {gameState.isEnded ? '게임 종료됨' : '다음 라운드 진행'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                플레이어 현황
              </Typography>
              
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>플레이어</TableCell>
                      <TableCell>역할</TableCell>
                      <TableCell align="center">재고</TableCell>
                      <TableCell align="center">미처리 주문</TableCell>
                      <TableCell align="center">현재 주문</TableCell>
                      <TableCell align="center">배송 대기</TableCell>
                      <TableCell align="right">누적 비용</TableCell>
                      <TableCell align="center">상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gameState.players.map((player) => (
                      <TableRow key={player.id}>
                        <TableCell>{player.name}</TableCell>
                        <TableCell>
                          <Chip label={roleKorean[player.role]} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="bold">
                            {player.inventory}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography 
                            variant="body2" 
                            color={player.backlog > 0 ? 'error' : 'text.primary'}
                            fontWeight={player.backlog > 0 ? 'bold' : 'normal'}
                          >
                            {player.backlog}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {player.currentOrder > 0 ? (
                            <Chip label={player.currentOrder} color="primary" size="small" />
                          ) : (
                            <Chip label="대기 중" variant="outlined" size="small" />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {player.incomingDelivery.reduce((sum, qty) => sum + qty, 0) || '-'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="error" fontWeight="bold">
                            ${player.totalCost.toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {player.currentOrder > 0 ? (
                              <Chip label="주문 완료" color="success" size="small" />
                            ) : (
                              <Chip label="주문 대기" color="warning" size="small" />
                            )}
                            <Button
                              size="small"
                              color="error"
                              onClick={() => handleKickPlayer(player.id)}
                              title="플레이어 퇴장"
                            >
                              퇴장
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                게임 설정
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  {/* @ts-ignore */}
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">총 라운드</Typography>
                    <Typography variant="h6">{gameState.maxRounds}</Typography>
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">배송 지연</Typography>
                    <Typography variant="h6">{gameState.deliveryDelay}주</Typography>
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">재고 비용</Typography>
                    <Typography variant="h6">${gameState.inventoryCostPerUnit}/개/주</Typography>
                  </Grid>
                  {/* @ts-ignore */}
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">품절 비용</Typography>
                    <Typography variant="h6">${gameState.stockoutCostPerUnit}/개/주</Typography>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                수요 패턴 관리
              </Typography>
              <Box sx={{ mt: 2, maxHeight: 300, overflowY: 'auto' }}>
                <Grid container spacing={1}>
                  {gameState.customerDemand.slice(0, gameState.maxRounds).map((demand, index) => (
                    <>
                      {/* @ts-ignore */}
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Paper 
                          sx={{ 
                            p: 1,
                            bgcolor: index + 1 === gameState.round ? 'primary.main' : 
                                    index + 1 < gameState.round ? 'grey.200' : 'grey.50',
                            color: index + 1 === gameState.round ? 'white' : 'text.primary'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="caption" display="block">
                                R{index + 1}
                              </Typography>
                              <Typography variant="h6" fontWeight="bold">
                                {demand}
                              </Typography>
                            </Box>
                            {index >= gameState.round && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={demandOverride[index] || ''}
                                  onChange={(e) => setDemandOverride({ ...demandOverride, [index]: e.target.value })}
                                  placeholder="새 수요"
                                  sx={{ width: 70 }}
                                  inputProps={{ min: 0, max: 99 }}
                                />
                                <Button
                                  size="small"
                                  onClick={() => handleDemandChange(index)}
                                  disabled={!demandOverride[index]}
                                  color="primary"
                                >
                                  수정
                                </Button>
                              </Box>
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    </>
                  ))}
                </Grid>
              </Box>
              <Alert severity="info" sx={{ mt: 2 }}>
                미래 라운드의 수요를 직접 수정할 수 있습니다. 수정 후 체크 버튼을 클릭하세요.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="error">
                게임 관리
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleForceEnd}
                  disabled={gameState.isEnded}
                >
                  게임 강제 종료
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDeleteGame}
                >
                  게임 삭제
                </Button>
              </Box>
              <Alert severity="warning" sx={{ mt: 2 }}>
                게임 삭제 시 모든 데이터가 사라지며 복구할 수 없습니다.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: '' })}
      >
        <DialogTitle>
          {confirmDialog.action === 'delete' && '게임 삭제 확인'}
          {confirmDialog.action === 'end' && '게임 종료 확인'}
          {confirmDialog.action === 'kick' && '플레이어 퇴장 확인'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.action === 'delete' && '정말로 이 게임을 삭제하시겠습니까? 모든 데이터가 사라집니다.'}
            {confirmDialog.action === 'end' && '게임을 강제로 종료하시겠습니까?'}
            {confirmDialog.action === 'kick' && '이 플레이어를 게임에서 퇴장시키시겠습니까?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: '' })}>
            취소
          </Button>
          <Button onClick={handleConfirm} color="error" autoFocus>
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};