import json
import os
import re
import urllib.request
from datetime import datetime

SPORTSTATS_URL = "https://sportstats.one/profile/273616"
RUNS_JSON_PATH = "data/runs.json"
MANUAL_RUNS_PATH = "data/manual_runs.json"

# Strava configuration (from environment variables)
STRAVA_CLIENT_ID = os.environ.get('STRAVA_CLIENT_ID')
STRAVA_CLIENT_SECRET = os.environ.get('STRAVA_CLIENT_SECRET')
STRAVA_REFRESH_TOKEN = os.environ.get('STRAVA_REFRESH_TOKEN')

def format_time(ms):
    seconds = ms // 1000
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

def fetch_sportstats_data():
    """Scrape data from Sportstats profile."""
    print(f"Fetching from {SPORTSTATS_URL}...")
    req = urllib.request.Request(
        SPORTSTATS_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            
        runs = []
        pattern = r'\\"elbl\\":\\"([^\\"]+)\\".*?\\"dts\\":(\d+).*?\\"rd\\":(\d+).*?\\"rlbl\\":\\"([^\\"]+)\\".*?\\"pt\\":(\d+)'
        matches = re.findall(pattern, html)
        
        for match in matches:
            event_name = match[0]
            dts = int(match[1])
            distance_m = int(match[2])
            race_label = match[3]
            time_ms = int(match[4])
            
            date_str = datetime.fromtimestamp(dts).strftime('%Y-%m-%d')
            title = f"{event_name} - {race_label}".strip(" -")
            distance = f"{distance_m / 1000:.1f} km"
            time_str = format_time(time_ms)
            
            runs.append({
                "date": date_str,
                "event_name": title,
                "distance": distance,
                "time": time_str,
                "source": "Sportstats",
                "url": SPORTSTATS_URL
            })

        print(f"Found {len(runs)} runs from Sportstats.")
        return runs
    except Exception as e:
        print(f"Error fetching from Sportstats: {e}")
        return []

def load_manual_runs():
    if os.path.exists(MANUAL_RUNS_PATH):
        with open(MANUAL_RUNS_PATH, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def fetch_strava_activities():
    """Fetch recent activities from Strava using the API."""
    if not all([STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN]):
        print("Strava credentials not found in environment. Skipping Strava integration.")
        return {}

    print("Authenticating with Strava API...")
    # 1. Get Access Token using Refresh Token
    token_url = "https://www.strava.com/oauth/token"
    data = urllib.parse.urlencode({
        'client_id': STRAVA_CLIENT_ID,
        'client_secret': STRAVA_CLIENT_SECRET,
        'refresh_token': STRAVA_REFRESH_TOKEN,
        'grant_type': 'refresh_token'
    }).encode('utf-8')

    try:
        req = urllib.request.Request(token_url, data=data)
        with urllib.request.urlopen(req) as response:
            auth_data = json.loads(response.read().decode('utf-8'))
            access_token = auth_data['access_token']
            
        print("Fetching recent activities from Strava...")
        # 2. Get activities
        activities_url = "https://www.strava.com/api/v3/athlete/activities?per_page=100"
        req = urllib.request.Request(
            activities_url,
            headers={'Authorization': f'Bearer {access_token}'}
        )
        with urllib.request.urlopen(req) as response:
            activities = json.loads(response.read().decode('utf-8'))
            
        strava_dict = {}
        # Group Strava activities by date (local timezone)
        for act in activities:
            if act['type'] == 'Run':
                # Strava date format: "2025-10-25T14:30:00Z"
                date_str = act['start_date_local'].split('T')[0]
                
                # If there are multiple runs on the same day, keep the longest one (most likely the race)
                if date_str not in strava_dict or act['distance'] > strava_dict[date_str]['distance']:
                    strava_dict[date_str] = {
                        'distance': act['distance'],
                        'elevation_gain': act.get('total_elevation_gain', 0),
                        'id': act['id']
                    }
        print(f"Found {len(strava_dict)} run days on Strava.")
        return strava_dict

    except Exception as e:
        print(f"Error fetching from Strava: {e}")
        return {}

def main():
    sportstats_runs = fetch_sportstats_data()
    manual_runs = load_manual_runs()
    strava_activities = fetch_strava_activities()
    
    unique_runs = {}
    
    # D'abord on ajoute les courses de Sportstats et on fusionne avec Strava
    for run in sportstats_runs:
        key = f"{run['date']}_{run['event_name']}"
        unique_runs[key] = run
        
        # Merge Strava data based on date
        if run['date'] in strava_activities:
            s_act = strava_activities[run['date']]
            if s_act['elevation_gain'] > 0:
                unique_runs[key]['elevation'] = f"{int(s_act['elevation_gain'])}m"
            unique_runs[key]['url'] = f"https://www.strava.com/activities/{s_act['id']}"
            unique_runs[key]['source'] = "Sportstats + Strava"
        
    # Ensuite on ajoute ou fusionne les courses manuelles (priorité absolue)
    for run in manual_runs:
        key = f"{run['date']}_{run['event_name']}"
        if key in unique_runs:
            for k, v in run.items():
                if v is not None and v != "":
                    if k == "source" and "Sportstats" in unique_runs[key]["source"]:
                        continue
                    unique_runs[key][k] = v
        else:
            unique_runs[key] = run
            
    final_runs = list(unique_runs.values())
    final_runs.sort(key=lambda x: x['date'], reverse=True)
    
    os.makedirs(os.path.dirname(RUNS_JSON_PATH), exist_ok=True)
    with open(RUNS_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(final_runs, f, indent=2, ensure_ascii=False)
        
    print(f"\nSuccessfully saved {len(final_runs)} runs to {RUNS_JSON_PATH}")
    print("\n--- Aperçu des données récupérées ---")
    for r in final_runs:
        elevation = f" [⛰️ {r['elevation']}]" if 'elevation' in r else ""
        print(f"- {r['date']} : {r['event_name']} ({r['distance']} en {r['time']}){elevation} [Source: {r['source']}]")

if __name__ == "__main__":
    main()
