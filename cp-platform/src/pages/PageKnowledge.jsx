/**
 * M9 — Learning Foundation
 * PageKnowledge.jsx — In-app engineering knowledge base
 *
 * Static content only — no engine changes, no backend.
 * Searchable, categorized, two-level display (summary + detail on expand).
 */

import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Tag,
  Target,
  AlertTriangle,
  CheckCircle2,
  BookMarked,
  FlaskConical,
  Zap,
  Layers,
  Cable,
  Cpu,
  Signal,
  FolderOpen,
  ClipboardCheck,
  X,
} from 'lucide-react'
import {
  KNOWLEDGE_MODULES,
  getKnowledgeCategories,
  searchKnowledge,
} from '../knowledge/engineeringKnowledge.js'

// ─── Icon Map ────────────────────────────────────────────────────────────────

const ICON_MAP = {
  Zap,
  Layers,
  Cable,
  Cpu,
  Signal,
  FolderOpen,
  ClipboardCheck,
  BookOpen,
}

function ModuleIcon({ name, size = 18 }) {
  const Icon = ICON_MAP[name] || BookOpen
  return <Icon size={size} />
}

// ─── Category Badge ──────────────────────────────────────────────────────────

function CategoryBadge({ category }) {
  const colors = {
    'Engineering Analysis': { bg: 'var(--accent-blue-subtle, rgba(59,130,246,0.12))', color: 'var(--accent-blue, #60a5fa)' },
    'Project Definition':   { bg: 'var(--accent-teal-subtle, rgba(20,184,166,0.12))',  color: 'var(--accent-teal, #2dd4bf)' },
    'Design Review':        { bg: 'var(--accent-purple-subtle, rgba(168,85,247,0.12))', color: 'var(--accent-purple, #c084fc)' },
  }
  const style = colors[category] || { bg: 'var(--surface-2)', color: 'var(--text-secondary)' }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.03em',
      background: style.bg,
      color: style.color,
    }}>
      {category}
    </span>
  )
}

// ─── Standard Badge ──────────────────────────────────────────────────────────

function StandardRef({ text }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 7px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 500,
      background: 'rgba(234,179,8,0.10)',
      color: 'var(--warn, #eab308)',
      border: '1px solid rgba(234,179,8,0.20)',
    }}>
      <BookMarked size={11} />
      {text}
    </span>
  )
}

// ─── Mistake Card ────────────────────────────────────────────────────────────

function MistakeCard({ mistake, consequence, fix }) {
  return (
    <div style={{
      borderRadius: 8,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      marginBottom: 8,
    }}>
      <div style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        padding: '10px 12px',
        background: 'rgba(239,68,68,0.06)',
        borderBottom: '1px solid var(--border)',
      }}>
        <AlertTriangle size={14} color="var(--fail, #ef4444)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            ❌ {mistake}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {consequence}
          </div>
        </div>
      </div>
      <div style={{
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        padding: '10px 12px',
        background: 'rgba(34,197,94,0.04)',
      }}>
        <CheckCircle2 size={14} color="var(--pass, #22c55e)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--pass)', fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 2 }}>
            ✓ FIX
          </strong>
          {fix}
        </div>
      </div>
    </div>
  )
}

// ─── Worked Example ──────────────────────────────────────────────────────────

function WorkedExample({ example }) {
  return (
    <div style={{
      borderRadius: 8,
      border: '1px solid rgba(99,102,241,0.25)',
      background: 'rgba(99,102,241,0.04)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(99,102,241,0.15)',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}>
        <FlaskConical size={14} color="var(--accent-blue, #818cf8)" />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue, #818cf8)', letterSpacing: '0.04em' }}>
          WORKED EXAMPLE
        </span>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          marginBottom: 12,
          fontStyle: 'italic',
        }}>
          {example.description}
        </div>

        <div style={{
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          marginBottom: 10,
        }}>
          {example.steps.map((step, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              borderBottom: i < example.steps.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                padding: '7px 10px',
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontWeight: 500,
                background: 'var(--surface-2)',
                borderRight: '1px solid var(--border)',
              }}>
                {step.label}
              </div>
              <div style={{
                padding: '7px 10px',
                fontSize: 12,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                color: 'var(--text-primary)',
              }}>
                {step.expression}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex',
          gap: 6,
          alignItems: 'flex-start',
          padding: '8px 10px',
          borderRadius: 6,
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.20)',
          marginBottom: example.notes ? 8 : 0,
        }}>
          <CheckCircle2 size={13} color="var(--pass)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: 'var(--pass)', fontWeight: 600 }}>
            {example.result}
          </div>
        </div>

        {example.notes && (
          <div style={{
            fontSize: 11.5,
            color: 'var(--text-tertiary)',
            fontStyle: 'italic',
            lineHeight: 1.6,
            marginTop: 6,
            paddingLeft: 4,
          }}>
            💡 {example.notes}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Typical Ranges Table ────────────────────────────────────────────────────

function RangesTable({ ranges }) {
  return (
    <div style={{
      borderRadius: 6,
      overflow: 'hidden',
      border: '1px solid var(--border)',
    }}>
      {ranges.map((row, i) => (
        <div key={i} style={{
          display: 'grid',
          gridTemplateColumns: '1fr 160px',
          borderBottom: i < ranges.length - 1 ? '1px solid var(--border)' : 'none',
        }}>
          <div style={{
            padding: '7px 10px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            background: 'var(--surface-2)',
            borderRight: '1px solid var(--border)',
          }}>
            {row.parameter}
          </div>
          <div style={{
            padding: '7px 10px',
            fontSize: 12,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            color: 'var(--text-primary)',
            fontWeight: 500,
          }}>
            {row.value}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Knowledge Module Card ───────────────────────────────────────────────────

function KnowledgeCard({ module, isExpanded, onToggle }) {
  const navigate = useNavigate()

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${isExpanded ? 'var(--accent-blue, #818cf8)' : 'var(--border)'}`,
      background: 'var(--surface-1)',
      overflow: 'hidden',
      transition: 'border-color 0.15s ease',
    }}>
      {/* ── Card Header (always visible) ── */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
          background: isExpanded ? 'rgba(99,102,241,0.04)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s ease',
        }}
      >
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'rgba(99,102,241,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-blue, #818cf8)',
          flexShrink: 0,
        }}>
          <ModuleIcon name={module.icon} size={16} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {module.title}
            </span>
            <CategoryBadge category={module.category} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6 }}>
            {module.summary}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <StandardRef text={module.standard} />
            {module.tags.slice(0, 4).map((tag) => (
              <span key={tag} style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 3,
                background: 'var(--surface-2)',
                color: 'var(--text-tertiary)',
                fontWeight: 500,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div style={{
          color: 'var(--text-tertiary)',
          transition: 'transform 0.2s ease',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          flexShrink: 0,
          marginTop: 4,
        }}>
          <ChevronRight size={16} />
        </div>
      </button>

      {/* ── Expanded Detail ── */}
      {isExpanded && (
        <div style={{
          padding: '0 18px 20px 18px',
          borderTop: '1px solid var(--border)',
        }}>
          {/* Go to page button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, marginBottom: 16 }}>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => navigate(module.route)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <ExternalLink size={12} />
              Open {module.title}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* What it calculates */}
              <div>
                <h4 style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <Target size={12} />
                  WHAT IT CALCULATES
                </h4>
                <p style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                }}>
                  {module.whatItCalculates}
                </p>
              </div>

              {/* Why it matters */}
              <div>
                <h4 style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <AlertTriangle size={12} />
                  WHY IT MATTERS
                </h4>
                <p style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                }}>
                  {module.whyItMatters}
                </p>
              </div>

              {/* Standard reference */}
              <div>
                <h4 style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-tertiary)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <BookMarked size={12} />
                  STANDARD REFERENCE
                </h4>
                <p style={{
                  fontSize: 12.5,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                  fontFamily: 'inherit',
                }}>
                  {module.standardReference}
                </p>
              </div>

              {/* Typical ranges */}
              {module.typicalRanges && (
                <div>
                  <h4 style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <Tag size={12} />
                    TYPICAL RANGES
                  </h4>
                  <RangesTable ranges={module.typicalRanges} />
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Common mistakes */}
              {module.commonMistakes && (
                <div>
                  <h4 style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <AlertTriangle size={12} />
                    COMMON MISTAKES
                  </h4>
                  {module.commonMistakes.map((m, i) => (
                    <MistakeCard key={i} {...m} />
                  ))}
                </div>
              )}

              {/* Worked example */}
              {module.workedExample && (
                <div>
                  <h4 style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-tertiary)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <FlaskConical size={12} />
                    WORKED EXAMPLE
                  </h4>
                  <WorkedExample example={module.workedExample} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function PageKnowledge() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [expandedId, setExpandedId] = useState(null)

  const categories = useMemo(() => getKnowledgeCategories(), [])

  const results = useMemo(() => {
    const searched = searchKnowledge(query)
    if (activeCategory === 'All') return searched
    return searched.filter((m) => m.category === activeCategory)
  }, [query, activeCategory])

  const handleToggle = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const handleClearSearch = useCallback(() => {
    setQuery('')
  }, [])

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.20), rgba(168,85,247,0.15))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-blue, #818cf8)',
          }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Engineering Knowledge Base
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Reference guide for CP engineering calculations, standards, and common pitfalls
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'flex',
          gap: 20,
          marginTop: 16,
          padding: '10px 16px',
          borderRadius: 8,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          width: 'fit-content',
        }}>
          {[
            { label: 'Engineering modules', value: KNOWLEDGE_MODULES.length },
            { label: 'Standards covered', value: '5' },
            { label: 'Common mistakes documented', value: KNOWLEDGE_MODULES.reduce((n, m) => n + (m.commonMistakes?.length ?? 0), 0) },
            { label: 'Worked examples', value: KNOWLEDGE_MODULES.filter((m) => m.workedExample).length },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-blue, #818cf8)' }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search box */}
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 480 }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 11,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
            }}
          />
          <input
            id="knowledge-search"
            type="text"
            placeholder="Search formulas, standards, topics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 36px 9px 34px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-1)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {query && (
            <button
              onClick={handleClearSearch}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: '1px solid',
                borderColor: activeCategory === cat ? 'var(--accent-blue, #818cf8)' : 'var(--border)',
                background: activeCategory === cat ? 'rgba(99,102,241,0.12)' : 'var(--surface-1)',
                color: activeCategory === cat ? 'var(--accent-blue, #818cf8)' : 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: activeCategory === cat ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Result count ── */}
      {query && (
        <div style={{
          fontSize: 12,
          color: 'var(--text-tertiary)',
          marginBottom: 12,
        }}>
          {results.length === 0
            ? `No results for "${query}"`
            : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
        </div>
      )}

      {/* ── Module Cards ── */}
      {results.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-tertiary)',
        }}>
          <BookOpen size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No modules found</div>
          <div style={{ fontSize: 13 }}>Try a different search term or category</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map((module) => (
            <KnowledgeCard
              key={module.id}
              module={module}
              isExpanded={expandedId === module.id}
              onToggle={() => handleToggle(module.id)}
            />
          ))}
        </div>
      )}

      {/* ── Footer Note ── */}
      <div style={{
        marginTop: 32,
        padding: '14px 18px',
        borderRadius: 8,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        fontSize: 12,
        color: 'var(--text-tertiary)',
        lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--text-secondary)' }}>📌 Engineering Note:</strong>{' '}
        This knowledge base is for educational reference only. All engineering calculations are performed
        by the RAXA calculation engine using the formulas and standards defined in{' '}
        <code style={{ fontSize: 11 }}>src/engine/modules/</code>. Never override engine outputs manually.
        The traceability panel on each calculation page links results to their specific formula and standard clause.
      </div>
    </div>
  )
}
