export const workspaceRegistry = {
  pipeline: {
    id: 'pipeline',
    name: 'Raxa Pipeline',
    enabled: true,
    description: 'Impressed Current Cathodic Protection (ICCP) & Galvanic design for transmission pipelines.',
    iconName: 'Route',
  },
  tank: {
    id: 'tank',
    name: 'Raxa Tank',
    enabled: false,
    description: 'Cathodic protection design for above-ground storage tank bottoms.',
    iconName: 'Layers',
  },
  vessel: {
    id: 'vessel',
    name: 'Raxa Vessel',
    enabled: false,
    description: 'Internal and external corrosion protection for pressure vessels and separators.',
    iconName: 'Database',
  },
  plant: {
    id: 'plant',
    name: 'Raxa Plant',
    enabled: false,
    description: 'Complex grounding and cathodic protection grid analysis for industrial facilities.',
    iconName: 'Cpu',
  },
  survey: {
    id: 'survey',
    name: 'Raxa Survey',
    enabled: false,
    description: 'CIS (Close Interval Survey) and DCVG data processing and visualization.',
    iconName: 'Signal',
  },
  integrity: {
    id: 'integrity',
    name: 'Raxa Integrity',
    enabled: false,
    description: 'Pipeline fitness-for-service (FFS), crack growth, and anomaly assessment.',
    iconName: 'Shield',
  },
}
