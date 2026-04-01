"""Data fetching utilities for Space Oddities."""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

BASE_URL = "https://www.space-track.org"
LOGIN_URL = f"{BASE_URL}/ajaxauth/login"
CDM_URL = f"{BASE_URL}/basicspacedata/query/class/cdm_public"
LOGOUT_URL = f"{BASE_URL}/ajaxauth/logout"

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT_DIR / "data" / "raw" / "spacetrack"


def load_credentials() -> tuple[str, str]:
    """Load Space-Track credentials from env vars or a local .env file."""
    env_path = ROOT_DIR / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

    user = os.environ.get("SPACETRACK_USER")
    pwd = os.environ.get("SPACETRACK_PASS")
    if not user or not pwd:
        raise RuntimeError(
            "Missing SPACETRACK_USER / SPACETRACK_PASS in environment or .env file."
        )
    return user, pwd


def fetch_latest_cdm(days: int = 30, limit: int = 2000) -> Path:
    """Fetch latest CDM records from Space-Track and save them in data/raw/spacetrack."""
    user, pwd = load_credentials()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    url = (
        f"{CDM_URL}"
        f"/TCA/%3E{since}"
        f"/orderby/TCA%20desc"
        f"/limit/{limit}"
        f"/format/json"
        f"/emptyresult/show"
    )

    with requests.Session() as session:
        login = session.post(LOGIN_URL, data={"identity": user, "password": pwd}, timeout=30)
        login.raise_for_status()
        if "Login" in login.text:
            raise RuntimeError("Space-Track login failed. Check credentials.")

        response = session.get(url, timeout=60)
        response.raise_for_status()
        records = response.json()
        session.get(LOGOUT_URL, timeout=30)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RAW_DIR / "cdm_latest.json"
    out_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch Space-Track CDM data")
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--limit", type=int, default=2000)
    args = parser.parse_args()

    output = fetch_latest_cdm(days=args.days, limit=args.limit)
    print(f"Saved CDM data to {output}")


if __name__ == "__main__":
    main()
