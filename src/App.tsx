import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, AppBar, Toolbar, Typography, Button, Box, Chip } from '@mui/material';
import { SocketGameProvider, useSocketGame } from './contexts/SocketGameContextCDN';
import { GameHome } from './components/GameHome/GameHome';
import { GameSetup } from './components/GameSetup/GameSetup';
import { GameLobby } from './components/GameLobby/GameLobby';
import { PlayerDashboard } from './components/PlayerDashboard/PlayerDashboard';
import { AdminPanel } from './components/AdminPanel/AdminPanel';
import { ResultsView } from './components/ResultsView/ResultsView';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
});

const GameContent: React.FC = () => {
  const { gameState, gameResults, isAdmin, currentPlayerRole, resetGame, connectionStatus, currentGameId, gameMode } = useSocketGame();

  const renderContent = () => {
    if (connectionStatus === 'disconnected') {
      return (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h5" color="error">
            서버 연결이 끊어졌습니다
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            서버를 시작하고 페이지를 새로고침하세요
          </Typography>
        </Box>
      );
    }

    if (connectionStatus === 'connecting') {
      return (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h5">
            서버에 연결 중...
          </Typography>
        </Box>
      );
    }

    if (gameResults) {
      return <ResultsView />;
    }

    // Show GameSetup when creating a new game
    if (gameMode === 'creating') {
      return <GameSetup />;
    }

    // Show GameHome when in home mode or no game selected
    if (gameMode === 'home' || !currentGameId) {
      return <GameHome />;
    }

    // If joining a game but no game state yet, show loading
    if (gameMode === 'joining' && !gameState) {
      return (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h5">
            게임에 참가 중...
          </Typography>
        </Box>
      );
    }

    if (!gameState?.isStarted) {
      return <GameLobby />;
    }

    if (isAdmin) {
      return (
        <>
          <AdminPanel />
          {currentPlayerRole && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ px: 3 }}>
                플레이어 뷰
              </Typography>
              <PlayerDashboard />
            </Box>
          )}
        </>
      );
    }

    return <PlayerDashboard />;
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            🍺 Beer Game Simulator (Multiplayer)
          </Typography>
          {connectionStatus === 'connected' && (
            <Chip 
              label="서버 연결됨" 
              color="success" 
              size="small" 
              sx={{ mr: 2 }}
            />
          )}
          {gameState && (
            <Button color="inherit" onClick={resetGame}>
              게임 초기화
            </Button>
          )}
        </Toolbar>
      </AppBar>
      
      <Container maxWidth={false} sx={{ py: 3 }}>
        {renderContent()}
      </Container>
    </>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SocketGameProvider>
        <GameContent />
      </SocketGameProvider>
    </ThemeProvider>
  );
}

export default App;