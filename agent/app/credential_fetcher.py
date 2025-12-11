"""
Credential fetcher for agent to get Meta API credentials from CRM backend.
Since one agent = one account, this fetches the single account's credentials.
"""
import os
import httpx
import json
from typing import Optional, Dict, Any
from pathlib import Path

class CredentialFetcher:
    """Fetches Meta API credentials from CRM backend"""
    
    def __init__(self, crm_base_url: str, agent_id: str, agent_token: str):
        self.crm_base_url = crm_base_url.rstrip('/')
        self.agent_id = agent_id
        self.agent_token = agent_token
        self._cached_credentials: Optional[Dict[str, Any]] = None
    
    def fetch_credentials(self) -> Optional[Dict[str, Any]]:
        """Fetch Meta API credentials from CRM backend"""
        try:
            url = f"{self.crm_base_url}/api/agents/{self.agent_id}/config:pull"
            headers = {"Authorization": f"Bearer {self.agent_token}"}
            
            with httpx.Client(timeout=10.0) as client:
                response = client.post(url, headers=headers)
                response.raise_for_status()
                config = response.json()
                
                # Extract Meta API credentials
                meta_api = config.get("meta_api")
                if meta_api and meta_api.get("access_token"):
                    self._cached_credentials = meta_api
                    return meta_api
                
                return None
        except Exception as e:
            print(f"Failed to fetch credentials from CRM: {e}")
            return None
    
    def get_cached_credentials(self) -> Optional[Dict[str, Any]]:
        """Get cached credentials if available"""
        return self._cached_credentials
    
    def save_credentials_to_file(self, credentials: Dict[str, Any], config_path: str):
        """Save credentials to config file for backward compatibility"""
        try:
            config_file = Path(config_path)
            config_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Load existing config if it exists
            existing_config = {}
            if config_file.exists():
                with open(config_file, 'r') as f:
                    existing_config = json.load(f)
            
            # Update with new credentials
            if "meta_api" not in existing_config:
                existing_config["meta_api"] = {}
            
            existing_config["meta_api"].update({
                "app_id": credentials.get("app_id", ""),
                "app_secret": credentials.get("app_secret", ""),
                "access_token": credentials.get("access_token", ""),
                "ad_account_id": credentials.get("ad_account_id", ""),
                "base_url": credentials.get("base_url", "https://graph.facebook.com/v20.0"),
                "timeout": credentials.get("timeout", 30),
            })
            
            # Preserve agent and CRM config
            if "agent" not in existing_config:
                existing_config["agent"] = {
                    "id": self.agent_id,
                    "token": self.agent_token,
                }
            if "crm" not in existing_config:
                existing_config["crm"] = {
                    "base_url": self.crm_base_url,
                }
            
            # Write updated config
            with open(config_file, 'w') as f:
                json.dump(existing_config, f, indent=2)
            
            print(f"Saved credentials to {config_path}")
        except Exception as e:
            print(f"Failed to save credentials to file: {e}")

