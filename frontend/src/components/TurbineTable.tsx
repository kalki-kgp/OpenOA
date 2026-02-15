import type { TurbineInfo } from '../api/client'

export function TurbineTable({ data }: { data: TurbineInfo[] }) {
  return (
    <div className="table-wrap">
      <table className="turbine-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Rated Power (MW)</th>
            <th>Hub Height (m)</th>
            <th>Rotor (m)</th>
            <th>Latitude</th>
            <th>Longitude</th>
          </tr>
        </thead>
        <tbody>
          {data.map((turbine) => (
            <tr key={turbine.turbine_id}>
              <td>{turbine.turbine_id}</td>
              <td>{turbine.rated_power_mw?.toFixed(2) ?? '—'}</td>
              <td>{turbine.hub_height_m?.toFixed(1) ?? '—'}</td>
              <td>{turbine.rotor_diameter_m?.toFixed(1) ?? '—'}</td>
              <td>{turbine.latitude?.toFixed(4) ?? '—'}</td>
              <td>{turbine.longitude?.toFixed(4) ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
