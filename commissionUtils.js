// Commission cycle data (mirroring the Streamlit app)
export const commissionCycles = [
  { start: "2024-12-14", end: "2024-12-27", pay: "2025-01-03" },
  { start: "2024-12-28", end: "2025-01-10", pay: "2025-01-17" },
  { start: "2025-01-11", end: "2025-01-24", pay: "2025-01-31" },
  { start: "2025-01-25", end: "2025-02-07", pay: "2025-02-14" },
  { start: "2025-02-08", end: "2025-02-21", pay: "2025-02-28" },
  { start: "2025-02-22", end: "2025-03-07", pay: "2025-03-14" },
  { start: "2025-03-08", end: "2025-03-21", pay: "2025-03-28" },
  { start: "2025-03-22", end: "2025-04-04", pay: "2025-04-11" },
  { start: "2025-04-05", end: "2025-04-18", pay: "2025-04-25" },
  { start: "2025-04-19", end: "2025-05-02", pay: "2025-05-09" },
  { start: "2025-05-03", end: "2025-05-16", pay: "2025-05-23" },
  { start: "2025-05-17", end: "2025-05-30", pay: "2025-06-06" },
  { start: "2025-05-31", end: "2025-06-13", pay: "2025-06-20" },
  { start: "2025-06-14", end: "2025-06-27", pay: "2025-07-03" },
  { start: "2025-06-28", end: "2025-07-11", pay: "2025-07-18" },
  { start: "2025-07-12", end: "2025-07-25", pay: "2025-08-01" },
  { start: "2025-07-26", end: "2025-08-08", pay: "2025-08-15" },
  { start: "2025-08-09", end: "2025-08-22", pay: "2025-08-29" },
  { start: "2025-08-23", end: "2025-09-05", pay: "2025-09-12" },
  { start: "2025-09-06", end: "2025-09-19", pay: "2025-09-26" },
  { start: "2025-09-20", end: "2025-10-03", pay: "2025-10-10" },
  { start: "2025-10-04", end: "2025-10-17", pay: "2025-10-24" },
  { start: "2025-10-18", end: "2025-10-31", pay: "2025-11-07" },
  { start: "2025-11-01", end: "2025-11-14", pay: "2025-11-21" },
  { start: "2025-11-15", end: "2025-11-28", pay: "2025-12-05" },
  { start: "2025-11-29", end: "2025-12-12", pay: "2025-12-19" },
  { start: "2025-12-13", end: "2025-12-26", pay: "2026-01-02" },
  { start: "2025-12-27", end: "2026-01-09", pay: "2026-01-16" },
];

// Constants
export const PROFIT_PER_SALE = 43.3;

// Calculate commission tier based on paid deal count
export const calculateCommissionTier = (paidDeals) => {
  if (paidDeals >= 200) {
    return { rate: 25, tier: "Top Tier ($25/deal)", color: "#13b13b" };
  } else if (paidDeals >= 150) {
    return { rate: 22.5, tier: "Pro Tier ($22.50/deal)", color: "#26a7ff" };
  } else if (paidDeals >= 120) {
    return { rate: 17.5, tier: "Rising Tier ($17.50/deal)", color: "#fd9800" };
  } else {
    return { rate: 15, tier: "Starter ($15/deal)", color: "#a0a0a0" };
  }
};

// Calculate bonus amount
export const calculateBonus = (paidDeals) => {
  return paidDeals >= 70 ? 1200 : 0;
};

// Calculate total payout (commission + bonus)
export const calculatePayout = (paidDeals) => {
  const { rate } = calculateCommissionTier(paidDeals);
  const bonus = calculateBonus(paidDeals);
  return paidDeals * rate + bonus;
};

// Get current commission cycle
export const getCurrentCycle = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (const cycle of commissionCycles) {
    const startDate = new Date(cycle.start);
    const endDate = new Date(cycle.end);
    
    if (today >= startDate && today <= endDate) {
      return {
        start: cycle.start,
        end: cycle.end,
        pay: cycle.pay,
        index: commissionCycles.indexOf(cycle)
      };
    }
  }
  
  return null;
};

// Get previous commission cycle
export const getPreviousCycle = () => {
  const currentCycle = getCurrentCycle();
  if (!currentCycle || currentCycle.index === 0) {
    return null;
  }
  
  const prevCycle = commissionCycles[currentCycle.index - 1];
  return {
    start: prevCycle.start,
    end: prevCycle.end,
    pay: prevCycle.pay,
    index: currentCycle.index - 1
  };
};

// Calculate next tier progress
export const calculateNextTierProgress = (paidDeals) => {
  const tierTargets = [
    { threshold: 70, value: "Bonus $1200" },
    { threshold: 120, value: 17.5 },
    { threshold: 150, value: 22.5 },
    { threshold: 200, value: 25 }
  ];
  
  let nextTarget = null;
  
  for (const tier of tierTargets) {
    if (paidDeals < tier.threshold) {
      nextTarget = tier.threshold;
      break;
    }
  }
  
  const percentToNext = nextTarget ? (paidDeals / nextTarget) * 100 : 100;
  
  return {
    nextTarget,
    percentToNext: Math.min(percentToNext, 100)
  };
};

// Calculate bonus progress
export const calculateBonusProgress = (paidDeals) => {
  const bonusTarget = 70;
  const percentToBonus = Math.min((paidDeals / bonusTarget) * 100, 100);
  
  return {
    bonusTarget,
    percentToBonus
  };
};

// Process statement data to calculate summary and totals
export const processStatementData = (data) => {
  // Initialize totals
  const totals = {
    deals: 0,
    agent: 0,
    owner_rev: 0,
    owner_prof: 0
  };
  
  // Generate summary for each agent
  const summary = [];
  
  // Group data by agent
  const agentGroups = {};
  
  data.forEach(row => {
    const agent = row.Agent;
    if (!agentGroups[agent]) {
      agentGroups[agent] = [];
    }
    agentGroups[agent].push(row);
  });
  
  // Process each agent
  for (const agent in agentGroups) {
    const agentData = agentGroups[agent];
    const paidDeals = agentData.filter(row => row.Paid_Status === "Paid").length;
    const { rate } = calculateCommissionTier(paidDeals);
    const bonus = calculateBonus(paidDeals);
    const payout = paidDeals * rate + bonus;
    const ownerRev = paidDeals * 150;
    const ownerProf = paidDeals * 43;
    
    // Add to totals
    totals.deals += paidDeals;
    totals.agent += payout;
    totals.owner_rev += ownerRev;
    totals.owner_prof += ownerProf;
    
    // Add to summary
    summary.push({
      Agent: agent,
      "Paid Deals": paidDeals,
      "Agent Payout": payout,
      "Owner Profit": ownerProf,
      "Net Paid": agentData.reduce((sum, row) => sum + (parseFloat(row.Advance) || 0), 0)
    });
  }
  
  return { summary, totals };
};

// Vendor constants
export const VENDOR_CODES = {
  "general": "GENERAL",
  "inbound": "INBOUND",
  "sms": "SMS",
  "advancegro": "Advance gro",
  "axad": "AXAD",
  "googlecalls": "GOOGLE CALLS",
  "buffercall": "Aetna",
  "ancletadvising": "Anclet advising",
  "blmcalls": "BLM CALLS",
  "loopcalls": "LOOP CALLS",
  "nobufferaca": "NO BUFFER ACA",
  "raycalls": "RAY CALLS",
  "nomiaca": "Nomi ACA",
  "hcsmedia": "HCS MEDIA",
  "francalls": "Fran Calls",
  "acaking": "ACA KING",
  "ptacacalls": "PT ACA CALLS",
  "hcscaa": "HCS CAA",
  "slavaaca": "Slava ACA",
  "slavaaca2": "Slava ACA 2",
  "francallssupp": "Fran Calls SUPP",
  "derekinhousefb": "DEREK INHOUSE FB",
  "allicalladdoncall": "ALI CALL ADDON CALL",
  "joshaca": "JOSH ACA",
  "hcs1p": "HCS1p",
  "hcsmediacpl": "HCS MEDIA CPL"
};

export const VENDOR_RATES = {
  "francalls": 75,
  "hcsmedia": 75,
  "buffercall": 80,
  "acaking": 75,
  "raycalls": 75,
};

export const VENDOR_CPLS = {
  "acaking": 35,
  "joshaca": 30,
  "francalls": 25,
  "hcsmediacpl": 25,
};

// Normalize vendor key
export const normalizeVendorKey = (value) => {
  return String(value).trim().toLowerCase().replace(/[ /_]/g, '');
};
