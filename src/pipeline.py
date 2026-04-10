"""Unified data pipeline for Space Oddities."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

from .cleaning import clean_ucs_columns
from .fetch_data import (
    fetch_celestrak_active_gp,
    fetch_celestrak_satcat,
    fetch_gp,
    fetch_latest_cdm,
    fetch_satcat,
)
from .merging import build_conjunction_events, build_objects_table, parse_tle_gp_elements

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT_DIR / "data" / "raw"
PROCESSED_DIR = ROOT_DIR / "data" / "processed"

# Default paths for UCS (update if location changes)
UCS_PATH = ROOT_DIR / "milestone1_latex" / "data" / "ucs" / "UCS-Satellite-Database 5-1-2023.xlsx"


def run_pipeline(fetch: bool = False) -> None:
    """Run the full data pipeline: Fetch -> Clean -> Merge -> Export."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Fetch data if requested
    if fetch:
        print("--- Step 1: Fetching data from Space-Track & CelesTrak ---")
        fetch_satcat()
        fetch_gp()
        fetch_latest_cdm(days=30)
        fetch_celestrak_satcat()
        fetch_celestrak_active_gp()

    # 2. Load Raw Data
    print("--- Step 2: Loading raw datasets ---")
    satcat_raw_path = RAW_DIR / "spacetrack" / "satcat.json"
    gp_raw_path = RAW_DIR / "spacetrack" / "gp_bulk.json"
    cdm_raw_path = RAW_DIR / "spacetrack" / "cdm_latest.json"

    if not satcat_raw_path.exists() or not gp_raw_path.exists():
        print(f"Error: Raw data not found at {RAW_DIR}. Run with --fetch first.")
        sys.exit(1)

    satcat_df = pd.read_json(satcat_raw_path)
    if not UCS_PATH.exists():
        print(f"Warning: UCS Database not found at {UCS_PATH}. Objects table will be SATCAT-only.")
        ucs_df = pd.DataFrame(columns=["norad_id"])
    else:
        ucs_df = pd.read_excel(UCS_PATH)
        ucs_df = clean_ucs_columns(ucs_df)

    # 3. Build Tables
    print("--- Step 3: Building Master Objects Table ---")
    objects_table = build_objects_table(ucs_df, satcat_df)

    print("--- Step 4: Parsing TLEs ---")
    tle_table = parse_tle_gp_elements(gp_raw_path)

    print("--- Step 5: Processing Conjunction Events ---")
    if cdm_raw_path.exists():
        cdm_table = build_conjunction_events(cdm_raw_path)
    else:
        print("Warning: CDM file not found. Skipping conjunction events.")
        cdm_table = pd.DataFrame()

    # 4. Export Snapshots
    print(f"--- Step 6: Exporting snapshots to {PROCESSED_DIR} ---")
    
    # Pre-parquet cleaning: ensure object columns are actually strings
    # (Mixed types like Int and String in the same column fail in pyarrow)
    for df in [objects_table, tle_table, cdm_table]:
        for col in df.select_dtypes(include=["object"]).columns:
            df[col] = df[col].astype(str).replace("nan", "").replace("None", "<NA>")

    # Save as CSV for compatibility
    objects_table.to_csv(PROCESSED_DIR / "objects.csv", index=False)
    tle_table.to_csv(PROCESSED_DIR / "tle.csv", index=False)
    cdm_table.to_csv(PROCESSED_DIR / "conjunction_events.csv", index=False)

    # Save as Parquet for performance (if possible)
    try:
        objects_table.to_parquet(PROCESSED_DIR / "objects.parquet", index=False)
        tle_table.to_parquet(PROCESSED_DIR / "tle.parquet", index=False)
        cdm_table.to_parquet(PROCESSED_DIR / "conjunction_events.parquet", index=False)
        print("Parquet snapshots also saved.")
    except ImportError:
        print("Note: Install 'pyarrow' or 'fastparquet' to save in Parquet format.")

    print("\nPipeline completed successfully.")
    print(f"Objects: {len(objects_table)} rows")
    print(f"TLEs: {len(tle_table)} rows")
    print(f"CDMs: {len(cdm_table)} rows")


def main() -> None:
    parser = argparse.ArgumentParser(description="Space Oddities Data Pipeline")
    parser.add_argument("--fetch", action="store_true", help="Fetch fresh data from Space-Track")
    args = parser.parse_args()

    run_pipeline(fetch=args.fetch)


if __name__ == "__main__":
    main()
