"""Data cleaning helpers for UCS and catalog datasets."""

from __future__ import annotations

import re
import unicodedata

import pandas as pd


def normalize_satellite_name(value: str) -> str:
    """Normalize satellite names to improve merge quality."""
    if not isinstance(value, str):
        return ""
    text = unicodedata.normalize("NFKD", value)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.upper().strip()
    text = re.sub(r"[^A-Z0-9 ]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


def clean_ucs_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Standardize UCS column names and create helper merge columns."""
    cleaned = df.copy()
    cleaned.columns = [c.strip().lower().replace(" ", "_") for c in cleaned.columns]

    norad_candidates = [
        "norad_number",
        "norad_id",
        "norad",
        "catalog_number",
    ]
    for col in norad_candidates:
        if col in cleaned.columns:
            cleaned["norad_id"] = pd.to_numeric(cleaned[col], errors="coerce").astype("Int64")
            break

    name_candidates = [
        "current_official_name_of_satellite",
        "name_of_satellite,_alternate_names",
        "satellite_name",
        "name",
    ]
    for col in name_candidates:
        if col in cleaned.columns:
            cleaned["sat_name_norm"] = cleaned[col].map(normalize_satellite_name)
            break

    useful_cols = [
        "norad_id",
        "sat_name_norm",
        "current_official_name_of_satellite",
        "name_of_satellite,_alternate_names",
        "country/org_of_un_registry",
        "purpose",
        "detailed_purpose",
        "country_of_operator/owner",
        "operator/owner",
        "users",
        "class_of_orbit",
        "type_of_orbit",
        "longitude_of_geo_(degrees)",
        "perigee_(km)",
        "apogee_(km)",
        "eccentricity",
        "inclination_(degrees)",
        "period_(minutes)",
        "launch_mass_(kg.)",
        "dry_mass_(kg.)",
        "power_(watts)",
        "expected_lifetime_(yrs.)",
        "contractor",
        "country_of_contractor",
        "date_of_launch",
        "launch_site",
        "launch_vehicle",
        "cospar_number",
        "norad_number",
        "comments",
    ]
    available = [col for col in useful_cols if col in cleaned.columns]
    cleaned = cleaned[available].copy()

    # Cast potential string columns to string to avoid mixed types (e.g. numeric names)
    # This prevents pyarrow conversion errors during parquet export.
    string_cols = [
        "sat_name_norm",
        "current_official_name_of_satellite",
        "name_of_satellite,_alternate_names",
        "country/org_of_un_registry",
        "purpose",
        "detailed_purpose",
        "country_of_operator/owner",
        "operator/owner",
        "users",
        "class_of_orbit",
        "type_of_orbit",
        "contractor",
        "country_of_contractor",
        "launch_site",
        "launch_vehicle",
        "cospar_number",
        "comments",
    ]
    for col in string_cols:
        if col in cleaned.columns:
            cleaned[col] = cleaned[col].astype(str).replace("nan", "").replace("None", "")

    return cleaned
