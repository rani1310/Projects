"""
02_eda_and_charts.py
----------------------
Exploratory Data Analysis on the cleaned Indian Overseas Migration
dataset. Generates summary statistics and PNG charts for the report.

Note on scope: Total_Indian_Migrants, Permanent_Migrants,
Temporary_Workers, and Students were only recorded for benchmark years
(2000, 2005/2010, 2015, 2020, 2024) in the source data, so charts using
those fields plot benchmark points rather than a continuous annual
series. GDP_India and Unemployment_India ARE available annually
(2000-2024) and support full time-series analysis.

Author: BI Analytics Pipeline
"""

import logging
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # headless rendering, no display needed
import matplotlib.pyplot as plt
import pandas as pd

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s", datefmt="%H:%M:%S"
)
log = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CLEANED_PATH = PROJECT_ROOT / "Cleaned_Data" / "cleaned_migration_data.csv"
IMAGES_DIR = PROJECT_ROOT / "Images"
REPORTS_DIR = PROJECT_ROOT / "Reports"

# Consistent color palette per country for cross-chart readability
COUNTRY_COLORS = {
    "USA": "#1f77b4",
    "Canada": "#ff7f0e",
    "UK": "#2ca02c",
    "Australia": "#d62728",
    "UAE": "#9467bd",
    "Germany": "#8c564b",
    "Singapore": "#e377c2",
}


def load_cleaned_data() -> pd.DataFrame:
    df = pd.read_csv(CLEANED_PATH)
    log.info("Loaded cleaned data: %s rows x %s cols", *df.shape)
    return df


def chart_total_migrants_by_country(df: pd.DataFrame):
    """Bar chart: total migrant stock by country, most recent benchmark year available (2024)."""
    latest = df[df["Total_Indian_Migrants"].notna()]
    latest_year = latest.groupby("Destination_Country")["Year"].transform("max")
    latest = latest[latest["Year"] == latest_year].sort_values(
        "Total_Indian_Migrants", ascending=True
    )

    fig, ax = plt.subplots(figsize=(9, 5.5))
    colors = [COUNTRY_COLORS.get(c, "#888") for c in latest["Destination_Country"]]
    ax.barh(latest["Destination_Country"], latest["Total_Indian_Migrants"], color=colors)
    ax.set_xlabel("Total Indian Migrant Stock")
    ax.set_title("Indian Migrant Stock by Destination Country (Latest Available Year)")
    for i, (val, yr) in enumerate(zip(latest["Total_Indian_Migrants"], latest["Year"])):
        ax.text(val, i, f"  {val:,.0f}  ({int(yr)})", va="center", fontsize=8)
    plt.tight_layout()
    fig.savefig(IMAGES_DIR / "01_total_migrants_by_country.png", dpi=150)
    plt.close(fig)


def chart_gdp_vs_unemployment_trend(df: pd.DataFrame):
    """Dual-axis line chart: India's GDP and unemployment trend, 2000-2024."""
    trend = df[["Year", "GDP_India_USD_Billion", "Unemployment_India"]].drop_duplicates("Year").sort_values("Year")
    trend = trend.dropna()

    fig, ax1 = plt.subplots(figsize=(10, 5.5))
    ax1.plot(trend["Year"], trend["GDP_India_USD_Billion"], color="#1f77b4", marker="o", markersize=3)
    ax1.set_ylabel("India GDP (USD Billion)", color="#1f77b4")
    ax1.tick_params(axis="y", labelcolor="#1f77b4")
    ax1.set_xlabel("Year")

    ax2 = ax1.twinx()
    ax2.plot(trend["Year"], trend["Unemployment_India"], color="#d62728", marker="s", markersize=3)
    ax2.set_ylabel("India Unemployment Rate (%)", color="#d62728")
    ax2.tick_params(axis="y", labelcolor="#d62728")

    ax1.set_title("India's GDP Growth vs. Unemployment Rate (2000-2024)")
    plt.tight_layout()
    fig.savefig(IMAGES_DIR / "02_gdp_vs_unemployment_trend.png", dpi=150)
    plt.close(fig)


def chart_remittances_trend(df: pd.DataFrame):
    """Line chart: India's total remittances over time."""
    trend = df[["Year", "Remittance_USD_Billion"]].drop_duplicates("Year").dropna().sort_values("Year")

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(trend["Year"], trend["Remittance_USD_Billion"], color="#2ca02c", marker="o", markersize=3)
    ax.fill_between(trend["Year"], trend["Remittance_USD_Billion"], color="#2ca02c", alpha=0.1)
    ax.set_xlabel("Year")
    ax.set_ylabel("Remittances to India (USD Billion)")
    ax.set_title("India's Inbound Remittances, 2000-2024")
    plt.tight_layout()
    fig.savefig(IMAGES_DIR / "03_remittances_trend.png", dpi=150)
    plt.close(fig)


def chart_migration_by_region(df: pd.DataFrame):
    """Grouped bar: total migrant stock summed by region, across available benchmark years."""
    subset = df[df["Total_Indian_Migrants"].notna()]
    by_region_year = (
        subset.groupby(["Year", "Region"])["Total_Indian_Migrants"].sum().unstack(fill_value=0)
    )

    fig, ax = plt.subplots(figsize=(10, 5.5))
    by_region_year.plot(kind="bar", stacked=True, ax=ax, colormap="tab10")
    ax.set_xlabel("Year")
    ax.set_ylabel("Total Indian Migrants")
    ax.set_title("Indian Migrant Stock by Region, Benchmark Years")
    ax.legend(title="Region", bbox_to_anchor=(1.02, 1), loc="upper left")
    plt.tight_layout()
    fig.savefig(IMAGES_DIR / "04_migration_by_region.png", dpi=150)
    plt.close(fig)


def chart_temp_worker_vs_student_share(df: pd.DataFrame):
    """Scatter: temporary worker share vs student share, by country (most recent year with data)."""
    subset = df.dropna(subset=["Temporary_Worker_Share_Pct", "Student_Share_Pct"])

    fig, ax = plt.subplots(figsize=(8.5, 6))
    for country, grp in subset.groupby("Destination_Country"):
        ax.scatter(
            grp["Temporary_Worker_Share_Pct"],
            grp["Student_Share_Pct"],
            label=country,
            color=COUNTRY_COLORS.get(country, "#888"),
            s=70,
        )
    ax.set_xlabel("Temporary Worker Share of Migrant Stock (%)")
    ax.set_ylabel("Student Share of Migrant Stock (%)")
    ax.set_title("Migration Composition: Workers vs. Students by Country")
    ax.legend(fontsize=8, loc="best")
    plt.tight_layout()
    fig.savefig(IMAGES_DIR / "05_worker_vs_student_composition.png", dpi=150)
    plt.close(fig)


def chart_correlation_heatmap(df: pd.DataFrame):
    """Correlation heatmap across the core numeric KPIs (annual India-level series)."""
    cols = ["GDP_India_USD_Billion", "Unemployment_India", "Remittance_USD_Billion"]
    corr = df[["Year"] + cols].drop_duplicates("Year")[cols].corr()

    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(len(cols)))
    ax.set_yticks(range(len(cols)))
    ax.set_xticklabels(cols, rotation=45, ha="right", fontsize=8)
    ax.set_yticklabels(cols, fontsize=8)
    for i in range(len(cols)):
        for j in range(len(cols)):
            ax.text(j, i, f"{corr.iloc[i, j]:.2f}", ha="center", va="center", fontsize=9)
    ax.set_title("Correlation: India Macro Indicators (2000-2024)")
    fig.colorbar(im, ax=ax, shrink=0.8)
    plt.tight_layout()
    fig.savefig(IMAGES_DIR / "06_correlation_heatmap.png", dpi=150)
    plt.close(fig)


def summary_statistics(df: pd.DataFrame) -> pd.DataFrame:
    """Numeric summary statistics table, exported for the insights report."""
    numeric_cols = [
        "Total_Indian_Migrants",
        "Permanent_Migrants",
        "Temporary_Workers",
        "Students",
        "Remittance_USD_Billion",
        "Unemployment_India",
        "GDP_India_USD_Billion",
    ]
    stats = df[numeric_cols].describe().T
    stats.to_csv(REPORTS_DIR / "Summary_Statistics.csv")
    log.info("Summary statistics exported.")
    return stats


def main():
    IMAGES_DIR.mkdir(exist_ok=True)
    df = load_cleaned_data()

    log.info("Generating chart: total migrants by country")
    chart_total_migrants_by_country(df)

    log.info("Generating chart: GDP vs unemployment trend")
    chart_gdp_vs_unemployment_trend(df)

    log.info("Generating chart: remittances trend")
    chart_remittances_trend(df)

    log.info("Generating chart: migration by region")
    chart_migration_by_region(df)

    log.info("Generating chart: worker vs student composition")
    chart_temp_worker_vs_student_share(df)

    log.info("Generating chart: correlation heatmap")
    chart_correlation_heatmap(df)

    summary_statistics(df)
    log.info("EDA complete. Charts saved to %s", IMAGES_DIR)


if __name__ == "__main__":
    main()
