# Data Dictionary — Cleaned Migration Dataset
`Cleaned_Data/cleaned_migration_data.csv` (182 rows, one per Year x Destination Country, 2000–2026)

| Column | Type | Description | Source Coverage |
|---|---|---|---|
| Year | int | Calendar year of the record | 2000–2026 (full) |
| Destination_Country | text | Short country name as in source | Full |
| Destination_Country_Full | text | Standardized full country name (e.g. USA → United States) | Full |
| Region | text | Geographic region of destination country | Full |
| Total_Indian_Migrants | float | Estimated total stock of Indian-born migrants in that country | Sparse — benchmark years only (2000, 2005/2010, 2015, 2020, 2024) |
| Permanent_Migrants | float | Estimated permanent-resident migrants | Very sparse |
| Temporary_Workers | float | Estimated temporary/contract workers | Very sparse |
| Students | float | Estimated Indian student population | Very sparse |
| Remittance_USD_Billion | float | **India-wide** total remittances received (not country-specific) | Near-full (2000–2024) |
| Unemployment_India | float | **India-wide** national unemployment rate (%) | Full |
| GDP_India_USD_Billion | float | **India-wide** GDP in USD billions (normalized from mixed $B/$T source notation) | Near-full (2000–2024; 2025–2026 not yet available) |
| Migrant_YoY_Growth_Pct | float | % change in Total_Indian_Migrants vs. the prior available record for that country | Derived; inherits sparsity of Total_Indian_Migrants |
| Temporary_Worker_Share_Pct | float | Temporary_Workers as % of Total_Indian_Migrants | Derived; very sparse |
| Student_Share_Pct | float | Students as % of Total_Indian_Migrants | Derived; very sparse |
| Remittance_per_Migrant_USD_Th | float | India-wide remittances divided by that country's migrant stock (thousands USD) — a rough per-capita proxy, NOT a country-specific remittance figure | Derived; sparse |
| Migrant_3yr_Moving_Avg | float | 3-observation rolling average of Total_Indian_Migrants per country (smooths benchmark-year gaps) | Derived |
| High_Migration_Flag | text | "High" if Total_Indian_Migrants is at/above that country's own 75th percentile, else "Normal" | Derived |
| India_Unemployment_Category | text | Bucketed unemployment rate: Low (<6%), Moderate (6–8%), High (>8%) | Derived |

## Important Interpretation Notes
1. **Remittance_USD_Billion, Unemployment_India, and GDP_India_USD_Billion are national (India-wide) figures**, repeated identically across all 7 destination countries for a given year. They describe conditions in India, not in the destination country, and should never be aggregated (e.g. summed) across countries.
2. **Total_Indian_Migrants and its sub-categories are only available for benchmark years**, not every year — treat any year-over-year growth calculation as spanning multi-year gaps, not annual change.
3. All currency figures have been normalized to **USD Billions** (source data mixed "$xxxB" and "$x.xxT" notation).
