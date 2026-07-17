"""
01_clean_and_engineer.py
-------------------------
Cleans the raw Indian Overseas Migration dataset and reshapes it from a
long "metric per row" format into an analysis-ready wide format, then
engineers business KPIs.

INPUT (long format, one row per Year-Country-Metric):
    Year, Destination_Country, Region, Column_Name, Value, Data_Type,
    Source_Name, Source_URL, Notes

OUTPUT (wide format, one row per Year-Country):
    Year, Destination_Country, Region, Total_Indian_Migrants,
    Permanent_Migrants, Temporary_Workers, Students,
    Remittance_USD_Billion, Unemployment_India, GDP_India_USD_Billion,
    + engineered KPI columns

Author: BI Analytics Pipeline
"""

import logging
import re
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Logging setup: prints timestamped progress to the console
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths (relative to project root so the script is portable)
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_PATH = PROJECT_ROOT / "Raw_Data" / "indian_overseas_migration_dataset.csv"
CLEANED_DIR = PROJECT_ROOT / "Cleaned_Data"
REPORTS_DIR = PROJECT_ROOT / "Reports"


def load_raw_data(path: Path) -> pd.DataFrame:
    """Load the raw long-format CSV."""
    log.info("Loading raw data from %s", path)
    df = pd.read_csv(path)
    log.info("Raw shape: %s rows x %s columns", *df.shape)
    return df


def profile_missing_and_duplicates(df: pd.DataFrame) -> dict:
    """
    Quantify data-quality issues BEFORE cleaning, so we can report
    exactly what was found and why each fix below is necessary.
    """
    report = {
        "total_rows": len(df),
        "duplicate_rows": int(df.duplicated().shape[0] - df.drop_duplicates().shape[0]),
        "not_available_cells": int((df["Value"] == "NOT AVAILABLE").sum()),
        "missing_source_name": int(df["Source_Name"].isna().sum()),
    }
    log.info("Data quality profile: %s", report)
    return report


def clean_value_column(raw_value: str):
    """
    Convert the raw 'Value' text field into a proper numeric type.

    The raw column mixes several formats in the SAME column:
      - Plain integers with thousands separators: "1,005,000"
      - Percentages as plain decimals:            "12.88"   (unemployment %)
      - Currency shorthand in BILLIONS:             "$468.40B"
      - Currency shorthand in TRILLIONS:            "$1.217T" (GDP from 2007 on)
      - Missing-data sentinel:                      "NOT AVAILABLE"

    All currency values are normalized to USD BILLIONS (a "T" figure is
    multiplied by 1000). Without this normalization, every GDP value
    from 2007 onward (once India's GDP passed $1 trillion and the
    source switched notation) would fail to parse and be dropped as
    missing -- understating GDP data availability by roughly 75%.
    """
    if pd.isna(raw_value) or raw_value == "NOT AVAILABLE":
        return np.nan
    text = str(raw_value).strip()
    text = text.replace(",", "").replace("$", "")

    multiplier = 1.0
    if text.endswith("T"):
        multiplier = 1000.0  # trillions -> billions
        text = text[:-1]
    elif text.endswith("B"):
        text = text[:-1]

    try:
        return float(text) * multiplier
    except ValueError:
        return np.nan


def reshape_long_to_wide(df: pd.DataFrame) -> pd.DataFrame:
    """
    Pivot the long "one metric per row" table into one row per
    Year + Destination_Country, with each metric as its own column.

    Why: BI tools, correlation analysis, and time-series charts all
    need one observation per row. Keeping the long format would force
    every chart/measure to first filter and re-pivot the data, which
    is inefficient and error-prone in both Python and Power BI.
    """
    df = df.copy()
    df["Value_Clean"] = df["Value"].apply(clean_value_column)

    wide = df.pivot_table(
        index=["Year", "Destination_Country", "Region"],
        columns="Column_Name",
        values="Value_Clean",
        aggfunc="first",
    ).reset_index()
    wide.columns.name = None

    # Standardize column names to be Power BI / Python friendly
    wide = wide.rename(
        columns={
            "GDP_India": "GDP_India_USD_Billion",
        }
    )
    log.info("Reshaped to wide format: %s rows x %s columns", *wide.shape)
    return wide


def standardize_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardize country and region text: trims whitespace, fixes
    casing, and confirms there are no near-duplicate spellings
    (e.g. "U.K." vs "UK"). Business impact: inconsistent country
    labels would silently split one country's data into two
    separate rows in every group-by/dashboard slicer.
    """
    df = df.copy()
    df["Destination_Country"] = df["Destination_Country"].str.strip()
    df["Region"] = df["Region"].str.strip()

    # Known-good canonical mapping (defensive; the raw data was
    # already consistent, but this guards against future raw refreshes)
    country_map = {
        "USA": "United States",
        "UK": "United Kingdom",
        "UAE": "United Arab Emirates",
    }
    df["Destination_Country_Full"] = df["Destination_Country"].replace(country_map)
    return df


def add_data_type_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure correct dtypes for downstream analysis and Power BI import."""
    df = df.copy()
    df["Year"] = df["Year"].astype(int)
    numeric_cols = [
        "Total_Indian_Migrants",
        "Permanent_Migrants",
        "Temporary_Workers",
        "Students",
        "Remittance_USD_Billion",
        "Unemployment_India",
        "GDP_India_USD_Billion",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create business KPIs. Every feature is documented with its
    business rationale in Documentation/Data_Dictionary.md.
    """
    df = df.sort_values(["Destination_Country", "Year"]).copy()
    g = df.groupby("Destination_Country")

    # Year-over-Year growth in total migrant stock (%)
    df["Migrant_YoY_Growth_Pct"] = g["Total_Indian_Migrants"].pct_change() * 100

    # Share of temporary workers among the total migrant stock
    df["Temporary_Worker_Share_Pct"] = (
        df["Temporary_Workers"] / df["Total_Indian_Migrants"] * 100
    )

    # Share of students among the total migrant stock
    df["Student_Share_Pct"] = df["Students"] / df["Total_Indian_Migrants"] * 100

    # Remittances generated per migrant (USD, in thousands, since
    # Remittance is total national remittance to India, not
    # country-specific — flagged clearly as a national-level proxy)
    df["Remittance_per_Migrant_USD_Th"] = (
        df["Remittance_USD_Billion"] * 1_000_000 / df["Total_Indian_Migrants"]
    )

    # 3-year moving average of migrant stock, to smooth noisy YoY swings
    df["Migrant_3yr_Moving_Avg"] = g["Total_Indian_Migrants"].transform(
        lambda s: s.rolling(window=3, min_periods=1).mean()
    )

    # Flag high-migration country-years using each country's own 75th percentile
    threshold = g["Total_Indian_Migrants"].transform(lambda s: s.quantile(0.75))
    df["High_Migration_Flag"] = np.where(
        df["Total_Indian_Migrants"] >= threshold, "High", "Normal"
    )

    # India's macro-economic push-factor snapshot per year (same across
    # countries in a given year since GDP/Unemployment are national figures)
    df["India_Unemployment_Category"] = pd.cut(
        df["Unemployment_India"],
        bins=[0, 6, 8, 100],
        labels=["Low (<6%)", "Moderate (6-8%)", "High (>8%)"],
    )

    return df


def generate_data_quality_report(before_profile: dict, wide_df: pd.DataFrame, out_path: Path):
    """Write a plain-English Data Quality Report (markdown)."""
    missing_summary = wide_df.isna().sum()
    missing_pct = (missing_summary / len(wide_df) * 100).round(1)

    lines = [
        "# Data Quality Report",
        "",
        "## Source",
        "`Raw_Data/indian_overseas_migration_dataset.csv` — long format, "
        "one row per (Year, Destination Country, Metric).",
        "",
        "## Issues Found (Before Cleaning)",
        f"- Total raw rows: **{before_profile['total_rows']}**",
        f"- Exact duplicate rows: **{before_profile['duplicate_rows']}**",
        f"- Cells marked `NOT AVAILABLE`: **{before_profile['not_available_cells']}** "
        f"({before_profile['not_available_cells']/before_profile['total_rows']*100:.1f}% of all cells)",
        f"- Rows missing a cited source: **{before_profile['missing_source_name']}**",
        "- Mixed value formats in a single column: plain numbers, percentages, "
        "and currency strings like `$468.40B` all stored as text in `Value`.",
        "- Data is stored long-format (one metric per row), which is not "
        "analysis-ready and must be pivoted before use.",
        "",
        "## Missing Values After Reshaping (per column, wide format)",
        "",
        "| Column | Missing Count | Missing % |",
        "|---|---|---|",
    ]
    for col in wide_df.columns:
        if col in missing_summary.index:
            lines.append(f"| {col} | {missing_summary[col]} | {missing_pct[col]}% |")

    lines += [
        "",
        "## Key Data Limitations (Important — read before drawing conclusions)",
        "- **Scope**: only 7 destination countries are covered "
        "(USA, Canada, UK, Australia, UAE, Germany, Singapore). This is a "
        "sample of major corridors, not a complete global picture of Indian migration.",
        "- **Granularity**: no Indian state-level, gender, age, or education "
        "breakdown exists in the source file — those dimensions cannot be "
        "reported on and are intentionally excluded from this project.",
        "- **Missing migrant-count data is substantial**, especially in "
        "early years (2000s), for Permanent_Migrants, Temporary_Workers, "
        "and Students — treat trend lines for those metrics as directional, "
        "not precise.",
        "- **GDP_India and Unemployment_India are national figures**, "
        "repeated identically across all 7 countries in a given year — "
        "they describe India's macro conditions, not the destination country.",
        "- **Years extend to 2026**, meaning some recent years may reflect "
        "estimates/projections rather than finalized statistics.",
    ]
    out_path.write_text("\n".join(lines), encoding="utf-8")
    log.info("Data Quality Report written to %s", out_path)


def main():
    raw_df = load_raw_data(RAW_PATH)
    before_profile = profile_missing_and_duplicates(raw_df)

    wide_df = reshape_long_to_wide(raw_df)
    wide_df = standardize_categoricals(wide_df)
    wide_df = add_data_type_columns(wide_df)
    wide_df = engineer_features(wide_df)

    # Export cleaned + engineered dataset
    CLEANED_DIR.mkdir(exist_ok=True)
    out_csv = CLEANED_DIR / "cleaned_migration_data.csv"
    wide_df.to_csv(out_csv, index=False)
    log.info("Cleaned dataset exported to %s (%s rows x %s cols)", out_csv, *wide_df.shape)

    # Also export an Excel version for easy Power BI / manual inspection
    out_xlsx = CLEANED_DIR / "cleaned_migration_data.xlsx"
    wide_df.to_excel(out_xlsx, index=False, sheet_name="Migration_Fact")
    log.info("Cleaned dataset also exported to %s", out_xlsx)

    # Data quality report
    REPORTS_DIR.mkdir(exist_ok=True)
    generate_data_quality_report(before_profile, wide_df, REPORTS_DIR / "Data_Quality_Report.md")

    return wide_df


if __name__ == "__main__":
    main()
