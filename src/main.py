"""Entry point for the Space Oddities data pipeline."""

from __future__ import annotations

import argparse
from src.pipeline import run_pipeline

def main() -> None:
    parser = argparse.ArgumentParser(description="Space Oddities Data Pipeline")
    parser.add_argument("--fetch", action="store_true", help="Fetch fresh data from Space-Track (requires .env credentials)")
    args = parser.parse_args()

    print("--- Space Oddities Data Pipeline ---")
    try:
        run_pipeline(fetch=args.fetch)
    except Exception as e:
        print(f"\nPipeline failed: {e}")
        print("\nTip: Ensure your .env file has SPACETRACK_USER and SPACETRACK_PASS if using --fetch.")
        print("Otherwise, ensure your raw data is placed in 'data/raw/spacetrack/'.")

if __name__ == "__main__":
    main()
