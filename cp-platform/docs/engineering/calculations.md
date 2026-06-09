# Calculation Modules

The platform implements 7 calculation modules based on industry standards:

```mermaid
graph LR
    M1["Module 1<br/>Surface Area<br/>πDL"]
    M2["Module 2<br/>Current Density<br/>Temp Corrected"]
    M3["Module 3<br/>Current Requirement<br/>Σ(A×i)×1.30"]
    M4["Module 4/5<br/>Groundbed Resistance<br/>Dwight / Sunde"]
    M5["Module 6<br/>Cable Resistance<br/>Parallel + Series"]
    M6["Module 7<br/>TR Circuit<br/>R_T + R_c + R_emf"]
    M7["Module 8<br/>Design Life<br/>N×W/(C×I)"]

    M1 --> M3
    M2 --> M3
    M3 --> M4
    M4 --> M6
    M5 --> M6
    M6 --> M7
```

## Standards Reference

| Module | Formula | Standard |
|--------|---------|----------|
| Surface Area | πDL | NACE SP0169 §5.2.2.1 |
| Temp Current Density | i×[1+(T-25)×k] | NACE SP0169 §5.2.2.3 |
| Deepwell R_G | Dwight (1936) | NACE SP0169 |
| Shallow R_G | Sunde (1968) | NACE SP0169 |
| Cable Resistance | Ohm's law | IEC 60287 |
| TR Circuit | R_T+R_c+R_emf+R_s | Industry Practice |
| Design Life | N×W/(C×I) | Industry Practice |

## Precision

All calculations use **Decimal.js** for arbitrary-precision decimal arithmetic,
with **MathJS** for unit conversions and symbolic computation verification.
