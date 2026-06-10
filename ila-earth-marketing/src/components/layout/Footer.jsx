import { Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg-surface">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col items-center gap-8 text-center md:flex-row md:items-start md:justify-between md:text-left">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green/10 border border-green/20">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-sm font-bold">
                ILA <span className="text-green">Earth</span>
              </span>
            </div>
            <p className="text-xs text-text-tertiary max-w-xs">
              Engineering Intelligence Platform for Critical Infrastructure
            </p>
            <p className="text-[11px] text-text-tertiary">A product of R World Technologies</p>
          </div>

          <div className="flex flex-col items-center gap-3 md:items-end">
            <a
              href="mailto:support@ilaearth.tech"
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-green transition-colors"
            >
              <Mail size={14} className="text-green" />
              support@ilaearth.tech
            </a>
            <div className="flex gap-5">
              <a href="#" className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center">
          <p className="text-xs text-text-tertiary">
            &copy; {new Date().getFullYear()} R World Technologies. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
