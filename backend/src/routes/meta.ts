import { Router, Response } from 'express';
import { Agent } from '../models';
import { authenticate, requireRoles, AuthRequest, verifyAgentRequest } from '../middleware/auth';
import { config } from '../config';
import axios from 'axios';

const router = Router();

async function getAgentMetaData(agentId: string, endpoint: string): Promise<any> {
  const agent = await Agent.findOne({ id: agentId });
  
  if (!agent) {
    throw new Error('Agent not found');
  }
  
  if (agent.status !== 'ONLINE') {
    throw new Error('Agent is offline. Meta data is only available when agent is connected.');
  }

  try {
    const agentUrl = `${config.agent.baseUrl}/meta/${endpoint}`;
    const response = await axios.get(agentUrl, { timeout: 10000 });
    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Agent request timed out');
    }
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to agent. Make sure the agent is running on ' + config.agent.baseUrl);
    }
    if (error.response) {
      throw new Error(`Agent returned error: ${error.response.status} ${error.response.statusText}`);
    }
    throw new Error('Agent returned an error');
  }
}

async function updateAgentMetaData(agentId: string, endpoint: string, data: any): Promise<any> {
  const agent = await Agent.findOne({ id: agentId });
  
  if (!agent) {
    throw new Error('Agent not found');
  }
  
  if (agent.status !== 'ONLINE') {
    throw new Error('Agent is offline. Meta data is only available when agent is connected.');
  }

  try {
    const agentUrl = `${config.agent.baseUrl}/meta/${endpoint}`;
    const response = await axios.put(agentUrl, data, { timeout: 10000 });
    
    // Check for application-level errors in the response
    if (response.data && response.data.status === 'error') {
      const errorMessage = response.data.message || response.data.error_details || 'Agent returned an error';
      throw new Error(errorMessage);
    }
    
    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Agent request timed out');
    }
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to agent. Make sure the agent is running on ' + config.agent.baseUrl);
    }
    if (error.response) {
      // If the agent returned an error response, try to extract the message
      if (error.response.data && error.response.data.status === 'error') {
        const errorMessage = error.response.data.message || error.response.data.error_details || 'Agent returned an error';
        throw new Error(errorMessage);
      }
      throw new Error(`Agent returned error: ${error.response.status} ${error.response.statusText}`);
    }
    // If error.message already exists (from our check above), throw it
    if (error.message) {
      throw error;
    }
    throw new Error('Agent returned an error');
  }
}

// Test Meta connection
router.get('/test', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { agent_id } = req.query;
    if (!agent_id || typeof agent_id !== 'string') {
      return res.status(400).json({ detail: 'agent_id is required' });
    }
    const data = await getAgentMetaData(agent_id, 'test');
    res.json(data);
  } catch (error: any) {
    if (error.message === 'Agent not found') {
      return res.status(404).json({ detail: error.message });
    }
    if (error.message.includes('offline')) {
      return res.status(503).json({ detail: error.message });
    }
    if (error.message.includes('timeout')) {
      return res.status(504).json({ detail: error.message });
    }
    if (error.message.includes('connect')) {
      return res.status(503).json({ detail: error.message });
    }
    return res.status(502).json({ detail: error.message });
  }
});

// Get Meta account
router.get('/account', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { agent_id } = req.query;
    if (!agent_id || typeof agent_id !== 'string') {
      return res.status(400).json({ detail: 'agent_id is required' });
    }
    const data = await getAgentMetaData(agent_id, 'account');
    res.json(data);
  } catch (error: any) {
    if (error.message === 'Agent not found') {
      return res.status(404).json({ detail: error.message });
    }
    if (error.message.includes('offline')) {
      return res.status(503).json({ detail: error.message });
    }
    if (error.message.includes('timeout')) {
      return res.status(504).json({ detail: error.message });
    }
    if (error.message.includes('connect')) {
      return res.status(503).json({ detail: error.message });
    }
    return res.status(502).json({ detail: error.message });
  }
});

// Get Meta campaigns
router.get('/campaigns', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { agent_id } = req.query;
    if (!agent_id || typeof agent_id !== 'string') {
      return res.status(400).json({ detail: 'agent_id is required' });
    }
    const data = await getAgentMetaData(agent_id, 'campaigns');
    res.json(data);
  } catch (error: any) {
    if (error.message === 'Agent not found') {
      return res.status(404).json({ detail: error.message });
    }
    if (error.message.includes('offline')) {
      return res.status(503).json({ detail: error.message });
    }
    if (error.message.includes('timeout')) {
      return res.status(504).json({ detail: error.message });
    }
    if (error.message.includes('connect')) {
      return res.status(503).json({ detail: error.message });
    }
    return res.status(502).json({ detail: error.message });
  }
});

// Get Meta insights
router.get('/insights', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { agent_id } = req.query;
    if (!agent_id || typeof agent_id !== 'string') {
      return res.status(400).json({ detail: 'agent_id is required' });
    }
    const data = await getAgentMetaData(agent_id, 'insights');
    res.json(data);
  } catch (error: any) {
    if (error.message === 'Agent not found') {
      return res.status(404).json({ detail: error.message });
    }
    if (error.message.includes('offline')) {
      return res.status(503).json({ detail: error.message });
    }
    if (error.message.includes('timeout')) {
      return res.status(504).json({ detail: error.message });
    }
    if (error.message.includes('connect')) {
      return res.status(503).json({ detail: error.message });
    }
    return res.status(502).json({ detail: error.message });
  }
});

// Get hierarchical campaigns
router.get('/campaigns/hierarchical', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { agent_id, date_preset } = req.query;
    if (!agent_id || typeof agent_id !== 'string') {
      return res.status(400).json({ detail: 'agent_id is required' });
    }
    const datePreset = typeof date_preset === 'string' ? date_preset : 'last_30d';
    const endpoint = date_preset ? `campaigns/hierarchical?date_preset=${datePreset}` : 'campaigns/hierarchical';
    const data = await getAgentMetaData(agent_id, endpoint);
    res.json(data);
  } catch (error: any) {
    if (error.message === 'Agent not found') {
      return res.status(404).json({ detail: error.message });
    }
    if (error.message.includes('offline')) {
      return res.status(503).json({ detail: error.message });
    }
    if (error.message.includes('timeout')) {
      return res.status(504).json({ detail: error.message });
    }
    if (error.message.includes('connect')) {
      return res.status(503).json({ detail: error.message });
    }
    return res.status(502).json({ detail: error.message });
  }
});

// Get campaign ad sets
router.get('/campaigns/:campaign_id/adsets', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { agent_id } = req.query;
    const { campaign_id } = req.params;
    if (!agent_id || typeof agent_id !== 'string') {
      return res.status(400).json({ detail: 'agent_id is required' });
    }
    const data = await getAgentMetaData(agent_id, `campaigns/${campaign_id}/adsets`);
    res.json(data);
  } catch (error: any) {
    if (error.message === 'Agent not found') {
      return res.status(404).json({ detail: error.message });
    }
    if (error.message.includes('offline')) {
      return res.status(503).json({ detail: error.message });
    }
    if (error.message.includes('timeout')) {
      return res.status(504).json({ detail: error.message });
    }
    if (error.message.includes('connect')) {
      return res.status(503).json({ detail: error.message });
    }
    return res.status(502).json({ detail: error.message });
  }
});

// Get ad set ads
router.get('/adsets/:adset_id/ads', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { agent_id } = req.query;
    const { adset_id } = req.params;
    if (!agent_id || typeof agent_id !== 'string') {
      return res.status(400).json({ detail: 'agent_id is required' });
    }
    const data = await getAgentMetaData(agent_id, `adsets/${adset_id}/ads`);
    res.json(data);
  } catch (error: any) {
    if (error.message === 'Agent not found') {
      return res.status(404).json({ detail: error.message });
    }
    if (error.message.includes('offline')) {
      return res.status(503).json({ detail: error.message });
    }
    if (error.message.includes('timeout')) {
      return res.status(504).json({ detail: error.message });
    }
    if (error.message.includes('connect')) {
      return res.status(503).json({ detail: error.message });
    }
    return res.status(502).json({ detail: error.message });
  }
});

// Update ad set status
router.put('/adsets/:adset_id/status', authenticate, requireRoles('USER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { agent_id } = req.query;
    const { adset_id } = req.params;
    const { status } = req.body;
    
    console.log('Update ad set status request:', { agent_id, adset_id, status, body: req.body });
    
    if (!agent_id || typeof agent_id !== 'string') {
      return res.status(400).json({ detail: 'agent_id is required' });
    }
    
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ detail: 'status is required' });
    }
    
    if (!['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ detail: 'Invalid status. Must be ACTIVE, PAUSED, or ARCHIVED' });
    }
    
    const data = await updateAgentMetaData(agent_id, `adsets/${adset_id}/status`, { status });
    console.log('Update ad set status response:', data);
    res.json(data);
  } catch (error: any) {
    console.error('Update ad set status error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.message === 'Agent not found') {
      return res.status(404).json({ detail: error.message });
    }
    if (error.message.includes('offline')) {
      return res.status(503).json({ detail: error.message });
    }
    if (error.message.includes('timeout')) {
      return res.status(504).json({ detail: error.message });
    }
    if (error.message.includes('connect')) {
      return res.status(503).json({ detail: error.message });
    }
    return res.status(502).json({ detail: error.message || 'Failed to update ad set status' });
  }
});

export default router;

