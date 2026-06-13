/**
 * InputLinkView.jsx
 *
 * Renders the full input-link dependency map for a designBasis field.
 * Used in:
 *   - PageProjectSetup "Input Dependencies" section
 *   - CalculationTraceability (extended mode)
 *
 * Three modes:
 *   - 'field' : show one field's downstream consumers (default)
 *   - 'module': show all fields consumed by one module
 *   - 'all'   : show the full table for the audit report view
 */

import { useState, useMemo } from 'react'
import { Link2, ChevronRight, Package, ShieldCheck, Sigma, Layers, Cpu, Wrench, FlaskConical } from 'lucide-react'
import {
  INPUT_LINKS,
  INPUT_GROUPS,
  getConsumers,
  getInputsForModule,
  getAuditSummary,
} from '../engine/inputLinkRegistry.js'

const GROUP_ICONS = {
  environment: Layers,
  project: Package,
  electrical: Cpu,
  material: Wrench,
  site: FlaskConical,
}

const GROUP_LABELS = {
  environment: 'Environment',
  project: 'Project',
  electrical: 'Electrical',
  material: 'Material',
  site: 'Site',
}

function GroupBadge({ group }) {
  const Icon = GROUP_ICONS[group] || Sigma
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 3, fontSize: 9.5, background: 'var(--surface)', color: 'var(--text-tertiary)', border: '1px solid var(--border)', fontWeight: 500 }}>
      <Icon size={9} />
      {GROUP_LABELS[group] || group}
    </span>
  )
}

function ConsumerRow({ consumer }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 180px', gap: 8, padding: '5px 8px', borderBottom: '1px dashed var(--border)', fontSize: 11.5, alignItems: 'center' }}>
      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{consumer.module}</span>
      <code style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={consumer.path}>
        {consumer.path}
      </code>
      <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{consumer.purpose}</span>
    </div>
  )
}

export function InputLinkView({ fieldName, mode = 'field' }) {
  if (mode === 'audit') return <AuditSummaryView />
  if (mode === 'module') return <ModuleView moduleName={fieldName} />
  return <FieldView fieldName={fieldName} />
}

function FieldView({ fieldName }) {
  const link = INPUT_LINKS[fieldName]
  if (!link) {
    return (
      <div style={{ padding: 12, color: 'var(--text-tertiary)', fontSize: 11 }}>
        Unknown input: <code>{fieldName}</code>
      </div>
    )
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Sigma size={12} style={{ color: 'var(--brand-mid)' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          {link.label}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-tertiary)' }}>({link.unit || '—'})</span>
        <GroupBadge group={link.group} />
        <span style={{ marginLeft: 'auto', fontSize: 9.5, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{link.standard}</span>
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 10 }}>{link.description}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <ChevronRight size={11} style={{ color: 'var(--brand-mid)' }} />
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>
          Downstream Consumers ({link.consumers.length})
        </span>
      </div>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 180px', gap: 8, padding: '5px 8px', borderBottom: '1px solid var(--border)', fontSize: 9.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          <span>Module</span>
          <span>Field Path</span>
          <span>Purpose</span>
        </div>
        {link.consumers.map((c, i) => <ConsumerRow key={i} consumer={c} />)}
      </div>

      {link.validationRules?.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <ShieldCheck size={11} style={{ color: 'var(--brand-mid)' }} />
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>Validation rules:</span>
          {link.validationRules.map((r) => (
            <span key={r} style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', background: 'var(--surface)', padding: '1px 5px', borderRadius: 2, border: '1px solid var(--border)' }}>
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ModuleView({ moduleName }) {
  const fields = getInputsForModule(moduleName)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Cpu size={12} style={{ color: 'var(--brand-mid)' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Inputs consumed by {moduleName}</span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>({fields.length})</span>
      </div>
      {fields.length === 0 ? (
        <div style={{ padding: 12, color: 'var(--text-tertiary)', fontSize: 11 }}>No audited inputs consumed by this module.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fields.map((f) => (
            <div key={f.name} style={{ padding: 8, background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600 }}>{f.label}</span>
                <GroupBadge group={f.group} />
              </div>
              <ul style={{ margin: 0, paddingLeft: 14, fontSize: 10.5, color: 'var(--text-secondary)' }}>
                {f.consumers.filter((c) => c.module === moduleName).map((c, i) => (
                  <li key={i} style={{ marginBottom: 2 }}>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>{c.path}</code> — {c.purpose}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AuditSummaryView() {
  const summary = getAuditSummary()
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
        <KpiTile label="Inputs Audited" value={summary.fieldCount} accent="var(--brand-mid)" />
        <KpiTile label="Consumer Links" value={summary.totalConsumers} accent="var(--brand-mid)" />
        <KpiTile label="Downstream Modules" value={summary.moduleCount} accent="var(--brand-mid)" />
        <KpiTile label="Coverage" value={`${summary.coveragePct}%`} accent="var(--pass)" />
      </div>

      {Object.entries(INPUT_GROUPS).map(([group, links]) => {
        const Icon = GROUP_ICONS[group] || Sigma
        return (
          <div key={group} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <Icon size={12} style={{ color: 'var(--brand-mid)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{GROUP_LABELS[group] || group}</span>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>({links.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {links.map((link) => (
                <FieldRow key={link.label} link={link} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KpiTile({ label, value, accent }) {
  return (
    <div style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600, color: accent, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function FieldRow({ link }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 80px 1fr', gap: 8, padding: '5px 8px', background: 'var(--surface)', borderRadius: 3, border: '1px solid var(--border)', fontSize: 11, alignItems: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 }}>{link.label}</span>
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{link.unit || '—'}</span>
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
        {link.consumers.length} consumer{link.consumers.length !== 1 ? 's' : ''} · {link.standard}
      </span>
    </div>
  )
}
