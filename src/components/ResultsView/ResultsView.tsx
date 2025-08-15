import React from 'react';
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
  Alert
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useSocketGame } from '../../contexts/SocketGameContextCDN';
import { Role } from '../../types/game.types';

const roleKorean: Record<Role, string> = {
  retailer: '소매상',
  wholesaler: '도매상',
  distributor: '유통업체',
  factory: '공장'
};

const roleColors: Record<Role, string> = {
  retailer: '#4caf50',
  wholesaler: '#2196f3',
  distributor: '#ff9800',
  factory: '#9c27b0'
};

export const ResultsView: React.FC = () => {
  const { gameResults, resetGame } = useSocketGame();

  if (!gameResults) return null;

  const inventoryData = gameResults.rounds.map(round => {
    const data: any = { round: `R${round.round}` };
    round.playerStates.forEach(player => {
      data[roleKorean[player.role]] = player.inventory;
    });
    return data;
  });

  const orderData = gameResults.rounds.map(round => {
    const data: any = { round: `R${round.round}` };
    data['고객 수요'] = round.customerDemand;
    round.playerStates.forEach(player => {
      data[roleKorean[player.role]] = player.currentOrder;
    });
    return data;
  });

  const costData = gameResults.rounds.map(round => {
    const data: any = { round: `R${round.round}` };
    round.playerStates.forEach(player => {
      data[roleKorean[player.role]] = player.totalCost;
    });
    return data;
  });

  const sortedScores = [...gameResults.finalScores].sort((a, b) => a.totalCost - b.totalCost);

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        게임 결과
      </Typography>

      <Grid container spacing={3}>
        {/* @ts-ignore */}
        <Grid item xs={12}>
          <Alert severity="info" sx={{ mb: 2 }}>
            게임이 종료되었습니다! 불휩 효과(Bullwhip Effect) 지수: {gameResults.bullwhipIndex.toFixed(2)}
            {gameResults.bullwhipIndex > 2 && ' - 공급망에서 수요 변동이 크게 증폭되었습니다!'}
          </Alert>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                최종 순위
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>순위</TableCell>
                      <TableCell>역할</TableCell>
                      <TableCell align="right">총 비용</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedScores.map((score, index) => (
                      <TableRow 
                        key={score.playerId}
                        sx={{ bgcolor: index === 0 ? 'success.50' : 'inherit' }}
                      >
                        <TableCell>
                          {index === 0 && '🏆'} {index + 1}위
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={roleKorean[score.role]} 
                            size="small"
                            sx={{ bgcolor: roleColors[score.role], color: 'white' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body1" 
                            fontWeight={index === 0 ? 'bold' : 'normal'}
                            color={index === 0 ? 'success.main' : 'text.primary'}
                          >
                            ${score.totalCost.toFixed(2)}
                          </Typography>
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
                학습 포인트
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" paragraph>
                  <strong>불휩 효과 지수:</strong> {gameResults.bullwhipIndex.toFixed(2)}
                </Typography>
                
                {gameResults.bullwhipIndex > 3 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    매우 높은 불휩 효과가 관찰되었습니다! 공급망 상류로 갈수록 주문 변동성이 크게 증가했습니다.
                  </Alert>
                )}
                
                {gameResults.bullwhipIndex <= 1.5 && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    훌륭합니다! 불휩 효과를 잘 관리했습니다. 공급망 전체의 주문 변동성이 안정적이었습니다.
                  </Alert>
                )}

                <Typography variant="body2" color="text.secondary">
                  불휩 효과는 공급망에서 수요 정보가 상류로 전달될수록 왜곡되고 증폭되는 현상입니다. 
                  이는 과도한 재고, 품절, 비효율적인 생산으로 이어집니다.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                재고 추이
              </Typography>
              <ResponsiveContainer width="100%" height={450}>
                <LineChart data={inventoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="round" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={roleKorean.retailer} stroke={roleColors.retailer} />
                  <Line type="monotone" dataKey={roleKorean.wholesaler} stroke={roleColors.wholesaler} />
                  <Line type="monotone" dataKey={roleKorean.distributor} stroke={roleColors.distributor} />
                  <Line type="monotone" dataKey={roleKorean.factory} stroke={roleColors.factory} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                주문량 변동 (불휩 효과 시각화)
              </Typography>
              <ResponsiveContainer width="100%" height={450}>
                <LineChart data={orderData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="round" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="고객 수요" stroke="#f44336" strokeWidth={2} />
                  <Line type="monotone" dataKey={roleKorean.retailer} stroke={roleColors.retailer} />
                  <Line type="monotone" dataKey={roleKorean.wholesaler} stroke={roleColors.wholesaler} />
                  <Line type="monotone" dataKey={roleKorean.distributor} stroke={roleColors.distributor} />
                  <Line type="monotone" dataKey={roleKorean.factory} stroke={roleColors.factory} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                누적 비용 추이
              </Typography>
              <ResponsiveContainer width="100%" height={450}>
                <LineChart data={costData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="round" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={roleKorean.retailer} stroke={roleColors.retailer} />
                  <Line type="monotone" dataKey={roleKorean.wholesaler} stroke={roleColors.wholesaler} />
                  <Line type="monotone" dataKey={roleKorean.distributor} stroke={roleColors.distributor} />
                  <Line type="monotone" dataKey={roleKorean.factory} stroke={roleColors.factory} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-ignore */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={resetGame}
            >
              새 게임 시작
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};