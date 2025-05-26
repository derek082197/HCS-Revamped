import React, { useContext, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Typography,
  AppBar,
  Toolbar
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { AuthContext } from '../context/AuthContext';
import { fetchAgentDeals } from '../services/api';
import {
  calculateBonus,
  calculateCommissionTier,
  calculateNextTierProgress,
  calculateBonusProgress,
  calculatePayout,
  getCurrentCycle,
  getPreviousCycle
} from '../utils/commissionUtils';
import LogoutIcon from '@mui/icons-material/Logout';

const AgentDashboard = () => {
  const { userName, userEmail, logout, agentUserIds } = useContext(AuthContext);
  const [currentCycle, setCurrentCycle] = useState(null);
  const [previousCycle, setPreviousCycle] = useState(null);
  const [cycleDeals, setCycleDeals] = useState([]);
  const [prevCycleDeals, setPrevCycleDeals] = useState([]);
  const [todayDeals, setTodayDeals] = useState([]);
  const [weekDeals, setWeekDeals] = useState([]);
  const [monthDeals, setMonthDeals] = useState([]);
  const [yearDeals, setYearDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fmoStatement, setFmoStatement] = useState(null);
  const [netPaid, setNetPaid] = useState(null);
  const [paidPolicies, setPaidPolicies] = useState([]);

  // Load commission cycles and fetch agent deals
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const cycle = getCurrentCycle();
        const prevCycle = getPreviousCycle();
        setCurrentCycle(cycle);
        setPreviousCycle(prevCycle);
        
        if (!cycle) {
          console.error('No active commission cycle found');
          setLoading(false);
          return;
        }
        
        const userId = agentUserIds[userEmail];
        if (!userId) {
          console.error('No user ID found for logged-in agent');
          setLoading(false);
          return;
        }
        
        // Get date ranges for different metrics
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Get week start (Monday of current week)
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
        const weekStartStr = weekStart.toISOString().split('T')[0];
        
        // Get month start
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthStartStr = monthStart.toISOString().split('T')[0];
        
        // Get year start
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearStartStr = yearStart.toISOString().split('T')[0];
        
        // Fetch deals for different time periods
        const [cycleDealsData, prevCycleDealsData, todayDealsData, weekDealsData, monthDealsData, yearDealsData] = 
          await Promise.all([
            fetchAgentDeals(userId, cycle.start, cycle.end),
            prevCycle ? fetchAgentDeals(userId, prevCycle.start, prevCycle.end) : Promise.resolve([]),
            fetchAgentDeals(userId, todayStr, todayStr),
            fetchAgentDeals(userId, weekStartStr, todayStr),
            fetchAgentDeals(userId, monthStartStr, todayStr),
            fetchAgentDeals(userId, yearStartStr, todayStr)
          ]);
        
        setCycleDeals(cycleDealsData);
        setPrevCycleDeals(prevCycleDealsData);
        setTodayDeals(todayDealsData);
        setWeekDeals(weekDealsData);
        setMonthDeals(monthDealsData);
        setYearDeals(yearDealsData);
      } catch (error) {
        console.error('Error loading agent dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [userEmail, agentUserIds]);

  // Format date to MM/DD/YY
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().substr(-2)}`;
  };

  // Data grid columns for deals
  const dealColumns = [
    { field: 'date_sold', headerName: 'Date Sold', width: 150, valueFormatter: (params) => formatDate(params.value) },
    { field: 'carrier', headerName: 'Carrier', width: 150 },
    { field: 'product', headerName: 'Product', width: 150 },
    { field: 'policy_id', headerName: 'Policy ID', width: 200 }
  ];

  // Calculate tier and bonus information
  const cycleCount = cycleDeals.length;
  const tierInfo = calculateCommissionTier(cycleCount);
  const bonus = calculateBonus(cycleCount);
  const payout = calculatePayout(cycleCount);
  const { nextTarget, percentToNext } = calculateNextTierProgress(cycleCount);
  const { percentToBonus } = calculateBonusProgress(cycleCount);

  // Previous cycle calculations
  const prevCycleCount = prevCycleDeals.length;
  const prevTierInfo = calculateCommissionTier(prevCycleCount);
  const prevBonus = calculateBonus(prevCycleCount);
  const prevPayout = calculatePayout(prevCycleCount);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            HCS Commission CRM
          </Typography>
          <Button color="inherit" onClick={logout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <div className="agent-dashboard-header">
          <Typography variant="h4" component="h1" className="header-title">
            👤 Agent Dashboard — <span className="header-name">{userName}</span>
          </Typography>
        </div>
        
        {loading ? (
          <Box sx={{ width: '100%', mt: 4 }}>
            <LinearProgress />
            <Typography sx={{ mt: 2, textAlign: 'center' }}>
              Loading dashboard data...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Current Commission Cycle */}
            <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2 }}>
              Current Commission Cycle
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Deals (Cycle)
                    </Typography>
                    <Typography variant="h4">{cycleCount}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Projected Payout
                    </Typography>
                    <Typography variant="h4">${payout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Cycle
                    </Typography>
                    <Typography variant="h5">
                      {currentCycle ? `${formatDate(currentCycle.start)} to ${formatDate(currentCycle.end)}` : 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Pay Date
                    </Typography>
                    <Typography variant="h5">
                      {currentCycle ? formatDate(currentCycle.pay) : 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* Tier Progress */}
            <Box
              sx={{
                bgcolor: `${tierInfo.color}22`,
                p: 2,
                borderRadius: 2,
                mt: 2
              }}
              className="tier-container"
            >
              <Typography variant="h6" component="div" sx={{ color: tierInfo.color, fontWeight: 'bold' }}>
                {tierInfo.tier}
              </Typography>
              
              <Typography variant="body1" component="span" sx={{ ml: 2, color: '#222' }}>
                {nextTarget 
                  ? `${cycleCount}/${nextTarget} deals to next tier` 
                  : "MAX tier achieved"}
              </Typography>
              
              <Box className="tier-progress">
                <Box
                  className="tier-bar"
                  sx={{
                    width: `${percentToNext}%`,
                    bgcolor: tierInfo.color
                  }}
                />
              </Box>
            </Box>
            
            {/* Bonus Progress */}
            <Box className="bonus-progress-container">
              <Typography className="bonus-label" component="span">
                🎁 Bonus Progress:
              </Typography>
              
              <Typography variant="body1" component="span" sx={{ ml: 1, color: '#222' }}>
                {cycleCount}/70 deals for $1200 bonus
              </Typography>
              
              <Box className="tier-progress">
                <Box
                  className="tier-bar"
                  sx={{ width: `${percentToBonus}%`, bgcolor: '#2dcc3a' }}
                />
              </Box>
            </Box>
            
            {bonus > 0 ? (
              <Paper 
                sx={{ 
                  p: 2, 
                  mt: 2, 
                  bgcolor: 'success.light', 
                  color: 'success.contrastText',
                  borderRadius: 2
                }}
              >
                <Typography variant="h6">
                  🎉 <strong>Bonus:</strong> ${bonus.toLocaleString('en-US')} HIT!
                </Typography>
              </Paper>
            ) : cycleCount >= 60 ? (
              <Paper 
                sx={{ 
                  p: 2, 
                  mt: 2, 
                  bgcolor: 'info.light', 
                  color: 'info.contrastText',
                  borderRadius: 2
                }}
              >
                <Typography variant="h6">
                  🎁 {cycleCount}/70 deals for $1200 bonus
                </Typography>
              </Paper>
            ) : null}
            
            <Divider sx={{ my: 4 }} />
            
            {/* Recent Performance */}
            <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
              Recent Performance
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Today's Deals
                    </Typography>
                    <Typography variant="h4">{todayDeals.length}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      This Week
                    </Typography>
                    <Typography variant="h4">{weekDeals.length}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      This Month
                    </Typography>
                    <Typography variant="h4">{monthDeals.length}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      This Year
                    </Typography>
                    <Typography variant="h4">{yearDeals.length}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            
            {/* Previous Cycle */}
            {prevCycleCount > 0 && previousCycle && (
              <>
                <Divider sx={{ my: 4 }} />
                
                <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
                  Previous Completed Cycle
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                          Deals
                        </Typography>
                        <Typography variant="h4">{prevCycleCount}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                          Gross Payout
                        </Typography>
                        <Typography variant="h4">
                          ${prevPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                          Cycle
                        </Typography>
                        <Typography variant="h5">
                          {formatDate(previousCycle.start)} to {formatDate(previousCycle.end)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography color="textSecondary" gutterBottom>
                          Pay Date
                        </Typography>
                        <Typography variant="h5">
                          {formatDate(previousCycle.pay)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                {netPaid !== null && (
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mt: 2, 
                      fontWeight: 600, 
                      color: 'success.main' 
                    }}
                  >
                    Net Payout (from FMO): ${netPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                )}
                
                {paidPolicies.length > 0 && (
                  <>
                    <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                      Paid Policies in FMO Statement
                    </Typography>
                    <Box sx={{ height: 300, width: '100%' }}>
                      <DataGrid
                        rows={paidPolicies.map((policy, index) => ({ id: index, ...policy }))}
                        columns={Object.keys(paidPolicies[0])
                          .filter(key => key.toLowerCase() !== 'agent')
                          .map(key => ({ field: key, headerName: key, flex: 1 }))}
                        pageSize={5}
                        disableSelectionOnClick
                      />
                    </Box>
                  </>
                )}
              </>
            )}
            
            {/* Current Cycle Deals */}
            <Divider sx={{ my: 4 }} />
            
            <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
              All Deals in Current Cycle
            </Typography>
            
            {cycleDeals.length > 0 ? (
              <Box sx={{ height: 400, width: '100%' }}>
                <DataGrid
                  rows={cycleDeals.map((deal, index) => ({ id: index, ...deal }))}
                  columns={dealColumns}
                  pageSize={10}
                  disableSelectionOnClick
                />
              </Box>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'info.light' }}>
                <Typography variant="body1">
                  No deals found in this commission cycle.
                </Typography>
              </Paper>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default AgentDashboard;
