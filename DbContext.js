import React, { createContext, useState, useEffect, useCallback } from 'react';
import localforage from 'localforage';

export const DbContext = createContext();

export const DbProvider = ({ children }) => {
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  // Initialize the database when component mounts
  useEffect(() => {
    const initDatabase = async () => {
      try {
        // Configure localforage
        localforage.config({
          name: 'hcs-crm',
          storeName: 'commission_reports'
        });
        
        // Check if reports collection exists and create if not
        const reports = await localforage.getItem('reports');
        if (!reports) {
          await localforage.setItem('reports', []);
        }
        
        // Load history data
        await loadHistory();
        
        setIsDbInitialized(true);
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };
    
    initDatabase();
  }, []);

  // Load report history from database
  const loadHistory = useCallback(async () => {
    try {
      const reports = await localforage.getItem('reports') || [];
      
      // Sort by upload date
      const sortedReports = [...reports].sort((a, b) => {
        return new Date(a.upload_date) - new Date(b.upload_date);
      });
      
      setHistoryData(sortedReports);
      return sortedReports;
    } catch (error) {
      console.error('Error loading history:', error);
      return [];
    }
  }, []);

  // Insert a new report or replace an existing one
  const insertReport = useCallback(async (date, totals) => {
    try {
      const reports = await localforage.getItem('reports') || [];
      
      // Check if a report with this date already exists
      const existingIndex = reports.findIndex(r => r.upload_date === date);
      
      // Create new report object
      const report = {
        upload_date: date,
        total_deals: totals.deals,
        agent_payout: totals.agent,
        owner_revenue: totals.owner_rev,
        owner_profit: totals.owner_prof
      };
      
      // Replace or add the report
      if (existingIndex >= 0) {
        reports[existingIndex] = report;
      } else {
        reports.push(report);
      }
      
      // Save updated reports back to database
      await localforage.setItem('reports', reports);
      
      // Refresh history data
      await loadHistory();
      
      return true;
    } catch (error) {
      console.error('Error inserting report:', error);
      return false;
    }
  }, [loadHistory]);

  // Get the latest report data
  const getLatestReport = useCallback(() => {
    if (historyData.length === 0) return null;
    return historyData[historyData.length - 1];
  }, [historyData]);

  return (
    <DbContext.Provider value={{
      isDbInitialized,
      historyData,
      loadHistory,
      insertReport,
      getLatestReport
    }}>
      {children}
    </DbContext.Provider>
  );
};
