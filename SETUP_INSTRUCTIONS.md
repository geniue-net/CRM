# Setup Instructions for Meta OAuth Integration

## Quick Start

### 1. Environment Variables

Add these to your `backend/.env` file:

```env
# Meta OAuth Configuration (from meta_config.json)
META_APP_ID=1331323195071661
META_APP_SECRET=0eb258a709f376346827b1848b7f0e84
META_REDIRECT_URI=http://localhost:3000/auth/meta/callback
META_API_VERSION=20.0
META_BASE_URL=https://graph.facebook.com
```

### 2. Meta App Configuration

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)
2. Select your app (ID: 1331323195071661)
3. **Add Facebook Login Product** (if not already added):
   - In the left sidebar, click **"Add Product"** or go to **Products**
   - Find **"Facebook Login"** and click **"Set Up"**
4. **Configure OAuth Redirect URIs**:
   - Go to **Products > Facebook Login > Settings** (in the left sidebar)
   - Scroll down to **"Valid OAuth Redirect URIs"** section
   - Click **"Add URI"** and add:
     - `http://localhost:3000/auth/meta/callback` (for local development)
   - Click **"Save Changes"**
5. **Configure App Domains** (optional but recommended):
   - Go to **Settings > Basic**
   - Under **"App Domains"**, add: `localhost` (for development)
   - Under **"Website"**, add: `http://localhost:3000` (if not already set)
6. **Ensure required permissions are requested** (these are automatically requested in the OAuth flow):
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
- Ensure the redirect URI in **Products > Facebook Login > Settings** matches `META_REDIRECT_URI` exactly
- The redirect URI must be exactly: `http://localhost:3000/auth/meta/callback`
- Make sure you clicked **"Save Changes"** after adding the URI
- If using HTTPS in production, ensure the protocol matches (http vs https)

#### Agent Can't Connect to Meta
- Check that the agent has fetched credentials: Look for "Using Meta API credentials from database" in agent logs
- Verify the agent can reach the backend: Check agent logs for connection errors
- Ensure the Meta account is connected: Check Dashboard for connected accounts

#### "Your request couldn't be processed" Error

This is a common Facebook OAuth error. Try these solutions in order:

**1. App is in Development Mode (MOST COMMON)**
- Go to **Settings > Basic** in your Facebook App
- Scroll to **"App Mode"** section
- If it says **"Development"**, you have two options:
  
  **Option A: Add Test Users (Quick Fix)**
  - Go to **Roles > Test Users** in the left sidebar
  - Click **"Add Test Users"** or **"Create Test User"**
  - Add the Facebook account you're trying to authenticate with as a test user
  - Or use the test user credentials provided by Facebook
  
  **Option B: Switch to Live Mode (Requires App Review)**
  - Go to **App Review > Permissions and Features**
  - Request approval for required permissions:
    - `ads_read` (usually auto-approved)
    - `ads_management` (requires app review)
    - `business_management` (requires app review)
  - Once approved, switch app mode to **"Live"** in **Settings > Basic**

**2. Verify Redirect URI Configuration**
- Double-check that `http://localhost:3000/auth/meta/callback` is added in **Products > Facebook Login > Settings**
- Make sure you clicked **"Save Changes"** (look for a confirmation message)
- The URI must match **exactly** (including http vs https, trailing slashes, etc.)

**3. Check App ID Mismatch**
- Verify the `client_id` in the OAuth URL matches your `META_APP_ID` in `.env`
- If they don't match, update your `.env` file with the correct App ID
- Restart the backend server after changing `.env`

**4. Verify Facebook Login Product is Active**
- Go to **Products** in the left sidebar
- Ensure **Facebook Login** shows as **"Active"** (green checkmark)
- If not, click on it and complete the setup

**5. Check App Permissions**
- Go to **App Review > Permissions and Features**
- Verify these permissions are available:
  - `ads_read`
  - `ads_management`
  - `business_management`
  - `pages_read_engagement`
  - `pages_show_list`
- Some permissions may require app review before they work

**6. Clear Browser Cache and Cookies**
- Clear cookies for `facebook.com` and `localhost:3000`
- Try in an incognito/private window
- Or use a different browser

**7. Check App Status**
- Go to **Settings > Basic**
- Ensure your app is not restricted or disabled
- Check for any warning messages at the top of the page

**8. API Version Format Issue**
- If your OAuth URL shows `vv20.0` (double "v"), this is a bug
- Check your `.env` file: `META_API_VERSION` should be `20.0` (without the "v" prefix)
- The code automatically adds the "v" prefix, so use `20.0` not `v20.0`
- Restart the backend after fixing

**Quick Diagnostic Steps:**
1. Check the OAuth URL in your browser's address bar
2. Note the `client_id` value
3. Compare it with `META_APP_ID` in your `.env` file
4. Verify the app mode (Development vs Live)
5. Check if you're added as a test user (if in Development mode)

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
   - Go to **Products > Facebook Login > Settings**
   - Add production redirect URI: `https://yourdomain.com/auth/meta/callback`
   - Go to **Settings > Basic** and update **App Domains** with your production domain

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

