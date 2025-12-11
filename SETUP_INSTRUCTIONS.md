# Setup Instructions for Meta OAuth Integration

## Quick Start

### 1. Environment Variables

Add these to your `backend/.env` file:

```env
# Meta OAuth Configuration (from meta_config.json)
META_APP_ID=1331323195071661
META_APP_SECRET=0eb258a709f376346827b1848b7f0e84
META_REDIRECT_URI=http://localhost:3000/auth/meta/callback
META_API_VERSION=v20.0
META_BASE_URL=https://graph.facebook.com
```

### 2. Meta App Configuration

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Select your app (ID: 1331323195071661)
3. Go to **Settings > Basic**
4. Add **Valid OAuth Redirect URIs**:
   - `http://localhost:3000/auth/meta/callback` (for local development)
5. Go to **Products > Facebook Login > Settings**
6. Add the same redirect URI
7. Ensure these permissions are requested:
   - `ads_read`
   - `ads_management`
   - `business_management`
   - `pages_read_engagement`
   - `pages_show_list`

### 3. Testing the OAuth Flow

1. **Start the backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Start the agent** (if testing agent integration):
   ```bash
   cd agent
   python run.py
   ```

4. **Connect a Meta Account**:
   - Log into the CRM dashboard
   - Go to Dashboard
   - Find an agent in the "Meta Account Management" section
   - Click "Connect Meta Account"
   - You'll be redirected to Facebook to authorize
   - After authorization, you'll be redirected back to the dashboard
   - The account should now be connected!

### 4. How It Works

#### One Agent = One Meta Account
- Each agent manages exactly one Meta ad account
- When you connect a Meta account to an agent, the OAuth tokens are stored in the database
- The agent fetches these credentials from the backend when it starts up
- The agent refreshes credentials every 5 minutes during sync

#### Credential Flow
1. User connects Meta account via OAuth → Tokens stored in `AdAccount` model
2. Agent starts → Fetches credentials from `/api/agents/{agent_id}/config:pull`
3. Agent uses credentials → Makes Meta API calls
4. Agent syncs → Refreshes credentials before each sync

### 5. Troubleshooting

#### "OAuth is not configured" Error
- Check that `META_APP_ID` and `META_APP_SECRET` are set in `.env`
- Restart the backend after adding environment variables

#### "Invalid redirect_uri" Error
- Ensure the redirect URI in Meta App settings matches `META_REDIRECT_URI`
- The redirect URI must be exactly: `http://localhost:3000/auth/meta/callback`

#### Agent Can't Connect to Meta
- Check that the agent has fetched credentials: Look for "Using Meta API credentials from database" in agent logs
- Verify the agent can reach the backend: Check agent logs for connection errors
- Ensure the Meta account is connected: Check Dashboard for connected accounts

#### Token Expired
- Meta tokens are long-lived (60 days) but can expire
- Use the "Refresh Token" button in the Dashboard (if implemented)
- Or reconnect the account via OAuth

### 6. Production Deployment

When deploying to production:

1. **Update Redirect URI**:
   ```env
   META_REDIRECT_URI=https://yourdomain.com/auth/meta/callback
   ```

2. **Update Meta App Settings**:
   - Add production redirect URI to Meta App
   - Update app domains if needed

3. **Security**:
   - Use environment variables (never commit secrets)
   - Enable HTTPS in production
   - Use secure token storage

## Architecture

```
User → Dashboard → "Connect Meta Account"
  ↓
Backend → Generate OAuth URL
  ↓
Meta OAuth → User Authorizes
  ↓
Backend → Exchange Code for Token
  ↓
Backend → Store Token in Database (AdAccount)
  ↓
Agent → Fetch Credentials from Backend
  ↓
Agent → Use Token for Meta API Calls
```

## Files Modified

### Backend
- `backend/src/config/index.ts` - Added Meta OAuth config
- `backend/src/models/AdAccount.ts` - Added OAuth token fields
- `backend/src/routes/meta-oauth.ts` - OAuth routes (NEW)
- `backend/src/routes/agents.ts` - Updated config:pull to include Meta credentials
- `backend/src/index.ts` - Registered OAuth routes

### Frontend
- `frontend/src/pages/Dashboard.tsx` - Added Meta account connection UI
- `frontend/src/pages/MetaOAuthCallback.tsx` - OAuth callback handler (NEW)
- `frontend/src/services/api.ts` - Added OAuth API methods
- `frontend/src/types/index.ts` - Updated AdAccount type
- `frontend/src/App.tsx` - Added callback route

### Agent
- `agent/app/credential_fetcher.py` - Credential fetcher from backend (NEW)
- `agent/app/main.py` - Updated to use credential fetcher
- `agent/app/meta_client.py` - Updated to accept credentials parameter

## Next Steps

1. Test the OAuth flow end-to-end
2. Verify agent can fetch and use credentials
3. Test account disconnection
4. Monitor token expiration and refresh

