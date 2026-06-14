/**
 * stationSpacing.js
 *
 * Recommends optimal CP station spacing based on attenuation profile analysis.
 * Uses the protection criteria to determine where additional stations are needed.
 */

/**
 * Recommend station spacing based on profile analysis.
 *
 * @param {Array<{km: number, combinedPotentialMv: number, isProtected: boolean}>} profile
 * @param {Array<{id: string, positionKm: number}>} currentStations
 * @param {number} [minimumMv=850] - Protection criterion in mV
 * @param {number} [maxAllowedGapKm=10] - Maximum allowed gap between protected zones
 * @returns {object} Spacing recommendation
 */
export function recommendSpacing(profile, currentStations, minimumMv = 850, maxAllowedGapKm = 10) {
  if (!profile?.length || !currentStations?.length) {
    return {
      currentSpacingKm: 0,
      recommendedSpacingKm: 0,
      currentStationCount: currentStations?.length || 0,
      recommendedStationCount: currentStations?.length || 0,
      gaps: [],
      expectedImprovement: null,
    }
  }

  // Current average spacing
  const sortedStations = [...currentStations].sort((a, b) => a.positionKm - b.positionKm)
  let totalGap = 0
  for (let i = 1; i < sortedStations.length; i++) {
    totalGap += sortedStations[i].positionKm - sortedStations[i - 1].positionKm
  }
  const currentSpacingKm = sortedStations.length > 1
    ? totalGap / (sortedStations.length - 1)
    : profile[profile.length - 1].km - profile[profile].km

  // Find unprotected gaps
  const gaps = []
  let inGap = false
  let gapStart = null

  for (const p of profile) {
    if (!p.isProtected && !inGap) {
      inGap = true
      gapStart = p.km
    } else if (p.isProtected && inGap) {
      inGap = false
      gaps.push({ startKm: gapStart, endKm: p.km, lengthKm: p.km - gapStart })
    }
  }
  // Close trailing gap
  if (inGap && gapStart != null) {
    gaps.push({
      startKm: gapStart,
      endKm: profile[profile.length - 1].km,
      lengthKm: profile[profile.length - 1].km - gapStart,
    })
  }

  // Recommend additional stations for gaps exceeding threshold
  const additionalStations = []
  for (const gap of gaps) {
    if (gap.lengthKm > maxAllowedGapKm) {
      const count = Math.ceil(gap.lengthKm / maxAllowedGapKm)
      const step = gap.lengthKm / (count + 1)
      for (let i = 1; i <= count; i++) {
        additionalStations.push({
          positionKm: gap.startKm + step * i,
          reason: `Gap ${gap.startKm.toFixed(1)}–${gap.endKm.toFixed(1)} km`,
        })
      }
    }
  }

  const recommendedStationCount = currentStations.length + additionalStations.length
  const recommendedSpacingKm = additionalStations.length > 0
    ? maxAllowedGapKm
    : currentSpacingKm

  // Expected improvement: rough estimate based on additional stations
  const protectedPct = profile.filter((p) => p.isProtected).length / profile.length * 100
  const expectedImprovement = additionalStations.length > 0
    ? {
        additionalStations: additionalStations.length,
        expectedProtectedPctIncrease: Math.min(100 - protectedPct, additionalStations.length * 8),
        currentProtectedPct: protectedPct,
      }
    : null

  return {
    currentSpacingKm,
    recommendedSpacingKm,
    currentStationCount: currentStations.length,
    recommendedStationCount,
    gaps,
    additionalStations,
    expectedImprovement,
  }
}
