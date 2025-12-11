import asyncio
import os
import json
import time
import sys
from datetime import datetime
from typing import Any, Dict
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

import httpx
import requests
from fastapi import FastAPI
from pydantic import BaseModel

# Handle imports for both standalone and module execution
try:
    from .meta_client import MetaAPIClient
except ImportError:
    # If relative import fails, try absolute import
    sys.path.insert(0, str(Path(__file__).parent))
    from meta_client import MetaAPIClient


# Load configuration from JSON file
def load_config():
    # Try multiple config paths for different execution contexts
    config_paths = [
        '/app/config/meta_config.json',  # Docker
        str(Path(__file__).parent.parent / 'config' / 'meta_config.json'),  # Local development
        'config/meta_config.json',  # Current directory
    ]
    
    for config_path in config_paths:
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                print(f"Loaded config from: {config_path}")
                return config
        except FileNotFoundError:
            continue
    
    # Fallback to environment variables
    print("Config file not found, using environment variables")
    return {
        "meta_api": {
            "app_id": os.getenv("META_APP_ID"),
            "app_secret": os.getenv("META_APP_SECRET"),
            "access_token": os.getenv("META_ACCESS_TOKEN"),
            "ad_account_id": os.getenv("META_AD_ACCOUNT_ID"),
            "base_url": os.getenv("META_BASE_URL", "https://graph.facebook.com/v20.0"),
            "timeout": int(os.getenv("META_TIMEOUT", "30"))
        },
        "agent": {
            "id": os.getenv("AGENT_ID", "agt_dev"),
            "token": os.getenv("AGENT_TOKEN")
        },
        "crm": {
            "base_url": os.getenv("CRM_BASE_URL", "http://localhost:8000"),
            "agent_token": os.getenv("AGENT_TOKEN")
        }
    }

config = load_config()

# Get CRM base URL - prefer config, then env var, then default to localhost
CRM_BASE_URL = config.get("crm", {}).get("base_url") or os.getenv("CRM_BASE_URL", "http://localhost:8000")
AGENT_ID = config.get("agent", {}).get("id") or config.get("crm", {}).get("agent_id") or os.getenv("AGENT_ID", "agt_dev")
AGENT_TOKEN = config.get("agent", {}).get("token") or config.get("crm", {}).get("agent_token") or os.getenv("AGENT_TOKEN")

# Global variables that can be updated when config changes
current_agent_id = AGENT_ID
current_agent_token = AGENT_TOKEN

def reload_config():
    global current_agent_id, current_agent_token
    try:
        new_config = load_config()
        current_agent_id = new_config["agent"]["id"]
        current_agent_token = new_config["agent"]["token"]
        
        # Validate credentials
        if not current_agent_id or not current_agent_token:
            print(f"ERROR: Invalid credentials - agent_id='{current_agent_id}', token={'EMPTY' if not current_agent_token else 'SET'}")
            return False
            
        print(f"Config reloaded: agent_id={current_agent_id}, token={'*' * len(current_agent_token)}")
        return True
    except Exception as e:
        print(f"Failed to reload config: {e}")
        return False


app = FastAPI(title="SM Agent", version="0.1.0")

# Secret management - use /etc/sm-agent in Docker, ./secrets locally
if os.path.exists("/etc/sm-agent"):
    SECRETS_DIR = Path("/etc/sm-agent")
else:
    SECRETS_DIR = Path(__file__).parent.parent / "secrets"
SECRETS_DIR.mkdir(exist_ok=True, parents=True)

class CredentialManager:
    def __init__(self):
        self.credentials = {}
        self.load_all_credentials()
    
    def load_all_credentials(self):
        """Load all credential files from /etc/sm-agent/"""
        for cred_file in SECRETS_DIR.glob("*.creds"):
            account_id = cred_file.stem
            try:
                with open(cred_file, 'r') as f:
                    self.credentials[account_id] = json.load(f)
            except Exception as e:
                print(f"Failed to load credentials for {account_id}: {e}")
    
    def get_credentials(self, account_id: str) -> Dict[str, Any]:
        """Get credentials for a specific account"""
        return self.credentials.get(account_id, {})
    
    def reload_credentials(self, account_id: str):
        """Reload credentials for a specific account"""
        cred_file = SECRETS_DIR / f"{account_id}.creds"
        if cred_file.exists():
            try:
                with open(cred_file, 'r') as f:
                    self.credentials[account_id] = json.load(f)
                print(f"Reloaded credentials for {account_id}")
            except Exception as e:
                print(f"Failed to reload credentials for {account_id}: {e}")

cred_manager = CredentialManager()

# Initialize Meta API client
# Try multiple config paths
config_paths = [
    '/app/config/meta_config.json',  # Docker
    str(Path(__file__).parent.parent / 'config' / 'meta_config.json'),  # Local development
    'config/meta_config.json',  # Current directory
]

meta_config_path = None
for path in config_paths:
    if os.path.exists(path):
        meta_config_path = path
        break

if meta_config_path:
    meta_client = MetaAPIClient(config_path=meta_config_path)
else:
    # Fallback: create client with default path (will use env vars)
    meta_client = MetaAPIClient(config_path="config/meta_config.json")

class CredentialFileHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.is_file and event.src_path.endswith('.creds'):
            account_id = Path(event.src_path).stem
            cred_manager.reload_credentials(account_id)

# Start file watcher
observer = Observer()
observer.schedule(CredentialFileHandler(), str(SECRETS_DIR), recursive=False)
observer.start()


async def post(client: httpx.AsyncClient, path: str, json: Dict[str, Any] | None = None) -> httpx.Response:
    url = f"{CRM_BASE_URL}{path}"
    headers = {"Authorization": f"Bearer {current_agent_token}"}
    return await client.post(url, json=json or {}, headers=headers, timeout=20.0)


async def heartbeat_loop():
    async with httpx.AsyncClient() as client:
        while True:
            try:
                # Reload config before each heartbeat
                if not reload_config():
                    print("ERROR: Invalid credentials detected. Stopping heartbeat loop.")
                    break
                    
                await post(client, f"/api/agents/{current_agent_id}/heartbeat", {"message": "ok"})
            except Exception as e:
                print(f"Heartbeat error: {e}")
            await asyncio.sleep(30)


async def pull_config_loop():
    async with httpx.AsyncClient() as client:
        backoff = 5
        while True:
            try:
                resp = await post(client, f"/api/agents/{AGENT_ID}/config:pull")
                if resp.is_success:
                    backoff = 5
                else:
                    backoff = min(backoff * 2, 300)
            except Exception:
                backoff = min(backoff * 2, 300)
            await asyncio.sleep(backoff)


async def pull_commands_loop():
    async with httpx.AsyncClient() as client:
        backoff = 5
        while True:
            try:
                resp = await post(client, f"/api/agents/{AGENT_ID}/commands:pull")
                if resp.is_success:
                    _ = resp.json()
                    # In MVP, we do not execute Meta actions; just acknowledge fetch
                    backoff = 5
                else:
                    backoff = min(backoff * 2, 300)
            except Exception:
                backoff = min(backoff * 2, 300)
            await asyncio.sleep(backoff)


async def sync_meta_data_loop():
    """Sync Meta data every 5 minutes"""
    async with httpx.AsyncClient() as client:
        while True:
            try:
                # Test Meta connection
                if meta_client.test_connection():
                    # Get account info
                    account_info = meta_client.get_ad_account_info()
                    
                    # Get campaigns
                    campaigns = meta_client.get_campaigns(limit=10)
                    
                    # Send data to CRM
                    sync_data = {
                        "meta_connected": True,
                        "account_info": account_info,
                        "campaigns": campaigns,
                        "last_sync": datetime.utcnow().isoformat() + "Z"
                    }
                    
                    await post(client, f"/api/agents/{AGENT_ID}/meta:sync", sync_data)
                    print(f"Synced Meta data: {len(campaigns)} campaigns")
                else:
                    print("Meta API connection failed")
                    
            except Exception as e:
                print(f"Failed to sync Meta data: {e}")
            
            # Wait 5 minutes before next sync
            await asyncio.sleep(300)


@app.on_event("startup")
async def on_startup():
    # Validate credentials at startup
    if not reload_config():
        print("ERROR: Invalid credentials at startup. Agent will not start.")
        import sys
        sys.exit(1)  # Exit the entire process
        
    print(f"Agent starting with valid credentials: agent_id={current_agent_id}")
    asyncio.create_task(heartbeat_loop())
    asyncio.create_task(pull_config_loop())
    asyncio.create_task(pull_commands_loop())
    asyncio.create_task(sync_meta_data_loop())


@app.get("/healthz")
def healthz():
    return {"status": "ok", "time": datetime.utcnow().isoformat() + "Z"}

@app.get("/meta/test")
def test_meta_connection():
    """Test connection to Meta API"""
    try:
        if meta_client.test_connection():
            return {"status": "success", "message": "Meta API connection successful"}
        else:
            return {"status": "error", "message": "Meta API connection failed"}
    except Exception as e:
        return {"status": "error", "message": f"Meta API error: {str(e)}"}

@app.get("/meta/account")
def get_meta_account():
    """Get Meta app information"""
    try:
        app_info = meta_client.get_app_info()
        return {"status": "success", "data": app_info}
    except Exception as e:
        return {"status": "error", "message": f"Failed to get app info: {str(e)}"}

@app.get("/meta/campaigns")
def get_meta_campaigns():
    """Get Meta campaigns"""
    try:
        campaigns = meta_client.get_campaigns()
        return {"status": "success", "data": campaigns}
    except Exception as e:
        return {"status": "error", "message": f"Failed to get campaigns: {str(e)}"}

@app.get("/meta/insights")
def get_meta_insights():
    """Get Meta insights/metrics"""
    try:
        insights = meta_client.get_insights()
        return {"status": "success", "data": insights}
    except Exception as e:
        return {"status": "error", "message": f"Failed to get insights: {str(e)}"}

@app.get("/meta/campaigns/hierarchical")
def get_hierarchical_campaigns(date_preset: str = "last_30d"):
    """Get campaigns with hierarchical structure (campaigns -> ad sets -> ads)
    
    Args:
        date_preset: Date range for insights (e.g., 'last_30d', 'today', 'yesterday', 'last_7d')
    """
    try:
        campaigns = meta_client.get_campaigns_detailed(limit=100, date_preset=date_preset)
        
        # Format the response in a clean hierarchical structure
        hierarchical_data = {
            "status": "success",
            "data": {
                "campaigns": campaigns,
                "summary": {
                    "total_campaigns": len(campaigns),
                    "total_ad_sets": sum(len(campaign.get("ad_sets", [])) for campaign in campaigns),
                    "total_ads": sum(
                        sum(len(ad_set.get("ads", [])) for ad_set in campaign.get("ad_sets", []))
                        for campaign in campaigns
                    )
                },
                "last_updated": datetime.utcnow().isoformat() + "Z"
            }
        }
        
        return hierarchical_data
    except Exception as e:
        return {"status": "error", "message": f"Failed to get hierarchical campaigns: {str(e)}"}

@app.get("/meta/test/hierarchical")
def test_hierarchical_structure():
    """Test endpoint to verify Meta API integration with detailed hierarchical display"""
    try:
        # Test connection first
        if not meta_client.test_connection():
            return {"status": "error", "message": "Meta API connection failed"}
        
        # Get account info
        account_info = meta_client.get_ad_account_info()
        
        # Get campaigns with full hierarchy
        campaigns = meta_client.get_campaigns_detailed(limit=100)
        
        # Create detailed hierarchical display
        hierarchical_display = {
            "status": "success",
            "message": "Meta Marketing API Integration Test - SUCCESS",
            "account_info": account_info,
            "hierarchical_structure": {
                "campaigns": []
            },
            "summary": {
                "total_campaigns": len(campaigns),
                "total_ad_sets": 0,
                "total_ads": 0,
                "active_campaigns": 0,
                "paused_campaigns": 0,
                "archived_campaigns": 0
            }
        }
        
        # Process each campaign
        for campaign in campaigns:
            campaign_data = {
                "id": campaign.get("id"),
                "name": campaign.get("name"),
                "status": campaign.get("status"),
                "effective_status": campaign.get("effective_status"),
                "objective": campaign.get("objective"),
                "daily_budget": campaign.get("daily_budget"),
                "lifetime_budget": campaign.get("lifetime_budget"),
                "performance_metrics": campaign.get("performance_metrics", {}),
                "ad_sets": []
            }
            
            # Count status
            if campaign.get("effective_status") == "ACTIVE":
                hierarchical_display["summary"]["active_campaigns"] += 1
            elif campaign.get("effective_status") == "PAUSED":
                hierarchical_display["summary"]["paused_campaigns"] += 1
            elif campaign.get("effective_status") == "ARCHIVED":
                hierarchical_display["summary"]["archived_campaigns"] += 1
            
            # Process ad sets
            for ad_set in campaign.get("ad_sets", []):
                ad_set_data = {
                    "id": ad_set.get("id"),
                    "name": ad_set.get("name"),
                    "status": ad_set.get("status"),
                    "effective_status": ad_set.get("effective_status"),
                    "daily_budget": ad_set.get("daily_budget"),
                    "lifetime_budget": ad_set.get("lifetime_budget"),
                    "optimization_goal": ad_set.get("optimization_goal"),
                    "performance_metrics": ad_set.get("performance_metrics", {}),
                    "ads": []
                }
                
                hierarchical_display["summary"]["total_ad_sets"] += 1
                
                # Process ads
                for ad in ad_set.get("ads", []):
                    ad_data = {
                        "id": ad.get("id"),
                        "name": ad.get("name"),
                        "status": ad.get("status"),
                        "effective_status": ad.get("effective_status"),
                        "creative": ad.get("creative", {}),
                        "performance_metrics": ad.get("performance_metrics", {})
                    }
                    
                    ad_set_data["ads"].append(ad_data)
                    hierarchical_display["summary"]["total_ads"] += 1
                
                campaign_data["ad_sets"].append(ad_set_data)
            
            hierarchical_display["hierarchical_structure"]["campaigns"].append(campaign_data)
        
        return hierarchical_display
        
    except Exception as e:
        return {
            "status": "error", 
            "message": f"Meta API integration test failed: {str(e)}",
            "error_details": str(e)
        }

@app.get("/meta/test/simple")
def test_simple_campaigns():
    """Simple test endpoint that just shows campaigns without nested data"""
    try:
        # Test connection first
        if not meta_client.test_connection():
            return {"status": "error", "message": "Meta API connection failed"}
        
        # Get account info
        account_info = meta_client.get_ad_account_info()
        
        # Get campaigns only (no nested data to avoid rate limits)
        campaigns = meta_client.get_campaigns(limit=100)
        
        return {
            "status": "success",
            "message": "Meta Marketing API Integration Test - SUCCESS (Simple)",
            "account_info": account_info,
            "campaigns": campaigns,
            "summary": {
                "total_campaigns": len(campaigns),
                "active_campaigns": len([c for c in campaigns if c.get("status") == "ACTIVE"]),
                "paused_campaigns": len([c for c in campaigns if c.get("status") == "PAUSED"]),
                "archived_campaigns": len([c for c in campaigns if c.get("status") == "ARCHIVED"])
            }
        }
        
    except Exception as e:
        return {
            "status": "error", 
            "message": f"Meta API integration test failed: {str(e)}",
            "error_details": str(e)
        }

@app.get("/meta/campaigns/{campaign_id}/adsets")
def get_campaign_adsets(campaign_id: str):
    """Get ad sets for a specific campaign"""
    try:
        # Test connection first
        if not meta_client.test_connection():
            return {"status": "error", "message": "Meta API connection failed"}
        
        # Get ad sets for the specific campaign
        ad_sets = meta_client.get_ad_sets(campaign_id, limit=50)
        
        return {
            "status": "success",
            "message": f"Ad sets for campaign {campaign_id}",
            "campaign_id": campaign_id,
            "ad_sets": ad_sets,
            "summary": {
                "total_ad_sets": len(ad_sets),
                "active_ad_sets": len([ads for ads in ad_sets if ads.get("status") == "ACTIVE"]),
                "paused_ad_sets": len([ads for ads in ad_sets if ads.get("status") == "PAUSED"]),
                "archived_ad_sets": len([ads for ads in ad_sets if ads.get("status") == "ARCHIVED"])
            }
        }
        
    except Exception as e:
        return {
            "status": "error", 
            "message": f"Failed to get ad sets for campaign {campaign_id}: {str(e)}",
            "error_details": str(e)
        }

@app.get("/meta/adsets/{adset_id}/ads")
def get_adset_ads(adset_id: str):
    """Get ads for a specific ad set"""
    try:
        # Test connection first
        if not meta_client.test_connection():
            return {"status": "error", "message": "Meta API connection failed"}
        
        # Get ads for the specific ad set
        ads = meta_client.get_ads(adset_id, limit=50)
        
        return {
            "status": "success",
            "message": f"Ads for ad set {adset_id}",
            "adset_id": adset_id,
            "ads": ads,
            "summary": {
                "total_ads": len(ads),
                "active_ads": len([ad for ad in ads if ad.get("status") == "ACTIVE"]),
                "paused_ads": len([ad for ad in ads if ad.get("status") == "PAUSED"]),
                "archived_ads": len([ad for ad in ads if ad.get("status") == "ARCHIVED"])
            }
        }
        
    except Exception as e:
        return {
            "status": "error", 
            "message": f"Failed to get ads for ad set {adset_id}: {str(e)}",
            "error_details": str(e)
        }

class AdSetStatusUpdate(BaseModel):
    status: str

@app.put("/meta/adsets/{adset_id}/status")
def update_adset_status(adset_id: str, status_data: AdSetStatusUpdate):
    """Update the status of an ad set"""
    try:
        # Test connection first
        if not meta_client.test_connection():
            return {"status": "error", "message": "Meta API connection failed"}
        
        status = status_data.status
        if not status:
            return {"status": "error", "message": "Status is required"}
        
        if status not in ["ACTIVE", "PAUSED", "ARCHIVED"]:
            return {"status": "error", "message": "Invalid status. Must be ACTIVE, PAUSED, or ARCHIVED"}
        
        # Update the ad set status
        result = meta_client.update_ad_set_status(adset_id, status)
        
        return {
            "status": "success",
            "message": f"Ad set {adset_id} status updated to {status}",
            "adset_id": adset_id,
            "new_status": status,
            "data": result
        }
        
    except Exception as e:
        error_message = str(e)
        error_details = str(e)
        
        # Extract more details from requests HTTPError
        if isinstance(e, requests.exceptions.HTTPError) and hasattr(e, 'response'):
            try:
                error_response = e.response.json()
                if 'error' in error_response:
                    error_info = error_response['error']
                    error_message = error_info.get('message', error_message)
                    error_details = f"Meta API Error {error_info.get('code', '')}: {error_info.get('message', '')}"
                    if 'error_subcode' in error_info:
                        error_details += f" (Subcode: {error_info['error_subcode']})"
            except:
                error_details = e.response.text if hasattr(e.response, 'text') else error_details
        
        return {
            "status": "error", 
            "message": f"Failed to update ad set {adset_id} status: {error_message}",
            "error_details": error_details
        }

@app.post("/meta/campaigns")
def create_meta_campaign(campaign_data: Dict[str, Any]):
    """Create a new Meta campaign"""
    try:
        name = campaign_data.get("name")
        objective = campaign_data.get("objective", "OUTCOME_TRAFFIC")
        status = campaign_data.get("status", "PAUSED")
        
        result = meta_client.create_campaign(name, objective, status)
        return {"status": "success", "data": result}
    except Exception as e:
        return {"status": "error", "message": f"Failed to create campaign: {str(e)}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)


