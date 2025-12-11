import { Router, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { AdAccount } from '../models';
import { authenticate, AuthRequest } from '../middleware/auth';
import { config } from '../config';
import axios from 'axios';
import { generateId } from '../utils';
import crypto from 'crypto';

const router = Router();

// Generate OAuth authorization URL
router.get('/authorize', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { agent_id } = req.query;
    
    if (!agent_id || typeof agent_id !== 'string') {
      return res.status(400).json({ detail: 'agent_id is required' });
    }

    if (!config.meta.appId || !config.meta.appSecret) {
      return res.status(500).json({ detail: 'Meta OAuth is not configured. Please set META_APP_ID and META_APP_SECRET environment variables.' });
    }

    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in session or return it to client to verify on callback
    // For simplicity, we'll include user_id and agent_id in state
    const stateData = {
      user_id: req.user!.id,
      agent_id: agent_id,
      nonce: state,
    };
    const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // Meta OAuth scopes required for Marketing API
    const scopes = [
      'ads_read',
      'ads_management',
      'business_management',
      'pages_read_engagement',
      'pages_show_list',
    ].join(',');

    const authUrl = `https://www.facebook.com/v${config.meta.apiVersion}/dialog/oauth?` +
      `client_id=${config.meta.appId}` +
      `&redirect_uri=${encodeURIComponent(config.meta.redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${encodedState}` +
      `&response_type=code`;

    res.json({ 
      auth_url: authUrl,
      state: encodedState,
    });
  } catch (error: any) {
    console.error('OAuth authorize error:', error);
    res.status(500).json({ detail: error.message || 'Internal server error' });
  }
});

// Handle OAuth callback
router.get('/callback', async (req: any, res: Response) => {
  try {
    const { code, state, error, error_reason, error_description } = req.query;

    if (error) {
      return res.redirect(`${config.cors.origin}/ad-accounts?error=${encodeURIComponent(error_description as string || error_reason as string)}`);
    }

    if (!code || !state) {
      return res.redirect(`${config.cors.origin}/ad-accounts?error=${encodeURIComponent('Missing authorization code or state')}`);
    }

    // Decode state
    let stateData: any;
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64url').toString());
    } catch (e) {
      return res.redirect(`${config.cors.origin}/ad-accounts?error=${encodeURIComponent('Invalid state parameter')}`);
    }

    const { user_id, agent_id } = stateData;

    // Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v${config.meta.apiVersion}/oauth/access_token`;
    const tokenResponse = await axios.get(tokenUrl, {
      params: {
        client_id: config.meta.appId,
        client_secret: config.meta.appSecret,
        redirect_uri: config.meta.redirectUri,
        code: code,
      },
    });

    const { access_token, expires_in, token_type } = tokenResponse.data;

    if (!access_token) {
      return res.redirect(`${config.cors.origin}/ad-accounts?error=${encodeURIComponent('Failed to obtain access token')}`);
    }

    // Get user info and ad accounts
    const userInfoUrl = `https://graph.facebook.com/v${config.meta.apiVersion}/me`;
    const userInfoResponse = await axios.get(userInfoUrl, {
      params: {
        access_token: access_token,
        fields: 'id,name,email',
      },
    });

    const metaUserId = userInfoResponse.data.id;

    // Get ad accounts
    const adAccountsUrl = `https://graph.facebook.com/v${config.meta.apiVersion}/me/adaccounts`;
    const adAccountsResponse = await axios.get(adAccountsUrl, {
      params: {
        access_token: access_token,
        fields: 'id,name,account_id,currency,account_status,timezone_name',
      },
    });

    const adAccounts = adAccountsResponse.data.data || [];

    // Store tokens and create/update ad accounts
    const results = [];
    for (const account of adAccounts) {
      // Check if account already exists
      let adAccount = await AdAccount.findOne({ 
        meta_ad_account_id: account.account_id || account.id,
        user_id: user_id,
      });

      const accountData = {
        meta_access_token: access_token,
        meta_token_expires_at: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
        meta_user_id: metaUserId,
        meta_connected_at: new Date(),
        currency_code: account.currency,
        is_active: account.account_status === 1, // 1 = ACTIVE
      };

      if (adAccount) {
        // Update existing account
        Object.assign(adAccount, accountData);
        await adAccount.save();
        results.push({ id: adAccount.id, name: adAccount.name, action: 'updated' });
      } else {
        // Create new account
        const accountId = generateId('acc');
        adAccount = new AdAccount({
          id: accountId,
          user_id: user_id,
          agent_id: agent_id,
          meta_ad_account_id: account.account_id || account.id,
          name: account.name,
          ...accountData,
        });
        await adAccount.save();
        results.push({ id: adAccount.id, name: adAccount.name, action: 'created' });
      }
    }

    // Redirect to success page with results
    const successMessage = `Successfully connected ${results.length} Meta ad account(s)`;
    return res.redirect(`${config.cors.origin}/ad-accounts?success=${encodeURIComponent(successMessage)}&accounts=${encodeURIComponent(JSON.stringify(results))}`);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to connect Meta account';
    return res.redirect(`${config.cors.origin}/ad-accounts?error=${encodeURIComponent(errorMessage)}`);
  }
});

// Disconnect Meta account
router.post('/disconnect/:ad_account_id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ad_account_id } = req.params;
    
    const account = await AdAccount.findOne({ id: ad_account_id });
    if (!account) {
      return res.status(404).json({ detail: 'Ad account not found' });
    }

    if (req.user!.role !== 'ADMIN' && account.user_id !== req.user!.id) {
      return res.status(403).json({ detail: 'Forbidden' });
    }

    // Clear OAuth tokens
    account.meta_access_token = undefined;
    account.meta_token_expires_at = undefined;
    account.meta_refresh_token = undefined;
    account.meta_user_id = undefined;
    account.is_active = false;
    await account.save();

    res.json({ message: 'Meta account disconnected successfully' });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    res.status(500).json({ detail: error.message || 'Internal server error' });
  }
});

// Refresh access token
router.post('/refresh-token/:ad_account_id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ad_account_id } = req.params;
    
    const account = await AdAccount.findOne({ id: ad_account_id });
    if (!account) {
      return res.status(404).json({ detail: 'Ad account not found' });
    }

    if (req.user!.role !== 'ADMIN' && account.user_id !== req.user!.id) {
      return res.status(403).json({ detail: 'Forbidden' });
    }

    if (!account.meta_access_token) {
      return res.status(400).json({ detail: 'No access token found. Please reconnect the account.' });
    }

    // Meta tokens are typically long-lived (60 days), but we can extend them
    // For now, we'll just verify the token is still valid
    try {
      const verifyUrl = `https://graph.facebook.com/v${config.meta.apiVersion}/me`;
      await axios.get(verifyUrl, {
        params: {
          access_token: account.meta_access_token,
        },
      });

      account.meta_last_synced_at = new Date();
      await account.save();

      res.json({ message: 'Token is valid', expires_at: account.meta_token_expires_at });
    } catch (error: any) {
      // Token might be expired, need to reconnect
      return res.status(401).json({ 
        detail: 'Token is invalid or expired. Please reconnect the account.',
        requires_reconnect: true,
      });
    }
  } catch (error: any) {
    console.error('Refresh token error:', error);
    res.status(500).json({ detail: error.message || 'Internal server error' });
  }
});

export default router;

