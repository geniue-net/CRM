import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Agent, AdAccount } from '../types';
import { apiService } from '../services/api';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectingAgent, setConnectingAgent] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agentsRes, adAccountsRes] = await Promise.all([
          apiService.getAgents(),
          apiService.getAdAccounts().catch(() => ({ data: [] })), // Gracefully handle if endpoint doesn't exist
        ]);
        setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : []);
        setAdAccounts(Array.isArray(adAccountsRes.data) ? adAccountsRes.data : []);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Check for OAuth callback success/error messages
    const success = searchParams.get('success');
    const errorMsg = searchParams.get('error');
    if (success || errorMsg) {
      // Show notification (you can replace this with a toast library)
      if (success) {
        alert(success);
      } else if (errorMsg) {
        alert(`Error: ${errorMsg}`);
      }
      // Clean up URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
        {error}
      </div>
    );
  }

  const handleConnectMetaAccount = async (agentId: string) => {
    try {
      setConnectingAgent(agentId);
      const response = await apiService.getMetaOAuthUrl(agentId);
      // Redirect to Meta OAuth page
      window.location.href = response.data.auth_url;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to initiate Meta account connection');
      setConnectingAgent(null);
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this Meta account?')) {
      return;
    }
    try {
      await apiService.disconnectMetaAccount(accountId);
      // Refresh data
      const adAccountsRes = await apiService.getAdAccounts().catch(() => ({ data: [] }));
      setAdAccounts(Array.isArray(adAccountsRes.data) ? adAccountsRes.data : []));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to disconnect account');
    }
  };

  const onlineAgents = (agents || []).filter(agent => agent.status === 'ONLINE').length;
  const totalAgents = (agents || []).length;
  const connectedAccounts = adAccounts.filter(acc => acc.is_active && acc.meta_access_token).length;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard</h1>
      
      <div className="flex flex-col gap-6">
        {/* Agent Health Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Agent Health</h2>
            </div>
            <div className="text-4xl font-bold text-primary mb-2">
              {onlineAgents}/{totalAgents}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Agents Online
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connected Accounts</h2>
            </div>
            <div className="text-4xl font-bold text-primary mb-2">
              {connectedAccounts}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Meta Accounts Connected
            </p>
          </div>
        </div>

        {/* Meta Account Connection Section */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Meta Account Management</h2>
          </div>
          
          {/* Connected Accounts List */}
          {adAccounts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Connected Accounts</h3>
              <div className="space-y-2">
                {adAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{account.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Account ID: {account.meta_ad_account_id}
                          {account.meta_connected_at && (
                            <> • Connected {new Date(account.meta_connected_at).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.is_active ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                          Inactive
                        </span>
                      )}
                      <button
                        onClick={() => handleDisconnectAccount(account.id)}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connect New Account */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Connect Meta Account to Agent</h3>
            <div className="space-y-3">
              {agents.map((agent) => {
                const hasAccount = adAccounts.some(acc => acc.agent_id === agent.id && acc.is_active);
                return (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{agent.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Status: {agent.status}
                        {hasAccount && <span className="ml-2 text-green-600 dark:text-green-400">• Account Connected</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleConnectMetaAccount(agent.id)}
                      disabled={connectingAgent === agent.id || hasAccount}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connectingAgent === agent.id
                        ? 'Connecting...'
                        : hasAccount
                        ? 'Connected'
                        : 'Connect Meta Account'}
                    </button>
                  </div>
                );
              })}
            </div>
            {agents.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No agents available. Create an agent first to connect a Meta account.
              </p>
            )}
          </div>
        </div>

        {/* Agent Status Table */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Agent Status</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Last Heartbeat</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Allowed IP</th>
                </tr>
              </thead>
              <tbody>
                {(agents || []).map((agent) => (
                  <tr key={agent.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-dark-lighter">
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{agent.name}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agent.status === 'ONLINE'
                          ? 'bg-primary text-black'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {agent.last_heartbeat_at
                        ? new Date(agent.last_heartbeat_at).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{agent.allowed_ip || 'Any'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
