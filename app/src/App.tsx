import { HashRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { BrowsePage } from "./pages/BrowsePage";
import { HomePage } from "./pages/HomePage";
import { MethodPage } from "./pages/MethodPage";
import { MitrePage } from "./pages/MitrePage";
import { ProgressPage } from "./pages/ProgressPage";
import { ReferencesPage } from "./pages/ReferencesPage";
import { ScenarioPage } from "./pages/ScenarioPage";

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="scenarios" element={<BrowsePage />} />
          <Route path="scenarios/:code" element={<ScenarioPage />} />
          <Route path="mitre" element={<MitrePage />} />
          <Route path="method" element={<MethodPage />} />
          <Route path="references" element={<ReferencesPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="*" element={<HomePage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
