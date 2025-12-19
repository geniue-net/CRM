# Meta OAuth Integration Implementation Guide

## Overview

This document describes the implementation of Meta (Facebook) OAuth integration for seamless account connection in the CRM system.

## Features Implemented

### 1. Backend OAuth Flow

#### Configuration
- Added Meta OAuth configuration to `backend/src/config/index.ts`:
  - `META_APP_ID`: Your Meta App ID
  - `META_APP_SECRET`: Your Meta App Secret
  - `META_REDIRECT_URI`: OAuth callback URL (default: `http://localhost:3000/auth/meta/callback`)
  - `META_API_VERSION`: Meta API version without 'v' prefix (default: `20.0`, will become `v20.0` in URLs)

#### New Routes (`backend/src/routes/meta-oauth.ts`)
- `GET /api/meta-oauth/authorize?agent_id=xxx`: Generates OAuth authorization URL
- `GET /api/meta-oauth/callback`: Handles OAuth callback and stores tokens
- `POST /api/meta-oauth/disconnect/:ad_account_id`: Disconnects a Meta account
- `POST /api/meta-oauth/refresh-token/:ad_account_id`: Refreshes/verifies access token

#### Database Schema Updates
- Updated `AdAccount` model to store OAuth tokens:
  - `meta_access_token`: Long-lived access token
  - `meta_token_expires_at`: Token expiration date
  - `meta_refresh_token`: Refresh token (if available)
  - `meta_user_id`: Meta user ID
  - `meta_connected_at`: Connection timestamp
  - `meta_last_synced_at`: Last sync timestamp

### 2. Enhanced Optimization Parameters

#### New Metrics Added
- **Reach Efficiency**: Measures how efficiently ads reach unique users (Reach/Impressions)
- **Engagement Rate**: Percentage of impressions that result in engagements
- **Profit & Profit Margin**: Revenue minus spend, and profit as percentage of revenue
- **Value per Conversion**: Average value generated per conversion
- **Conversion Value/Cost Ratio**: Revenue divided by spend
- **Video Metrics**: Video views, video view rate, cost per video view
- **Quality Rankings**: Meta's quality signals (quality_ranking, engagement_ranking, conversion_ranking)

#### Enhanced AI Analysis
- Updated AI prompts to include:
  - Frequency optimization recommendations
  - Reach efficiency analysis
  - Profitability-based prioritization
  - Engagement quality signals
  - Budget reallocation opportunities

### 3. Frontend Integration

#### API Service Updates
- Added OAuth methods to `frontend/src/services/api.ts`:
  - `getMetaOAuthUrl(agentId)`: Get OAuth authorization URL
  - `disconnectMetaAccount(adAccountId)`: Disconnect account
  - `refreshMetaToken(adAccountId)`: Refresh token

## Setup Instructions

### 1. Meta App Configuration

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing app
3. Add "Facebook Login" product
4. Configure OAuth Redirect URIs:
   - Development: `http://localhost:3000/auth/meta/callback`
   - Production: `https://yourdomain.com/auth/meta/callback`
5. Add required permissions:
   - `ads_read`
   - `ads_management`
   - `business_management`
   - `pages_read_engagement`
   - `pages_show_list`

### 2. Environment Variables

Add to your `.env` file:

```env
# Meta OAuth Configuration
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here
META_REDIRECT_URI=http://localhost:3000/auth/meta/callback
META_API_VERSION=20.0
```

### 3. Frontend OAuth Flow

1. User clicks "Connect Meta Account" button
2. Frontend calls `GET /api/meta-oauth/authorize?agent_id=xxx`
3. User is redirected to Meta OAuth page
4. User authorizes the app
5. Meta redirects to `/auth/meta/callback` with authorization code
6. Backend exchanges code for access token
7. Backend fetches user's ad accounts
8. Backend creates/updates AdAccount records with tokens
9. User is redirected back to frontend with success message

## Usage Example

### Connecting a Meta Account

```typescript
// Frontend code
const connectMetaAccount = async (agentId: string) => {
  try {
    const response = await apiService.getMetaOAuthUrl(agentId);
    // Redirect user to OAuth URL
    window.location.href = response.data.auth_url;
  } catch (error) {
    console.error('Failed to get OAuth URL:', error);
  }
};
```

### Disconnecting a Meta Account

```typescript
const disconnectMetaAccount = async (adAccountId: string) => {
  try {
    await apiService.disconnectMetaAccount(adAccountId);
    // Show success message
  } catch (error) {
    console.error('Failed to disconnect:', error);
  }
};
```

## Security Considerations

1. **State Parameter**: OAuth flow uses state parameter for CSRF protection
2. **Token Storage**: Access tokens are stored encrypted in database
3. **Token Expiration**: Tokens are checked for expiration before use
4. **User Authorization**: Users can only connect/disconnect their own accounts

## Next Steps

### Agent Integration (TODO)
The agent module needs to be updated to:
1. Fetch credentials from database instead of config files
2. Use per-account access tokens when making Meta API calls
3. Handle token refresh automatically

### Frontend UI (TODO)
Create UI components for:
1. "Connect Meta Account" button
2. Account connection status display
3. Disconnect account functionality
4. Token refresh status

## Troubleshooting

### "OAuth is not configured" Error
- Ensure `META_APP_ID` and `META_APP_SECRET` are set in environment variables

### "Invalid redirect_uri" Error
- Ensure the redirect URI in Meta App settings matches `META_REDIRECT_URI`

### Token Expiration
- Meta tokens are typically long-lived (60 days)
- Use the refresh endpoint to verify token validity
- If token is expired, user needs to reconnect

## API Reference

### GET /api/meta-oauth/authorize
**Query Parameters:**
- `agent_id` (required): Agent ID to associate with the account

**Response:**
```json
{
  "auth_url": "https://www.facebook.com/v20.0/dialog/oauth?...",
  "state": "base64_encoded_state"
}
```

### GET /api/meta-oauth/callback
**Query Parameters:**
- `code`: Authorization code from Meta
- `state`: State parameter for CSRF protection

**Response:** Redirects to frontend with success/error message

### POST /api/meta-oauth/disconnect/:ad_account_id
**Response:**
```json
{
  "message": "Meta account disconnected successfully"
}
```

### POST /api/meta-oauth/refresh-token/:ad_account_id
**Response:**
```json
{
  "message": "Token is valid",
  "expires_at": "2024-12-31T23:59:59.000Z"
}
```

