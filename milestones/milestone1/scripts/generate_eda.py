"""
EDA figure generation for Space Oddities - Milestone 1
Generates 3 publication-quality figures saved to Images/
"""

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
from pathlib import Path

IMAGES_DIR = Path(__file__).parent.parent / "Images"
DATA_DIR = Path(__file__).parent.parent / "data"

plt.rcParams.update({
    "font.family": "serif",
    "font.size": 10,
    "axes.titlesize": 11,
    "axes.labelsize": 10,
    "figure.dpi": 150,
})

DARK_BG = "#0d1117"
ACCENT = "#58a6ff"
ACCENT2 = "#f78166"
ACCENT3 = "#3fb950"
TEXT_COLOR = "#e6edf3"
GRID_COLOR = "#21262d"


# ── Figure 1: Satellites launched per year ───────────────────────────────────
def fig_launches_per_year():
    ucs_path = DATA_DIR / "ucs" / "UCS-Satellite-Database 5-1-2023.xlsx"
    df = pd.read_excel(ucs_path)

    # Find launch date column
    date_col = next(c for c in df.columns if "date of launch" in c.lower() or "launch date" in c.lower())
    df["year"] = pd.to_datetime(df[date_col], errors="coerce").dt.year
    counts = df.dropna(subset=["year"]).groupby("year").size()
    counts = counts[counts.index >= 1957]

    fig, ax = plt.subplots(figsize=(7, 3.5), facecolor=DARK_BG)
    ax.set_facecolor(DARK_BG)

    colors = [ACCENT2 if y >= 2019 else ACCENT for y in counts.index]
    bars = ax.bar(counts.index, counts.values, color=colors, width=0.8, linewidth=0)

    # Annotation for Starlink era
    ax.axvline(2019, color=ACCENT2, linewidth=1, linestyle="--", alpha=0.7)
    ax.text(2019.3, counts.max() * 0.92, "Starlink era\n(2019–)", color=ACCENT2,
            fontsize=8, va="top")

    ax.set_xlabel("Year", color=TEXT_COLOR)
    ax.set_ylabel("Satellites Launched", color=TEXT_COLOR)
    ax.set_title("Active Satellite Launches per Year (UCS, 1957–2023)", color=TEXT_COLOR, pad=10)
    ax.tick_params(colors=TEXT_COLOR)
    ax.spines[:].set_visible(False)
    ax.yaxis.grid(True, color=GRID_COLOR, linewidth=0.5)
    ax.set_axisbelow(True)

    # Legend proxy
    from matplotlib.patches import Patch
    legend = ax.legend(
        handles=[Patch(color=ACCENT, label="Pre-2019"), Patch(color=ACCENT2, label="2019–2023")],
        framealpha=0, labelcolor=TEXT_COLOR, fontsize=8
    )

    fig.tight_layout()
    out = IMAGES_DIR / "fig_launches_per_year.pdf"
    fig.savefig(out, bbox_inches="tight", facecolor=DARK_BG)
    print(f"Saved: {out}")
    plt.close(fig)


# ── Figure 2: Orbit class distribution ───────────────────────────────────────
def fig_orbit_class():
    ucs_path = DATA_DIR / "ucs" / "UCS-Satellite-Database 5-1-2023.xlsx"
    df = pd.read_excel(ucs_path)

    orbit_col = next(c for c in df.columns if "class of orbit" in c.lower())
    counts = df[orbit_col].value_counts()

    fig, ax = plt.subplots(figsize=(5, 3.5), facecolor=DARK_BG)
    ax.set_facecolor(DARK_BG)

    palette = [ACCENT, ACCENT2, ACCENT3, "#d2a8ff", "#ffa657"]
    wedges, texts, autotexts = ax.pie(
        counts.values,
        labels=counts.index,
        autopct="%1.1f%%",
        colors=palette[:len(counts)],
        startangle=140,
        wedgeprops={"linewidth": 1.5, "edgecolor": DARK_BG},
        textprops={"color": TEXT_COLOR},
    )
    for at in autotexts:
        at.set_fontsize(8)
        at.set_color(DARK_BG)

    ax.set_title(f"Orbit Class Distribution\n({len(df):,} active satellites, UCS 2023)",
                 color=TEXT_COLOR, pad=12)

    fig.tight_layout()
    out = IMAGES_DIR / "fig_orbit_class.pdf"
    fig.savefig(out, bbox_inches="tight", facecolor=DARK_BG)
    print(f"Saved: {out}")
    plt.close(fig)


# ── Figure 3: All tracked objects breakdown (SATCAT) ────────────────────────
def fig_objects_breakdown():
    satcat_path = DATA_DIR / "celestrak" / "satcat.csv"
    df = pd.read_csv(satcat_path)

    type_map = {"DEB": "Debris", "PAY": "Payload", "R/B": "Rocket Body", "UNK": "Unknown"}
    df["Type"] = df["OBJECT_TYPE"].map(type_map).fillna("Unknown")
    counts = df["Type"].value_counts().reindex(["Debris", "Payload", "Rocket Body", "Unknown"])

    fig, ax = plt.subplots(figsize=(5, 3.5), facecolor=DARK_BG)
    ax.set_facecolor(DARK_BG)

    colors = [ACCENT2, ACCENT, ACCENT3, "#d2a8ff"]
    bars = ax.barh(counts.index, counts.values, color=colors, height=0.55)

    for bar, val in zip(bars, counts.values):
        ax.text(val + 300, bar.get_y() + bar.get_height() / 2,
                f"{val:,}", va="center", color=TEXT_COLOR, fontsize=9)

    ax.set_xlabel("Number of Objects", color=TEXT_COLOR)
    ax.set_title(f"All Tracked Objects by Type\n(CelesTrak SATCAT, {len(df):,} total)",
                 color=TEXT_COLOR, pad=10)
    ax.tick_params(colors=TEXT_COLOR)
    ax.spines[:].set_visible(False)
    ax.xaxis.grid(True, color=GRID_COLOR, linewidth=0.5)
    ax.set_axisbelow(True)
    ax.set_xlim(0, counts.max() * 1.18)

    fig.tight_layout()
    out = IMAGES_DIR / "fig_objects_breakdown.pdf"
    fig.savefig(out, bbox_inches="tight", facecolor=DARK_BG)
    print(f"Saved: {out}")
    plt.close(fig)


if __name__ == "__main__":
    IMAGES_DIR.mkdir(exist_ok=True)
    fig_launches_per_year()
    fig_orbit_class()
    fig_objects_breakdown()
    print("All figures generated.")
