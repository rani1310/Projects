# Data Quality Report

## Source
`Raw_Data/indian_overseas_migration_dataset.csv` — long format, one row per (Year, Destination Country, Metric).

## Issues Found (Before Cleaning)
- Total raw rows: **1323**
- Exact duplicate rows: **0**
- Cells marked `NOT AVAILABLE`: **703** (53.1% of all cells)
- Rows missing a cited source: **703**
- Mixed value formats in a single column: plain numbers, percentages, and currency strings like `$468.40B` all stored as text in `Value`.
- Data is stored long-format (one metric per row), which is not analysis-ready and must be pivoted before use.

## Missing Values After Reshaping (per column, wide format)

| Column | Missing Count | Missing % |
|---|---|---|
| Year | 0 | 0.0% |
| Destination_Country | 0 | 0.0% |
| Region | 0 | 0.0% |
| GDP_India_USD_Billion | 7 | 3.8% |
| Permanent_Migrants | 164 | 90.1% |
| Remittance_USD_Billion | 7 | 3.8% |
| Students | 159 | 87.4% |
| Temporary_Workers | 170 | 93.4% |
| Total_Indian_Migrants | 147 | 80.8% |
| Unemployment_India | 0 | 0.0% |
| Destination_Country_Full | 0 | 0.0% |
| Migrant_YoY_Growth_Pct | 182 | 100.0% |
| Temporary_Worker_Share_Pct | 179 | 98.4% |
| Student_Share_Pct | 175 | 96.2% |
| Remittance_per_Migrant_USD_Th | 147 | 80.8% |
| Migrant_3yr_Moving_Avg | 84 | 46.2% |
| High_Migration_Flag | 0 | 0.0% |
| India_Unemployment_Category | 0 | 0.0% |

## Key Data Limitations (Important — read before drawing conclusions)
- **Scope**: only 7 destination countries are covered (USA, Canada, UK, Australia, UAE, Germany, Singapore). This is a sample of major corridors, not a complete global picture of Indian migration.
- **Granularity**: no Indian state-level, gender, age, or education breakdown exists in the source file — those dimensions cannot be reported on and are intentionally excluded from this project.
- **Missing migrant-count data is substantial**, especially in early years (2000s), for Permanent_Migrants, Temporary_Workers, and Students — treat trend lines for those metrics as directional, not precise.
- **GDP_India and Unemployment_India are national figures**, repeated identically across all 7 countries in a given year — they describe India's macro conditions, not the destination country.
- **Years extend to 2026**, meaning some recent years may reflect estimates/projections rather than finalized statistics.