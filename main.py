"""Entry point for the Space Oddities data pipeline."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from src.cleaning import clean_ucs_columns
from src.merging import build_conjunction_events, build_objects_table, parse_tle_gp_elements

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"


def _require_files(paths: list[Path]) -> None:
    missing = [str(path) for path in paths if not path.exists()]
    if missing:
        joined = "\n".join(f" - {item}" for item in missing)
        raise FileNotFoundError(f"Missing required input files:\n{joined}")


def run_pipeline() -> dict[str, Path]:
    """Build normalized outputs: objects, TLE/GP elements, and conjunction events."""
    ucs_path = RAW / "ucs" / "UCS-Satellite-Database 5-1-2023.xlsx"
    satcat_path = RAW / "celestrak" / "satcat.csv"
    tle_path = RAW / "spacetrack" / "3le.txt"
    cdm_path = RAW / "spacetrack" / "cdm_latest.json"

    _require_files([ucs_path, satcat_path, tle_path, cdm_path])

    ucs_df = pd.read_excel(ucs_path)
    satcat_df = pd.read_csv(satcat_path)

    ucs_clean = clean_ucs_columns(ucs_df)
    objects_df = build_objects_table(ucs_clean, satcat_df)
    tle_gp_df = parse_tle_gp_elements(tle_path)
    conjunctions_df = build_conjunction_events(cdm_path)

    PROCESSED.mkdir(parents=True, exist_ok=True)
    objects_out = PROCESSED / "objects.csv"
    tle_out = PROCESSED / "tle.csv"
    conjunctions_out = PROCESSED / "conjunction_events.csv"
    diagnostics_out = PROCESSED / "merge_diagnostics.json"

    objects_df.to_csv(objects_out, index=False)
    tle_gp_df.to_csv(tle_out, index=False)
    conjunctions_df.to_csv(conjunctions_out, index=False)

    diagnostics = {
        "objects_rows": int(len(objects_df)),
        "objects_ucs_matched_rows": int(objects_df.get("is_ucs_matched", pd.Series(dtype="boolean")).fillna(False).sum()),
        "tle_rows": int(len(tle_gp_df)),
        "conjunction_rows": int(len(conjunctions_df)),
    }
    diagnostics_out.write_text(json.dumps(diagnostics, indent=2), encoding="utf-8")

    return {
        "objects": objects_out,
        "tle": tle_out,
        "conjunction_events": conjunctions_out,
        "diagnostics": diagnostics_out,
    }


def main() -> None:
    outputs = run_pipeline()
    print("Pipeline done. Generated files:")
    for label, path in outputs.items():
        print(f" - {label}: {path}")


if __name__ == "__main__":
    main()
