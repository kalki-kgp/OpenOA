import { ReactNode } from "react";
import { motion } from "framer-motion";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          flex: 1,
          marginLeft: "var(--sidebar-width)",
          padding: "var(--space-6)",
          minHeight: "100vh",
        }}
      >
        {children}
      </motion.main>
    </div>
  );
}
