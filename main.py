"""Entry point for the Space Oddities data pipeline."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.cleaning import clean_ucs_columns
from src.merging import merge_ucs_satcat

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"


def run_pipeline() -> Path:
    """Load raw data, clean UCS metadata, merge with SATCAT, and export master file."""
    ucs_path = RAW / "ucs" / "UCS-Satellite-Database 5-1-2023.xlsx"
    satcat_path = RAW / "celestrak" / "satcat.csv"

    ucs_df = pd.read_excel(ucs_path)
    satcat_df = pd.read_csv(satcat_path)

    ucs_clean = clean_ucs_columns(ucs_df)
    master_df = merge_ucs_satcat(ucs_clean, satcat_df)

    PROCESSED.mkdir(parents=True, exist_ok=True)
    out = PROCESSED / "master_satellites.csv"
    master_df.to_csv(out, index=False)
    return out


def main() -> None:
    output = run_pipeline()
    print(f"Pipeline done. Master file: {output}")


if __name__ == "__main__":
    main()
