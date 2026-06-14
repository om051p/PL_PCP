export { VisualizationCanvas } from './VisualizationCanvas.jsx'
export { ZoomPan } from './ZoomPan.jsx'
export { VizTooltip } from './VizTooltip.jsx'
export { VizLegend } from './VizLegend.jsx'
export { VizAxis } from './VizAxis.jsx'
export { VizGrid } from './VizGrid.jsx'
export { ScenarioToggle } from './ScenarioToggle.jsx'
export { ProtectionBand } from './ProtectionBand.jsx'
export { EmptyState } from './EmptyState.jsx'
export { PipelineOverviewCanvas } from './PipelineOverviewCanvas.jsx'
export { GroundbedVisualizer } from './GroundbedVisualizer.jsx'
export { CableNetworkVisualizer } from './CableNetworkVisualizer.jsx'
export { RightSideEngineeringPanel } from './sidePanel/RightSideEngineeringPanel.jsx'
export { GroundbedWidgets } from './sidePanel/pageWidgets/GroundbedWidgets.jsx'
export { CableWidgets } from './sidePanel/pageWidgets/CableWidgets.jsx'
export { PipelineWidgets } from './sidePanel/pageWidgets/PipelineWidgets.jsx'
export {
  KpiCard,
  KpiGrid,
  RadialGauge,
  DonutChart,
  StatusList,
  InsightCard,
  InsightList,
  FlowIndicator,
  DepthProfile,
  WorkflowProgress,
  ActivityFeed,
  CalculationInputsUsed,
  SoilResistivitySection,
} from './sidePanel/widgets/index.js'

// Input summary builders (pure functions, not components)
import { buildGroundbedInputsUsed, buildCableInputsUsed, buildAttenuationInputsUsed } from './sidePanel/inputSummaries.js'

// Visualization 2.0 — Shared components
export { EngineeringKPIRow } from './shared/EngineeringKPIRow.jsx'
export { RiskZoneBackground, RiskZoneBands } from './shared/RiskZoneBackground.jsx'
export { AnimatedCurrentFlow, DirectionalArrow, CurrentLabel } from './shared/AnimatedCurrentFlow.jsx'
export { OptimizationSuggestion } from './shared/OptimizationSuggestion.jsx'
export { EngineeringGauge, GaugeRow } from './shared/EngineeringGauge.jsx'

// Visualization 2.0 — Module-specific components
export { SensitivitySliders } from './SensitivitySliders.jsx'
export { CriticalKPDetector } from './CriticalKPDetector.jsx'
export { StationSpacingRecommendation } from './StationSpacingRecommendation.jsx'
export { CableHeatMap } from './CableHeatMap.jsx'
export { CableContributionChart } from './CableContributionChart.jsx'
export { CableOptimizationPanel } from './CableOptimizationPanel.jsx'
export { GroundbedGaugeRow } from './GroundbedGaugeRow.jsx'
export { GroundbedOptimizationPanel } from './GroundbedOptimizationPanel.jsx'
export { SoilColumnVisualization } from './SoilColumnVisualization.jsx'
export { CorrosivityGauge } from './CorrosivityGauge.jsx'
export { SoilImpactPanel } from './SoilImpactPanel.jsx'
export { SurveyQualityScore } from './SurveyQualityScore.jsx'
export { PipelineRouteMap } from './PipelineRouteMap.jsx'
export { PipelineTimeline } from './PipelineTimeline.jsx'
export { ProjectStatusDashboard } from './ProjectStatusDashboard.jsx'

export {
  buildGroundbedInputsUsed,
  buildCableInputsUsed,
  buildAttenuationInputsUsed,
}
