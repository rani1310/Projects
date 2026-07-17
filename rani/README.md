# Indian Overseas Migration Analytics

A data cleaning, feature engineering, and exploratory analytics project on Indian migration to 7 major destination countries (USA, Canada, UK, Australia, UAE, Germany, Singapore), 2000–2026.

## Project Overview
Public source data tracks Indian migrant stock, remittances, and India's macroeconomic indicators (GDP, unemployment) across 7 major destination countries. This project transforms the raw long-format export into a clean, analysis-ready dataset, engineers business KPIs, runs exploratory analysis, and produces an executive insights report — with explicit, honest documentation of the data's real coverage and limitations.

## Business Problem
Organizations advising migrants, diaspora-support bodies, and policymakers need a clear read on: which destinations are growing fastest, how remittances relate to India's economic conditions, and where the data itself is too thin to draw firm conclusions. This project answers that with real numbers, not assumed dimensions the source data doesn't contain.

## Honest Scope (read this first)
The original request template assumed richer data (Indian state-level, gender, age-group, education/employment breakdowns). **The actual source file does not contain those dimensions.** This project only reports on what the data supports: country/region-level migrant stock, remittances, and India's GDP/unemployment, 2000–2024 (2025–2026 largely unavailable). See `Reports/Data_Quality_Report.md` for the full breakdown, including that **53% of raw data cells are marked "NOT AVAILABLE."**

## Methodology
1. **Clean & Reshape** (`Python/01_clean_and_engineer.py`): parses the mixed-format `Value` column (commas, %, "$xxxB"/"$x.xxT" currency notation — including a fix for the trillion-suffix values used from 2007 onward), pivots the long "one metric per row" source into a wide, analysis-ready table, standardizes country names, and engineers KPIs (YoY growth, worker/student share, moving averages, high-migration flags).
2. **EDA** (`Python/02_eda_and_charts.py`): generates 6 charts (migrant stock by country, GDP vs. unemployment trend, remittance trend, migration by region, worker/student composition, correlation heatmap) and a summary statistics table.
3. **Insights**: 10 evidence-based findings in `Reports/Executive_Insights_Report.md`, each stating what happened, why, the business impact, and a recommendation — including findings about data limitations themselves.

## Key Findings (headline)
- **UAE (3.25M) and USA (3.17M)** are the largest Indian migrant destinations tracked; **Canada grew fastest** (+490% since 2000).
- **UK growth lagged** all other tracked countries (+70% since 2000).
- **Remittances grew ~10.7x** (2000–2024), tracking India's GDP (r≈0.98) far more closely than migrant headcount.
- **India's GDP grew 8.3x** over the same period without a corresponding slowdown in emigration.
- Workforce/student sub-category data is **too sparse (2 of 182 records)** to support a general trend claim.

## Folder Structure
```
Indian_Global_Migration_Analytics/
├── Raw_Data/            # Original source CSV
├── Cleaned_Data/        # cleaned_migration_data.csv / .xlsx
├── Reports/             # Data Quality Report, Executive Insights, Summary Statistics
├── Python/              # 01_clean_and_engineer.py, 02_eda_and_charts.py
├── Images/              # 6 PNG charts
├── Documentation/       # Data dictionary
└── README.md
```

## How to Run
```bash
cd Python
python3 01_clean_and_engineer.py   # cleans data, exports Cleaned_Data/ + Data Quality Report
python3 02_eda_and_charts.py       # generates charts + summary stats into Images/ and Reports/
```
Requires: `pandas`, `numpy`, `matplotlib`, `openpyxl`.

## Future Enhancements
- Source additional data to fill Permanent_Migrants / Temporary_Workers / Students for non-benchmark years.
- If state-level, gender, or age-group source data becomes available, extend the schema and dashboard accordingly rather than fabricating placeholder dimensions.
- Build a Power BI star schema (fact table + Year/Country dimension tables) as a follow-up phase once the Python layer is validated — available on request.

## Business Value
Gives diaspora-policy and migration-advisory stakeholders a fast, honest read on real destination-country trends and remittance dynamics, while explicitly flagging where the underlying data is too sparse to support granular claims — preventing overconfident conclusions from thin data.
