"""Join and parsing logic for normalized Space Oddities outputs."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

from .cleaning import normalize_satellite_name


def _find_norad_column(df: pd.DataFrame) -> str | None:
    candidates = ["NORAD_CAT_ID", "NORAD", "NORAD_ID", "CATNR"]
    cols_upper = {c.upper(): c for c in df.columns}
    for candidate in candidates:
        if candidate in cols_upper:
            return cols_upper[candidate]
    return None


def _find_first_existing_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    cols_upper = {c.upper(): c for c in df.columns}
    for candidate in candidates:
        if candidate.upper() in cols_upper:
            return cols_upper[candidate.upper()]
    return None


def _parse_alpha5_norad(raw: str) -> int | None:
    """Parse classic or Alpha-5 NORAD IDs from the 5-char TLE catalog field."""
    token = (raw or "").strip().upper()
    if not token:
        return None
    if token.isdigit():
        return int(token)
    if len(token) != 5:
        return None

    first = token[0]
    tail = token[1:]
    if not tail.isdigit():
        return None

    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    if first not in alphabet:
        return None

    prefix = 10 + alphabet.index(first)
    return prefix * 10000 + int(tail)


def _parse_tle_epoch_to_utc(raw_epoch: str) -> datetime | None:
    """Parse TLE epoch format YYDDD.DDDDDDDD into UTC datetime."""
    token = (raw_epoch or "").strip()
    if len(token) < 5:
        return None

    try:
        year_2 = int(token[:2])
        day_of_year = float(token[2:])
    except ValueError:
        return None

    year = 1900 + year_2 if year_2 >= 57 else 2000 + year_2
    day_start = datetime(year, 1, 1, tzinfo=timezone.utc)
    return day_start + timedelta(days=day_of_year - 1.0)


def build_objects_table(ucs_df: pd.DataFrame, satcat_df: pd.DataFrame) -> pd.DataFrame:
    """Build canonical objects table from UCS + SATCAT with SATCAT as backbone."""
    satcat = satcat_df.copy()
    ucs = ucs_df.copy()

    satcat_norad_col = _find_norad_column(satcat)
    if satcat_norad_col:
        satcat["norad_id"] = pd.to_numeric(satcat[satcat_norad_col], errors="coerce").astype("Int64")

    satcat_name_col = _find_first_existing_column(satcat, ["OBJECT_NAME", "SATNAME", "OBJECT"])
    if satcat_name_col:
        satcat["sat_name_norm"] = satcat[satcat_name_col].map(normalize_satellite_name)

    ucs["__ucs_row_id"] = range(len(ucs))

    merged = satcat.merge(ucs, on="norad_id", how="left", suffixes=("_satcat", "_ucs"))
    sat_name_norm_col = "sat_name_norm"
    if sat_name_norm_col not in merged.columns:
        if "sat_name_norm_satcat" in merged.columns:
            sat_name_norm_col = "sat_name_norm_satcat"
        elif "sat_name_norm_ucs" in merged.columns:
            sat_name_norm_col = "sat_name_norm_ucs"
    merged["match_method"] = "satcat_only"
    merged.loc[merged["__ucs_row_id"].notna(), "match_method"] = "norad_id"

    needs_name_fallback = merged["__ucs_row_id"].isna() & merged[sat_name_norm_col].notna()
    if needs_name_fallback.any() and "sat_name_norm" in ucs.columns:
        ucs_name = ucs.dropna(subset=["sat_name_norm"]).drop_duplicates(subset=["sat_name_norm"]).copy()
        fallback = merged.loc[needs_name_fallback, [sat_name_norm_col]].rename(
            columns={sat_name_norm_col: "sat_name_norm"}
        ).merge(
            ucs_name, on="sat_name_norm", how="left", suffixes=("", "_fb")
        )

        fallback_index = merged.loc[needs_name_fallback].index
        for col in ucs.columns:
            if col == "sat_name_norm":
                continue
            fb_col = col
            if fb_col not in fallback.columns:
                continue
            target_col = col
            fill_mask = merged.loc[fallback_index, target_col].isna().to_numpy()
            merged.loc[fallback_index[fill_mask], target_col] = fallback[fb_col].to_numpy()[fill_mask]

        fallback_method = fallback["__ucs_row_id"].notna().map({True: "sat_name_norm", False: "satcat_only"})
        merged.loc[fallback_index, "match_method"] = fallback_method.to_numpy()

    object_name_col = satcat_name_col or _find_first_existing_column(ucs, [
        "current_official_name_of_satellite",
        "name_of_satellite,_alternate_names",
    ])
    if object_name_col and object_name_col in merged.columns:
        merged["object_name"] = merged[object_name_col]
    elif satcat_name_col and f"{satcat_name_col}_satcat" in merged.columns:
        merged["object_name"] = merged[f"{satcat_name_col}_satcat"]

    if "norad_id" not in merged.columns:
        fallback_norad_col = _find_first_existing_column(merged, ["NORAD_CAT_ID", "NORAD", "NORAD_ID", "CATNR"])
        if fallback_norad_col:
            merged["norad_id"] = pd.to_numeric(merged[fallback_norad_col], errors="coerce").astype("Int64")

    merged["is_ucs_matched"] = merged["__ucs_row_id"].notna()

    # --- Infer Object Status ---
    def infer_status(row):
        if pd.notna(row.get("DECAY_DATE")) or pd.notna(row.get("decay_date")):
            return "DECAYED"
        obj_type = str(row.get("OBJECT_TYPE", "")).upper()
        if obj_type in ["DEB", "DEBRIS", "R/B", "ROCKET BODY"]:
            return "DEBRIS"
        if row["is_ucs_matched"]:
            return "ACTIVE"
        ops_status = str(row.get("OPS_STATUS_CODE", "")).upper()
        if ops_status in ["+", "P", "B"]:
            return "ACTIVE"
        if ops_status in ["-", "D"]:
            return "INACTIVE"
        return "UNKNOWN"

    merged["object_status"] = merged.apply(infer_status, axis=1)
    merged = merged.drop(columns=["__ucs_row_id"], errors="ignore")

    leading_cols = ["norad_id", "object_name", "object_status", "match_method", "is_ucs_matched"]
    ordered = [col for col in leading_cols if col in merged.columns]
    trailing = [col for col in merged.columns if col not in ordered]
    return merged[ordered + trailing]


def parse_tle_gp_elements(tle_path: Path | str) -> pd.DataFrame:
    """Parse a Space-Track 3LE file into a normalized TLE/GP elements table."""
    path = Path(tle_path)
    # Detect if JSON or 3LE text
    content = path.read_text(encoding="utf-8", errors="ignore")
    if content.strip().startswith("["):
        return parse_gp_json(tle_path)

    lines = content.splitlines()
    rows: list[dict] = []
    i = 0
    while i < len(lines):
        line0 = lines[i].rstrip("\n")
        if not line0.startswith("0 "):
            i += 1
            continue

        if i + 2 >= len(lines):
            break

        line1 = lines[i + 1].rstrip("\n")
        line2 = lines[i + 2].rstrip("\n")
        if not (line1.startswith("1 ") and line2.startswith("2 ")):
            i += 1
            continue

        norad_id = _parse_alpha5_norad(line1[2:7])
        epoch_utc = _parse_tle_epoch_to_utc(line1[18:32])

        def _to_float(segment: str) -> float | None:
            try:
                return float(segment.strip())
            except ValueError:
                return None

        eccentricity_raw = line2[26:33].strip()
        eccentricity = _to_float(f"0.{eccentricity_raw}") if eccentricity_raw.isdigit() else None

        rows.append(
            {
                "norad_id": pd.NA if norad_id is None else norad_id,
                "tle_name": line0[2:].strip(),
                "element_epoch_utc": None if epoch_utc is None else epoch_utc.isoformat(),
                "tle_line1": line1,
                "tle_line2": line2,
                "inclination_deg": _to_float(line2[8:16]),
                "raan_deg": _to_float(line2[17:25]),
                "eccentricity": eccentricity,
                "arg_perigee_deg": _to_float(line2[34:42]),
                "mean_anomaly_deg": _to_float(line2[43:51]),
                "mean_motion_rev_day": _to_float(line2[52:63]),
                "rev_number_at_epoch": _to_float(line2[63:68]),
            }
        )
        i += 3

    tle_df = pd.DataFrame(rows)
    if not tle_df.empty:
        tle_df["norad_id"] = pd.to_numeric(tle_df["norad_id"], errors="coerce").astype("Int64")
    return tle_df


def parse_gp_json(gp_path: Path | str) -> pd.DataFrame:
    """Parse Space-Track GP JSON results into a normalized TLE/GP table."""
    path = Path(gp_path)
    records = json.loads(path.read_text(encoding="utf-8"))
    df = pd.DataFrame(records)

    if df.empty:
        return pd.DataFrame()

    out = pd.DataFrame()
    out["norad_id"] = pd.to_numeric(df["NORAD_CAT_ID"], errors="coerce").astype("Int64")
    out["tle_name"] = df.get("OBJECT_NAME")
    out["element_epoch_utc"] = df.get("EPOCH")
    out["tle_line1"] = df.get("TLE_LINE1")
    out["tle_line2"] = df.get("TLE_LINE2")
    out["inclination_deg"] = pd.to_numeric(df.get("INCLINATION"), errors="coerce")
    out["raan_deg"] = pd.to_numeric(df.get("RA_OF_ASC_NODE"), errors="coerce")
    out["eccentricity"] = pd.to_numeric(df.get("ECCENTRICITY"), errors="coerce")
    out["arg_perigee_deg"] = pd.to_numeric(df.get("ARG_OF_PERICENTER"), errors="coerce")
    out["mean_anomaly_deg"] = pd.to_numeric(df.get("MEAN_ANOMALY"), errors="coerce")
    out["mean_motion_rev_day"] = pd.to_numeric(df.get("MEAN_MOTION"), errors="coerce")
    out["rev_number_at_epoch"] = pd.to_numeric(df.get("REV_AT_EPOCH"), errors="coerce")

    return out


def build_conjunction_events(cdm_path: Path | str) -> pd.DataFrame:
    """Build conjunction events keeping one row per CDM_ID."""
    path = Path(cdm_path)
    records = json.loads(path.read_text(encoding="utf-8"))
    cdm = pd.json_normalize(records)

    if cdm.empty:
        return pd.DataFrame(
            columns=[
                "cdm_id",
                "created_utc",
                "tca_utc",
                "min_rng_m",
                "pc",
                "emergency_reportable",
                "norad_id_1",
                "norad_id_2",
            ]
        )

    sat_1_series = cdm["SAT_1_ID"] if "SAT_1_ID" in cdm.columns else pd.Series(index=cdm.index, dtype="object")
    sat_2_series = cdm["SAT_2_ID"] if "SAT_2_ID" in cdm.columns else pd.Series(index=cdm.index, dtype="object")
    tca_series = cdm["TCA"] if "TCA" in cdm.columns else pd.Series(index=cdm.index, dtype="object")
    created_series = cdm["CREATED"] if "CREATED" in cdm.columns else pd.Series(index=cdm.index, dtype="object")

    cdm["norad_id_1"] = pd.to_numeric(sat_1_series, errors="coerce").astype("Int64")
    cdm["norad_id_2"] = pd.to_numeric(sat_2_series, errors="coerce").astype("Int64")

    cdm["tca_utc"] = pd.to_datetime(tca_series, errors="coerce", utc=True)
    cdm["created_utc"] = pd.to_datetime(created_series, errors="coerce", utc=True)

    cdm = cdm.sort_values("created_utc")
    if "CDM_ID" in cdm.columns:
        canonical = cdm.drop_duplicates(subset=["CDM_ID"], keep="first").copy()
    else:
        canonical = cdm.copy()

    out = pd.DataFrame(
        {
            "cdm_id": canonical.get("CDM_ID"),
            "created_utc": canonical["created_utc"].dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "tca_utc": canonical["tca_utc"].dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "min_rng_m": pd.to_numeric(
                canonical["MIN_RNG"] if "MIN_RNG" in canonical.columns else pd.Series(index=canonical.index, dtype="object"),
                errors="coerce",
            ),
            "pc": pd.to_numeric(
                canonical["PC"] if "PC" in canonical.columns else pd.Series(index=canonical.index, dtype="object"),
                errors="coerce",
            ),
            "emergency_reportable": canonical.get("EMERGENCY_REPORTABLE"),
            "norad_id_1": pd.to_numeric(canonical["norad_id_1"], errors="coerce").astype("Int64"),
            "norad_id_2": pd.to_numeric(canonical["norad_id_2"], errors="coerce").astype("Int64"),
        }
    )
    return out


def merge_ucs_satcat(ucs_df: pd.DataFrame, satcat_df: pd.DataFrame) -> pd.DataFrame:
    """Backward-compatible alias that now returns the canonical objects table."""
    return build_objects_table(ucs_df, satcat_df)
