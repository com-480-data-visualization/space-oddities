"""Orbital propagation helpers using SGP4."""

from __future__ import annotations

from datetime import datetime, timezone

from sgp4.api import Satrec, jday


def propagate_tle(tle_line1: str, tle_line2: str, when_utc: datetime | None = None) -> dict:
    """Propagate a TLE to ECI position/velocity vectors at a target UTC time."""
    when = when_utc or datetime.now(timezone.utc)
    jd, fr = jday(
        when.year,
        when.month,
        when.day,
        when.hour,
        when.minute,
        when.second + when.microsecond / 1_000_000,
    )

    sat = Satrec.twoline2rv(tle_line1, tle_line2)
    err, pos, vel = sat.sgp4(jd, fr)
    if err != 0:
        raise RuntimeError(f"SGP4 propagation error code: {err}")

    return {
        "timestamp_utc": when.isoformat(),
        "position_km": {"x": pos[0], "y": pos[1], "z": pos[2]},
        "velocity_km_s": {"vx": vel[0], "vy": vel[1], "vz": vel[2]},
    }
