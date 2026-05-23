import { useState } from 'react'

const LOAD_STATE_STYLE = {
  'Carga Completa': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Media Carga':    { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
}

const HEADERS = ['#', 'Área', 'Dinámica', 'Amenazas', 'Vigilancia', 'Restricción', 'Intervención']

// Relative column widths (flex values)
const COL_FLEX = [0.4, 1.2, 1.5, 1.6, 1.6, 1.4, 1.6]

const COL_COLORS = {
  'Área':         '#eff6ff',
  'Amenazas':     '#fef2f2',
  'Vigilancia':   '#f0fdf4',
  'Restricción':  '#fffbeb',
  'Intervención': '#fdf4ff',
}

function ProcesoTable({ rows }) {
  if (!rows || rows.length === 0) return null

  return (
    <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'fixed' }}>
        <colgroup>
          {COL_FLEX.map((f, i) => (
            <col key={i} style={{ width: `${(f / COL_FLEX.reduce((a, b) => a + b, 0)) * 100}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ background: '#1a1a2e' }}>
            {HEADERS.map((h, i) => (
              <th
                key={h}
                style={{
                  padding: '7px 8px',
                  textAlign: i === 0 ? 'center' : 'left',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '11px',
                  borderRight: i < HEADERS.length - 1 ? '1px solid #374151' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f9fafb' }}>
              {row.map((cell, ci) => {
                const colName = HEADERS[ci]
                const bg = COL_COLORS[colName]
                return (
                  <td
                    key={ci}
                    style={{
                      padding: '7px 8px',
                      verticalAlign: 'top',
                      lineHeight: 1.55,
                      color: '#1f2937',
                      borderRight: ci < row.length - 1 ? '1px solid #e5e7eb' : 'none',
                      borderBottom: '1px solid #e5e7eb',
                      textAlign: ci === 0 ? 'center' : 'left',
                      fontWeight: ci === 0 ? 700 : 400,
                      background: bg && ci !== 0 ? bg : undefined,
                    }}
                  >
                    {cell}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RiskAnalysisPanel({ riskAnalysis }) {
  const [expanded, setExpanded] = useState(false)

  if (!riskAnalysis) return null

  const { load_state, load_state_flag, tabla_proceso, os_profile } = riskAnalysis
  const ls = LOAD_STATE_STYLE[load_state] || LOAD_STATE_STYLE['Carga Completa']

  return (
    <div style={{
      marginTop: '8px',
      border: `1px solid ${load_state_flag ? '#fca5a5' : '#e5e7eb'}`,
      borderRadius: '8px',
      overflow: 'hidden',
      background: '#fff',
    }}>
      {/* ── Toggle header ─────────────────────────────────────── */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '9px 14px',
          cursor: 'pointer',
          background: load_state_flag ? '#fef2f2' : '#f9fafb',
          userSelect: 'none',
        }}
      >
        <span style={{
          background: ls.bg,
          color: ls.color,
          border: `1px solid ${ls.border}`,
          padding: '2px 10px',
          borderRadius: '99px',
          fontSize: '11px',
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          {load_state}
        </span>

        {load_state_flag && (
          <span style={{
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            padding: '2px 10px',
            borderRadius: '99px',
            fontSize: '11px',
            fontWeight: 700,
          }}>
            ⚠ Perfil de riesgo modificado por media carga
          </span>
        )}

        <span style={{ flex: 1, fontSize: '12px', fontWeight: 700, color: '#374151' }}>
          Análisis PROCESO — Riesgos Operativos
        </span>
        <span style={{
          fontSize: '11px',
          color: '#9ca3af',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
          flexShrink: 0,
        }}>
          ▼
        </span>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      {expanded && (
        <div style={{ padding: '14px 14px 16px' }}>
          {/* 7-column PROCESO table */}
          <ProcesoTable rows={tabla_proceso} />

          {/* OS Profile note */}
          {os_profile && (
            <div style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: '#faf5ff',
              border: '1px solid #e9d5ff',
              borderRadius: '6px',
            }}>
              <p style={{
                margin: '0 0 4px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#6d28d9',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                Perfil del Oficial de Seguridad (OS)
              </p>
              <p style={{
                margin: 0,
                fontSize: '11px',
                lineHeight: 1.65,
                color: '#374151',
              }}>
                {os_profile}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RiskAnalysisPanel
