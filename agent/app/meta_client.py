import json
import requests
import logging
from typing import Dict, List, Optional, Any
from pathlib import Path

logger = logging.getLogger(__name__)

class MetaAPIClient:
    """Client for interacting with Meta's Marketing API"""
    
    def __init__(self, config_path: str = "config/meta_config.json"):
        self.config = self._load_config(config_path)
        self.base_url = self.config["meta_api"]["base_url"]
        self.access_token = self.config["meta_api"]["access_token"]
        self.ad_account_id = self.config["meta_api"]["ad_account_id"]
        self.app_id = self.config["meta_api"]["app_id"]
        self.timeout = self.config["meta_api"]["timeout"]
        
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        try:
            config_file = Path(config_path)
            if not config_file.exists():
                raise FileNotFoundError(f"Config file not found: {config_path}")
            
            with open(config_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            raise
    
    def _make_request(self, endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make a request to Meta's API"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=self.timeout)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=self.timeout)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=self.timeout)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=self.timeout)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            raise
    
    def get_app_info(self) -> Dict[str, Any]:
        """Get information about the Meta app"""
        endpoint = f"{self.app_id}"
        params = {"fields": "id,name"}
        # params = {"fields": "id,name,category,link,privacy_policy_url,terms_of_service_url"}
        response = self._make_request(f"{endpoint}?{'&'.join([f'{k}={v}' for k, v in params.items()])}")
        return response
    
    def get_ad_account_info(self) -> Dict[str, Any]:
        """Get information about the ad account"""
        endpoint = f"act_{self.ad_account_id}"
        params = {"fields": "id,account_id,currency,account_status,timezone_name"}
        response = self._make_request(f"{endpoint}?{'&'.join([f'{k}={v}' for k, v in params.items()])}")
        return response
    
    def get_campaigns(self, limit: int = 25) -> List[Dict[str, Any]]:
        """Get campaigns from the ad account"""
        endpoint = f"act_{self.ad_account_id}/campaigns"
        params = {"limit": limit, "fields": "id,name,status,objective,created_time,updated_time,daily_budget,lifetime_budget"}
        response = self._make_request(f"{endpoint}?{'&'.join([f'{k}={v}' for k, v in params.items()])}")
        return response.get("data", [])
    
    def get_insights(self, date_preset: str = "today") -> Dict[str, Any]:
        """Get insights/metrics for the ad account"""
        endpoint = f"act_{self.ad_account_id}/insights"
        params = {
            "date_preset": date_preset,
            "fields": "spend,impressions,clicks,ctr,cpc,cpm,reach,frequency"
        }
        response = self._make_request(f"{endpoint}?{'&'.join([f'{k}={v}' for k, v in params.items()])}")
        return response.get("data", [{}])[0] if response.get("data") else {}
    
    def get_ad_sets(self, campaign_id: str, limit: int = 25) -> List[Dict[str, Any]]:
        """Get ad sets for a specific campaign"""
        endpoint = f"{campaign_id}/adsets"
        params = {
            "limit": limit, 
            "fields": "id,name,status,effective_status,daily_budget,lifetime_budget,optimization_goal,created_time,updated_time"
        }
        response = self._make_request(f"{endpoint}?{'&'.join([f'{k}={v}' for k, v in params.items()])}")
        ad_sets = response.get("data", [])
        
        # Handle pagination
        while "paging" in response and "next" in response["paging"]:
            try:
                next_url = response["paging"]["next"]
                if "?" in next_url:
                    query_string = next_url.split("?")[1]
                    response = self._make_request(f"{endpoint}?{query_string}")
                    ad_sets.extend(response.get("data", []))
                else:
                    break
            except Exception as e:
                logger.warning(f"Failed to fetch next page of ad sets: {e}")
                break
        
        return ad_sets
    
    def get_ads(self, ad_set_id: str, limit: int = 25) -> List[Dict[str, Any]]:
        """Get ads for a specific ad set"""
        endpoint = f"{ad_set_id}/ads"
        params = {
            "limit": limit,
            "fields": "id,name,status,effective_status,creative,created_time,updated_time"
        }
        response = self._make_request(f"{endpoint}?{'&'.join([f'{k}={v}' for k, v in params.items()])}")
        return response.get("data", [])
    
    def create_campaign(self, name: str, objective: str, status: str = "PAUSED") -> Dict[str, Any]:
        """Create a new campaign"""
        endpoint = f"act_{self.ad_account_id}/campaigns"
        data = {
            "name": name,
            "objective": objective,
            "status": status
        }
        return self._make_request(endpoint, method="POST", data=data)
    
    def get_campaigns_detailed(self, limit: int = 25, date_preset: str = "last_30d") -> List[Dict[str, Any]]:
        """Get campaigns with detailed ad sets and ads using nested field requests
        
        Uses Meta API's nested field syntax to fetch campaigns, ad sets, and ads
        in a single API call to avoid rate limits.
        Includes insights (spend, impressions, clicks, etc.) using nested insights fields.
        
        Reference: 
        - https://stackoverflow.com/questions/68576154/facebook-developer-apis-trying-to-fetch-all-the-campaigns-adsets-and-ads
        - https://stackoverflow.com/questions/60916171/how-can-i-get-the-amount-spent-faceook-marketing-api
        - https://developers.facebook.com/docs/marketing-api/reference/ads-insights/
        """
        endpoint = f"act_{self.ad_account_id}/campaigns"
        
        # Use nested fields to get campaigns with their ad sets and ads in a single call
        # Include insights with spend, impressions, clicks, etc. for accurate spend data
        # This avoids rate limits from making multiple separate API calls
        # Reference: https://stackoverflow.com/questions/60916171/how-can-i-get-the-amount-spent-faceook-marketing-api
        # The insights{spend} syntax gets actual spend from Insights API, not calculated from budget
        fields = (
            "id,name,status,objective,created_time,updated_time,daily_budget,lifetime_budget,"
            "insights{spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,cost_per_action},"
            "adsets{id,name,status,effective_status,daily_budget,lifetime_budget,optimization_goal,created_time,updated_time,"
            "insights{spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,cost_per_action},"
            "ads{id,name,status,effective_status,creative,created_time,updated_time,"
            "insights{spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,cost_per_action}}"
        )
        
        params = {
            "limit": limit,
            "fields": fields,
            "date_preset": date_preset  # Pass date_preset as a query parameter for insights
        }
        
        try:
            response = self._make_request(f"{endpoint}?{'&'.join([f'{k}={v}' for k, v in params.items()])}")
            campaigns = response.get("data", [])
            
            # Handle pagination if needed
            while "paging" in response and "next" in response["paging"]:
                try:
                    next_url = response["paging"]["next"]
                    # Extract the query string from the full URL
                    if "?" in next_url:
                        query_string = next_url.split("?")[1]
                        response = self._make_request(f"{endpoint}?{query_string}")
                        campaigns.extend(response.get("data", []))
                    else:
                        break
                except Exception as e:
                    logger.warning(f"Failed to fetch next page: {e}")
                    break
            
            # Normalize the structure - Meta API returns nested data in 'data' field
            for campaign in campaigns:
                # Normalize insights - Meta API returns insights as a list with one object
                if "insights" in campaign:
                    insights_data = campaign["insights"]
                    if isinstance(insights_data, dict) and "data" in insights_data:
                        insights_list = insights_data["data"]
                    elif isinstance(insights_data, list):
                        insights_list = insights_data
                    else:
                        insights_list = []
                    
                    # Extract the first insights object (or empty dict if none)
                    campaign["performance_metrics"] = insights_list[0] if insights_list else {}
                    del campaign["insights"]
                else:
                    campaign["performance_metrics"] = {}
                
                # Ensure ad_sets is a list
                # Meta API returns nested fields as objects with 'data' and 'paging' keys
                if "adsets" in campaign:
                    if isinstance(campaign["adsets"], dict) and "data" in campaign["adsets"]:
                        campaign["ad_sets"] = campaign["adsets"]["data"]
                    elif isinstance(campaign["adsets"], list):
                        # Sometimes it might already be a list
                        campaign["ad_sets"] = campaign["adsets"]
                    else:
                        campaign["ad_sets"] = []
                    # Remove the original 'adsets' key if it exists
                    if "adsets" in campaign:
                        del campaign["adsets"]
                else:
                    campaign["ad_sets"] = []
                
                # Normalize ads and insights within each ad set
                for ad_set in campaign.get("ad_sets", []):
                    # Normalize ad set insights
                    if "insights" in ad_set:
                        insights_data = ad_set["insights"]
                        if isinstance(insights_data, dict) and "data" in insights_data:
                            insights_list = insights_data["data"]
                        elif isinstance(insights_data, list):
                            insights_list = insights_data
                        else:
                            insights_list = []
                        
                        ad_set["performance_metrics"] = insights_list[0] if insights_list else {}
                        del ad_set["insights"]
                    else:
                        ad_set["performance_metrics"] = {}
                    
                    # Normalize ads
                    if "ads" in ad_set:
                        if isinstance(ad_set["ads"], dict) and "data" in ad_set["ads"]:
                            ad_set["ads"] = ad_set["ads"]["data"]
                        elif isinstance(ad_set["ads"], list):
                            # Sometimes it might already be a list
                            pass  # Already a list, no need to change
                        else:
                            ad_set["ads"] = []
                    else:
                        ad_set["ads"] = []
                    
                    # Normalize insights for each ad
                    for ad in ad_set.get("ads", []):
                        if "insights" in ad:
                            insights_data = ad["insights"]
                            if isinstance(insights_data, dict) and "data" in insights_data:
                                insights_list = insights_data["data"]
                            elif isinstance(insights_data, list):
                                insights_list = insights_data
                            else:
                                insights_list = []
                            
                            ad["performance_metrics"] = insights_list[0] if insights_list else {}
                            del ad["insights"]
                        else:
                            ad["performance_metrics"] = {}
            
            return campaigns
            
        except Exception as e:
            logger.error(f"Failed to get detailed campaigns: {e}")
            # Fallback to the old method if nested fields fail
            logger.warning("Falling back to separate API calls method")
            campaigns = self.get_campaigns(limit)
            
            for campaign in campaigns:
                try:
                    # Get ad sets for this campaign
                    ad_sets = self.get_ad_sets(campaign["id"], limit=50)
                    campaign["ad_sets"] = ad_sets
                    
                    # Get ads for each ad set
                    for ad_set in ad_sets:
                        try:
                            ads = self.get_ads(ad_set["id"], limit=50)
                            ad_set["ads"] = ads
                        except Exception as e:
                            logger.warning(f"Failed to get ads for ad set {ad_set.get('id')}: {e}")
                            ad_set["ads"] = []
                            
                except Exception as e:
                    logger.warning(f"Failed to get ad sets for campaign {campaign.get('id')}: {e}")
                    campaign["ad_sets"] = []
            
            return campaigns

    def update_ad_set_status(self, ad_set_id: str, status: str) -> Dict[str, Any]:
        """Update the status of an ad set (ACTIVE, PAUSED, ARCHIVED)
        
        According to Meta's Marketing API documentation:
        https://developers.facebook.com/docs/marketing-api/reference/ad-campaign/
        Updates should use POST with form data, not PUT with JSON.
        """
        endpoint = ad_set_id
        # Meta API requires form data, not JSON for updates
        data = {
            "status": status
        }
        
        try:
            # Meta API uses POST for updates, not PUT, and requires form data
            # According to Meta API docs, access_token can be in query params or form data
            url = f"{self.base_url}/{endpoint.lstrip('/')}"
            params = {
                "access_token": self.access_token
            }
            headers = {
                "Authorization": f"Bearer {self.access_token}"
                # Don't set Content-Type, let requests set it for form data
            }
            
            # Use POST with form data (data parameter) instead of PUT with JSON
            # Include access_token in query params as per Meta API documentation examples
            response = requests.post(url, headers=headers, params=params, data=data, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.HTTPError as e:
            # If Meta API returns an error, log it and re-raise
            error_msg = f"Meta API error updating ad set {ad_set_id}: {e}"
            if hasattr(e, 'response') and e.response:
                try:
                    error_data = e.response.json()
                    if 'error' in error_data:
                        error_info = error_data['error']
                        error_msg = f"Meta API Error {error_info.get('code', '')}: {error_info.get('message', str(e))}"
                        logger.error(f"{error_msg} - Full response: {error_data}")
                except:
                    error_msg = f"{error_msg} - Response: {e.response.text}"
            logger.error(error_msg)
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            raise

    def test_connection(self) -> bool:
        """Test the connection to Meta's API"""
        try:
            self.get_ad_account_info()
            return True
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False
