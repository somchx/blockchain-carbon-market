import { Routes, Route } from "react-router-dom";
import RoleSelect from "./pages/RoleSelect";
import DeveloperDashboard from "./pages/developer/Dashboard";
import VerifierDashboard from "./pages/verifier/Dashboard";
import BuyerMarketplace from "./pages/buyer/Marketplace";
import TraceabilityExplorer from "./pages/explorer/Traceability";
import GovernancePortal from "./pages/dao/GovernancePortal";
import AdminDashboard from "./pages/admin/Dashboard";
import OracleStatus from "./pages/oracle/OracleStatus";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleSelect />} />
      <Route path="/developer" element={<DeveloperDashboard />} />
      <Route path="/verifier" element={<VerifierDashboard />} />
      <Route path="/buyer" element={<BuyerMarketplace />} />
      <Route path="/explorer" element={<TraceabilityExplorer />} />
      <Route path="/dao" element={<GovernancePortal />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/oracle" element={<OracleStatus />} />
    </Routes>
  );
}
