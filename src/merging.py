"""Join logic for UCS metadata and SATCAT operational records."""

from __future__ import annotations

import pandas as pd

from .cleaning import normalize_satellite_name


def _find_norad_column(df: pd.DataFrame) -> str | None:
    candidates = ["NORAD_CAT_ID", "NORAD", "NORAD_ID", "CATNR"]
    cols_upper = {c.upper(): c for c in df.columns}
    for candidate in candidates:
        if candidate in cols_upper:
            return cols_upper[candidate]
    return None


def merge_ucs_satcat(ucs_df: pd.DataFrame, satcat_df: pd.DataFrame) -> pd.DataFrame:
    """Merge UCS and SATCAT primarily on NORAD ID, then fallback on normalized name."""
    satcat = satcat_df.copy()
    ucs = ucs_df.copy()

    satcat_norad_col = _find_norad_column(satcat)
    if satcat_norad_col:
        satcat["norad_id"] = pd.to_numeric(satcat[satcat_norad_col], errors="coerce").astype("Int64")

    satcat_name_col = None
    for candidate in ["OBJECT_NAME", "SATNAME", "OBJECT"]:
        if candidate in satcat.columns:
            satcat_name_col = candidate
            break

    if satcat_name_col:
        satcat["sat_name_norm"] = satcat[satcat_name_col].map(normalize_satellite_name)

    if "norad_id" in satcat.columns and "norad_id" in ucs.columns:
        merged = ucs.merge(satcat, on="norad_id", how="left", suffixes=("_ucs", "_satcat"))
    elif "sat_name_norm" in satcat.columns and "sat_name_norm" in ucs.columns:
        merged = ucs.merge(satcat, on="sat_name_norm", how="left", suffixes=("_ucs", "_satcat"))
    else:
        merged = ucs.copy()

    return merged
