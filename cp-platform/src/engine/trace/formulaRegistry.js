/**
 * Static metadata registry of formulas used in the Cathodic Protection calculation engine.
 * Contains documentation, LaTeX equations, variables, and standards references.
 * Non-executable, strictly metadata.
 */
export const FORMULA_REGISTRY = {
  SURFACE_AREA: {
    id: 'SURFACE_AREA',
    label: 'Pipeline External Surface Area',
    equation: 'A = π × d × L',
    latexEquation: 'A = \\pi \\cdot d \\cdot L',
    variables: {
      d: { symbol: 'd', label: 'Outside Diameter', unit: 'in' },
      L: { symbol: 'L', label: 'Segment Length', unit: 'm' },
    },
    standard: 'NACE SP0169 / Saudi Aramco',
    notes: 'Calculates the external surface area of a single pipeline segment. Outside diameter is converted to meters (1 inch = 0.0254 m).'
  },
  TEMP_CORRECTION_EXP: {
    id: 'TEMP_CORRECTION_EXP',
    label: 'Temperature Correction — Exponential (Saudi Aramco)',
    equation: 'i_T = i_base × 1.25^((T − T_base) / 10)',
    latexEquation: 'i_T = i_{base} \\cdot 1.25^{\\frac{T - T_{base}}{10}}',
    variables: {
      i_base: { symbol: 'i_base', label: 'Base Current Density', unit: 'mA/m²' },
      T: { symbol: 'T', label: 'Operating Temperature', unit: '°C' },
      T_base: { symbol: 'T_base', label: 'Reference Base Temperature', unit: '°C' },
    },
    standard: 'SAES-X-400 Section 6.2 / THRESHOLDS',
    notes: 'Saudi Aramco standard exponential temperature correction method. Standard base reference temperature is 30°C.'
  },
  TEMP_CORRECTION_LINEAR: {
    id: 'TEMP_CORRECTION_LINEAR',
    label: 'Temperature Correction — Linear (NACE SP0169)',
    equation: 'i_T = i_base × [1 + (T − T_base) × 0.025]',
    latexEquation: 'i_T = i_{base} \\cdot [1 + (T - T_{base}) \\cdot 0.025]',
    variables: {
      i_base: { symbol: 'i_base', label: 'Base Current Density', unit: 'mA/m²' },
      T: { symbol: 'T', label: 'Operating Temperature', unit: '°C' },
      T_base: { symbol: 'T_base', label: 'Reference Base Temperature', unit: '°C' },
    },
    standard: 'NACE SP0169 §A5.2',
    notes: 'Linear temperature correction method based on NACE SP0169. Reference base temperature is 30°C.'
  },
  CURRENT_REQUIREMENT: {
    id: 'CURRENT_REQUIREMENT',
    label: 'Total Required & Design Current',
    equation: 'I_req = Σ(A_i × i_T_i) / 1000, I_design = I_req × SF',
    latexEquation: 'I_{req} = \\frac{\\sum A_i \\cdot i_{T_i}}{1000}, \\quad I_{design} = I_{req} \\cdot SF',
    variables: {
      A_i: { symbol: 'A_i', label: 'Segment Surface Area', unit: 'm²' },
      i_T_i: { symbol: 'i_T_i', label: 'Temp-Corrected Current Density', unit: 'mA/m²' },
      SF: { symbol: 'SF', label: 'Design Spare Factor', unit: '' },
    },
    standard: 'SAES-X-400 / NACE SP0169',
    notes: 'Sum of required current across all segments, converted from mA to A. Coating efficiency is not applied for conservative bare-equivalent calculation per Aramco practice.'
  },
  DWIGHT_DEEPWELL: {
    id: 'DWIGHT_DEEPWELL',
    label: 'Dwight Equation — Deepwell Groundbed',
    equation: 'Rg = (ρ / 2πL) × (ln(8L/d) − 1 + L/(4h))',
    latexEquation: 'R_g = \\frac{\\rho}{2\\pi L}\\left(\\ln\\frac{8L}{d} - 1 + \\frac{L}{4h}\\right)',
    variables: {
      rho: { symbol: 'ρ', label: 'Soil Resistivity', unit: 'Ω·cm' },
      L: { symbol: 'L', label: 'Active Column Length', unit: 'm' },
      d: { symbol: 'd', label: 'Borehole Diameter', unit: 'm' },
      h: { symbol: 'h', label: 'Midpoint Depth of Active Column', unit: 'm' },
    },
    standard: 'SAES-X-400 Section 7.3 / Dwight (1936)',
    notes: 'Standard Dwight formula for deep vertical groundbeds. Midpoint depth is calculated as top-depth (startDepthM) + L/2.'
  },
  SUNDE_SHALLOW: {
    id: 'SUNDE_SHALLOW',
    label: 'Sunde Equation — Shallow Vertical Parallel Groundbed',
    equation: 'Rg = R_single / N + R_mutual',
    latexEquation: 'R_g = \\frac{R_{single}}{N} + \\frac{\\rho}{\\pi L N^2}\\sum_{i=1}^{N-1}\\ln\\frac{2iS}{L}',
    variables: {
      R_single: { symbol: 'R_single', label: 'Single-Anode Ground Resistance', unit: 'Ω' },
      N: { symbol: 'N', label: 'Number of Anodes', unit: '' },
      S: { symbol: 'S', label: 'Anode Spacing (centre-to-centre)', unit: 'm' },
      rho: { symbol: 'ρ', label: 'Soil Resistivity', unit: 'Ω·cm' },
      L: { symbol: 'L', label: 'Anode Length', unit: 'm' },
    },
    standard: 'Sunde (1968) / NACE SP0169',
    notes: 'Accounts for mutual electrostatic interference between parallel vertical anodes in a linear array.'
  },
  DISTRIBUTED_GROUNDBED: {
    id: 'DISTRIBUTED_GROUNDBED',
    label: 'Distributed Groundbed Resistance (Independent Anodes)',
    equation: 'Rg = R_single / N',
    latexEquation: 'R_g = \\frac{R_{single}}{N}',
    variables: {
      R_single: { symbol: 'R_single', label: 'Single-Anode Resistance', unit: 'Ω' },
      N: { symbol: 'N', label: 'Number of Anodes', unit: '' },
    },
    standard: 'NACE SP0169 / SAES-X-400',
    notes: 'Used when anodes are installed far apart (typically > 10m spacing) such that mutual interference is negligible.'
  },
  CABLE_RESISTANCE: {
    id: 'CABLE_RESISTANCE',
    label: 'Cable Circuit Resistance',
    equation: 'R_cable = R_tails_parallel + R_pos_main + R_neg_main + R_neg_sec',
    latexEquation: 'R_{cable} = R_{tails} + R_{pos\\_main} + R_{neg\\_main} + R_{neg\\_sec}',
    variables: {
      R_tails_parallel: { symbol: 'R_tails', label: 'Parallel Anode Tails Resistance', unit: 'Ω' },
      R_pos_main: { symbol: 'R_pos_main', label: 'Positive Main Cable Resistance', unit: 'Ω' },
      R_neg_main: { symbol: 'R_neg_main', label: 'Negative Main Cable Resistance', unit: 'Ω' },
      R_neg_sec: { symbol: 'R_neg_sec', label: 'Negative Secondary Cable Resistance', unit: 'Ω' },
    },
    standard: 'IEC 60287 / IEEE 142',
    notes: 'Total series resistance of positive and negative copper conductors.'
  },
  TR_CIRCUIT_ANALYSIS: {
    id: 'TR_CIRCUIT_ANALYSIS',
    label: 'Transformer Rectifier Circuit Sizing',
    equation: 'R_total = R_G + R_cable + R_emf + R_structure, V_min = R_total × I_rated + V_backEMF',
    latexEquation: 'R_{total} = R_G + R_{cable} + \\frac{V_{backEMF}}{I_{rated}} + R_{struct}, \\quad V_{min} = R_{total} \\cdot I_{rated} + V_{backEMF}',
    variables: {
      R_G: { symbol: 'R_G', label: 'Groundbed Resistance', unit: 'Ω' },
      R_cable: { symbol: 'R_cable', label: 'Total Cable Resistance', unit: 'Ω' },
      V_backEMF: { symbol: 'V_backEMF', label: 'Structure-to-Electrolyte Back EMF', unit: 'V' },
      R_struct: { symbol: 'R_struct', label: 'Structure Connection Resistance', unit: 'Ω' },
      I_rated: { symbol: 'I_rated', label: 'TR Rated Output Current', unit: 'A' },
    },
    standard: 'SAES-X-600 Section 5.2',
    notes: 'Determines the minimum voltage required from the TR rectifier. Effective Back-EMF resistance is V_backEMF / I_rated.'
  },
  DESIGN_LIFE: {
    id: 'DESIGN_LIFE',
    label: 'Anode Bed Design Life (Consumption Model)',
    equation: 'Life (years) = (N × W × U_f) / (C × I_rated)',
    latexEquation: 'Y = \\frac{N \\cdot W \\cdot U_f}{C \\cdot I_{rated}}',
    variables: {
      N: { symbol: 'N', label: 'Number of Anodes', unit: '' },
      W: { symbol: 'W', label: 'Individual Anode Weight', unit: 'kg' },
      U_f: { symbol: 'U_f', label: 'Anode Utilization Factor', unit: '' },
      C: { symbol: 'C', label: 'Anode Consumption Rate', unit: 'kg/A·yr' },
      I_rated: { symbol: 'I_rated', label: 'TR Rated Current (or Operating Load)', unit: 'A' },
    },
    standard: 'NACE SP0169 / SAES-X-400 Section 7.1',
    notes: 'Determines the lifetime of the anodes before exhaustion. Standard utilization factor is 0.85.'
  },
  COKE_REQUIREMENT: {
    id: 'COKE_REQUIREMENT',
    label: 'Coke Backfill Requirement',
    equation: 'Bags_base = CEILING(L × ft/m × AF / bagWeight), Bags_final = CEILING(Bags_base × contingency)',
    latexEquation: 'B_{base} = \\lceil \\frac{L \\cdot 3.28 \\cdot 39.2}{50} \\rceil, \\quad B_{final} = \\lceil B_{base} \\cdot (1 + C_{pct}/100) \\rceil',
    variables: {
      L: { symbol: 'L', label: 'Active Column Length', unit: 'm' },
      AF: { symbol: 'AF', label: 'Annulus Factor', unit: 'lbs/ft' },
      contingency: { symbol: 'contingency', label: 'Coke Handling Contingency Factor', unit: '' },
    },
    standard: 'SAES-X-400 / Cal.(DW) Section 13',
    notes: 'Volume calculation of petroleum coke column based on standard borehole annulus dimensions.'
  }
}
