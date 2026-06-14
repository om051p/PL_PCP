/**
 * M9 — Learning Foundation — Tests
 * engineeringKnowledge.test.js
 */

import { describe, it, expect } from 'vitest'
import {
  KNOWLEDGE_MODULES,
  getKnowledgeCategories,
  searchKnowledge,
  getKnowledgeModule,
} from './engineeringKnowledge.js'

describe('KNOWLEDGE_MODULES structure', () => {
  it('contains at least 6 modules', () => {
    expect(KNOWLEDGE_MODULES.length).toBeGreaterThanOrEqual(6)
  })

  it('every module has required fields', () => {
    for (const m of KNOWLEDGE_MODULES) {
      expect(m.id, `${m.id} missing id`).toBeTruthy()
      expect(m.title, `${m.id} missing title`).toBeTruthy()
      expect(m.category, `${m.id} missing category`).toBeTruthy()
      expect(m.summary, `${m.id} missing summary`).toBeTruthy()
      expect(m.standard, `${m.id} missing standard`).toBeTruthy()
      expect(Array.isArray(m.tags), `${m.id} tags must be array`).toBe(true)
    }
  })

  it('every module has worked example with valid shape', () => {
    const withExample = KNOWLEDGE_MODULES.filter((m) => m.workedExample)
    expect(withExample.length).toBeGreaterThan(0)
    for (const m of withExample) {
      expect(Array.isArray(m.workedExample.steps)).toBe(true)
      expect(m.workedExample.result).toBeTruthy()
    }
  })

  it('every module has common mistakes with fix', () => {
    const withMistakes = KNOWLEDGE_MODULES.filter((m) => m.commonMistakes)
    expect(withMistakes.length).toBeGreaterThan(0)
    for (const m of withMistakes) {
      for (const mis of m.commonMistakes) {
        expect(mis.mistake).toBeTruthy()
        expect(mis.fix).toBeTruthy()
      }
    }
  })
})

describe('getKnowledgeCategories', () => {
  it('returns All plus unique categories', () => {
    const cats = getKnowledgeCategories()
    expect(cats[0]).toBe('All')
    expect(cats.length).toBeGreaterThan(1)
    const unique = new Set(cats)
    expect(unique.size).toBe(cats.length)
  })
})

describe('searchKnowledge', () => {
  it('returns all modules for empty query', () => {
    expect(searchKnowledge('')).toHaveLength(KNOWLEDGE_MODULES.length)
    expect(searchKnowledge(null)).toHaveLength(KNOWLEDGE_MODULES.length)
  })

  it('finds module by title keyword', () => {
    const results = searchKnowledge('groundbed')
    expect(results.some((m) => m.id === 'groundbed_design')).toBe(true)
  })

  it('finds module by tag keyword', () => {
    const results = searchKnowledge('attenuation')
    expect(results.some((m) => m.id === 'attenuation')).toBe(true)
  })

  it('finds module by standard reference', () => {
    const results = searchKnowledge('SAES-X-400')
    expect(results.length).toBeGreaterThan(0)
  })

  it('returns empty array for unmatched query', () => {
    const results = searchKnowledge('zzz_no_match_xyz_9999')
    expect(results).toHaveLength(0)
  })

  it('is case insensitive', () => {
    const lower = searchKnowledge('dwight')
    const upper = searchKnowledge('DWIGHT')
    expect(lower.length).toBe(upper.length)
  })
})

describe('getKnowledgeModule', () => {
  it('returns correct module by id', () => {
    const m = getKnowledgeModule('current_requirement')
    expect(m?.id).toBe('current_requirement')
    expect(m?.title).toBeTruthy()
  })

  it('returns undefined for unknown id', () => {
    expect(getKnowledgeModule('does_not_exist')).toBeUndefined()
  })
})
