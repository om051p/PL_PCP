# Formulas & Standards

## Surface Area (NACE SP0169 §5.2.2.1)

$$
A = \pi \times D \times L
$$

- A = external surface area (m²)
- D = outside diameter (m), converted from inches via ×0.0254
- L = section length (m)

## Temperature-Corrected Current Density (NACE SP0169 §5.2.2.3)

$$
i_T = i_{base} \times [1 + (T - 25) \times 0.025]
$$

- i_T = temperature-corrected current density (mA/m²)
- i_base = base current density at 25°C (mA/m²)
- 0.025 = correction factor per °C

## Current Requirement (NACE SP0169 §5.3)

$$
I_{req} = \Sigma(A_i \times i_{T_i})
$$
$$
I_{design} = I_{req} \times 1.30
$$

## Deepwell Groundbed Resistance (Dwight, 1936)

$$
R_G = \frac{\rho}{2\pi L} \times \left[ \ln\left(\frac{8L}{d}\right) - 1 + \frac{L}{4h} \right]
$$

## Shallow Vertical Groundbed Resistance (Sunde, 1968)

$$
R_{single} = \frac{\rho}{2\pi L} \times \left[ \ln\left(\frac{4L}{d}\right) - 1 + \frac{L}{2h} \right]
$$

## Design Life

$$
Y = \frac{N \times W}{C \times I}
$$
