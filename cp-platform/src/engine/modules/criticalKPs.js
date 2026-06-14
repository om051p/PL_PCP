/**
 * criticalKPs.js
 *
 * Detects critical key points in an attenuation profile:
 * - Maximum attenuation point (steepest voltage drop)
 * - Minimum protection point (lowest combined potential)
 * - Critical distance threshold (where protection criterion is first/last met)
 */

/**
 * Find critical key points in an attenuation profile.
 *
 * @param {Array<{km: number, combinedPotentialMv: number, isProtected: boolean}>} profile
 * @param {number} [minimumMv=850] - Protection criterion in mV
 * @returns {object} Critical KP data
 */
export function findCriticalKPs(profile, minimumMv = 850) {
  if (!profile?.length) {
    return {
      maxAttenuationPoint: null,
      minProtectionPoint: null,
      firstProtectedKm: null,
      lastProtectedKm: null,
      unprotectedLengthKm: 0,
      criticalDistanceKm: null,
    }
  }

  // Minimum protection point (lowest combined potential)
  let minPoint = profile[0]
  for (const p of profile) {
    if (p.combinedPotentialMv < minPoint.combinedPotentialMv) {
      minPoint = p
    }
  }

  // Maximum attenuation point (steepest drop between consecutive points)
  let maxAttenIdx = 0
  let maxAttenSlope = 0
  for (let i = 1; i < profile.length; i++) {
    const dx = profile[i].km - profile[i - 1].km
    if (dx === 0) continue
    const slope = Math.abs(profile[i].combinedPotentialMv - profile[i - 1].combinedPotentialMv) / dx
    if (slope > maxAttenSlope) {
      maxAttenSlope = slope
      maxAttenIdx = i
    }
  }
  const maxAttenuationPoint = profile[maxAttenIdx]
    ? {
        km: profile[maxAttenIdx].km,
        potentialMv: profile[maxAttenIdx].combinedPotentialMv,
        slopePerKm: maxAttenSlope,
      }
    : null

  // First/last protected points
  const protectedPoints = profile.filter((p) => p.isProtected)
  const firstProtectedKm = protectedPoints.length > 0 ? protectedPoints[0].km : null
  const lastProtectedKm = protectedPoints.length > 0 ? protectedPoints[protectedPoints.length - 1].km : null

  // Critical distance: furthest point from any protected zone
  let maxUnprotectedGap = 0
  let criticalDistanceKm = null
  let prevProtectedKm = null

  for (const p of profile) {
    if (p.isProtected) {
      if (prevProtectedKm != null) {
        const gap = p.km - prevProtectedKm
        if (gap > maxUnprotectedGap) {
          maxUnprotectedGap = gap
          criticalDistanceKm = prevProtectedKm + gap / 2
        }
      }
      prevProtectedKm = p.km
    }
  }

  // Unprotected length
  const unprotectedLengthKm = profile.filter((p) => !p.isProtected).length > 0
    ? (profile[profile.length - 1].km - profile[0].km) -
      (protectedPoints.length > 0
        ? protectedPoints.reduce((sum, p, i) => {
            if (i === 0) return 0
            const prev = protectedPoints[i - 1]
            return sum + (p.km - prev.km)
          }, 0)
        : 0)
    : 0

  return {
    maxAttenuationPoint,
    minProtectionPoint: {
      km: minPoint.km,
      potentialMv: minPoint.combinedPotentialMv,
      isProtected: minPoint.isProtected,
    },
    firstProtectedKm,
    lastProtectedKm,
    unprotectedLengthKm: Math.max(0, unprotectedLengthKm),
    criticalDistanceKm,
  }
}
