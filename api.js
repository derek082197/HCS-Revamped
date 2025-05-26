import axios from 'axios';

// API constants
const CRM_API_URL = "https://hcs.tldcrm.com/api/egress/policies";
const CRM_API_ID = "310";
const CRM_API_KEY = "87c08b4b-8d1b-4356-b341-c96e5f67a74a";
const AGENT_API_URL = "https://hcs.tldcrm.com/api/egress/users";

// Create axios instance with default configs
const apiClient = axios.create({
  headers: {
    'tld-api-id': CRM_API_ID,
    'tld-api-key': CRM_API_KEY,
  },
  timeout: 10000
});

// Fetch all agents
export const fetchAgents = async () => {
  try {
    const params = { limit: 1000 };
    const response = await apiClient.get(AGENT_API_URL, { params });
    return response.data?.response?.results || [];
  } catch (error) {
    console.error("Error fetching agents:", error);
    throw error;
  }
};

// Fetch all deals for today
export const fetchAllDealsToday = async (limit = 5000) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const columns = [
    'policy_id', 'date_created', 'date_converted', 'date_sold', 'date_posted',
    'carrier', 'product', 'duration', 'premium', 'policy_number',
    'lead_first_name', 'lead_last_name', 'lead_state', 'lead_vendor_name',
    'agent_id', 'agent_name'
  ];

  try {
    const params = {
      date_from: today,
      limit,
      columns: columns.join(',')
    };

    const results = [];
    let url = CRM_API_URL;
    const seen = new Set();

    while (url && !seen.has(url)) {
      seen.add(url);
      const response = await apiClient.get(url, { params });
      const data = response.data?.response;
      
      if (!data || !data.results || data.results.length === 0) {
        break;
      }
      
      results.push(...data.results);
      
      const nextUrl = data.navigate?.next;
      if (!nextUrl || seen.has(nextUrl)) {
        break;
      }
      
      url = nextUrl;
      params = {}; // No params needed for next URL as they're included in the URL
    }

    return results;
  } catch (error) {
    console.error("Error fetching today's deals:", error);
    throw error;
  }
};

// Fetch deals for a specific agent within a date range
export const fetchAgentDeals = async (userId, dateFrom, dateTo) => {
  const columns = [
    'policy_id', 'date_sold', 'carrier', 'product', 'premium',
    'lead_first_name', 'lead_last_name', 'lead_state', 'lead_vendor_name',
    'agent_id', 'agent_name'
  ];

  try {
    const params = {
      agent_id: userId,
      date_sold_greater_equal: dateFrom,
      date_sold_less_equal: dateTo,
      limit: 1000,
      columns: columns.join(',')
    };

    const response = await apiClient.get(CRM_API_URL, { params });
    return response.data?.response?.results || [];
  } catch (error) {
    console.error("Error fetching agent deals:", error);
    throw error;
  }
};
