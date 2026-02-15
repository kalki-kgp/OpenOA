import { TurbineInfo } from "../api/client";

interface TurbineTableProps {
  turbines: TurbineInfo[];
}

export default function TurbineTable({ turbines }: TurbineTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <th style={{ textAlign: "left", padding: "var(--space-3)", color: "var(--text-secondary)" }}>Turbine</th>
            <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--text-secondary)" }}>Hub (m)</th>
            <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--text-secondary)" }}>Rotor (m)</th>
            <th style={{ textAlign: "right", padding: "var(--space-3)", color: "var(--text-secondary)" }}>Rated (kW)</th>
          </tr>
        </thead>
        <tbody>
          {turbines.map((t) => (
            <tr key={t.asset_id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <td style={{ padding: "var(--space-3)", fontFamily: "var(--font-mono)" }}>{t.asset_id}</td>
              <td style={{ padding: "var(--space-3)", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                {t.hub_height.toFixed(1)}
              </td>
              <td style={{ padding: "var(--space-3)", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                {t.rotor_diameter.toFixed(1)}
              </td>
              <td style={{ padding: "var(--space-3)", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                {Math.round(t.rated_power)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
