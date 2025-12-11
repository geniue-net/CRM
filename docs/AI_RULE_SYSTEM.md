# AI Rule System for Meta Ad Management

## Overview

The AI Rule System is a comprehensive solution for creating and managing automated rules for Meta (Facebook) Ad Sets. It uses AI (OpenAI GPT-4) to interpret natural language requests and convert them into executable rules that can pause, activate, or optimize ad sets based on various conditions.

## Features

### 1. Natural Language Rule Creation
Create rules by describing what you want in plain English:
- "Pause all ad sets with cost per conversion above $50"
- "Activate ad sets that have been paused for more than 7 days"
- "Pause ad sets where spend is between $60 and $100 with no conversions"

### 2. Basic and Advanced Modes

#### Basic Mode
Suitable for common optimization scenarios:
- **Basic Fields**: name, status, effective_status, daily_budget, lifetime_budget, optimization_goal
- **Date/Time Fields**: created_time, updated_time, start_time, end_time
- **Performance Metrics**: spend, impressions, clicks, reach, frequency, ctr, cpc, cpm
- **Conversions**: conversions, conversion_rate, cost_per_conversion, cost_per_action, actions, roas, purchase_value

#### Advanced Mode
Full access to Meta API fields and advanced operators:
- All Basic Mode fields plus:
- **Advanced Settings**: bid_amount, bid_strategy, billing_event, destination_type, pacing_type
- **Targeting**: age_min, age_max, genders, geo_locations, publisher_platforms, facebook_positions, instagram_positions

### 3. Operators

#### Basic Operators
| Operator | Description | Example |
|----------|-------------|---------|
| `equals` | Exact match | status equals "ACTIVE" |
| `not_equals` | Does not match | status not_equals "PAUSED" |
| `greater_than` | Greater than value | spend greater_than 100 |
| `less_than` | Less than value | ctr less_than 1 |
| `greater_than_or_equal` | >= value | impressions >= 1000 |
| `less_than_or_equal` | <= value | cpc <= 2.5 |
| `between` | Value in range | spend between 50 and 100 |
| `contains` | String contains | name contains "Summer" |
| `not_contains` | String doesn't contain | name not_contains "Test" |
| `starts_with` | String starts with | name starts_with "Campaign" |
| `ends_with` | String ends with | name ends_with "v2" |
| `in` | Value in list | status in ["ACTIVE", "PAUSED"] |
| `not_in` | Value not in list | optimization_goal not_in ["REACH"] |

#### Regex Operators
| Operator | Description | Example |
|----------|-------------|---------|
| `regex` | Matches pattern | name regex "^Test_\d+" |
| `not_regex` | Doesn't match pattern | name not_regex "^_Archive" |

#### Date/Time Operators
| Operator | Description | Example |
|----------|-------------|---------|
| `date_equals` | Same day | created_time date_equals "2024-01-15" |
| `date_before` | Before date | created_time date_before "2024-01-01" |
| `date_after` | After date | updated_time date_after "2024-06-01" |
| `date_between` | Between dates | created_time date_between "2024-01-01" and "2024-06-30" |
| `days_ago_less_than` | Created less than X days ago | created_time days_ago_less_than 7 |
| `days_ago_greater_than` | Created more than X days ago | created_time days_ago_greater_than 30 |
| `days_ago_between` | Created between X and Y days ago | created_time days_ago_between 7 and 14 |
| `time_of_day_between` | Hour of day (0-23) | created_time time_of_day_between 9 and 17 |

#### Statistics Operators
| Operator | Description | Example |
|----------|-------------|---------|
| `above_average` | Above campaign average | spend above_average |
| `below_average` | Below campaign average | ctr below_average |
| `above_median` | Above median value | cost_per_conversion above_median |
| `below_median` | Below median value | impressions below_median |
| `above_percentile` | Above Nth percentile | spend above_percentile 75 |
| `below_percentile` | Below Nth percentile | conversions below_percentile 25 |
| `percent_change_greater` | Changed by more than X% | spend percent_change_greater 50 |
| `percent_change_less` | Changed by less than X% | ctr percent_change_less -10 |
| `trend_increasing` | Metric trending up | spend trend_increasing |
| `trend_decreasing` | Metric trending down | conversions trend_decreasing |
| `trend_stable` | Metric relatively stable | cpc trend_stable |

#### Null Check Operators
| Operator | Description | Example |
|----------|-------------|---------|
| `is_null` | Field is empty/null | end_time is_null |
| `is_not_null` | Field has a value | lifetime_budget is_not_null |

### 4. Campaign Analysis

The system can analyze campaign performance and provide:
- **Summary Statistics**: Total spend, conversions, CTR, CPC, ROAS
- **Performance Insights**: AI-generated observations about campaign health
- **Optimization Opportunities**: Actionable suggestions with one-click rule creation
- **Underperforming Ad Sets**: Identification of wasteful ad sets
- **Top Performers**: Best performing ad sets for scaling

### 5. Rule Execution Modes

#### Manual Mode
- Rules are saved but require manual execution
- Click "Run Now" in the Rules tab to execute
- Good for testing and one-time optimizations

#### Automatic Mode
- Rules execute automatically every 5 minutes
- Continuously monitors and optimizes campaigns
- Ideal for ongoing optimization rules

## API Endpoints

### Rule Schema
```
GET /api/ad-set-rules/schema?mode=basic|advanced
```
Returns available fields, operators, and actions.

### Generate Rule
```
POST /api/ad-set-rules/generate
{
  "natural_language": "Pause ad sets with high spend and no conversions",
  "agent_id": "agent-123",
  "campaign_id": "123456789",
  "mode": "basic" | "advanced"
}
```

### Analyze Campaign
```
POST /api/ad-set-rules/analyze
{
  "agent_id": "agent-123",
  "campaign_id": "123456789"
}
```
Returns comprehensive campaign analysis with optimization suggestions.

### Preview Rule
```
POST /api/ad-set-rules/preview
{
  "agent_id": "agent-123",
  "campaign_id": "123456789",
  "filter_config": { ... }
}
```
Returns list of ad sets that match the rule conditions.

### Create Rule
```
POST /api/ad-set-rules/
{
  "agent_id": "agent-123",
  "campaign_id": "123456789",
  "rule_name": "Pause High Cost Ad Sets",
  "description": "Pauses ad sets with cost above $50",
  "filter_config": {
    "conditions": [
      {
        "field": "cost_per_conversion",
        "operator": "greater_than",
        "value": 50
      }
    ],
    "logical_operator": "AND"
  },
  "action": {
    "type": "PAUSE"
  },
  "execution_mode": "MANUAL" | "AUTO"
}
```

### Execute Rule
```
POST /api/ad-set-rules/:rule_id/execute
```
Manually executes a rule and returns results.

## Rule Configuration Structure

### Simple Rule
```json
{
  "filter_config": {
    "conditions": [
      {
        "field": "spend",
        "operator": "greater_than",
        "value": 100
      },
      {
        "field": "conversions",
        "operator": "equals",
        "value": 0
      }
    ],
    "logical_operator": "AND"
  },
  "action": {
    "type": "PAUSE"
  }
}
```

### Complex Rule with Condition Groups
```json
{
  "filter_config": {
    "condition_groups": [
      {
        "conditions": [
          {
            "field": "spend",
            "operator": "greater_than",
            "value": 50
          },
          {
            "field": "conversions",
            "operator": "equals",
            "value": 0
          }
        ],
        "logical_operator": "AND"
      },
      {
        "conditions": [
          {
            "field": "cost_per_conversion",
            "operator": "above_average",
            "value": null
          },
          {
            "field": "created_time",
            "operator": "days_ago_greater_than",
            "value": 7
          }
        ],
        "logical_operator": "AND"
      }
    ],
    "logical_operator": "OR"
  },
  "action": {
    "type": "PAUSE"
  }
}
```

### Rule with Time Windows
```json
{
  "filter_config": {
    "conditions": [
      {
        "field": "spend",
        "operator": "greater_than",
        "value": 100,
        "time_window": "last_7d"
      },
      {
        "field": "conversions",
        "operator": "less_than",
        "value": 2,
        "time_window": "last_7d"
      }
    ],
    "logical_operator": "AND"
  },
  "action": {
    "type": "PAUSE"
  }
}
```

## Example Use Cases

### 1. Stop Wasting Budget
**Request:** "Pause all ad sets that spent more than $50 with no conversions"

**Generated Rule:**
```json
{
  "rule_name": "Stop Budget Waste",
  "filter_config": {
    "conditions": [
      { "field": "spend", "operator": "greater_than", "value": 50 },
      { "field": "conversions", "operator": "equals", "value": 0 }
    ],
    "logical_operator": "AND"
  },
  "action": { "type": "PAUSE" }
}
```

### 2. Optimize by Cost Efficiency
**Request:** "Pause ad sets where cost per conversion is above campaign average"

**Generated Rule:**
```json
{
  "rule_name": "Optimize Cost Efficiency",
  "filter_config": {
    "conditions": [
      { "field": "cost_per_conversion", "operator": "above_average", "value": null },
      { "field": "spend", "operator": "greater_than", "value": 10 }
    ],
    "logical_operator": "AND"
  },
  "action": { "type": "PAUSE" }
}
```

### 3. Age-Based Optimization
**Request:** "Pause ad sets created more than 30 days ago with low performance"

**Generated Rule:**
```json
{
  "rule_name": "Archive Old Underperformers",
  "filter_config": {
    "conditions": [
      { "field": "created_time", "operator": "days_ago_greater_than", "value": 30 },
      { "field": "ctr", "operator": "below_average", "value": null }
    ],
    "logical_operator": "AND"
  },
  "action": { "type": "PAUSE" }
}
```

### 4. Pattern-Based Filtering
**Request:** "Pause all test ad sets (names starting with 'Test_' or '_test')"

**Generated Rule:**
```json
{
  "rule_name": "Pause Test Ad Sets",
  "filter_config": {
    "conditions": [
      { "field": "name", "operator": "regex", "value": "^(Test_|_test)" }
    ],
    "logical_operator": "AND"
  },
  "action": { "type": "PAUSE" }
}
```

### 5. Budget Range Control
**Request:** "Pause ad sets with spend between $60 and $100"

**Generated Rule:**
```json
{
  "rule_name": "Budget Range Control",
  "filter_config": {
    "conditions": [
      { "field": "spend", "operator": "between", "value": 60, "value2": 100 }
    ],
    "logical_operator": "AND"
  },
  "action": { "type": "PAUSE" }
}
```

## Environment Configuration

Add the following to your backend `.env` file:

```env
# OpenAI Configuration (Required for AI features)
OPENAI_API_KEY=your-openai-api-key-here
```

The system uses GPT-4o for rule generation and campaign analysis.

## Frontend Usage

### Opening the AI Assistant
1. Navigate to an Agent Details page
2. Select a campaign from the dropdown
3. Click "Create Rule with AI" button

### Using Basic Mode
- Describe simple rules in plain English
- Uses common metrics and operators
- Best for straightforward optimization rules

### Using Advanced Mode
- Toggle to "Advanced" in the header
- Access all Meta API fields
- Use complex operators (regex, statistics, trends)
- Create sophisticated multi-condition rules

### Campaign Analysis
1. Click the "Analysis" tab or type "analyze" in the chat
2. View performance summary and insights
3. Click "Apply Rule" on any suggestion to create it instantly

## Best Practices

1. **Start Simple**: Begin with basic rules and gradually add complexity
2. **Preview First**: Always preview rules before saving to see affected ad sets
3. **Use Manual Mode Initially**: Test rules manually before enabling auto-execution
4. **Set Minimum Thresholds**: Add spend/impression minimums to avoid acting on new ad sets
5. **Combine Conditions**: Use AND logic to be more precise, OR for broader matching
6. **Regular Analysis**: Run campaign analysis weekly to discover new optimization opportunities

## Troubleshooting

### "OpenAI API key is not configured"
Add `OPENAI_API_KEY` to your backend `.env` file.

### "Agent not found or offline"
Ensure the agent is running and connected to the CRM.

### Rule not matching expected ad sets
- Check field names match exactly (case-sensitive for some)
- Verify value types (numbers vs strings)
- Use Preview to debug

### Analysis taking too long
Large campaigns with many ad sets may take 30-60 seconds to analyze.

## Data Flow

```
User Input (Natural Language)
         ↓
   OpenAI GPT-4o
         ↓
  Structured Rule JSON
         ↓
   Preview (Backend)
         ↓
  Matching Ad Sets List
         ↓
    Save Rule (MongoDB)
         ↓
  Execute (Manual/Auto)
         ↓
  Agent → Meta API
         ↓
   Ad Set Status Updated
```

## Architecture

```
Frontend (React)
    ↓ API Calls
Backend (Express.js)
    ↓ Rule Generation
OpenAI API (GPT-4o)
    ↓ Rule Execution
Agent Service (Python)
    ↓ Meta Updates
Meta Marketing API
```

