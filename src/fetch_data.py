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
SATCAT_URL = f"{BASE_URL}/basicspacedata/query/class/satcat"
GP_URL = f"{BASE_URL}/basicspacedata/query/class/gp"
LOGOUT_URL = f"{BASE_URL}/ajaxauth/logout"

CELESTRAK_GP_URL = "https://celestrak.org/NORAD/elements/gp.php"
CELESTRAK_SATCAT_URL = "https://celestrak.org/pub/satcat.csv"

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


def get_spacetrack_session() -> requests.Session:
    """Create an authenticated Space-Track session."""
    user, pwd = load_credentials()
    session = requests.Session()
    login = session.post(LOGIN_URL, data={"identity": user, "password": pwd}, timeout=30)
    login.raise_for_status()
    if "Login" in login.text:
        raise RuntimeError("Space-Track login failed. Check credentials.")
    return session


def fetch_latest_cdm(days: int = 30, limit: int = 2000) -> Path:
    """Fetch latest CDM records from Space-Track and save them in data/raw/spacetrack."""
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    url = (
        f"{CDM_URL}"
        f"/TCA/%3E{since}"
        f"/orderby/TCA%20desc"
        f"/limit/{limit}"
        f"/format/json"
        f"/emptyresult/show"
    )

    with get_spacetrack_session() as session:
        response = session.get(url, timeout=60)
        response.raise_for_status()
        records = response.json()
        session.get(LOGOUT_URL, timeout=30)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RAW_DIR / "cdm_latest.json"
    out_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    return out_path


def fetch_satcat() -> Path:
    """Fetch the complete Satellite Catalog from Space-Track."""
    url = f"{SATCAT_URL}/format/json"
    print("Fetching full SATCAT (this may take a minute)...")
    with get_spacetrack_session() as session:
        response = session.get(url, timeout=120)
        response.raise_for_status()
        records = response.json()
        session.get(LOGOUT_URL, timeout=30)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RAW_DIR / "satcat.json"
    out_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    return out_path


def fetch_gp() -> Path:
    """Fetch the latest General Perturbations (TLEs) for all objects from Space-Track."""
    url = f"{GP_URL}/format/json"
    print("Fetching bulk GP records/TLEs (this may take a minute)...")
    with get_spacetrack_session() as session:
        response = session.get(url, timeout=300)  # High timeout for bulk data
        response.raise_for_status()
        records = response.json()
        session.get(LOGOUT_URL, timeout=30)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    out_path = RAW_DIR / "gp_bulk.json"
    out_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
    return out_path


def fetch_celestrak_satcat() -> Path:
    """Fetch the Satellite Catalog from CelesTrak (CSV format)."""
    print("Fetching SATCAT from CelesTrak...")
    response = requests.get(CELESTRAK_SATCAT_URL, timeout=60)
    response.raise_for_status()
    
    out_dir = ROOT_DIR / "data" / "raw" / "celestrak"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "satcat.csv"
    out_path.write_text(response.text, encoding="utf-8")
    return out_path


def fetch_celestrak_active_gp() -> Path:
    """Fetch TLEs for all active satellites from CelesTrak."""
    print("Fetching active GP records from CelesTrak...")
    params = {"GROUP": "active", "FORMAT": "json"}
    response = requests.get(CELESTRAK_GP_URL, params=params, timeout=60)
    response.raise_for_status()
    
    out_dir = ROOT_DIR / "data" / "raw" / "celestrak"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "active_gp.json"
    out_path.write_text(response.text, encoding="utf-8")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch Space-Track and CelesTrak data")
    parser.add_argument("type", choices=["cdm", "satcat", "gp", "all"], default="cdm")
    parser.add_argument("--days", type=int, default=30)
    parser.add_argument("--limit", type=int, default=2000)
    args = parser.parse_args()

    if args.type in ["cdm", "all"]:
        path = fetch_latest_cdm(days=args.days, limit=args.limit)
        print(f"Saved CDM data to {path}")
    if args.type in ["satcat", "all"]:
        path = fetch_satcat()
        print(f"Saved SATCAT data to {path}")
        fetch_celestrak_satcat()
    if args.type in ["gp", "all"]:
        path = fetch_gp()
        print(f"Saved GP data to {path}")
        fetch_celestrak_active_gp()


if __name__ == "__main__":
    main()
