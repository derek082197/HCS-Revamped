import React, { useContext, useState, useRef } from 'react';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  Tab,
  Tabs,
  Typography,
  Toolbar,
  Alert,
  TextField,
  Slider,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { AuthContext } from '../context/AuthContext';
import { DbContext } from '../context/DbContext';
import { processStatementData } from '../utils/commissionUtils';
import { fetchAllDealsToday } from '../services/api';
import LogoutIcon from '@mui/icons-material/Logout';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';

// Tab Panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminDashboard = () => {
  const { logout } = useContext(AuthContext);
  const { historyData, insertReport, getLatestReport } = useContext(DbContext);
  
  const [tabValue, setTabValue] = useState(0);
  const [summary, setSummary] = useState([]);
  const [totals, setTotals] = useState({ deals: 0, agent: 0, owner_rev: 0, owner_prof: 0 });
  const [threshold, setThreshold] = useState(10);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [todayDeals, setTodayDeals] = useState([]);
  const [isLoadingDeals, setIsLoadingDeals] = useState(false);
  const [dealCounts, setDealCounts] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0
  });
  const [downloadReady, setDownloadReady] = useState(false);
  const [zipBlob, setZipBlob] = useState(null);
  
  const fileInputRef = useRef(null);
  
  // Latest report data (either from upload or database)
  const latestReport = getLatestReport();
  const deals = totals.deals || (latestReport ? latestReport.total_deals : 0);
  const agentPayout = totals.agent || (latestReport ? latestReport.agent_payout : 0);
  const ownerRevenue = totals.owner_rev || (latestReport ? latestReport.owner_revenue : 0);
  const ownerProfit = totals.owner_prof || (latestReport ? latestReport.owner_profit : 0);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    // Fetch today's deals when switching to the Live Counts tab
    if (newValue === 3) {
      fetchTodayDeals();
    }
  };
  
  // Fetch today's deals from API
  const fetchTodayDeals = async () => {
    if (isLoadingDeals) return;
    
    setIsLoadingDeals(true);
    try {
      const deals = await fetchAllDealsToday();
      setTodayDeals(deals);
      
      // Calculate counts
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Get start of week (Monday)
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      // Get start of month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      
      // Get start of year
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearStartStr = yearStart.toISOString().split('T')[0];
      
      // Filter deals by date
      const dealDates = deals.map(deal => {
        const date = new Date(deal.date_sold);
        return date.toISOString().split('T')[0];
      });
      
      const dailyCount = dealDates.filter(date => date === today).length;
      const weeklyCount = dealDates.filter(date => date >= weekStartStr).length;
      const monthlyCount = dealDates.filter(date => date >= monthStartStr).length;
      const yearlyCount = dealDates.filter(date => date >= yearStartStr).length;
      
      setDealCounts({
        daily: dailyCount,
        weekly: weeklyCount,
        monthly: monthlyCount,
        yearly: yearlyCount
      });
    } catch (error) {
      console.error('Error fetching today\'s deals:', error);
    } finally {
      setIsLoadingDeals(false);
    }
  };
  
  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadError('');
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Process the data
        if (jsonData.length === 0) {
          setUploadError('The uploaded file contains no data.');
          setIsUploading(false);
          return;
        }
        
        // Transform column names to match expected format
        const transformedData = jsonData.map(row => {
          // Map column names that might vary in the Excel file
          return {
            Agent: row.Agent || row.agent || '',
            first_name: row.first_name || row['First Name'] || '',
            last_name: row.last_name || row['Last Name'] || '',
            Advance: row.Advance || row.advance || 0,
            'Advance Excluded Reason': row['Advance Excluded Reason'] || row.Reason || '',
            'Eff Date': row['Eff Date'] || row.Effective_Date || '',
            Paid_Status: parseFloat(row.Advance || 0) > 0 ? 'Paid' : 'Not Paid',
          };
        });
        
        // Filter out rows without agent information
        const filteredData = transformedData.filter(
          row => row.Agent && row.first_name && row.last_name
        );
        
        // Process the statement data
        const result = processStatementData(filteredData);
        setSummary(result.summary);
        setTotals(result.totals);
        
        // Insert report into database
        const today = new Date().toISOString().split('T')[0];
        insertReport(today, result.totals);
        
        // Generate ZIP file with paystubs (in a real app)
        // Here we're just simulating the ZIP creation
        setTimeout(() => {
          setDownloadReady(true);
          
          // In a real implementation, this would be actual ZIP data
          // For demo purposes, we're creating a mock blob
          const mockZipContent = new Blob(['Mock ZIP content'], { type: 'application/zip' });
          setZipBlob(mockZipContent);
        }, 1000);
        
        setIsUploading(false);
      } catch (error) {
        console.error('Error processing Excel file:', error);
        setUploadError('Error processing the file. Make sure it\'s a valid Excel file.');
        setIsUploading(false);
      }
    };
    
    reader.onerror = () => {
      setUploadError('Error reading the file.');
      setIsUploading(false);
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  // Define columns for data grids
  const leaderboardColumns = [
    { field: 'Agent', headerName: 'Agent', flex: 1 },
    { field: 'Paid Deals', headerName: 'Paid Deals', width: 120, type: 'number' },
    { 
      field: 'Agent Payout', 
      headerName: 'Agent Payout', 
      width: 150,
      valueFormatter: (params) => {
        return typeof params.value === 'number' 
          ? `$${params.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : params.value;
      }
    },
    { 
      field: 'Owner Profit', 
      headerName: 'Owner Profit', 
      width: 150,
      valueFormatter: (params) => {
        return typeof params.value === 'number' 
          ? `$${params.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : params.value;
      }
    },
    { 
      field: 'Net Paid', 
      headerName: 'Net Paid', 
      width: 150,
      valueFormatter: (params) => {
        return typeof params.value === 'number' 
          ? `$${params.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : params.value;
      }
    }
  ];
  
  const historyColumns = [
    { 
      field: 'upload_date', 
      headerName: 'Date', 
      width: 130,
      valueFormatter: (params) => {
        const date = new Date(params.value);
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().substr(-2)}`;
      }
    },
    { field: 'total_deals', headerName: 'Deals', width: 100, type: 'number' },
    { 
      field: 'agent_payout', 
      headerName: 'Agent Pay', 
      width: 150,
      valueFormatter: (params) => `$${params.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    { 
      field: 'owner_revenue', 
      headerName: 'Owner Rev', 
      width: 150,
      valueFormatter: (params) => `$${params.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    { 
      field: 'owner_profit', 
      headerName: 'Owner Profit', 
      width: 150,
      valueFormatter: (params) => `$${params.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  ];
  
  const todayDealsColumns = [
    { field: 'policy_id', headerName: 'Policy ID', width: 150 },
    { field: 'lead_first_name', headerName: 'First Name', width: 120 },
    { field: 'lead_last_name', headerName: 'Last Name', width: 120 },
    { 
      field: 'date_sold', 
      headerName: 'Date Sold', 
      width: 180,
      valueFormatter: (params) => {
        if (!params.value) return '';
        const date = new Date(params.value);
        return date.toLocaleString();
      }
    },
    { field: 'carrier', headerName: 'Carrier', width: 120 },
    { field: 'product', headerName: 'Product', width: 120 },
    { field: 'lead_vendor_name', headerName: 'Vendor', width: 150 },
  ];
  
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
      
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            background: 'linear-gradient(90deg,#f5fff0,#eef5ff 80%)',
            borderRadius: 2,
            mb: 4
          }}
        >
          <Typography variant="h4" component="h1" sx={{ color: '#223969' }}>
            🏆 HCS Commission <span style={{ color: '#208b26' }}>Admin Dashboard</span>
          </Typography>
        </Paper>
        
        {/* Overview Cards */}
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Paid Deals
                </Typography>
                <Typography variant="h4">{deals.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Agent Payout
                </Typography>
                <Typography variant="h4">
                  ${agentPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Owner Revenue
                </Typography>
                <Typography variant="h4">
                  ${ownerRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Owner Profit
                </Typography>
                <Typography variant="h4">
                  ${ownerProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
            <Tab label="🏆 Overview" id="dashboard-tab-0" />
            <Tab label="📋 Leaderboard" id="dashboard-tab-1" />
            <Tab label="📈 History" id="dashboard-tab-2" />
            <Tab label="📊 Live Counts" id="dashboard-tab-3" />
            <Tab label="⚙️ Settings" id="dashboard-tab-4" />
          </Tabs>
        </Box>
        
        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h5" component="h2" gutterBottom>
            HCS Commission Dashboard
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Eddy (0.5%)
                  </Typography>
                  <Typography variant="h5">
                    ${(ownerRevenue * 0.005).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Matt (2%)
                  </Typography>
                  <Typography variant="h5">
                    ${(ownerRevenue * 0.02).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Jarad (1%)
                  </Typography>
                  <Typography variant="h5">
                    ${(ownerRevenue * 0.01).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Typography variant="h6" component="h3" sx={{ mt: 4, mb: 2 }}>
            🥇 Top Agents This Month
          </Typography>
          
          {summary.length > 0 ? (
            <Box sx={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={summary.slice(0, 6).map((row, index) => ({ id: index, ...row }))}
                columns={leaderboardColumns}
                pageSize={6}
                rowsPerPageOptions={[6]}
                disableSelectionOnClick
              />
            </Box>
          ) : (
            <Alert severity="info">Upload a statement to see leaderboard.</Alert>
          )}
          
          <Typography variant="h6" component="h3" sx={{ mt: 4, mb: 2 }}>
            📅 Recent Payroll Periods
          </Typography>
          
          {historyData.length > 0 ? (
            <Box sx={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={historyData.slice(-6).map((row, index) => ({ id: index, ...row }))}
                columns={historyColumns}
                pageSize={6}
                rowsPerPageOptions={[6]}
                disableSelectionOnClick
              />
            </Box>
          ) : (
            <Alert severity="info">No payroll history yet.</Alert>
          )}
        </TabPanel>
        
        {/* Leaderboard Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h5" component="h2" gutterBottom>
            Agent Leaderboard & Drill-Down
          </Typography>
          
          {summary.length > 0 ? (
            <>
              <Box sx={{ height: 400, width: '100%', mb: 3 }}>
                <DataGrid
                  rows={summary.map((row, index) => ({ id: index, ...row }))}
                  columns={leaderboardColumns}
                  pageSize={10}
                  rowsPerPageOptions={[10]}
                  disableSelectionOnClick
                />
              </Box>
              
              <Typography variant="h6" gutterBottom>
                Performance Threshold Settings
              </Typography>
              
              <Box sx={{ maxWidth: 400, mb: 3 }}>
                <Slider
                  value={threshold}
                  onChange={(_, newValue) => setThreshold(newValue)}
                  aria-label="Coaching threshold (Paid Deals)"
                  valueLabelDisplay="auto"
                  step={5}
                  marks
                  min={0}
                  max={100}
                />
                <Typography variant="body2" color="textSecondary">
                  Highlight agents below {threshold} deals
                </Typography>
              </Box>
              
              {/* Filtered agents below threshold */}
              <Typography variant="h6" gutterBottom>
                Agents Below Threshold
              </Typography>
              
              {(() => {
                const flagged = summary.filter(agent => agent['Paid Deals'] < threshold);
                return (
                  <>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Agents below {threshold}: {flagged.length}
                    </Typography>
                    
                    {flagged.length > 0 ? (
                      <Box sx={{ height: 300, width: '100%' }}>
                        <DataGrid
                          rows={flagged.map((row, index) => ({ id: index, ...row }))}
                          columns={leaderboardColumns}
                          pageSize={5}
                          rowsPerPageOptions={[5]}
                          disableSelectionOnClick
                        />
                      </Box>
                    ) : (
                      <Alert severity="success">No agents below the threshold.</Alert>
                    )}
                  </>
                );
              })()}
            </>
          ) : (
            <Alert severity="info">No data—upload in Settings first.</Alert>
          )}
        </TabPanel>
        
        {/* History Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h5" component="h2" gutterBottom>
            Historical Reports
          </Typography>
          
          {historyData.length > 0 ? (
            <Box sx={{ height: 400, width: '100%' }}>
              <DataGrid
                rows={historyData.map((row, index) => ({ id: index, ...row }))}
                columns={historyColumns}
                pageSize={10}
                rowsPerPageOptions={[10]}
                disableSelectionOnClick
              />
            </Box>
          ) : (
            <Alert severity="info">No history data yet.</Alert>
          )}
        </TabPanel>
        
        {/* Live Counts Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2">
              Live Daily/Weekly/Monthly/Yearly Counts
            </Typography>
            
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={fetchTodayDeals}
              disabled={isLoadingDeals}
            >
              Refresh
            </Button>
          </Box>
          
          {isLoadingDeals ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Today's Deals
                      </Typography>
                      <Typography variant="h4">{dealCounts.daily}</Typography>
                      <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                        Net Profit: ${(dealCounts.daily * 43).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        This Week's Deals
                      </Typography>
                      <Typography variant="h4">{dealCounts.weekly}</Typography>
                      <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                        Net Profit: ${(dealCounts.weekly * 43).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        This Month's Deals
                      </Typography>
                      <Typography variant="h4">{dealCounts.monthly}</Typography>
                      <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                        Net Profit: ${(dealCounts.monthly * 43).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        This Year's Deals
                      </Typography>
                      <Typography variant="h4">{dealCounts.yearly}</Typography>
                      <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                        Net Profit: ${(dealCounts.yearly * 43).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
                Today's Deals Table
              </Typography>
              
              {todayDeals.length > 0 ? (
                <Box sx={{ height: 400, width: '100%' }}>
                  <DataGrid
                    rows={todayDeals.map((deal, index) => ({ id: index, ...deal }))}
                    columns={todayDealsColumns}
                    pageSize={10}
                    rowsPerPageOptions={[10]}
                    disableSelectionOnClick
                  />
                </Box>
              ) : (
                <Alert severity="info">No deals for today.</Alert>
              )}
            </>
          )}
        </TabPanel>
        
        {/* Settings Tab */}
        <TabPanel value={tabValue} index={4}>
          <Typography variant="h5" component="h2" gutterBottom>
            ⚙️ Settings & Upload
          </Typography>
          
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Upload Statement
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', maxWidth: 500 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current.click()}
                disabled={isUploading}
                sx={{ mb: 2 }}
              >
                {isUploading ? 'Uploading...' : 'Upload Excel Statement'}
              </Button>
              
              {isUploading && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                  <CircularProgress size={24} sx={{ mr: 2 }} />
                  <Typography>Processing statement...</Typography>
                </Box>
              )}
              
              {uploadError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {uploadError}
                </Alert>
              )}
              
              {downloadReady && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    if (zipBlob) {
                      const url = URL.createObjectURL(zipBlob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `paystubs_${new Date().toISOString().split('T')[0]}.zip`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }
                  }}
                  sx={{ mt: 2 }}
                >
                  Download ZIP of Pay Stubs
                </Button>
              )}
            </Box>
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Coaching Threshold
            </Typography>
            
            <Box sx={{ maxWidth: 400 }}>
              <Slider
                value={threshold}
                onChange={(_, newValue) => setThreshold(newValue)}
                aria-label="Coaching threshold (Paid Deals)"
                valueLabelDisplay="auto"
                step={5}
                marks
                min={0}
                max={100}
              />
              <Typography variant="body2" color="textSecondary">
                Set threshold for highlighting agents in leaderboard
              </Typography>
            </Box>
          </Paper>
        </TabPanel>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
