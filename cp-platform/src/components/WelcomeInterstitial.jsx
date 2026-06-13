/**
 * WelcomeInterstitial.jsx
 *
 * Brief interstitial screen shown AFTER successful login, before routing
 * to the dashboard. Gives the user a moment to see "you're signed in"
 * with their email/avatar while the dashboard mounts.
 *
 * Auto-dismisses after ~1.2s and calls onContinue.
 */

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'

export function WelcomeInterstitial({
  email,
  displayName,
  onContinue,
  duration = 1200,
  testId = 'welcome-interstitial',
}) {
  const [phase, setPhase] = useState('loading') // 'loading' | 'ready' | 'leaving'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('ready'), Math.min(400, duration / 3))
    const t2 = setTimeout(() => {
      setPhase('leaving')
      setTimeout(onContinue, 200) // wait for exit animation
    }, duration)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [duration, onContinue])

  return (
    <div className={`welcome welcome--${phase}`} data-testid={testId}>
      <div className="welcome__inner">
        <div className="welcome__check" aria-hidden="true">
          {phase === 'loading' ? <Loader2 size={36} className="spin" /> : <CheckCircle2 size={36} />}
        </div>
        <h1 className="welcome__title">
          {phase === 'ready' || phase === 'leaving' ? 'Welcome back' : 'Signing you in…'}
        </h1>
        <p className="welcome__email">{displayName || email}</p>
        <div className="welcome__loader" role="progressbar" aria-busy={phase === 'loading'}>
          <div className="welcome__loader-fill" />
        </div>
        {phase === 'ready' && (
          <div className="welcome__sparkle" aria-hidden="true">
            <Sparkles size={14} />
            <span>All systems ready</span>
          </div>
        )}
      </div>
    </div>
  )
}
