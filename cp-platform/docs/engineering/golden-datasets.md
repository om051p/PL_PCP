# Golden Datasets

Golden datasets are pre-computed reference input/output pairs used for regression testing and engineering verification.

## Dataset 1: Standard Deepwell — Tie-In Section

| Field | Expected | Tolerance |
|-------|----------|-----------|
| totalSurfaceAreaM2 | 1,118.43 | ±0.1% |
| requiredCurrentA | 0.2019 | ±0.5% |
| designCurrentA | 0.2625 | ±0.5% |
| groundbedResistanceOhm | 0.1135 | ±0.5% |
| designLifeYears | 30.88 | ±0.1y |

## Dataset 2: Standard Deepwell — Main Line

| Field | Expected | Tolerance |
|-------|----------|-----------|
| totalSurfaceAreaM2 | 158,877.93 | ±0.1% |
| requiredCurrentA | 28.6854 | ±0.5% |
| designCurrentA | 37.2910 | ±0.5% |

## Running Golden Dataset Tests

```bash
npm test -- --grep "Golden Dataset"
```
