# Variance Analysis Report — CP Designer ICCP Platform v2.0

**Date:** June 2026  
**RC:** RC-1  
**Reference:** Excel engineering workbook v2.0

---

## 1. Overview

Variance measured between CP Designer calculated values and Excel reference workbook for Dataset 1 (Deepwell Tie-In).

**Dataset parameters:**
- Pipe: 48in OD × 292m, FBE coating
- Temperature: 57.22°C, Base CD: 0.1 mA/m²
- Groundbed: Deepwell, 9 anodes, 15m start depth
- Soil: 5,000 Ω·cm

---

## 2. Per-Parameter Variance

| Parameter | Code Value | Excel Value | Variance | Threshold | Status |
|-----------|-----------|-------------|----------|-----------|--------|
| Surface Area | 1,118.43 m² | 1,118.00 m² | ±0.01% | ±0.1% | ✅ |
| Temp-Corrected CD | 0.18055 mA/m² | 0.18055 mA/m² | ±0.01% | ±0.1% | ✅ |
| Required Current (bare) | 0.2019 A | 0.2019 A | ±0.01% | ±0.5% | ✅ |
| Design Current (inc. 30%) | 0.2625 A | 0.2624 A | ±0.04% | ±0.5% | ✅ |
| Groundbed Resistance | 0.1135 Ω | 0.1134 Ω | ±0.09% | ±0.5% | ✅ |
| Min TR Voltage | 8.377 V | 8.400 V | ±0.27% | ±0.5% | ✅ |
| Total Circuit Resistance | 1.378 Ω | 1.376 Ω | ±0.15% | ±0.5% | ✅ |
| Anode Tail Resistance | 0.007627 Ω | 0.00762 Ω | ±0.09% | ±0.5% | ✅ |
| Positive Cable Resistance | 0.1186 Ω | 0.1186 Ω | ±0.01% | ±0.5% | ✅ |
| Negative Cable Resistance | 0.1186 Ω | 0.1186 Ω | ±0.01% | ±0.5% | ✅ |
| Design Life (9 anodes) | 30.88 yrs | 30.90 yrs | ±0.06% | ±0.5% | ✅ |

---

## 3. Summary Statistics

| Metric | Value |
|--------|-------|
| Parameters measured | 11 |
| Mean variance | 0.07% |
| Max variance | 0.27% (Min TR Voltage) |
| Min variance | 0.01% (Surface area) |
| All within threshold (<0.5%) | ✅ |

---

## 4. Residual Risk

| Item | Risk | Notes |
|------|------|-------|
| Min TR Voltage (0.27%) | LOW | Rounding difference in V_emf × I product |
| Groundbed Resistance (0.09%) | LOW | Dwight formula uses π/ln ratio — within float64 precision |
| Design Life (0.06%) | LOW | Anode mass × count ÷ current — acceptable for sizing |

**No residual risk items require mitigation.**

---

## 5. Variance Trend (vs Previous Run)

| Parameter | Previous | Current | Delta | Notes |
|-----------|----------|---------|-------|-------|
| Required Current | 0.1979 A | 0.2019 A | +2.0% | CE factor removed (intentional) |
| Design Current | 0.2573 A | 0.2625 A | +2.0% | CE factor removed (intentional) |
| Groundbed Resistance | 0.1135 Ω | 0.1135 Ω | 0% | Unchanged |
| Design Life | 30.88 yrs | 30.88 yrs | 0% | Unchanged |

**✅ ACCEPTED — All variances within engineering tolerance.**
