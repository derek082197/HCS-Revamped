import React, { createContext, useState, useEffect } from 'react';

// Create auth context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  // Load user state from localStorage on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('hcs_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setIsLoggedIn(true);
      setUserRole(user.role || '');
      setUserEmail(user.email || '');
      setUserName(user.name || '');
    }
  }, []);

  // User database - in a real app, this would be on a server
  const adminUsers = {
    'admin@example.com': { 
      password: 'password', 
      firstName: 'Admin', 
      lastName: 'User', 
      role: 'admin' 
    },
    // Add other admin users here
  };

  // Agent credentials would come from an API in a real implementation
  const [agentCredentials, setAgentCredentials] = useState({});
  const [agentNames, setAgentNames] = useState({});
  const [agentRoles, setAgentRoles] = useState({});
  const [agentUserIds, setAgentUserIds] = useState({});

  // Login function
  const login = (email, password) => {
    // Check admin credentials
    if (adminUsers[email] && adminUsers[email].password === password) {
      const user = adminUsers[email];
      const name = `${user.firstName} ${user.lastName}`;
      
      setIsLoggedIn(true);
      setUserRole('admin');
      setUserEmail(email);
      setUserName(name);
      
      // Store user in localStorage
      localStorage.setItem('hcs_user', JSON.stringify({
        email,
        role: 'admin',
        name
      }));
      
      return { success: true, message: `Welcome, ${name}! (Admin)` };
    }
    
    // Check agent credentials
    if (agentCredentials[email] && agentCredentials[email] === password) {
      setIsLoggedIn(true);
      setUserRole(agentRoles[email] || 'agent');
      setUserEmail(email);
      setUserName(agentNames[email] || email);
      
      // Store user in localStorage
      localStorage.setItem('hcs_user', JSON.stringify({
        email,
        role: agentRoles[email] || 'agent',
        name: agentNames[email] || email
      }));
      
      return { success: true, message: `Welcome, ${agentNames[email]}!` };
    }
    
    return { success: false, message: 'Incorrect credentials' };
  };

  // Logout function
  const logout = () => {
    setIsLoggedIn(false);
    setUserRole('');
    setUserEmail('');
    setUserName('');
    localStorage.removeItem('hcs_user');
  };

  // Set agent credentials from API data
  const setAgentData = (agentsData) => {
    const credentials = {};
    const names = {};
    const roles = {};
    const userIds = {};
    
    agentsData.forEach(agent => {
      credentials[agent.username] = 'password'; // Default password for all agents
      names[agent.username] = `${agent.first_name} ${agent.last_name}`;
      roles[agent.username] = agent.role_descriptions || 'agent';
      userIds[agent.username] = agent.user_id;
    });
    
    setAgentCredentials(credentials);
    setAgentNames(names);
    setAgentRoles(roles);
    setAgentUserIds(userIds);
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      userRole,
      userEmail,
      userName,
      login,
      logout,
      setAgentData,
      agentUserIds
    }}>
      {children}
    </AuthContext.Provider>
  );
};
