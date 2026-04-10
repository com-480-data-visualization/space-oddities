"""
Fetch Conjunction Data Messages (CDMs) from Space-Track.org
Saves results to data/spacetrack/cdm_latest.json

Usage:
    python fetch_cdm.py
    python fetch_cdm.py --days 7 --limit 1000

Credentials are read from a .env file at the repo root or from environment variables:
    SPACETRACK_USER=your@email.com
    SPACETRACK_PASS=yourpassword
"""

import os
import json
import argparse
import requests
from pathlib import Path
from datetime import datetime, timedelta, timezone

BASE_URL = "https://www.space-track.org"
LOGIN_URL = f"{BASE_URL}/ajaxauth/login"
CDM_URL = f"{BASE_URL}/basicspacedata/query/class/cdm_public"
LOGOUT_URL = f"{BASE_URL}/ajaxauth/logout"

OUT_DIR = Path(__file__).parent.parent / "data" / "spacetrack"


def load_credentials() -> tuple[str, str]:
    """Load credentials from .env file or environment variables."""
    # Try .env file at repo root (two levels up from scripts/)
    env_path = Path(__file__).parent.parent.parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

    user = os.environ.get("SPACETRACK_USER")
    pwd = os.environ.get("SPACETRACK_PASS")

    if not user or not pwd:
        print("Credentials not found in environment or .env file.")
        print("Either:")
        print("  1. Create a .env file at the repo root with:")
        print("       SPACETRACK_USER=your@email.com")
        print("       SPACETRACK_PASS=yourpassword")
        print("  2. Or export them as environment variables before running.")
        raise SystemExit(1)

    return user, pwd


def fetch_cdm(session: requests.Session, days: int, limit: int) -> list[dict]:
    """Fetch CDM records from Space-Track for the last `days` days."""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    url = (
        f"{CDM_URL}"
        f"/TCA/%3E{since}"       # TCA (Time of Closest Approach) >= since date
        f"/orderby/TCA%20desc"
        f"/limit/{limit}"
        f"/format/json"
        f"/emptyresult/show"
    )
    resp = session.get(url)
    resp.raise_for_status()
    return resp.json()


def main():
    parser = argparse.ArgumentParser(description="Fetch CDMs from Space-Track.org")
    parser.add_argument("--days", type=int, default=30,
                        help="Fetch CDMs with TCA in the last N days (default: 30)")
    parser.add_argument("--limit", type=int, default=2000,
                        help="Maximum number of records to fetch (default: 2000)")
    args = parser.parse_args()

    user, pwd = load_credentials()

    with requests.Session() as session:
        # Login
        print(f"Logging in as {user}...")
        resp = session.post(LOGIN_URL, data={"identity": user, "password": pwd})
        resp.raise_for_status()
        if "Login" in resp.text:
            print("Login failed — check your credentials.")
            raise SystemExit(1)
        print("Login successful.")

        # Fetch CDMs
        print(f"Fetching CDMs for the last {args.days} days (limit: {args.limit})...")
        records = fetch_cdm(session, days=args.days, limit=args.limit)
        print(f"Retrieved {len(records)} CDM records.")

        # Logout
        session.get(LOGOUT_URL)

    # Save output
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / "cdm_latest.json"
    with open(out_path, "w") as f:
        json.dump(records, f, indent=2)
    print(f"Saved to {out_path}")

    # Quick summary
    if records:
        max_pc = max((float(r.get("PC", 0) or 0) for r in records), default=0)
        print(f"Highest collision probability in dataset: {max_pc:.2e}")


if __name__ == "__main__":
    main()
