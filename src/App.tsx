import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TenantDataProvider } from "./context/TenantDataContext";
import { AppShell } from "./components/AppShell";
import TenantsPage from "./pages/TenantsPage";
import ApisPage from "./pages/ApisPage";
import ApiDetailPage from "./pages/ApiDetailPage";
import EventsPage from "./pages/EventsPage";
import FileTemplatesPage from "./pages/FileTemplatesPage";
import FileTemplateDetailPage from "./pages/FileTemplateDetailPage";

export default function App() {
  return (
    <TenantDataProvider>
        <BrowserRouter>
          <AppShell />
          <Routes>
            <Route path="/" element={<TenantsPage />} />
            <Route path="/tenants/:tenantId" element={<Navigate to="apis" replace />} />
            <Route path="/tenants/:tenantId/apis" element={<ApisPage />} />
            <Route path="/tenants/:tenantId/apis/:apiId" element={<ApiDetailPage />} />
            <Route path="/tenants/:tenantId/events" element={<EventsPage />} />
            <Route path="/tenants/:tenantId/file-templates" element={<FileTemplatesPage />} />
            <Route path="/tenants/:tenantId/file-templates/:templateId" element={<FileTemplateDetailPage />} />
          </Routes>
        </BrowserRouter>
    </TenantDataProvider>
  );
}