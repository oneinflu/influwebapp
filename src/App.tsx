import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import Clients from "./pages/Clients";
import ClientsNew from "./pages/ClientsNew";
import TeamMembers from "./pages/TeamMembers";
import TeamMembersNew from "./pages/TeamMembersNew";
import TeamMembersEdit from "./pages/TeamMembersEdit";
import Collaborators from "./pages/Collaborators";
import CollaboratorsNew from "./pages/CollaboratorsNew";
import Leads from "./pages/Leads";
import LeadsNew from "./pages/LeadsNew";
import Services from "./pages/Services";
import ServicesNew from "./pages/ServicesNew";
import Projects from "./pages/Projects";
import ProjectsNew from "./pages/ProjectsNew";
import ProjectDetails from "./pages/ProjectDetails";
import Portfolio from "./pages/Portfolio";
import PortfolioNew from "./pages/PortfolioNew";
import PortfolioEdit from "./pages/PortfolioEdit";
import PortfolioPublic from "./pages/PortfolioPublic";
import PublicProfile from "./pages/PublicProfile";
import PublicProfileEdit from "./pages/PublicProfileEdit";
import Invoices from "./pages/Invoices";
import InvoicesNew from "./pages/InvoicesNew";
import InvoiceDetails from "./pages/InvoiceDetails";
import Roles from "./pages/Roles";
import RolesNew from "./pages/RolesNew";
import RoleView from "./pages/RoleView";
import RolesEdit from "./pages/RolesEdit";
import Categories from "./pages/Categories";
import ContentTypes from "./pages/ContentTypes";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ProfileSetup from "./pages/AuthPages/ProfileSetup";
import BusinessInfo from "./pages/AuthPages/BusinessInfo";
import RateCards from "./pages/RateCards";
import RateCardsNew from "./pages/RateCardsNew";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Protected Dashboard Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />

              {/* Others Page */}
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/profile/edit" element={<PublicProfileEdit />} />
              <Route path="/roles" element={<Roles />} />
              <Route path="/roles/new" element={<RolesNew />} />
              <Route path="/roles/:id" element={<RoleView />} />
              <Route path="/roles/:id/edit" element={<RolesEdit />} />
              <Route path="/team/members" element={<TeamMembers />} />
              <Route path="/team/members/new" element={<TeamMembersNew />} />
              <Route path="/team/members/:id/edit" element={<TeamMembersEdit />} />
              <Route path="/collaborators" element={<Collaborators />} />
              <Route path="/collaborators/new" element={<CollaboratorsNew />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/leads/new" element={<LeadsNew />} />
              <Route path="/services" element={<Services />} />
              <Route path="/services/new" element={<ServicesNew />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/new" element={<ProjectsNew />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/portfolio/new" element={<PortfolioNew />} />
              <Route path="/portfolio/:id/edit" element={<PortfolioEdit />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/new" element={<InvoicesNew />} />
              <Route path="/invoices/:id" element={<InvoiceDetails />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/new" element={<ClientsNew />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/content-types" element={<ContentTypes />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/blank" element={<Blank />} />

              {/* Forms */}
              <Route path="/form-elements" element={<FormElements />} />

              {/* Tables */}
              <Route path="/basic-tables" element={<BasicTables />} />

              {/* Ui Elements */}
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/avatars" element={<Avatars />} />
              <Route path="/badge" element={<Badges />} />
              <Route path="/buttons" element={<Buttons />} />
              <Route path="/images" element={<Images />} />
              <Route path="/videos" element={<Videos />} />
              <Route path="/rate-cards" element={<RateCards />} />
              <Route path="/rate-cards/new" element={<RateCardsNew />} />



              {/* Charts */}
              <Route path="/line-chart" element={<LineChart />} />
              <Route path="/bar-chart" element={<BarChart />} />
            </Route>
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          {/* Onboarding - protected but outside dashboard layout */}
          <Route element={<ProtectedRoute />}>
            <Route path="/business-info" element={<BusinessInfo />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
          </Route>

          {/* Public portfolio viewer (no auth) */}
          <Route path="/p/:id" element={<PortfolioPublic />} />
          {/* Public user profile (no auth) */}
          <Route path="/:slug" element={<PublicProfile />} />
          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
