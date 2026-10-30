import { Routes, Route, Navigate } from "react-router-dom";
import { RequireRole } from "./lib/auth";
import { Layout } from "./components/Layout";

import Landing from "./pages/Landing";
import Apply from "./pages/Apply";
import Login from "./pages/Login";
import SetPassword from "./pages/SetPassword";
import PartnerLink from "./pages/PartnerLink";
import AssociateLink from "./pages/AssociateLink";
import AssociateApply from "./pages/AssociateApply";
import AssociatesInfo from "./pages/AssociatesInfo";

import AdminOverview from "./pages/admin/AdminOverview";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminPartners from "./pages/admin/AdminPartners";
import AdminAssociates from "./pages/admin/AdminAssociates";
import AdminSales from "./pages/admin/AdminSales";
import AdminCommissions from "./pages/admin/AdminCommissions";
import AdminPayouts from "./pages/admin/AdminPayouts";
import AdminSettings from "./pages/admin/AdminSettings";

import PartnerOverview from "./pages/partner/PartnerOverview";
import PartnerAssociates from "./pages/partner/PartnerAssociates";
import PartnerSales from "./pages/partner/PartnerSales";
import PartnerCommissions from "./pages/partner/PartnerCommissions";
import PartnerPayouts from "./pages/partner/PartnerPayouts";

import AssociateOverview from "./pages/associate/AssociateOverview";
import AssociateSales from "./pages/associate/AssociateSales";
import AssociateCommissions from "./pages/associate/AssociateCommissions";
import AssociatePayouts from "./pages/associate/AssociatePayouts";

const adminNav = [
  { to: "/super-admin", label: "Overview" },
  { to: "/super-admin/products", label: "Products" },
  { to: "/super-admin/partners", label: "Partners" },
  { to: "/super-admin/associates", label: "Associates" },
  { to: "/super-admin/sales", label: "Sales" },
  { to: "/super-admin/commissions", label: "Commissions" },
  { to: "/super-admin/payouts", label: "Payouts" },
  { to: "/super-admin/settings", label: "Settings" },
];

const partnerNav = [
  { to: "/partner", label: "Overview" },
  { to: "/partner/associates", label: "My Associates" },
  { to: "/partner/sales", label: "Sales" },
  { to: "/partner/commissions", label: "Commissions" },
  { to: "/partner/payouts", label: "Payouts" },
];

const associateNav = [
  { to: "/associate", label: "Overview" },
  { to: "/associate/sales", label: "Sales" },
  { to: "/associate/commissions", label: "Commissions" },
  { to: "/associate/payouts", label: "Payouts" },
];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/set-password" element={<SetPassword />} />

      {/* Company-level (root) recruitment pages */}
      <Route path="/partners" element={<Apply />} />
      <Route path="/associates" element={<AssociatesInfo />} />

      {/* Per-person links: the company retains the root /partners and /associates paths above,
          a specific person's own link always carries their code. */}
      <Route path="/partners/:code" element={<PartnerLink />} />
      <Route path="/associates/:code" element={<AssociateLink />} />
      <Route path="/associates/apply/:partnerCode" element={<AssociateApply />} />

      <Route
        path="/super-admin"
        element={
          <RequireRole role="ADMIN">
            <Layout nav={adminNav} brand="Super Admin">
              <AdminOverview />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/super-admin/products"
        element={
          <RequireRole role="ADMIN">
            <Layout nav={adminNav} brand="Super Admin">
              <AdminProducts />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/super-admin/partners"
        element={
          <RequireRole role="ADMIN">
            <Layout nav={adminNav} brand="Super Admin">
              <AdminPartners />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/super-admin/associates"
        element={
          <RequireRole role="ADMIN">
            <Layout nav={adminNav} brand="Super Admin">
              <AdminAssociates />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/super-admin/sales"
        element={
          <RequireRole role="ADMIN">
            <Layout nav={adminNav} brand="Super Admin">
              <AdminSales />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/super-admin/commissions"
        element={
          <RequireRole role="ADMIN">
            <Layout nav={adminNav} brand="Super Admin">
              <AdminCommissions />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/super-admin/payouts"
        element={
          <RequireRole role="ADMIN">
            <Layout nav={adminNav} brand="Super Admin">
              <AdminPayouts />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/super-admin/settings"
        element={
          <RequireRole role="ADMIN">
            <Layout nav={adminNav} brand="Super Admin">
              <AdminSettings />
            </Layout>
          </RequireRole>
        }
      />

      <Route
        path="/partner"
        element={
          <RequireRole role="PARTNER">
            <Layout nav={partnerNav}>
              <PartnerOverview />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/partner/associates"
        element={
          <RequireRole role="PARTNER">
            <Layout nav={partnerNav}>
              <PartnerAssociates />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/partner/sales"
        element={
          <RequireRole role="PARTNER">
            <Layout nav={partnerNav}>
              <PartnerSales />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/partner/commissions"
        element={
          <RequireRole role="PARTNER">
            <Layout nav={partnerNav}>
              <PartnerCommissions />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/partner/payouts"
        element={
          <RequireRole role="PARTNER">
            <Layout nav={partnerNav}>
              <PartnerPayouts />
            </Layout>
          </RequireRole>
        }
      />

      <Route
        path="/associate"
        element={
          <RequireRole role="ASSOCIATE">
            <Layout nav={associateNav}>
              <AssociateOverview />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/associate/sales"
        element={
          <RequireRole role="ASSOCIATE">
            <Layout nav={associateNav}>
              <AssociateSales />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/associate/commissions"
        element={
          <RequireRole role="ASSOCIATE">
            <Layout nav={associateNav}>
              <AssociateCommissions />
            </Layout>
          </RequireRole>
        }
      />
      <Route
        path="/associate/payouts"
        element={
          <RequireRole role="ASSOCIATE">
            <Layout nav={associateNav}>
              <AssociatePayouts />
            </Layout>
          </RequireRole>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
