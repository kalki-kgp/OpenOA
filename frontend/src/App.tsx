import { Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import DataExplorer from "./pages/DataExplorer";
import PowerCurves from "./pages/PowerCurves";
import AEPAnalysis from "./pages/AEPAnalysis";
import LossesAnalysis from "./pages/LossesAnalysis";
import YawAnalysis from "./pages/YawAnalysis";

function App() {
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data" element={<DataExplorer />} />
          <Route path="/power-curves" element={<PowerCurves />} />
          <Route path="/aep" element={<AEPAnalysis />} />
          <Route path="/losses" element={<LossesAnalysis />} />
          <Route path="/yaw" element={<YawAnalysis />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
}

export default App;
