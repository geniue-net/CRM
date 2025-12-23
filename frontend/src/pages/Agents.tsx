import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Agent, User, AgentCreate, AdAccount } from '../types';

const Agents: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [agentToken, setAgentToken] = useState('');
  const [agentId, setAgentId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    user_id: '',
    allowed_ip: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [agentsRes, usersRes, adAccountsRes] = await Promise.all([
        apiService.getAgents(),
        apiService.getUsers(),
        apiService.getAdAccounts().catch(() => ({ data: [] })),
      ]);
      setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setAdAccounts(Array.isArray(adAccountsRes.data) ? adAccountsRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setFormData({
      name: '',
      user_id: users.length > 0 ? users[0].id : '',
      allowed_ip: '',
    });
    setError('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      name: '',
      user_id: users.length > 0 ? users[0].id : '',
      allowed_ip: '',
    });
  };

  const handleSubmit = async () => {
    try {
      setError('');
      
      if (!formData.name.trim()) {
        setError('Agent name is required');
        return;
      }

      const agentData: AgentCreate = {
        name: formData.name.trim(),
        user_id: formData.user_id || undefined,
        allowed_ip: formData.allowed_ip?.trim() || undefined,
      };

      const response = await apiService.createAgent(agentData);
      
      // Show token dialog for new agents
      if (response.data.bootstrap?.token) {
        setAgentToken(response.data.bootstrap.token);
        setAgentId(response.data.id);
        setShowTokenDialog(true);
      }
      
      await fetchData();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create agent');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Agents</h1>
        <button 
          onClick={handleOpen}
          className="btn btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Agent
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <div className="card p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Meta Account</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Last Heartbeat</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const hasAccount = adAccounts.some(acc => acc.agent_id === agent.id && acc.is_active);
                const isConnected = agent.meta_connected || hasAccount;
                const accountName = agent.meta_account_name || adAccounts.find(acc => acc.agent_id === agent.id)?.name;
                const accountStatus = agent.meta_account_status || (hasAccount ? 'ACTIVE' : 'DISCONNECTED');
                
                return (
                  <tr key={agent.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-dark-lighter">
                    <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">{agent.name}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {users.find(u => u.id === agent.user_id)?.email || 'Unknown'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agent.status === 'ONLINE'
                          ? 'bg-primary text-black'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isConnected && accountName ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            accountStatus === 'ACTIVE'
                              ? 'bg-green-500'
                              : accountStatus === 'INACTIVE'
                              ? 'bg-yellow-500'
                              : 'bg-gray-400'
                          }`}></div>
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-900 dark:text-white font-medium">{accountName}</span>
                            <span className={`text-xs ${
                              accountStatus === 'ACTIVE'
                                ? 'text-green-600 dark:text-green-400'
                                : accountStatus === 'INACTIVE'
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {accountStatus}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500 italic">Not connected</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {agent.last_heartbeat_at
                        ? new Date(agent.last_heartbeat_at).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => navigate(`/agents/${agent.id}`)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-lighter"
                        title="View Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Agent Dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleClose}>
          <div className="card p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create New Agent</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Agent Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Enter agent name"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Agent ID will be auto-generated
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">User</label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="input"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Allowed IP (Optional)</label>
                <input
                  type="text"
                  value={formData.allowed_ip}
                  onChange={(e) => setFormData({ ...formData, allowed_ip: e.target.value })}
                  className="input"
                  placeholder="Leave empty for any IP"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Comma-separated list of IP addresses
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={handleClose} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={handleSubmit} className="btn btn-primary">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Display Dialog */}
      {showTokenDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowTokenDialog(false)}>
          <div className="card p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white text-center">Agent Created Successfully</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Your Agent Token</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Copy this token and add it to your agent's configuration file:
                </p>
                <div className="p-4 bg-gray-100 dark:bg-dark-lighter rounded-lg border border-gray-300 dark:border-gray-700 font-mono text-sm break-all text-center">
                  {agentToken}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Agent ID</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Your agent's unique identifier:
                </p>
                <div className="p-3 bg-gray-100 dark:bg-dark-lighter rounded-lg border border-gray-300 dark:border-gray-700 font-mono text-sm text-center">
                  {agentId}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Configuration File</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Update your agent's <code className="bg-gray-100 dark:bg-dark-lighter px-1 rounded">meta_config.json</code> file:
                </p>
                <div className="p-4 bg-gray-100 dark:bg-dark-lighter rounded-lg border border-gray-300 dark:border-gray-700 font-mono text-xs overflow-auto max-h-64">
                  {`{
  "meta_api": {
    "app_id": "YOUR_APP_ID",
    "app_secret": "YOUR_APP_SECRET",
    "access_token": "YOUR_ACCESS_TOKEN",
    "ad_account_id": "YOUR_AD_ACCOUNT_ID",
    "base_url": "https://graph.facebook.com/v18.0",
    "timeout": 30
  },
  "crm": {
    "agent_token": "${agentToken}"
  }
}`}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(agentToken);
                }}
                className="btn btn-secondary"
              >
                Copy Token
              </button>
              <button
                onClick={() => setShowTokenDialog(false)}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
