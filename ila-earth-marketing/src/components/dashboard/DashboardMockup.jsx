import { motion } from 'framer-motion'
import { MapPin, Activity, CheckCircle, Clock, Radio, TrendingUp } from 'lucide-react'

function PipelineRoute() {
  return (
    <div className="relative h-28">
      <svg viewBox="0 0 400 120" className="w-full h-full">
        <defs>
          <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00D26A" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#00D26A" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#00D26A" stopOpacity="0.15" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <motion.path
          d="M 10 90 Q 60 30 130 50 T 260 40 T 390 70"
          fill="none"
          stroke="url(#pg)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 2 }}
        />
        <motion.path
          d="M 10 90 Q 60 30 130 50 T 260 40 T 390 70"
          fill="none"
          stroke="#00D26A"
          strokeWidth="1"
          strokeDasharray="6 8"
          opacity="0.3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />
        {[
          { cx: 50, cy: 68, n: 'CP-01' },
          { cx: 130, cy: 50, n: 'CP-02' },
          { cx: 210, cy: 48, n: 'CP-03' },
          { cx: 310, cy: 52, n: 'CP-04' },
        ].map((p, i) => (
          <g key={i}>
            <motion.circle
              cx={p.cx} cy={p.cy} r="5"
              fill="#00D26A"
              filter="url(#glow)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.2, duration: 0.4 }}
            />
            <motion.circle
              cx={p.cx} cy={p.cy} r="12"
              fill="none" stroke="#00D26A" strokeWidth="1"
              opacity="0.2"
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.8, 1] }}
              transition={{ delay: 0.3 + i * 0.2, duration: 2.5, repeat: Infinity }}
            />
            <text x={p.cx - 12} y={p.cy - 10} fill="#5B6572" fontSize="7" fontFamily="monospace">
              {p.n}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, trend }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-bg/40 p-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-dim">
        <Icon size={12} className="text-green" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] text-text-tertiary uppercase tracking-wider truncate">{label}</p>
        <p className="text-sm font-semibold text-text-primary">{value}</p>
      </div>
      {trend && (
        <div className="flex items-center gap-0.5 text-[10px] text-green">
          <TrendingUp size={10} />
          <span>{trend}</span>
        </div>
      )}
    </div>
  )
}

export default function DashboardMockup() {
  return (
    <motion.div
      className="glass rounded-2xl overflow-hidden border border-border-light"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.2 }}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-green">
            <span className="h-2 w-2 rounded-full bg-green animate-ping opacity-75" />
          </span>
          <span className="text-xs font-medium text-text-secondary">Pipeline Monitor</span>
        </div>
        <span className="text-[10px] text-text-tertiary font-mono">ILA-EARTH-01</span>
      </div>

      <div className="p-5 space-y-4">
        <PipelineRoute />

        <div className="flex items-center justify-between text-[10px] text-text-tertiary">
          <div className="flex items-center gap-2">
            <Clock size={10} />
            <span>Last sync: 2 min ago</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio size={10} className="text-green" />
            <span className="text-green">Online</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MiniStat icon={MapPin} label="GIS Points" value="1,247" trend="+12" />
          <MiniStat icon={Activity} label="CP Readings" value="8,432" trend="+5.2%" />
          <MiniStat icon={CheckCircle} label="Pass Rate" value="98.6%" trend="+1.4%" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-text-tertiary">Survey Progress</span>
            <span className="font-mono text-green">78%</span>
          </div>
          <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-green/60 to-green"
              initial={{ width: 0 }}
              animate={{ width: '78%' }}
              transition={{ duration: 1.5, delay: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['Survey', 'Validated', 'Review', 'Approved'].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`text-[9px] px-2 py-0.5 rounded font-medium ${
                i < 3 ? 'bg-green-dim text-green' : 'bg-bg-elevated text-text-tertiary'
              }`}>
                {s}
              </div>
              {i < 3 && <span className="text-text-tertiary text-[7px]">→</span>}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-text-tertiary pt-1 border-t border-border">
          <FileTextIcon />
          <span>3 reports ready for export</span>
        </div>
      </div>
    </motion.div>
  )
}

function FileTextIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00D26A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}
