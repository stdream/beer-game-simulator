import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Paper,
  Chip,
  Alert,
  LinearProgress
} from '@mui/material';
import { useSocketGame } from '../../contexts/SocketGameContextCDN';
import { Role } from '../../types/game.types';

const roleKorean: Record<Role, string> = {
  retailer: '소매상',
  wholesaler: '도매상',
  distributor: '유통업체',
  factory: '공장'
};

export const PlayerDashboard: React.FC = () => {
  const { gameState, currentPlayerId, currentPlayerRole, placeOrder } = useSocketGame();
  const [orderQuantity, setOrderQuantity] = useState<string>('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [lastRound, setLastRound] = useState<number>(0);

  // Reset order state when round changes
  useEffect(() => {
    if (gameState && gameState.round !== lastRound) {
      // Round has changed, reset order state
      setOrderPlaced(false);
      setOrderQuantity('');
      setLastRound(gameState.round);
    }
  }, [gameState, lastRound]);

  if (!gameState || !currentPlayerId || !currentPlayerRole) return null;

  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  if (!currentPlayer) return null;

  const handlePlaceOrder = () => {
    const quantity = parseInt(orderQuantity);
    if (!isNaN(quantity) && quantity >= 0) {
      placeOrder(quantity);
      setOrderPlaced(true);
    }
  };

  const getUpstreamRole = (): string => {
    switch (currentPlayerRole) {
      case 'retailer': return '도매상';
      case 'wholesaler': return '유통업체';
      case 'distributor': return '공장';
      case 'factory': return '생산';
      default: return '';
    }
  };

  const getDownstreamRole = (): string => {
    switch (currentPlayerRole) {
      case 'retailer': return '고객';
      case 'wholesaler': return '소매상';
      case 'distributor': return '도매상';
      case 'factory': return '유통업체';
      default: return '';
    }
  };

  const getDownstreamOrder = (): number | string => {
    if (currentPlayerRole === 'retailer') {
      return currentDemand;
    }
    
    const roleOrder: Role[] = ['retailer', 'wholesaler', 'distributor', 'factory'];
    const currentIndex = roleOrder.indexOf(currentPlayerRole);
    
    if (currentIndex > 0) {
      const downstreamRole = roleOrder[currentIndex - 1];
      const downstreamPlayer = gameState.players.find(p => p.role === downstreamRole);
      
      // Show order only if player has ordered
      if (downstreamPlayer?.hasOrdered) {
        return downstreamPlayer.currentOrder;
      }
      return 0;
    }
    
    return 0;
  };

  const currentDemand = gameState.customerDemand[gameState.round - 1] || 0;
  const progressPercent = (gameState.round / gameState.maxRounds) * 100;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {roleKorean[currentPlayerRole]} 대시보드
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Chip label={`라운드 ${gameState.round}/${gameState.maxRounds}`} color="primary" />
          <Chip label={currentPlayer.name} />
          {currentPlayerRole === 'retailer' && (
            <Chip label={`고객 수요: ${currentDemand}`} color="warning" />
          )}
        </Box>
        <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 8, borderRadius: 1 }} />
      </Box>

      <Grid container spacing={3}>
        {/* @ts-ignore */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                재고 상태
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Paper sx={{ p: 2, bgcolor: 'primary.50', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">현재 재고</Typography>
                  <Typography variant="h3">{currentPlayer.inventory}</Typography>
                </Paper>
                <Paper sx={{ p: 2, bgcolor: currentPlayer.backlog > 0 ? 'error.50' : 'grey.100' }}>
                  <Typography variant="body2" color="text.secondary">미처리 주문</Typography>
                  <Typography variant="h4" color={currentPlayer.backlog > 0 ? 'error.main' : 'text.primary'}>
                    {currentPlayer.backlog}
                  </Typography>
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                주문 관리
              </Typography>
              
              {!orderPlaced ? (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {getUpstreamRole()}에게 주문할 수량을 입력하세요
                  </Alert>
                  <TextField
                    fullWidth
                    label="주문 수량"
                    type="number"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                    inputProps={{ min: 0 }}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handlePlaceOrder}
                    disabled={!orderQuantity || parseInt(orderQuantity) < 0}
                  >
                    주문하기
                  </Button>
                </Box>
              ) : (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="success">
                    이번 라운드 주문이 완료되었습니다
                  </Alert>
                  <Paper sx={{ p: 2, mt: 2, bgcolor: 'success.50' }}>
                    <Typography variant="body2" color="text.secondary">주문 수량</Typography>
                    <Typography variant="h4">{currentPlayer.currentOrder}</Typography>
                  </Paper>
                </Box>
              )}

              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  배송 대기 중인 주문
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {currentPlayer.incomingDelivery.length > 0 ? (
                    currentPlayer.incomingDelivery.map((qty, idx) => (
                      <Chip 
                        key={idx} 
                        label={`${qty}개 (${idx + 1}주 후)`} 
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">없음</Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                비용 현황
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">누적 총 비용</Typography>
                  <Typography variant="h3" color="error.main">
                    ${currentPlayer.totalCost.toFixed(2)}
                  </Typography>
                </Paper>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" gutterBottom>비용 구조</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">재고 유지 비용:</Typography>
                    <Typography variant="caption">${gameState.inventoryCostPerUnit}/개/주</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">품절 비용:</Typography>
                    <Typography variant="caption">${gameState.stockoutCostPerUnit}/개/주</Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    이번 라운드 예상 비용
                  </Typography>
                  <Typography variant="body1">
                    재고: ${(currentPlayer.inventory * gameState.inventoryCostPerUnit).toFixed(2)}
                  </Typography>
                  <Typography variant="body1">
                    품절: ${(currentPlayer.backlog * gameState.stockoutCostPerUnit).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                공급망 정보
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <Paper sx={{ p: 2, textAlign: 'center', minWidth: 120 }}>
                  <Typography variant="caption" color="text.secondary">
                    {getDownstreamRole()}로부터
                  </Typography>
                  <Typography variant="h6">
                    {getDownstreamOrder()}
                  </Typography>
                  <Typography variant="caption">주문 받음</Typography>
                </Paper>

                <Typography variant="h5">→</Typography>

                <Paper sx={{ p: 2, textAlign: 'center', minWidth: 120, bgcolor: 'primary.50' }}>
                  <Typography variant="caption" color="text.secondary">
                    {roleKorean[currentPlayerRole]}
                  </Typography>
                  <Typography variant="h6">{currentPlayer.inventory}</Typography>
                  <Typography variant="caption">재고</Typography>
                </Paper>

                <Typography variant="h5">→</Typography>

                <Paper sx={{ p: 2, textAlign: 'center', minWidth: 120 }}>
                  <Typography variant="caption" color="text.secondary">
                    {getUpstreamRole()}에게
                  </Typography>
                  <Typography variant="h6">
                    {currentPlayer.currentOrder || '?'}
                  </Typography>
                  <Typography variant="caption">주문</Typography>
                </Paper>
              </Box>

              <Alert severity="info" sx={{ mt: 3 }}>
                배송은 {gameState.deliveryDelay}주 후에 도착합니다. 
                다른 플레이어의 재고나 주문 정보는 볼 수 없습니다.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};