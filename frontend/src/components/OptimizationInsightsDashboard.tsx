import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface OptimizationInsightsProps {
  agentId: string;
  campaignId: string;
  campaignName: string;
}

interface OptimizationRecommendation {
  id: string;
  type: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OPPORTUNITY';
  related_entity_id: string;
  related_entity_name: string;
  detected_value?: number;
  benchmark_value?: number;
  metric_label: string;
  message: string;
  action_endpoint?: string;
  estimated_savings?: number;
  estimated_revenue_increase?: number;
  confidence: number;
  module: string;
}

const OptimizationInsightsDashboard: React.FC<OptimizationInsightsProps> = ({
  agentId,
  campaignId,
  campaignName,
}) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);
  const [error, setError] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedRecommendation, setSelectedRecommendation] = useState<OptimizationRecommendation | null>(null);
  const [configuring, setConfiguring] = useState(false);
  const [targetCPA, setTargetCPA] = useState<string>('');
  const [targetROAS, setTargetROAS] = useState<string>('');

  useEffect(() => {
    runAnalysis();
  }, [agentId, campaignId]);

  const runAnalysis = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.runOptimizationAnalysis(agentId, campaignId);
      setInsights(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to run optimization analysis');
    } finally {
      setLoading(false);
    }
  };

  const runSpecificModule = async (moduleName: 'bleeding_budget' | 'creative_fatigue' | 'scaling') => {
    try {
      setLoading(true);
      setError('');
      setSelectedModule(moduleName);
      const response = await apiService.runOptimizationModule(agentId, campaignId, moduleName);
      setInsights({
        ...insights,
        recommendations: response.data.recommendations,
        summary: {
          ...insights?.summary,
          total_recommendations: response.data.count,
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to run ${moduleName} module`);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setConfiguring(true);
      const config: any = {};
      if (targetCPA) config.target_cpa = parseFloat(targetCPA);
      if (targetROAS) config.target_roas = parseFloat(targetROAS);
      
      await apiService.updateCampaignConfig(agentId, campaignId, config);
      alert('Configuration saved successfully!');
      runAnalysis(); // Re-run analysis with new config
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setConfiguring(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      CRITICAL: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      HIGH: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      MEDIUM: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      LOW: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      OPPORTUNITY: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    };
    return colors[priority as keyof typeof colors] || colors.MEDIUM;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      budget_waste: '💸',
      creative_alert: '🎨',
      scaling_opportunity: '🚀',
      cost_efficiency: '💰',
      sentiment_warning: '⚠️',
      learning_phase: '🎓',
      platform_arbitrage: '📱',
      dayparting: '⏰',
    };
    return icons[type] || '📊';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  if (loading && !insights) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !insights) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
        {error}
      </div>
    );
  }

  if (!insights) return null;

  // Group recommendations by priority
  const critical = insights.recommendations?.filter((r: OptimizationRecommendation) => r.priority === 'CRITICAL') || [];
  const high = insights.recommendations?.filter((r: OptimizationRecommendation) => r.priority === 'HIGH') || [];
  const opportunities = insights.recommendations?.filter((r: OptimizationRecommendation) => r.priority === 'OPPORTUNITY') || [];
  const others = insights.recommendations?.filter((r: OptimizationRecommendation) => 
    !['CRITICAL', 'HIGH', 'OPPORTUNITY'].includes(r.priority)
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              🎯 Optimization Insights: {campaignName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              AI-powered recommendations to optimize your campaign performance
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50"
          >
            {loading ? '🔄 Analyzing...' : '🔄 Refresh Analysis'}
          </button>
        </div>

        {/* Module Selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setSelectedModule('all'); runAnalysis(); }}
            className={`px-3 py-1 text-sm rounded-lg ${
              selectedModule === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            All Modules
          </button>
          <button
            onClick={() => runSpecificModule('bleeding_budget')}
            className={`px-3 py-1 text-sm rounded-lg ${
              selectedModule === 'bleeding_budget'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            💸 Bleeding Budget
          </button>
          <button
            onClick={() => runSpecificModule('creative_fatigue')}
            className={`px-3 py-1 text-sm rounded-lg ${
              selectedModule === 'creative_fatigue'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            🎨 Creative Fatigue
          </button>
          <button
            onClick={() => runSpecificModule('scaling')}
            className={`px-3 py-1 text-sm rounded-lg ${
              selectedModule === 'scaling'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            🚀 Scaling
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {insights.summary?.critical_issues || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Critical Issues</div>
          </div>
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {insights.summary?.high_priority || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">High Priority</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {insights.summary?.opportunities || 0}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Opportunities</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(insights.summary?.total_estimated_savings || 0)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Est. Savings</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(insights.summary?.total_estimated_revenue_increase || 0)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Est. Revenue</div>
          </div>
        </div>

        {/* Configuration */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Campaign Configuration</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Target CPA</label>
              <input
                type="number"
                step="0.01"
                value={targetCPA}
                onChange={(e) => setTargetCPA(e.target.value)}
                placeholder={insights.config?.target_cpa?.toFixed(2) || 'Auto'}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Target ROAS</label>
              <input
                type="number"
                step="0.1"
                value={targetROAS}
                onChange={(e) => setTargetROAS(e.target.value)}
                placeholder={insights.config?.target_roas?.toFixed(1) || '4.0'}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Account Avg CPA</label>
              <input
                type="text"
                value={insights.config?.account_avg_cpa?.toFixed(2) || 'N/A'}
                disabled
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={saveConfig}
                disabled={configuring || (!targetCPA && !targetROAS)}
                className="w-full px-3 py-1 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded disabled:opacity-50"
              >
                {configuring ? 'Saving...' : 'Save Config'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Issues */}
      {critical.length > 0 && (
        <div className="card p-6">
          <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
            🚨 Critical Issues ({critical.length})
          </h3>
          <div className="space-y-3">
            {critical.map((rec: OptimizationRecommendation) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onViewDetails={() => setSelectedRecommendation(rec)}
                getPriorityBadge={getPriorityBadge}
                getTypeIcon={getTypeIcon}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        </div>
      )}

      {/* High Priority */}
      {high.length > 0 && (
        <div className="card p-6">
          <h3 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-4">
            ⚠️ High Priority ({high.length})
          </h3>
          <div className="space-y-3">
            {high.map((rec: OptimizationRecommendation) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onViewDetails={() => setSelectedRecommendation(rec)}
                getPriorityBadge={getPriorityBadge}
                getTypeIcon={getTypeIcon}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        </div>
      )}

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <div className="card p-6">
          <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-4">
            💡 Growth Opportunities ({opportunities.length})
          </h3>
          <div className="space-y-3">
            {opportunities.map((rec: OptimizationRecommendation) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onViewDetails={() => setSelectedRecommendation(rec)}
                getPriorityBadge={getPriorityBadge}
                getTypeIcon={getTypeIcon}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Recommendations */}
      {others.length > 0 && (
        <div className="card p-6">
          <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">
            📋 Other Recommendations ({others.length})
          </h3>
          <div className="space-y-3">
            {others.map((rec: OptimizationRecommendation) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onViewDetails={() => setSelectedRecommendation(rec)}
                getPriorityBadge={getPriorityBadge}
                getTypeIcon={getTypeIcon}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        </div>
      )}

      {/* Detailed Modal */}
      {selectedRecommendation && (
        <RecommendationModal
          recommendation={selectedRecommendation}
          onClose={() => setSelectedRecommendation(null)}
          getPriorityBadge={getPriorityBadge}
          getTypeIcon={getTypeIcon}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

// Recommendation Card Component
const RecommendationCard: React.FC<{
  recommendation: OptimizationRecommendation;
  onViewDetails: () => void;
  getPriorityBadge: (priority: string) => string;
  getTypeIcon: (type: string) => string;
  formatCurrency: (value: number) => string;
}> = ({ recommendation, onViewDetails, getPriorityBadge, getTypeIcon, formatCurrency }) => {
  return (
    <div
      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border border-gray-200 dark:border-gray-700"
      onClick={onViewDetails}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getTypeIcon(recommendation.type)}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(recommendation.priority)}`}>
              {recommendation.priority}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {recommendation.confidence}% confidence
            </span>
            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
              {recommendation.module}
            </span>
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {recommendation.metric_label}
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {recommendation.message}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Affected: {recommendation.related_entity_name}
          </div>
        </div>
        <div className="text-right ml-4">
          {recommendation.estimated_savings && (
            <div className="text-sm font-semibold text-green-600 dark:text-green-400">
              Save {formatCurrency(recommendation.estimated_savings)}
            </div>
          )}
          {recommendation.estimated_revenue_increase && (
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              Gain {formatCurrency(recommendation.estimated_revenue_increase)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Recommendation Modal Component
const RecommendationModal: React.FC<{
  recommendation: OptimizationRecommendation;
  onClose: () => void;
  getPriorityBadge: (priority: string) => string;
  getTypeIcon: (type: string) => string;
  formatCurrency: (value: number) => string;
}> = ({ recommendation, onClose, getPriorityBadge, getTypeIcon, formatCurrency }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-lighter rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{getTypeIcon(recommendation.type)}</span>
                <span className={`px-3 py-1 rounded text-xs font-medium ${getPriorityBadge(recommendation.priority)}`}>
                  {recommendation.priority} PRIORITY
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {recommendation.metric_label}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">📊 Details</h4>
              <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">
                {recommendation.message}
              </p>
            </div>

            {recommendation.detected_value !== undefined && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Detected Value</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {typeof recommendation.detected_value === 'number' && recommendation.detected_value > 100
                      ? formatCurrency(recommendation.detected_value)
                      : recommendation.detected_value.toFixed(2)}
                  </div>
                </div>
                {recommendation.benchmark_value !== undefined && (
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Benchmark Value</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {typeof recommendation.benchmark_value === 'number' && recommendation.benchmark_value > 100
                        ? formatCurrency(recommendation.benchmark_value)
                        : recommendation.benchmark_value.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {recommendation.estimated_savings && (
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(recommendation.estimated_savings)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Potential Savings</div>
                </div>
              )}
              {recommendation.estimated_revenue_increase && (
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(recommendation.estimated_revenue_increase)}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Revenue Increase</div>
                </div>
              )}
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {recommendation.confidence}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Confidence</div>
              </div>
            </div>

            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Affected Entity</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {recommendation.related_entity_name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                ID: {recommendation.related_entity_id}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
            >
              Close
            </button>
            {recommendation.action_endpoint && (
              <button
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg"
                onClick={() => alert('Action will be implemented: ' + recommendation.action_endpoint)}
              >
                Take Action
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationInsightsDashboard;



