import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AdSetRule, Agent } from '../models';
import { authenticate, requireRoles, AuthRequest } from '../middleware/auth';
import { generateId } from '../utils';
import { 
  generateRuleFromNaturalLanguage, 
  analyzeCampaign,
  getAvailableOperators,
  getAvailableFields,
} from '../utils/ai';
import { 
  executeRule, 
  evaluateFilterConditions, 
  calculateCampaignStatistics,
  FIELD_CATEGORIES,
} from '../utils/ruleExecutor';
import axios from 'axios';
import { config } from '../config';

const router = Router();

// Get available fields and operators for rule building
router.get('/schema', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const mode = (req.query.mode as 'basic' | 'advanced') || 'basic';
    
    res.json({
      fields: getAvailableFields(mode),
      operators: getAvailableOperators(),
      actions: ['PAUSE', 'ACTIVATE'],
      time_windows: ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d'],
    });
  } catch (error) {
    console.error('Get schema error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// List rules
router.get('/', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { agent_id, campaign_id } = req.query;
    
    let query: any = {};
    if (req.user!.role !== 'ADMIN') {
      query.user_id = req.user!.id;
    }
    if (agent_id) query.agent_id = agent_id;
    if (campaign_id) query.campaign_id = campaign_id;

    const rules = await AdSetRule.find(query).sort({ created_at: -1 });
    res.json(rules);
  } catch (error) {
    console.error('List rules error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Get rule
router.get('/:rule_id', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { rule_id } = req.params;
    const rule = await AdSetRule.findOne({ id: rule_id });

    if (!rule) {
      return res.status(404).json({ detail: 'Rule not found' });
    }

    if (req.user!.role !== 'ADMIN' && rule.user_id !== req.user!.id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    res.json(rule);
  } catch (error) {
    console.error('Get rule error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Generate rule from natural language (AI endpoint)
router.post('/generate', authenticate, requireRoles('USER', 'ADMIN'), [
  body('natural_language').notEmpty().withMessage('Natural language description is required'),
  body('agent_id').notEmpty().withMessage('Agent ID is required'),
  body('campaign_id').notEmpty().withMessage('Campaign ID is required'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { natural_language, agent_id, campaign_id, mode = 'basic' } = req.body;

    // Verify agent and campaign access
    const agent = await Agent.findOne({ id: agent_id });
    if (!agent) {
      return res.status(404).json({ detail: 'Agent not found' });
    }

    if (req.user!.role !== 'ADMIN' && agent.user_id !== req.user!.id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    // Fetch campaign and ad sets data for context
    let campaignData = null;
    let adSetsData: any[] = [];
    
    try {
      const campaignsUrl = `${config.agent.baseUrl}/meta/test/hierarchical`;
      const campaignsResponse = await axios.get(campaignsUrl, { timeout: 15000 });
      const campaigns = campaignsResponse.data?.hierarchical_structure?.campaigns || [];
      campaignData = campaigns.find((c: any) => c.id === campaign_id);
      
      if (campaignData) {
        adSetsData = campaignData.ad_sets || [];
      }
    } catch (error) {
      console.warn('Could not fetch campaign context for AI:', error);
    }

    // Generate rule using AI with context
    const generatedRule = await generateRuleFromNaturalLanguage({
      naturalLanguage: natural_language,
      campaignData,
      adSetsData,
      mode,
    });

    res.json({
      ...generatedRule,
      agent_id,
      campaign_id,
    });
  } catch (error: any) {
    console.error('Generate rule error:', error);
    if (error.message.includes('OpenAI') || error.message.includes('API key')) {
      return res.status(503).json({ detail: error.message });
    }
    res.status(500).json({ detail: error.message || 'Internal server error' });
  }
});

// Analyze campaign and get optimization suggestions
router.post('/analyze', authenticate, requireRoles('USER', 'ADMIN'), [
  body('agent_id').notEmpty().withMessage('Agent ID is required'),
  body('campaign_id').notEmpty().withMessage('Campaign ID is required'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { agent_id, campaign_id } = req.body;

    // Verify agent access
    const agent = await Agent.findOne({ id: agent_id });
    if (!agent) {
      return res.status(404).json({ detail: 'Agent not found' });
    }

    if (req.user!.role !== 'ADMIN' && agent.user_id !== req.user!.id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    // Fetch campaign and ad sets data
    let campaignData = null;
    let adSetsData: any[] = [];
    
    try {
      const campaignsUrl = `${config.agent.baseUrl}/meta/test/hierarchical`;
      const campaignsResponse = await axios.get(campaignsUrl, { timeout: 20000 });
      const campaigns = campaignsResponse.data?.hierarchical_structure?.campaigns || [];
      campaignData = campaigns.find((c: any) => c.id === campaign_id);
      
      if (!campaignData) {
        return res.status(404).json({ detail: 'Campaign not found' });
      }
      
      adSetsData = campaignData.ad_sets || [];
    } catch (error: any) {
      console.error('Failed to fetch campaign data:', error);
      return res.status(503).json({ detail: 'Failed to fetch campaign data from agent' });
    }

    // Analyze campaign
    const analysis = await analyzeCampaign(campaignData, adSetsData);

    res.json(analysis);
  } catch (error: any) {
    console.error('Analyze campaign error:', error);
    res.status(500).json({ detail: error.message || 'Internal server error' });
  }
});

// Preview rule (shows which ad sets would match)
router.post('/preview', authenticate, requireRoles('USER', 'ADMIN'), [
  body('agent_id').notEmpty(),
  body('campaign_id').notEmpty(),
  body('filter_config').notEmpty(),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { agent_id, campaign_id, filter_config } = req.body;

    // Verify agent access
    const agent = await Agent.findOne({ id: agent_id });
    if (!agent) {
      return res.status(404).json({ detail: 'Agent not found' });
    }

    if (req.user!.role !== 'ADMIN' && agent.user_id !== req.user!.id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    // Get ad sets from agent
    const agentUrl = `${config.agent.baseUrl}/meta/campaigns/${campaign_id}/adsets`;
    let adSetsResponse;
    try {
      adSetsResponse = await axios.get(agentUrl, { timeout: 15000 });
    } catch (error: any) {
      return res.status(503).json({ detail: 'Failed to fetch ad sets from agent' });
    }

    const adSets = adSetsResponse.data?.ad_sets || adSetsResponse.data?.data || [];
    
    // Calculate campaign statistics for comparison operators
    const campaignStats = calculateCampaignStatistics(adSets);
    
    // Apply filter to find matching ad sets
    const matchingAdSets = adSets.filter((adSet: any) => {
      return evaluateFilterConditions(adSet, filter_config, campaignStats);
    });

    res.json({
      total_ad_sets: adSets.length,
      matching_ad_sets: matchingAdSets.length,
      matched_ad_sets: matchingAdSets.map((adSet: any) => ({
        id: adSet.id,
        name: adSet.name,
        status: adSet.status,
        effective_status: adSet.effective_status,
        daily_budget: adSet.daily_budget,
        lifetime_budget: adSet.lifetime_budget,
        performance_metrics: adSet.performance_metrics,
      })),
      campaign_statistics: campaignStats,
    });
  } catch (error: any) {
    console.error('Preview rule error:', error);
    res.status(500).json({ detail: error.message || 'Internal server error' });
  }
});

// Create rule
router.post('/', authenticate, requireRoles('USER', 'ADMIN'), [
  body('agent_id').notEmpty(),
  body('campaign_id').notEmpty(),
  body('rule_name').notEmpty(),
  body('filter_config').notEmpty(),
  body('action').notEmpty(),
  body('execution_mode').optional().isIn(['AUTO', 'MANUAL']),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { agent_id, campaign_id, rule_name, description, filter_config, action, execution_mode } = req.body;

    // Verify agent access
    const agent = await Agent.findOne({ id: agent_id });
    if (!agent) {
      return res.status(404).json({ detail: 'Agent not found' });
    }

    if (req.user!.role !== 'ADMIN' && agent.user_id !== req.user!.id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const rule_id = generateId('rule');

    const rule = new AdSetRule({
      id: rule_id,
      user_id: req.user!.id,
      agent_id,
      campaign_id,
      rule_name,
      description,
      is_active: true,
      execution_mode: execution_mode || 'MANUAL',
      filter_config,
      action,
    });

    await rule.save();

    res.status(201).json(rule);
  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Update rule
router.put('/:rule_id', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { rule_id } = req.params;
    const rule = await AdSetRule.findOne({ id: rule_id });

    if (!rule) {
      return res.status(404).json({ detail: 'Rule not found' });
    }

    if (req.user!.role !== 'ADMIN' && rule.user_id !== req.user!.id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    if (req.body.rule_name) rule.rule_name = req.body.rule_name;
    if (req.body.description !== undefined) rule.description = req.body.description;
    if (req.body.is_active !== undefined) rule.is_active = req.body.is_active;
    if (req.body.execution_mode) rule.execution_mode = req.body.execution_mode;
    if (req.body.filter_config) rule.filter_config = req.body.filter_config;
    if (req.body.action) rule.action = req.body.action;
    rule.updated_at = new Date();

    await rule.save();

    res.json(rule);
  } catch (error) {
    console.error('Update rule error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Delete rule
router.delete('/:rule_id', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { rule_id } = req.params;
    const rule = await AdSetRule.findOne({ id: rule_id });

    if (!rule) {
      return res.status(404).json({ detail: 'Rule not found' });
    }

    if (req.user!.role !== 'ADMIN' && rule.user_id !== req.user!.id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    await AdSetRule.deleteOne({ id: rule_id });
    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Execute rule manually
router.post('/:rule_id/execute', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { rule_id } = req.params;
    const rule = await AdSetRule.findOne({ id: rule_id });

    if (!rule) {
      return res.status(404).json({ detail: 'Rule not found' });
    }

    if (req.user!.role !== 'ADMIN' && rule.user_id !== req.user!.id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    if (!rule.is_active) {
      return res.status(400).json({ detail: 'Rule is not active' });
    }

    // Execute the rule
    const result = await executeRule(rule);

    res.json(result);
  } catch (error: any) {
    console.error('Execute rule error:', error);
    res.status(500).json({ 
      detail: error.message || 'Internal server error',
      has_errors: true,
    });
  }
});

export default router;
