import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { path: "/", label: "Dashboard", icon: "◉" },
  { path: "/data", label: "Data Explorer", icon: "◈" },
  { path: "/power-curves", label: "Power Curves", icon: "◐" },
  { path: "/aep", label: "AEP Analysis", icon: "◎" },
  { path: "/losses", label: "Losses", icon: "◔" },
  { path: "/yaw", label: "Yaw Misalignment", icon: "◑" },
];

export default function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        width: "var(--sidebar-width)",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "var(--space-6)",
        zIndex: 100,
      }}
    >
      {/* Wind turbine icon with slow rotation */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{
          width: 36,
          height: 36,
          marginBottom: "var(--space-8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
        }}
      >
        ⚡
      </motion.div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            style={({ isActive }) => ({
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
              background: isActive ? "var(--accent-primary-dim)" : "transparent",
              textDecoration: "none",
              fontSize: 11,
              fontFamily: "var(--font-display)",
              transition: "all var(--transition-fast)",
            })}
          >
            <span style={{ fontSize: 18, marginBottom: 2 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </motion.aside>
  );
}
