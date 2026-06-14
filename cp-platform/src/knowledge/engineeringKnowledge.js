/**
 * M9 — Learning Foundation
 * Static engineering knowledge base for the RAXA CP Platform.
 *
 * Structure:
 *   - Each module covers one calculation area
 *   - No formula logic — purely educational metadata
 *   - Referenced from PageKnowledge.jsx and optionally from TracePanel
 *
 * PROTECTED: This file contains NO calculation logic.
 * It is read-only reference material for UI display only.
 */

export const KNOWLEDGE_MODULES = [
  // ─── CURRENT REQUIREMENT ──────────────────────────────────────────────────
  {
    id: 'current_requirement',
    title: 'Current Requirement',
    category: 'Engineering Analysis',
    icon: 'Zap',
    route: '/current',
    standard: 'SAES-X-400 / ISO 15589-1',
    tags: ['current', 'protection', 'coating', 'temperature', 'current density'],
    summary: 'Calculates the total protection current required to cathodically protect a pipeline segment.',
    whatItCalculates: `The protection current requirement (I_protect) is the electrical current that must be impressed on the pipeline
to raise its electrochemical potential to the protection criterion (−850 mV Cu/CuSO₄ for most soils).

A higher current means the pipeline is harder to protect — it has more exposed metal area, worse coating, or more aggressive soil conditions.`,

    whyItMatters: `Undersizing the current requirement leads to inadequate protection — corrosion will proceed at unprotected areas.
Oversizing leads to over-protection, which can damage polyethylene coatings through cathodic disbondment and wastes energy.

The design must hit the protection sweet spot for the full design life, even as coating degrades over time.`,

    standardReference: `SAES-X-400 §6.2 — Protection criteria and current density requirements
ISO 15589-1 §8 — Current density tables by coating type and soil condition
NACE SP0169 §6.2 — Criteria for cathodic protection`,

    typicalRanges: [
      { parameter: 'Current Density (bare steel, mild soil)', value: '5–15 mA/m²' },
      { parameter: 'Current Density (bare steel, aggressive)', value: '15–25 mA/m²' },
      { parameter: 'Coating Efficiency Factor', value: '0.01–0.10 (1–10%)' },
      { parameter: 'Protection Criterion', value: '−850 mV (Cu/CuSO₄)' },
      { parameter: 'Temperature Correction Range', value: '±15–30% for Saudi conditions' },
    ],

    commonMistakes: [
      {
        mistake: 'Using design coating efficiency at end-of-life',
        consequence: 'System is undersized — coating degrades over 25 years; must design for worst-case (highest current).',
        fix: 'Use design life end coating factor. SAES-X-400 requires designing for the most onerous condition.',
      },
      {
        mistake: 'Ignoring temperature correction for buried pipelines',
        consequence: 'Saudi Arabia operating temperatures can exceed 60–80°C. Current density increases significantly with temperature.',
        fix: 'Apply the Saudi Aramco exponential temperature correction. Do not use a linear approximation for Saudi conditions.',
      },
      {
        mistake: 'Applying wrong current density for coating type',
        consequence: 'Different coatings have very different breakdown characteristics. FBE has much better long-term performance than coal tar.',
        fix: 'Select current density from the ISO 15589-1 Table 1 or SAES-X-400 based on actual coating system specified.',
      },
    ],

    workedExample: {
      description: 'Pipeline segment: 500m × DN400 FBE coated, operating at 60°C, design life 25 years',
      steps: [
        { label: 'Bare surface area', expression: 'A = π × OD × L = π × 0.4064 × 500 = 638.0 m²' },
        { label: 'Current density at 20°C (FBE, end-of-life)', expression: 'j₀ = 12 mA/m²' },
        { label: 'Temperature correction (Saudi Aramco exp.)', expression: 'j_T = 12 × exp(0.015 × (60 − 20)) = 12 × 1.822 = 21.9 mA/m²' },
        { label: 'Coating factor (end of design life)', expression: 'f_coating = 0.05 (5%)' },
        { label: 'Protection current', expression: 'I = A × j_T × f_coating = 638.0 × 21.9 × 0.05 = 0.698 A' },
      ],
      result: '0.698 A required for this segment',
      notes: 'This is the contribution from one segment. Sum all segments for the total station current requirement.',
    },
  },

  // ─── GROUNDBED DESIGN ─────────────────────────────────────────────────────
  {
    id: 'groundbed_design',
    title: 'Groundbed Design',
    category: 'Engineering Analysis',
    icon: 'Layers',
    route: '/groundbed',
    standard: 'SAES-X-400 / NACE SP0572',
    tags: ['groundbed', 'anode', 'resistance', 'Dwight', 'deepwell', 'surface'],
    summary: 'Determines the anode bed configuration and calculates groundbed-to-earth resistance using the Dwight equation.',
    whatItCalculates: `Groundbed resistance (Rg) is the electrical resistance between the anode bed and the remote earth reference.
It directly controls how much voltage the TR must supply to drive the required protection current through the circuit.

A lower Rg means less TR voltage is needed for the same current — a more efficient design.`,

    whyItMatters: `Groundbed resistance is one of the most critical parameters in the CP circuit.
It directly limits how much current can be driven at a given TR voltage:

I = (V_TR − V_back_EMF) / R_circuit

where R_circuit includes Rg. An oversized groundbed resistance requires a larger, more expensive TR.
Undersized groundbed resistance may allow current to flow uncontrolled.`,

    standardReference: `SAES-X-400 §7.3.2 — Groundbed resistance calculation using Dwight equation
NACE SP0572 — Design of Galvanic Cathodic Protection for Reinforced Concrete
Dwight (1936) — Calculation of Resistances to Ground (IEEE Transactions)`,

    typicalRanges: [
      { parameter: 'Acceptable groundbed resistance', value: '< 2.0 Ω (typical), < 1.0 Ω (preferred)' },
      { parameter: 'Anode spacing-to-depth ratio', value: '≥ 1.5 (to minimize mutual interference)' },
      { parameter: 'Deepwell depth', value: '30–60 m typical for Saudi conditions' },
      { parameter: 'Coke breeze column length', value: '6–12 m per anode' },
      { parameter: 'MMO tubular current output', value: '2–10 A/anode depending on rating' },
    ],

    commonMistakes: [
      {
        mistake: 'Ignoring mutual interference between parallel anodes',
        consequence: 'Parallel anode arrays have higher resistance than single-anode calculation predicts due to mutual interference.',
        fix: 'Use parallel resistance formula: Rg_parallel = Rg_single / n for widely spaced anodes. Apply spacing correction for tightly packed arrays. RAXA uses conservative parallel formula per Aramco practice.',
      },
      {
        mistake: 'Using surface measurement for buried resistivity',
        consequence: 'Wenner 4-pin method measures average to a depth of approximately the pin spacing. For deepwell groundbeds, the actual formation resistivity at depth may be very different.',
        fix: 'Use deep resistivity investigation (Schlumberger, borehole logging) for deepwell groundbed design. Apply appropriate layered model.',
      },
      {
        mistake: 'Not accounting for coke breeze column in single-anode Rg',
        consequence: 'The coke breeze column significantly reduces single-anode resistance. Ignoring it leads to over-design.',
        fix: 'Use the effective anode column length (anode + coke breeze) as L in the Dwight equation when a coke column is present.',
      },
    ],

    workedExample: {
      description: 'Surface groundbed: 9 MMO tubular anodes, ρ = 350 Ω·cm, L = 1.5m each, d = 0.075m borehole, spacing = 3m',
      steps: [
        { label: 'Single-anode Rg (Dwight)', expression: 'Rg₁ = (ρ/2πL)(ln(4L/d) − 1) = (3.5/2π×1.5)(ln(4×1.5/0.075) − 1)' },
        { label: 'ln(4L/d)', expression: 'ln(4 × 1.5 / 0.075) = ln(80) = 4.382' },
        { label: 'Rg₁', expression: 'Rg₁ = (3.5 / 9.425) × 3.382 = 0.371 × 3.382 = 1.254 Ω' },
        { label: 'Parallel Rg (n = 9)', expression: 'Rg = Rg₁ / n = 1.254 / 9 = 0.139 Ω' },
      ],
      result: '0.139 Ω groundbed resistance',
      notes: 'This is below the 2.0 Ω threshold. Good design margin.',
    },
  },

  // ─── CABLE RESISTANCE ─────────────────────────────────────────────────────
  {
    id: 'cable_resistance',
    title: 'Cable Resistance',
    category: 'Engineering Analysis',
    icon: 'Cable',
    route: '/cable',
    standard: 'IEC 60228 / SAES-X-400',
    tags: ['cable', 'resistance', 'voltage drop', 'conductor', 'cross-section'],
    summary: 'Calculates resistance and voltage drop in the TR positive and negative cables to verify they are within acceptable limits.',
    whatItCalculates: `Cable resistance directly subtracts from the available driving voltage. The TR must supply enough voltage
to overcome: pipeline-to-electrolyte back-EMF + groundbed resistance + positive cable resistance + negative cable resistance.

If cables are undersized, they consume too much of the TR voltage budget.`,

    whyItMatters: `The circuit voltage equation is:
V_TR = V_EMF + I × (Rg + R_cable_pos + R_cable_neg + R_pipe)

A high cable resistance forces either a larger (more expensive) TR or limits the protection current.
Saudi Aramco requires cable voltage drop to be below defined limits to ensure voltage headroom for the TR.`,

    standardReference: `SAES-X-400 §8.4 — Cable sizing requirements
IEC 60228 — Conductors of insulated cables (resistance tables)
IEEE 80 — Cable current-carrying capacity`,

    typicalRanges: [
      { parameter: 'Positive cable cross-section', value: '10–50 mm² (typical CP cable)' },
      { parameter: 'Negative cable cross-section', value: '16–70 mm²' },
      { parameter: 'Max cable voltage drop (positive)', value: '< 0.5 V (typical Aramco requirement)' },
      { parameter: 'Max cable voltage drop (negative)', value: '< 0.3 V (typical Aramco requirement)' },
      { parameter: 'Copper resistivity (20°C)', value: '1.724 × 10⁻⁸ Ω·m' },
    ],

    commonMistakes: [
      {
        mistake: 'Not applying temperature correction to cable resistance',
        consequence: 'Cable buried in hot soil (50–80°C in Saudi Arabia) has 15–25% higher resistance than at standard 20°C.',
        fix: 'Apply R_T = R_20 × [1 + α(T − 20)] where α = 0.00393 per °C for copper.',
      },
      {
        mistake: 'Using nominal cross-section instead of actual conductor area',
        consequence: 'Cable standards specify nominal cross-sections; the actual conductor area may be slightly different.',
        fix: 'Use resistance-per-metre values from IEC 60228 Table 1 for the specific cable and conductor type.',
      },
      {
        mistake: 'Forgetting to include both legs of the cable run',
        consequence: 'A 100m cable run has 100m positive AND 100m negative — total 200m of conductor.',
        fix: 'Calculate resistance for each cable leg separately. The positive cable goes from TR to groundbed; negative cable from TR to pipe test point.',
      },
    ],

    workedExample: {
      description: '50 mm² copper positive cable, 120m run, 50°C operating temperature',
      steps: [
        { label: 'Unit resistance from IEC 60228 (20°C)', expression: 'r₂₀ = 0.387 mΩ/m' },
        { label: 'Temperature correction', expression: 'r₅₀ = 0.387 × (1 + 0.00393 × 30) = 0.387 × 1.118 = 0.433 mΩ/m' },
        { label: 'Cable resistance', expression: 'R_cable = 0.433 × 10⁻³ × 120 = 0.052 Ω' },
        { label: 'Voltage drop at 5A', expression: 'ΔV = 5 × 0.052 = 0.26 V' },
      ],
      result: '0.052 Ω, 0.26 V drop at 5A — within the 0.5 V limit.',
      notes: 'Always check voltage drop at the design current, not just resistance. Both matter.',
    },
  },

  // ─── TR SIZING ────────────────────────────────────────────────────────────
  {
    id: 'tr_sizing',
    title: 'TR Sizing',
    category: 'Engineering Analysis',
    icon: 'Cpu',
    route: '/tr',
    standard: 'SAES-X-400 §9 / IEC 62395',
    tags: ['TR', 'transformer', 'rectifier', 'voltage', 'current', 'circuit'],
    summary: 'Determines the minimum transformer-rectifier voltage and current rating required to protect the station.',
    whatItCalculates: `The TR is the power supply for the CP system. It must provide:
1. Enough current to meet the protection requirement (I_design)
2. Enough voltage to drive that current through the full circuit resistance

The minimum TR voltage is:
V_TR_min = V_back_EMF + I_design × (Rg + R_cable_pos + R_cable_neg + R_pipe)`,

    whyItMatters: `An undersized TR cannot drive the required protection current. 
An oversized TR wastes capital expenditure and must be operated at very low output — less stable and efficient.
SAES-X-400 requires a design margin: the selected TR must have rated output ≥ 1.25 × V_min and ≥ 1.25 × I_min.`,

    standardReference: `SAES-X-400 §9 — TR selection and sizing requirements
IEC 62395 — Electrical resistance tracing systems for industrial applications (TR rating standards)
NACE SP0169 §A5 — TR sizing methodology`,

    typicalRanges: [
      { parameter: 'TR rated current range', value: '5–50 A (typical pipeline CP)' },
      { parameter: 'TR rated voltage range', value: '12–50 V (typical)' },
      { parameter: 'Design margin factor', value: '1.25× (SAES-X-400 minimum)' },
      { parameter: 'Back EMF assumption', value: '−0.85 V (Cu/CuSO₄ criterion)' },
      { parameter: 'TR efficiency', value: '≥ 60% (SAES-X-400 requirement)' },
    ],

    commonMistakes: [
      {
        mistake: 'Not applying the 1.25× design margin',
        consequence: 'Without margin, the TR operates at its rating limit. Any increase in soil resistivity, coating degradation, or new segments added will cause the system to fail to achieve protection.',
        fix: 'Always select rated TR output ≥ 1.25 × V_min and ≥ 1.25 × I_min. This is non-negotiable per SAES-X-400.',
      },
      {
        mistake: 'Forgetting the back-EMF in the circuit equation',
        consequence: 'The pipeline is not a simple resistor. There is an electrochemical EMF (approximately −0.85V for the protection criterion) that the TR must overcome before any current flows.',
        fix: 'Include V_back_EMF = 0.85 V in the TR voltage calculation. This is the most commonly omitted term.',
      },
      {
        mistake: 'Using instantaneous current for TR sizing instead of design life current',
        consequence: 'Current requirement increases over design life as coating degrades. Sizing the TR for current-day conditions will leave the system under-protected within 5–10 years.',
        fix: 'Size the TR for the end-of-design-life current requirement.',
      },
    ],

    workedExample: {
      description: 'Station with: I_design = 3.2A, Rg = 0.110 Ω, R_pos = 0.052 Ω, R_neg = 0.041 Ω, V_EMF = 0.85V',
      steps: [
        { label: 'Circuit resistance', expression: 'R_circuit = Rg + R_pos + R_neg = 0.110 + 0.052 + 0.041 = 0.203 Ω' },
        { label: 'Resistive voltage drop', expression: 'ΔV = I × R_circuit = 3.2 × 0.203 = 0.650 V' },
        { label: 'Minimum TR voltage', expression: 'V_min = V_EMF + ΔV = 0.85 + 0.650 = 1.50 V' },
        { label: 'With 1.25× margin', expression: 'V_rated = 1.25 × 1.50 = 1.88 V → select 12V TR (standard)' },
        { label: 'Rated current with margin', expression: 'I_rated = 1.25 × 3.2 = 4.0 A → select 5A TR' },
      ],
      result: 'Select 12V / 5A TR as minimum. Standard sizes available.',
      notes: 'In practice, always select the next standard TR size above the calculated minimum. A 12V/10A unit provides good headroom.',
    },
  },

  // ─── ATTENUATION ANALYSIS ─────────────────────────────────────────────────
  {
    id: 'attenuation',
    title: 'Attenuation Analysis',
    category: 'Engineering Analysis',
    icon: 'Signal',
    route: '/attenuation',
    standard: 'NACE SP0169 / ISO 15589-1',
    tags: ['attenuation', 'transmission line', 'potential', 'drain point', 'pipeline length'],
    summary: 'Models how protection potential attenuates along a pipeline using the transmission-line cosh model.',
    whatItCalculates: `Protection potential does not stay constant along a pipeline. It decays (attenuates) with distance from the CP drain point.
The cosh model from transmission-line theory predicts the potential profile:

V(x) = V₀ × cosh[α(L−x)] / cosh(αL)

where α is the attenuation constant: α = √(r / (R_coating × circumference))`,

    whyItMatters: `A pipeline that appears protected at the TR test point may be under-protected at its far end.
Regulators and Saudi Aramco standards require that the protection criterion is met at every point along the pipeline — not just at the drain point.
The attenuation analysis identifies whether a single drain point is sufficient or whether additional CP stations are required.`,

    standardReference: `NACE SP0169 Appendix A — Mathematical analysis of cathodic protection systems
ISO 15589-1 §10 — Pipeline attenuation calculation
SAES-X-400 §6.4 — Attenuation criteria and drain point spacing`,

    typicalRanges: [
      { parameter: 'Maximum allowable attenuation', value: '< 50 mV from criterion (NACE)' },
      { parameter: 'Maximum drain point spacing', value: '5–40 km depending on coating and soil' },
      { parameter: 'Protection potential criterion', value: '−850 mV (Cu/CuSO₄) or more negative' },
      { parameter: 'Attenuation constant α (well-coated pipeline)', value: '0.001–0.01 /m' },
      { parameter: 'Attenuation constant α (bare pipeline)', value: '0.01–0.1 /m' },
    ],

    commonMistakes: [
      {
        mistake: 'Checking protection criterion only at the drain point test station',
        consequence: 'The potential at the far end of the pipeline segment may be 100–300 mV less negative than at the drain point — potentially under the protection criterion.',
        fix: 'Run the full cosh attenuation model and check the potential at every significant point, especially the segment midpoint and far end.',
      },
      {
        mistake: 'Using new-coating resistivity for long-term attenuation',
        consequence: 'Coating degrades over 25 years. A well-coated pipeline that attenuates slowly today will attenuate faster as coating breaks down.',
        fix: 'Run the attenuation model for both current (new) and end-of-life (degraded) coating conditions.',
      },
      {
        mistake: 'Ignoring the effect of bonds to other structures',
        consequence: 'Bonds, crossings, and foreign structure contacts create current drain points that shorten the effective protection range.',
        fix: 'Model all bonds and foreign structure contacts as drain points in the attenuation analysis.',
      },
    ],

    workedExample: {
      description: 'DN400 pipeline, 8km, ρ_soil = 20 Ω·m, coating resistance = 50,000 Ω·m²',
      steps: [
        { label: 'Pipe resistance per metre', expression: 'r = ρ_steel × 4 / (π × (OD² − ID²)) = 0.000287 Ω/m' },
        { label: 'Coating leakance per metre', expression: 'g = π × OD / R_coating = π × 0.4064 / 50000 = 2.55 × 10⁻⁵ S/m' },
        { label: 'Attenuation constant', expression: 'α = √(r × g) = √(0.000287 × 2.55×10⁻⁵) = 0.00271 /m' },
        { label: 'Potential at 8km (x = L)', expression: 'V(L) = V₀ / cosh(α × L/2) where L = 8000m' },
        { label: 'cosh(αL/2)', expression: 'cosh(0.00271 × 4000) = cosh(10.84) = 27,600' },
        { label: 'V at far end', expression: 'V_far = V₀ / 27,600 — potential nearly zero at far end' },
      ],
      result: 'This pipeline is far too long for a single drain point. Multiple CP stations required.',
      notes: 'The high cosh value shows the potential attenuates to near zero. Reduce segment length or add intermediate drain points.',
    },
  },

  // ─── SOIL RESISTIVITY ─────────────────────────────────────────────────────
  {
    id: 'soil_resistivity',
    title: 'Soil Resistivity',
    category: 'Project Definition',
    icon: 'Layers',
    route: '/resistivity',
    standard: 'ASTM G57 / SAES-X-400',
    tags: ['soil', 'resistivity', 'Wenner', 'survey', 'corrosion', 'electrolyte'],
    summary: 'Interprets Wenner 4-pin resistivity survey data to determine the design soil resistivity for CP calculations.',
    whatItCalculates: `Soil resistivity (ρ) is the primary factor determining both:
1. Corrosion aggressiveness of the soil (low ρ = aggressive)
2. Groundbed efficiency (high ρ = more TR voltage required)

The Wenner method measures apparent resistivity: ρ_a = 2π × a × R
where a = pin spacing and R = measured resistance.`,

    whyItMatters: `Soil resistivity affects virtually every calculation in the CP system:
- Current requirement increases in low-resistivity (aggressive) soil
- Groundbed resistance increases with resistivity
- Attenuation characteristics change significantly with resistivity

Using a wrong design resistivity can cause the entire system to be incorrectly sized.`,

    standardReference: `ASTM G57 — Standard Test Method for Field Measurement of Soil Resistivity Using the Wenner Four-Electrode Method
SAES-X-400 §5 — Soil resistivity survey requirements
NACE SP0169 §6.1 — Corrosivity classification`,

    typicalRanges: [
      { parameter: 'Highly aggressive (< 10 Ω·m)', value: '< 1,000 Ω·cm' },
      { parameter: 'Aggressive (10–30 Ω·m)', value: '1,000–3,000 Ω·cm' },
      { parameter: 'Moderately aggressive (30–100 Ω·m)', value: '3,000–10,000 Ω·cm' },
      { parameter: 'Mildly aggressive (> 100 Ω·m)', value: '> 10,000 Ω·cm' },
      { parameter: 'Saudi Aramco inland soils (typical)', value: '200–2,000 Ω·cm' },
    ],

    commonMistakes: [
      {
        mistake: 'Using the average Wenner reading instead of the minimum',
        consequence: 'CP design must cover the worst-case condition along the entire pipeline route. The minimum resistivity location controls the current requirement.',
        fix: 'Design for the minimum measured resistivity unless the low-resistivity zone is isolated and short enough to treat separately.',
      },
      {
        mistake: 'Measuring resistivity in dry conditions only',
        consequence: 'Saudi Arabia soils can vary 10:1 in resistivity between dry summer and wet winter conditions. Dry measurements give non-conservative (higher) values.',
        fix: 'Measure at representative seasonal conditions or correct for moisture content. SAES-X-400 may specify wet season as design basis.',
      },
      {
        mistake: 'Not converting units correctly between Ω·cm and Ω·m',
        consequence: 'All RAXA formulas use Ω·m internally. Wenner surveys typically report Ω·cm.',
        fix: 'ρ(Ω·m) = ρ(Ω·cm) / 100. Always check units at the boundary between survey data and calculation inputs.',
      },
    ],

    workedExample: {
      description: 'Wenner survey with pin spacing a = 1.5m, measured resistance R = 2.3 Ω',
      steps: [
        { label: 'Apparent resistivity', expression: 'ρ_a = 2π × a × R = 2π × 1.5 × 2.3 = 21.7 Ω·m = 2,170 Ω·cm' },
        { label: 'Corrosivity classification', expression: 'Aggressive (1,000–3,000 Ω·cm)' },
        { label: 'Typical current density', expression: 'Use 12–20 mA/m² for aggressive soil' },
      ],
      result: 'Design resistivity: 2,170 Ω·cm. Aggressive soil — enhanced CP required.',
      notes: 'If multiple measurements are taken, use the minimum for design. Record all measurements for documentation.',
    },
  },

  // ─── DESIGN BASIS ─────────────────────────────────────────────────────────
  {
    id: 'design_basis',
    title: 'Design Basis',
    category: 'Project Definition',
    icon: 'FolderOpen',
    route: '/project',
    standard: 'SAES-X-400 / Company Standards',
    tags: ['design basis', 'project', 'design life', 'standard', 'criterion'],
    summary: 'Defines the fundamental engineering parameters that govern all calculations in the project.',
    whatItCalculates: `The design basis is not a calculation — it is a set of design decisions that define the engineering scope:
- Design life (years) — determines coating degradation and end-of-life current requirement
- Protection criterion (mV) — determines the target potential
- Design standard — determines which formulas and safety factors apply
- Coating system — determines current density tables and coating efficiency factors`,

    whyItMatters: `All 500+ calculations in a CP design project derive from the design basis.
A wrong design life, wrong criterion, or wrong standard selection can invalidate the entire engineering output.
These decisions must be made deliberately and documented before any calculations are performed.`,

    standardReference: `SAES-X-400 §4 — General requirements and design basis
ISO 15589-1 §5 — Design basis for buried pipelines
NACE SP0169 §6 — Criteria for cathodic protection`,

    typicalRanges: [
      { parameter: 'Design life (Saudi Aramco pipelines)', value: '25–40 years' },
      { parameter: 'Protection criterion (soil)', value: '−850 mV (Cu/CuSO₄) or −950 mV (IR-free)' },
      { parameter: 'Protection criterion (marine)', value: '−800 mV (Ag/AgCl)' },
      { parameter: 'Maximum protection potential', value: '−1,200 mV (to prevent coating damage)' },
    ],

    commonMistakes: [
      {
        mistake: 'Setting design life to 20 years for a 25-year project',
        consequence: 'The TR and anode bed will be undersized for the last 5 years of operation, requiring costly replacement.',
        fix: 'Use the full contractual or regulatory design life. Round up to the nearest standard design life bracket.',
      },
      {
        mistake: 'Using instant-off criterion instead of on-potential for SAES-X-400',
        consequence: 'SAES-X-400 uses on-potential criterion of −850 mV for most applications. Some designs incorrectly apply the NACE IR-free criterion, which gives a different current requirement.',
        fix: 'Confirm with the client which criterion applies. For Saudi Aramco projects, default to SAES-X-400 criterion unless specifically told otherwise.',
      },
    ],

    workedExample: {
      description: 'Determining design basis for a new crude oil pipeline',
      steps: [
        { label: 'Design life', expression: '25 years (per SAES-X-400 minimum for major pipelines)' },
        { label: 'Design standard', expression: 'SAES-X-400 (Saudi Aramco project)' },
        { label: 'Protection criterion', expression: '−850 mV Cu/CuSO₄ (on-potential)' },
        { label: 'Coating system', expression: '3-Layer PE (3LPE) — high performance coating' },
        { label: 'End-of-life coating factor', expression: '5% (0.05) for 3LPE at 25 years' },
        { label: 'Temperature range', expression: 'Ambient to 60°C (requires temperature correction)' },
      ],
      result: 'Design basis locked. All subsequent calculations reference these parameters.',
      notes: 'Any change to the design basis after calculations are performed invalidates all results and requires recalculation.',
    },
  },

  // ─── VALIDATION ───────────────────────────────────────────────────────────
  {
    id: 'validation',
    title: 'Engineering Validation',
    category: 'Design Review',
    icon: 'ClipboardCheck',
    route: '/validation',
    standard: 'SAES-X-400 / Internal QA',
    tags: ['validation', 'PASS', 'FAIL', 'checks', 'engineering review', 'QA'],
    summary: 'Automated rule-based checks that verify all engineering outputs meet SAES-X-400 and project requirements.',
    whatItCalculates: `The validation engine applies the rules engine to all calculated results and produces PASS/FAIL/WARN status for each check.
These checks cover:
- Groundbed resistance within limit
- TR voltage and current within rated capacity
- Cable voltage drop within limit
- Design current achievability
- Anode design life meets project life
- Compliance with standard-specific administrative requirements`,

    whyItMatters: `Manual review of complex multi-station CP designs is error-prone. The validation engine:
- Catches errors that would be missed in manual review
- Provides a defensible audit trail for regulatory and client review
- Ensures all SAES-X-400 requirements are systematically checked, not just the ones an engineer happens to remember

A single failed validation check can invalidate an entire station design.`,

    standardReference: `SAES-X-400 — All relevant sections (checks are mapped to specific clauses)
IEC 62395 — Electrical resistance tracing systems
Internal QA checklists`,

    typicalRanges: [
      { parameter: 'Groundbed resistance limit', value: '< 2.0 Ω' },
      { parameter: 'TR voltage headroom', value: '≥ 25% above minimum required' },
      { parameter: 'Cable voltage drop limit', value: '< 0.5 V positive, < 0.3 V negative' },
      { parameter: 'Design life ratio', value: 'Anode life ≥ project design life' },
      { parameter: 'TR current utilization', value: '< 80% of rated current' },
    ],

    commonMistakes: [
      {
        mistake: 'Assuming a green validation dashboard means the design is complete',
        consequence: 'The validation engine checks engineering correctness, not completeness. Design basis must also be correctly specified.',
        fix: 'Treat validation as a necessary but not sufficient condition. Also review design basis inputs for reasonableness.',
      },
      {
        mistake: 'Dismissing WARN status items without investigation',
        consequence: 'WARN items indicate borderline conditions that may fail under worst-case operating conditions.',
        fix: 'Review every WARN item. If acceptable, document the engineering judgment for the file. Do not ignore without review.',
      },
    ],

    workedExample: {
      description: 'Typical validation result interpretation',
      steps: [
        { label: 'Groundbed resistance', expression: '0.110 Ω < 2.0 Ω limit → ✅ PASS' },
        { label: 'TR voltage check', expression: 'V_rated = 12V, V_min = 1.88V, margin = 12/1.88 = 6.4× → ✅ PASS' },
        { label: 'Anode design life', expression: 'Life = 31 years ≥ 25 year design life → ✅ PASS' },
        { label: 'Cable voltage drop', expression: 'ΔV_pos = 0.26V < 0.5V limit → ✅ PASS' },
        { label: 'Overall station status', expression: 'All PASS → Station PASS ✅' },
      ],
      result: 'Station passes all engineering checks.',
      notes: 'A station must pass ALL checks to be PASS. One FAIL anywhere means the station is FAIL.',
    },
  },
]

/**
 * Get all unique categories from the knowledge modules.
 */
export function getKnowledgeCategories() {
  const cats = new Set(KNOWLEDGE_MODULES.map((m) => m.category))
  return ['All', ...Array.from(cats)]
}

/**
 * Search knowledge modules by query text.
 * Matches against title, summary, tags, and content fields.
 *
 * @param {string} query
 * @returns {KnowledgeModule[]}
 */
export function searchKnowledge(query) {
  if (!query || !query.trim()) return KNOWLEDGE_MODULES

  const q = query.toLowerCase().trim()
  return KNOWLEDGE_MODULES.filter((m) => {
    return (
      m.title.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q)) ||
      m.category.toLowerCase().includes(q) ||
      m.whatItCalculates?.toLowerCase().includes(q) ||
      m.whyItMatters?.toLowerCase().includes(q) ||
      m.standard?.toLowerCase().includes(q)
    )
  })
}

/**
 * Get a single knowledge module by ID.
 * @param {string} id
 * @returns {KnowledgeModule|undefined}
 */
export function getKnowledgeModule(id) {
  return KNOWLEDGE_MODULES.find((m) => m.id === id)
}
