import { useState } from 'react'
import { INDICATION_TYPES } from '../services/indicationService'

/**
 * Floating panel for toggling indication layers on/off.
 * Rendered as a sibling of MapContainer and positioned absolutely
 * over the top-right corner of the map.
 */
function MapLayerControls({ visibleLayers, onToggle, indicationCounts, loading }) {
  const [collapsed, setCollapsed] = useState(false)

  const hasAny = Object.values(indicationCounts).some(n => n > 0)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.96)',
      borderRadius: '8px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
      minWidth: '210px',
      maxWidth: '240px',
      fontSize: '12px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '7px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e5e7eb',
        gap: '6px',
      }}>
        <span style={{
          fontWeight: 700,
          color: '#374151',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          flex: 1,
        }}>
          Capas
        </span>
        {loading && (
          <span style={{ fontSize: '10px', color: '#6b7280' }}>extrayendo…</span>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
            padding: '0 2px',
            lineHeight: 1,
            fontSize: '10px',
          }}
          title={collapsed ? 'Expandir capas' : 'Colapsar capas'}
        >
          {collapsed ? '▼' : '▲'}
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: '4px 0 6px' }}>
          {/* Show-all / Hide-all shortcuts */}
          {hasAny && (
            <div style={{
              padding: '2px 12px 5px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              gap: '10px',
            }}>
              <button
                onClick={() =>
                  Object.keys(INDICATION_TYPES).forEach(t => {
                    if (!visibleLayers.has(t)) onToggle(t)
                  })
                }
                style={{
                  fontSize: '10px', color: '#4b5563', background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Ver todo
              </button>
              <button
                onClick={() =>
                  Object.keys(INDICATION_TYPES).forEach(t => {
                    if (visibleLayers.has(t)) onToggle(t)
                  })
                }
                style={{
                  fontSize: '10px', color: '#4b5563', background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Ocultar todo
              </button>
            </div>
          )}

          {/* One row per indication type */}
          {Object.entries(INDICATION_TYPES).map(([type, meta]) => {
            const count = indicationCounts[type] || 0
            // Hide rows for types with zero items unless still loading
            if (!loading && count === 0) return null
            return (
              <label
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '3px 12px',
                  cursor: count > 0 ? 'pointer' : 'default',
                  opacity: count === 0 ? 0.35 : 1,
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={visibleLayers.has(type)}
                  onChange={() => count > 0 && onToggle(type)}
                  style={{ accentColor: meta.color, flexShrink: 0 }}
                />
                {/* Colour swatch */}
                <span style={{
                  width: '9px', height: '9px',
                  borderRadius: '2px',
                  background: meta.color,
                  flexShrink: 0,
                }} />
                <span style={{ flex: 1, color: '#374151', lineHeight: 1.4 }}>
                  {meta.label}
                </span>
                {count > 0 && (
                  <span style={{
                    fontSize: '10px',
                    background: '#f3f4f6',
                    color: '#6b7280',
                    padding: '1px 5px',
                    borderRadius: '8px',
                    flexShrink: 0,
                  }}>
                    {count}
                  </span>
                )}
              </label>
            )
          })}

          {!loading && !hasAny && (
            <div style={{ padding: '8px 12px', color: '#9ca3af', fontSize: '11px' }}>
              Sin indicaciones en esta ruta
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MapLayerControls
