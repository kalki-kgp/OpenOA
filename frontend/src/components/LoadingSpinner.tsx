import { motion } from "framer-motion";

export default function LoadingSpinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      style={{
        width: 32,
        height: 32,
        border: "3px solid var(--border-subtle)",
        borderTopColor: "var(--accent-primary)",
        borderRadius: "50%",
      }}
    />
  );
}
