# Engineering Assumptions

> **Purpose:** Document all engineering constants, safety factors, utilization factors, design margins, and hidden assumptions found in the Excel workbook, PDF standards, and application code.
> **Status Key:** ✅ Verified · ⚠️ Discrepancy found · ❌ Not applied

---

## 1. Constants Registry

### Source: `THRESHOLDS` in `constants/index.js`

| Constant | Value | Description | Source Document | Status |
|----------|-------|-------------|-----------------|--------|
| `SPARE_FACTOR` | 1.3 | 30% current spare capacity | Excel F24 (=F23*1.3) | ✅ Verified |
| `TEMP_CORRECTION_FACTOR` | 0.025 | Per °C above 25°C (NACE linear) | NACE SP0169 | ⚠️ Excel uses 1.25^ΔT/10 |
| `BASE_TEMP_C` | 25 | Reference temperature for CD | NACE SP0169 | ⚠️ Excel uses 30°C |
| `TR_EFFICIENCY` | 0.8 | Transformer-rectifier stage efficiency | Excel F200 (80%) | ✅ Verified |
| `RECTIFIER_EFFICIENCY` | 0.8 | Rectifier stage efficiency | Excel F201 (80%) | ⚠️ Excel uses 0.6 combined |
| `CIRCUIT_RESISTANCE_OPERATING` | 0.7 | 70% of rated V/I operating limit | Excel F178 | ✅ Verified |
| `CIRCUIT_RESISTANCE_WARNING` | 0.9 | 90% of rated V/I warning limit | Excel F185 | ✅ Verified |
| `MIN_REMOTENESS_M` | 20 | Minimum groundbed distance | SAES-X-400 | ✅ Verified |
| `HIGH_SOIL_RESISTIVITY` | 10,000 | Threshold for deeper groundbed | CP4 Chapter 4 | ✅ Industry standard |
| `VERY_HIGH_SOIL_RESISTIVITY` | 50,000 | Extreme soil resistivity threshold | CP4 Chapter 4 | ✅ Industry standard |
| `COKE_FT_PER_M` | 3.28 | Feet per meter conversion | Excel F212 | ✅ Verified |
| `COKE_ANNULUS_FACTOR` | 39.2 | Empirical annulus volume factor | Excel F212 | ✅ Verified (Aramco practice) |
| `COKE_BAG_LBS` | 50 | Pounds per bag of CPC backfill | Excel F212 | ✅ Verified |
| `COKE_BACKFILL_CONTINGENCY` | 1.15 | 15% site handling loss | Excel F213 | ⚠️ Excel label says "10%" |
| `MIN_DESIGN_LIFE_MARGIN_Y` | 3 | Warn if design life within 3yr of target | CP4 | ✅ Industry standard |

---

## 2. Utilization Factors

| Factor | Value | Used In | Source | Status |
|--------|-------|---------|--------|--------|
| Anode mass utilization | **0.85** | Excel F42: `(F38*F39*0.85)/(F41*F40)` | Excel Cal.(DW) | ⚠️ Not in app |
| Coating efficiency (FBE) | 0.98 | Current calculation | COATING_TYPES | ✅ Applied |
| Coating efficiency (3LPE) | 0.99 | Current calculation | COATING_TYPES | ✅ Applied |
| Coating efficiency (CTE) | 0.95 | Current calculation | COATING_TYPES | ✅ Applied |
| Coating degradation (FBE) | 0.002/yr | Future degradation modeling | CP4 | ❌ Not implemented |

### Anode Utilization Factor Discrepancy
```
Excel:  Y = (N × W × 0.85) / (C × I)
App:    Y = (N × W) / (C × I)
```
The 0.85 factor accounts for the fact that not all anode mass is usable — typically 85% before the anode becomes ineffective. The app calculates a longer design life (100% utilization). For the standard case (9 anodes × 38.6kg, 0.45 kg/A·yr, 25A):
- **Excel:** 25.27 years
- **App:** 29.75 years (no utilization factor)
- **Impact:** App overestimates design life by ~18%

---

## 3. Safety Factors

| Factor | Value | Application | Source | Status |
|--------|-------|-------------|--------|--------|
| Current spare | 1.3 (30%) | Design current = required × 1.3 | Excel F24 | ✅ |
| TR voltage margin | 0.7 (70%) | V_min = R_T×I / 0.7 → TR at ≤70% rated | Excel F161 | ✅ |
| Circuit resistance 70% | 0.7 | Max RT = V_rated/I_rated × 0.7 | Excel F178 | ✅ |
| Circuit resistance 90% | 0.9 | Warning threshold at 90% | Excel F185 | ✅ |
| Coke site handling | 1.15 (15%) | Extra 15% for losses | Excel F213 | ✅ |

### TR Voltage Margin Explained
```
V_min = R_T × I_rated / 0.7
```
The division by 0.7 means the TR operates at 70% of its rated voltage. This 30% margin accounts for:
- Future coating degradation (increased current demand)
- Seasonal soil resistivity changes
- Anode consumption (increased resistance over time)
- Measurement tolerances

---

## 4. Design Margins

| Margin | Value | Notes |
|--------|-------|-------|
| Design life target | 25 years | Standard industry requirement |
| Design life warning | 3 years cushion | THRESHOLDS.MIN_DESIGN_LIFE_MARGIN_Y |
| Coke backfill | 15% contingency | Excel F213 (label says 10%, uses 15%) |
| Cable sizing | NEC/BS 7671 ratings | CABLE_SPECS max current ratings |
| Minimum groundbed spacing | 20m | SAES-X-400 minimum |
| Minimum structure distance | Per SAES-X-400 table | Depends on current × resistivity |

---

## 5. Hidden Excel Assumptions

### 5.1 Temperature Base
```
Excel:  i_T = i_base × 1.25^((T-30)/10)    [Base = 30°C]
App:    i_T = i_base × [1 + (T-25) × 0.025] [Base = 25°C]
```
The Excel formula assumes 30°C as reference temperature (not 25°C per NACE). The 1.25 multiplier per 10°C represents a non-linear temperature effect model.

### 5.2 Anode Cable Method
```
Excel: Sums individual anode tail resistances (R_total = ΣR_i)
App:   Computes parallel resistance (R_parallel = 1/Σ(1/R_i))
```
The Excel method treats anode tail cables as if they were in series. This is physically incorrect — all anode tails connect at the junction box in parallel. The Excel method overestimates cable resistance by ~100× for a 9-anode system.

**Impact Analysis:** Despite the 100× difference:
- Excel total cable resistance: ~1.07 Ω (sum of all segments)
- App total cable resistance: ~0.255 Ω (parallel tails + main cables)
- The anode tail component contributes ~0.0076 Ω (parallel) vs ~0.817 Ω (Excel's series sum)
- Impact on total circuit resistance: ~0.82 Ω difference

### 5.3 AC Power Combined Factor
```
Excel:  /0.6 (combined efficiency × PF)
App:    /(0.8 × 0.8) = /0.64
```
The Excel workbook lists 80% efficiency and 80% power factor (0.8 × 0.8 = 0.64), but the formula uses 0.6. This is likely a formula error in the Excel. The app uses the correct combined factor (0.64).

**Impact:** ~6.7% lower AC KVA in Excel compared to app.

### 5.4 Coke Contingency Label
```
Excel cell F213 label: "Number of bags required with 10% contingency"
Excel formula: =ROUNDUP(F212*1.15,0)   ← 1.15 = 15%, not 10%
```
The label says 10% contingency but the formula multiplies by 1.15 (15%). The app correctly uses 15%.

### 5.5 Design Life Utilization
```
Excel:  Includes 0.85 utilization factor (implicit, hardcoded in formula)
App:    No utilization factor (assumes 100% anode mass utilization)
```
The 0.85 factor is embedded directly in the formula cell and not documented as a separate constant. This makes it easy to miss during formula extraction.

### 5.6 PI vs 3.14
```
Excel:  =3.14*(F19*F13)
App:    Math.PI * odM * lengthM
```
Excel uses 3.14 as an approximation of π. The app uses Math.PI (3.14159...). Impact is negligible (~0.05% difference).

---

## 6. Industry Standards Referenced

| Standard | Description | Applied In |
|----------|-------------|-----------|
| NACE SP0169 | Control of External Corrosion on Underground/Submerged Metallic Pipelines | Current density, protection criteria |
| 17-SAMSS-003 | Saudi Aramco — TRU Specification | TRU standard |
| 17-SAMSS-016 | Saudi Aramco — Anode Specification | HSCI TA-4 standard |
| 17-SAMSS-008 | Saudi Aramco — Junction Box Specification | Junction box standard |
| 17-SAMSS-020 | Saudi Aramco — Cable Specification | Cable standards |
| 17-SAMSS-007 | Saudi Aramco — Test Station Specification | Test station standard |
| 17-855-011 | Saudi Aramco — Coke Backfill Material | CPC backfill standard |
| SAES-X-400 | Saudi Aramco — CP Systems Design | Remoteness distance |
| AWWA C213 | FBE Coating Standard | Coating efficiency |
| DIN 30670 | 3LPE Coating Standard | Coating efficiency |
| ASTM B418 | Zinc Anode Standard | Sacrificial anode spec |
| Dwight (1936) | Groundbed resistance formula | Deepwell calculation |
| Sunde (1968) | Mutual coupling theory | Shallow vertical calculation |
| IEC 60287 | Current-carrying capacity | Cable ampacity reference |

---

## 7. Assumption Impact Matrix

| Assumption | Parameter Affected | Direction | Magnitude |
|-----------|-------------------|-----------|-----------|
| Excel temp base = 30°C (vs NACE 25°C) | Current density | ↓ Excel lower | ~2% |
| Exponential temp correction | Current density | ↑ Excel higher at high T | 5-10% at 60°C+ |
| Anode tails in series (Excel) | Cable resistance | ↑ Excel overestimates | ~100× for 9 anodes |
| Combined Eff×PF = 0.6 (Excel) | AC KVA | ↓ Excel lower | ~6.7% |
| No utilization factor (App) | Design life | ↑ App overestimates | ~18% |
| Coke label "10%" vs 1.15 | Bag count | Same (both use 1.15) | 0% |
| 3.14 vs Math.PI | Surface area | ↑ Excel lower | ~0.05% |

---

## 8. Recommended Actions

| Priority | Issue | Impact | Proposed Fix |
|----------|-------|--------|-------------|
| **High** | Add 0.85 utilization factor to `calcDesignLife()` | App overestimates life by 18% | Add `THRESHOLDS.ANODE_UTILIZATION_FACTOR: 0.85` |
| **Medium** | Document/verify temperature correction method | Excel vs NACE method divergence | Add note or config flag |
| **Low** | AC power combined factor (0.6 vs 0.64) | 6.7% difference in AC KVA | Likely Excel formula error; app is correct |
| **Low** | Coke contingency label (10% vs 15%) | Documentation only | Formula is correct (1.15); fix label |
