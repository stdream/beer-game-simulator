import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Slider,
  Grid
} from '@mui/material';
import { GameConfig } from '../../types/game.types';
import { useSocketGame } from '../../contexts/SocketGameContextCDN';

export const GameSetup: React.FC = () => {
  const { createGame } = useSocketGame();
  
  const [config, setConfig] = useState<GameConfig>({
    maxRounds: 24,
    initialInventory: 12,
    inventoryCostPerUnit: 0.5,
    stockoutCostPerUnit: 1.0,
    deliveryDelay: 2,
    demandPattern: 'stable'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGame(config);
  };

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          게임 설정
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          {/* @ts-ignore */}
          <Grid container spacing={3}>
            {/* @ts-ignore */}
            <Grid item xs={12}>
              <Typography gutterBottom>
                게임 라운드 수: {config.maxRounds}
              </Typography>
              <Slider
                value={config.maxRounds}
                onChange={(_, value) => setConfig({ ...config, maxRounds: value as number })}
                min={10}
                max={50}
                step={1}
                marks={[
                  { value: 10, label: '10' },
                  { value: 24, label: '24' },
                  { value: 50, label: '50' }
                ]}
                valueLabelDisplay="auto"
              />
            </Grid>

            {/* @ts-ignore */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="초기 재고"
                type="number"
                value={config.initialInventory}
                onChange={(e) => setConfig({ ...config, initialInventory: Number(e.target.value) })}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>

            {/* @ts-ignore */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="배송 지연 (주)"
                type="number"
                value={config.deliveryDelay}
                onChange={(e) => setConfig({ ...config, deliveryDelay: Number(e.target.value) })}
                inputProps={{ min: 1, max: 4 }}
              />
            </Grid>

            {/* @ts-ignore */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="재고 유지 비용 ($/개/주)"
                type="number"
                value={config.inventoryCostPerUnit}
                onChange={(e) => setConfig({ ...config, inventoryCostPerUnit: Number(e.target.value) })}
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>

            {/* @ts-ignore */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="품절 비용 ($/개/주)"
                type="number"
                value={config.stockoutCostPerUnit}
                onChange={(e) => setConfig({ ...config, stockoutCostPerUnit: Number(e.target.value) })}
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>

            {/* @ts-ignore */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>수요 패턴</InputLabel>
                <Select
                  value={config.demandPattern}
                  onChange={(e) => setConfig({ ...config, demandPattern: e.target.value as any })}
                  label="수요 패턴"
                >
                  <MenuItem value="stable">안정적 (4→8 유지)</MenuItem>
                  <MenuItem value="increasing">증가형 (4→8→12→16→20)</MenuItem>
                  <MenuItem value="random">무작위 (2-12 사이)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* @ts-ignore */}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
              >
                게임 생성
              </Button>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};