import { Link, NavLink } from 'react-router-dom'
import { BarChart3, Compass, Gauge, Home, LineChart, ScanLine, Wind } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/data', label: 'Data Explorer', icon: Compass },
  { to: '/power-curves', label: 'Power Curves', icon: LineChart },
  { to: '/aep', label: 'AEP', icon: Gauge },
  { to: '/losses', label: 'Losses', icon: BarChart3 },
  { to: '/yaw', label: 'Yaw', icon: ScanLine }
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <Link className="brand" to="/">
        <div className="brand-turbine" aria-hidden="true">
          <div className="mast" />
          <div className="nacelle" />
          <div className="blade blade-a" />
          <div className="blade blade-b" />
          <div className="blade blade-c" />
        </div>
        <div>
          <h1>OpenOA</h1>
          <p>Observatory</p>
        </div>
      </Link>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-foot">
        <Wind size={14} />
        <span>La Haute Borne</span>
      </div>
    </aside>
  )
}
