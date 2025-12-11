import React, { useState, useEffect } from 'react';
import { Agent } from '../types';
import { apiService } from '../services/api';

const Dashboard: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const agentsRes = await apiService.getAgents();
        setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : []);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const onlineAgents = (agents || []).filter(agent => agent.status === 'ONLINE').length;
  const totalAgents = (agents || []).length;
  const connectedApps = (agents || []).filter(agent => agent.status === 'ONLINE').length;

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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connected Apps</h2>
            </div>
            <div className="text-4xl font-bold text-primary mb-2">
              {connectedApps}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Meta Apps Connected
            </p>
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
