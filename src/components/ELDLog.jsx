const STATUS_COLORS = {
  'Driving':                { bg: '#dcfce7', color: '#15803d' },
  'Off Duty':               { bg: '#f3f4f6', color: '#6b7280' },
  'On Duty Not Driving':    { bg: '#fef9c3', color: '#854d0e' },
}

function StatusBadge({ status }) {
  const style = STATUS_COLORS[status] || { bg: '#e0e7ff', color: '#3730a3' }
  return (
    <span style={{
      background: style.bg,
      color: style.color,
      padding: '3px 10px',
      borderRadius: '99px',
      fontSize: '12px',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  )
}

function ELDLog({ logs }) {
  return (
    <div className="eld-log">
      <table className="log-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Location</th>
            <th>Status</th>
            <th>Miles</th>
            <th>Hours</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={index}>
              <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{log.time}</td>
              <td>{log.location}</td>
              <td><StatusBadge status={log.status} /></td>
              <td>{log.miles}</td>
              <td>{log.hours}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ELDLog
