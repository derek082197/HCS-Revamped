import React, { useContext, useEffect, useState } from 'react';
import { Box, CircularProgress, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AuthContext } from './context/AuthContext';
import { DbContext } from './context/DbContext';
import { fetchAgents } from './services/api';
import LoginPage from './components/LoginPage';
import AgentDashboard from './components/AgentDashboard';
import AdminDashboard from './components/AdminDashboard';

const theme = createTheme({
  palette: {
    primary: {
      main: '#223969',
    },
    secondary: {
      main: '#208b26',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#fd9800',
    },
    info: {
      main: '#26a7ff',
    },
    success: {
      main: '#13b13b',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
});

function App() {
  const { isLoggedIn, userRole, setAgentData } = useContext(AuthContext);
  const { isDbInitialized } = useContext(DbContext);
  const [loading, setLoading] = useState(true);

  // Fetch agents data on component mount
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const agents = await fetchAgents();
        setAgentData(agents);
      } catch (error) {
        console.error('Error loading agents:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isDbInitialized) {
      loadAgents();
    }
  }, [isDbInitialized, setAgentData]);

  // Show loading spinner while initializing
  if (loading && !isLoggedIn) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!isLoggedIn ? (
        <LoginPage />
      ) : userRole.toLowerCase() === 'agent' ? (
        <AgentDashboard />
      ) : (
        <AdminDashboard />
      )}
    </ThemeProvider>
  );
}

export default App;
