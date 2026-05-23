import { useState } from 'react'

const MAGNITUD_COLOR = {
  'Bajo':    { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Medio':   { bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  'Alto':    { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  'Crítico': { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
}

const LOAD_STATE_STYLE = {
  'Carga Completa': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Media Carga':    { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
}

const SECTION_META = [
  {
    key: 'objetivos_vulnerabilidades',
    label: '1. Objetivos a Proteger / Fragilidades',
    icon: '🛡',
  },
  {
    key: 'identificacion_riesgos',
    label: '2. Identificación y Dimensionamiento de Riesgos',
    icon: '⚠',
  },
  {
    key: 'perspectiva_impacto',
    label: '3. Perspectiva de Impacto',
    icon: '💥',
  },
  {
    key: 'escenarios_ocurrencia',
    label: '4. Escenarios de Ocurrencia / Eventos',
    icon: '📋',
  },
  {
    key: 'elementos_deteccion',
    label: '5. Elementos de Detección / Indicadores',
    icon: '🔍',
  },
  {
    key: 'previsiones_proteccion',
    label: '6. Previsiones de Protección',
    icon: '✅',
  },
]

function MagnitudBadge({ mag }) {
  const s = MAGNITUD_COLOR[mag] || MAGNITUD_COLOR['Medio']
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      padding: '2px 9px',
      borderRadius: '99px',
      fontSize: '11px',
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {mag}
    </span>
  )
}

function SectionToggle({ label, icon, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div style={{ borderTop: '1px solid #e5e7eb' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontSize: '13px',
          fontWeight: 600,
          color: '#374151',
        }}
      >
        <span style={{ fontSize: '14px', lineHeight: 1 }}>{icon}</span>
        <span style={{ flex: 1 }}>{label}</span>
        <span style={{
          fontSize: '11px',
          color: '#9ca3af',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
        }}>
          ▼
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px 38px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function ObjetivosSection({ data }) {
  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '6px' }}>
          Objetivos a Proteger
        </p>
        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>
          {data.objetivos.map((o, i) => <li key={i}>{o}</li>)}
        </ul>
      </div>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c', marginBottom: '6px' }}>
          Fragilidades / Vulnerabilidades
        </p>
        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#374151', lineHeight: 1.7 }}>
          {data.vulnerabilidades.map((v, i) => <li key={i}>{v}</li>)}
        </ul>
      </div>
    </div>
  )
}

function RiesgosSection({ data }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Riesgo</th>
            <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Descripción</th>
            <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Magnitud</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '7px 10px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{r.riesgo}</td>
              <td style={{ padding: '7px 10px', color: '#4b5563', lineHeight: 1.5 }}>{r.descripcion}</td>
              <td style={{ padding: '7px 10px', textAlign: 'center' }}><MagnitudBadge mag={r.magnitud} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ImpactoSection({ data }) {
  const DIM_COLORS = {
    'Humano':        '#dc2626',
    'Económico':     '#d97706',
    'Operacional':   '#2563eb',
    'Reputacional':  '#7c3aed',
    'Ambiental':     '#16a34a',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{
            minWidth: '90px',
            fontSize: '11px',
            fontWeight: 700,
            color: DIM_COLORS[item.dimension] || '#374151',
            paddingTop: '1px',
          }}>
            {item.dimension}
          </span>
          <span style={{ fontSize: '12px', color: '#4b5563', lineHeight: 1.6 }}>{item.descripcion}</span>
        </div>
      ))}
    </div>
  )
}

function EscenariosSection({ data }) {
  return (
    <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#374151', lineHeight: 1.8 }}>
      {data.map((s, i) => <li key={i}>{s}</li>)}
    </ol>
  )
}

function DeteccionSection({ data }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Indicador</th>
            <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Herramienta / Método</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '7px 10px', fontWeight: 600, color: '#111827' }}>{d.indicador}</td>
              <td style={{ padding: '7px 10px', color: '#4b5563', lineHeight: 1.5 }}>{d.herramienta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PrevisionesSection({ data }) {
  return (
    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#374151', lineHeight: 1.8 }}>
      {data.map((p, i) => <li key={i}>{p}</li>)}
    </ul>
  )
}

const SECTION_RENDERERS = {
  objetivos_vulnerabilidades: ObjetivosSection,
  identificacion_riesgos:     RiesgosSection,
  perspectiva_impacto:        ImpactoSection,
  escenarios_ocurrencia:      EscenariosSection,
  elementos_deteccion:        DeteccionSection,
  previsiones_proteccion:     PrevisionesSection,
}

function RiskAnalysisPanel({ riskAnalysis }) {
  const [expanded, setExpanded] = useState(false)

  if (!riskAnalysis) return null

  const { load_state, load_state_flag, sections } = riskAnalysis
  const lStyle = LOAD_STATE_STYLE[load_state] || LOAD_STATE_STYLE['Carga Completa']

  return (
    <div style={{
      marginTop: '8px',
      border: `1px solid ${load_state_flag ? '#fca5a5' : '#e5e7eb'}`,
      borderRadius: '8px',
      background: '#fff',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          cursor: 'pointer',
          background: load_state_flag ? '#fef2f2' : '#f9fafb',
          userSelect: 'none',
        }}
      >
        <span style={{
          background: lStyle.bg,
          color: lStyle.color,
          border: `1px solid ${lStyle.border}`,
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

        <span style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: '#374151' }}>
          Análisis de Riesgo Vial
        </span>
        <span style={{
          fontSize: '11px',
          color: '#9ca3af',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
        }}>
          ▼
        </span>
      </div>

      {/* 6 sections */}
      {expanded && SECTION_META.map((meta, idx) => {
        const Renderer = SECTION_RENDERERS[meta.key]
        const sectionData = sections[meta.key]
        if (!sectionData) return null
        return (
          <SectionToggle
            key={meta.key}
            label={meta.label}
            icon={meta.icon}
            defaultOpen={idx === 0}
          >
            <Renderer data={sectionData} />
          </SectionToggle>
        )
      })}
    </div>
  )
}

export default RiskAnalysisPanel
