/**
 * StationTabs.jsx
 *
 * Shared station tab bar used across multiple engineering pages.
 * Shows active station tabs with calculation status indicators.
 */

import { useState, useCallback } from 'react'
import { useProjectStore } from '../store/projectStore.js'
import { ConfirmDialog } from './ui.jsx'
import { Trash2, Plus } from 'lucide-react'

export default function StationTabs() {
  const stations = useProjectStore((s) => s.getProject()?.stations ?? [])
  const activeId = useProjectStore((s) => s.activeStationId) || stations[0]?.id
  const setActive = useProjectStore((s) => s.setActiveStation)
  const addStation = useProjectStore((s) => s.addStation)
  const removeStation = useProjectStore((s) => s.removeStation)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleDelete = useCallback(() => {
    if (confirmDelete) {
      removeStation(confirmDelete)
      setConfirmDelete(null)
    }
  }, [confirmDelete, removeStation])

  return (
    <>
      <div className="station-tabs">
        {stations.map((st) => (
          <button
            key={st.id}
            className={`station-tab ${st.id === activeId ? 'station-tab--active' : ''}`}
            onClick={() => setActive(st.id)}
          >
            <span>{st.name}</span>
            {st.lastCalcResult && (
              <span
                className={`tab-dot ${st.lastCalcResult.allChecksPassed ? 'tab-dot--pass' : 'tab-dot--fail'}`}
              />
            )}
          </button>
        ))}
        {stations.length > 1 && activeId && (
          <button
            className="station-tab station-tab--add"
            onClick={(e) => {
              e.stopPropagation()
              setConfirmDelete(activeId)
            }}
            title="Remove station"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <Trash2 size={14} />
          </button>
        )}
        <button className="station-tab station-tab--add" onClick={addStation} title="Add station">
          <Plus size={14} />
        </button>
      </div>
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Station"
        message="Are you sure you want to delete this station? All calculations and data for this station will be permanently removed. This action cannot be undone."
        confirmLabel="Delete Station"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  )
}
