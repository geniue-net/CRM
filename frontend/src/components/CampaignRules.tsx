import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import { AdSetRule, MetaCampaign, RulePreview } from '../types';
import { showToast } from './Toast';

interface CampaignRulesProps {
  agentId: string;
  campaigns: MetaCampaign[];
  refreshToken?: number;
}

const CampaignRules: React.FC<CampaignRulesProps> = ({ agentId, campaigns, refreshToken = 0 }) => {
  const [rules, setRules] = useState<AdSetRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executingRuleId, setExecutingRuleId] = useState<string | null>(null);
  const [updatingRuleId, setUpdatingRuleId] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<{
    rule: AdSetRule | null;
    data: RulePreview | null;
    loading: boolean;
    error?: string;
  }>({ rule: null, data: null, loading: false });

  const campaignMap = useMemo(() => {
    const map: Record<string, MetaCampaign> = {};
    campaigns.forEach((campaign) => {
      map[campaign.id] = campaign;
    });
    return map;
  }, [campaigns]);

  useEffect(() => {
    if (!agentId) return;
    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, refreshToken]);

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getAdSetRules(agentId);
      setRules(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (rule: AdSetRule) => {
    setPreviewState({ rule, data: null, loading: true });
    try {
      const response = await apiService.previewRule(rule.agent_id, rule.campaign_id, rule.filter_config);
      setPreviewState({ rule, data: response.data, loading: false });
    } catch (err: any) {
      setPreviewState({
        rule,
        data: null,
        loading: false,
        error: err.response?.data?.detail || err.message || 'Failed to preview rule',
      });
    }
  };

  const handleExecute = async (rule: AdSetRule) => {
    setExecutingRuleId(rule.id);
    try {
      const response = await apiService.executeRule(rule.id);
      const result = response.data;
      
      await fetchRules();
      
      // Check if there were any failures
      if (result.has_errors || result.failed_count > 0) {
        const failedResults = result.results?.filter((r: any) => !r.success) || [];
        const errorMessages = failedResults.map((r: any) => 
          `${r.ad_set_name || r.ad_set_id}: ${r.error || 'Unknown error'}`
        ).join('\n');
        
        const errorSummary = result.error_summary || 
          `${result.failed_count} out of ${result.matched_count} ad sets failed to update`;
        
        showToast(
          `${errorSummary}${errorMessages ? '\n\nDetails:\n' + errorMessages : ''}`,
          'error',
          10000
        );
      } else if (result.successful_count > 0) {
        showToast(
          `Rule executed successfully: ${result.action || rule.action.type} applied to ${result.successful_count} ad set(s)`,
          'success'
        );
      } else {
        showToast('Rule executed but no ad sets were affected', 'info');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to execute rule';
      showToast(`Failed to execute rule: ${errorMessage}`, 'error', 8000);
    } finally {
      setExecutingRuleId(null);
    }
  };

  const handleToggleActive = async (rule: AdSetRule) => {
    setUpdatingRuleId(rule.id);
    try {
      await apiService.updateAdSetRule(rule.id, { is_active: !rule.is_active });
      await fetchRules();
      showToast(`Rule ${!rule.is_active ? 'activated' : 'deactivated'} successfully`, 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update rule';
      showToast(`Failed to update rule: ${errorMessage}`, 'error');
    } finally {
      setUpdatingRuleId(null);
    }
  };

  const closePreview = () => {
    setPreviewState({ rule: null, data: null, loading: false });
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Ad Set Rules</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View and manage AI-generated rules for this agent&apos;s campaigns
          </p>
        </div>
        <button onClick={fetchRules} className="btn btn-secondary">
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No rules yet. Use the AI assistant to create your first rule.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-sm text-gray-600 dark:text-gray-300">
                <th className="py-3 px-4">Rule</th>
                <th className="py-3 px-4">Campaign</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Execution</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last run</th>
                <th className="py-3 px-4">Ad Sets affected</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const campaign = campaignMap[rule.campaign_id];
                return (
                  <tr
                    key={rule.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">{rule.rule_name}</div>
                      {rule.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{rule.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {campaign?.name || 'Unknown campaign'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rule.action.type === 'PAUSE'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                        }`}
                      >
                        {rule.action.type === 'PAUSE' ? 'Pause' : 'Activate'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rule.execution_mode === 'AUTO'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                        }`}
                      >
                        {rule.execution_mode === 'AUTO' ? 'Automatic' : 'Manual'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={rule.is_active}
                          onChange={() => handleToggleActive(rule)}
                          disabled={updatingRuleId === rule.id}
                        />
                        <div
                          className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                            rule.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          } ${updatingRuleId === rule.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              rule.is_active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </label>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                      {rule.last_executed_at
                        ? new Date(rule.last_executed_at).toLocaleString()
                        : 'Never'}
                      <div className="text-xs text-gray-500">
                        {rule.execution_count} run{rule.execution_count === 1 ? '' : 's'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {rule.last_matched_count ?? '—'}
                      <div className="text-xs text-gray-500">last execution</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handlePreview(rule)}
                          className="btn btn-secondary btn-sm"
                          disabled={previewState.loading && previewState.rule?.id === rule.id}
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handleExecute(rule)}
                          className="btn btn-primary btn-sm"
                          disabled={executingRuleId === rule.id}
                        >
                          {executingRuleId === rule.id ? 'Executing...' : 'Run now'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {previewState.rule && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Preview: {previewState.rule.rule_name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Campaign: {campaignMap[previewState.rule.campaign_id]?.name || previewState.rule.campaign_id}
                </p>
              </div>
              <button onClick={closePreview} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              {previewState.loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : previewState.error ? (
                <div className="p-3 rounded bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200">
                  {previewState.error}
                </div>
              ) : previewState.data ? (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                    <span>Total ad sets: {previewState.data.total_ad_sets}</span>
                    <span>Matching now: {previewState.data.matching_ad_sets}</span>
                  </div>
                  {previewState.data.matched_ad_sets.length > 0 ? (
                    <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                          <tr>
                            <th className="py-2 px-3 text-left">Ad Set</th>
                            <th className="py-2 px-3 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewState.data.matched_ad_sets.map((adSet) => (
                            <tr key={adSet.id} className="border-b border-gray-100 dark:border-gray-800">
                              <td className="py-2 px-3 text-gray-900 dark:text-white">{adSet.name}</td>
                              <td className="py-2 px-3 text-gray-600 dark:text-gray-300">{adSet.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                      No ad sets currently match this rule.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignRules;

