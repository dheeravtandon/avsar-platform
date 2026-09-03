import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { Loading } from './components/ui.jsx';

import Landing from './pages/Landing.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import PublicDashboard from './pages/PublicDashboard.jsx';
import PublicChallenges from './pages/PublicChallenges.jsx';
import PublicRegistry from './pages/PublicRegistry.jsx';
import PublicSolutions from './pages/PublicSolutions.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

import Dashboard from './pages/Dashboard.jsx';
import Challenges from './pages/Challenges.jsx';
import ChallengeDetail from './pages/ChallengeDetail.jsx';
import ChallengeForm from './pages/ChallengeForm.jsx';
import Applications from './pages/Applications.jsx';
import ApplicationDetail from './pages/ApplicationDetail.jsx';
import ApplyForm from './pages/ApplyForm.jsx';
import Evaluations from './pages/Evaluations.jsx';
import Pilots from './pages/Pilots.jsx';
import PilotDetail from './pages/PilotDetail.jsx';
import Procurement from './pages/Procurement.jsx';
import Catalogue from './pages/Catalogue.jsx';
import Payments from './pages/Payments.jsx';
import Registry from './pages/Registry.jsx';
import Grievances from './pages/Grievances.jsx';
import Profile from './pages/Profile.jsx';
import Audit from './pages/Audit.jsx';
import Admin from './pages/Admin.jsx';
import NotFound from './pages/NotFound.jsx';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page" style={{ paddingTop: 80 }}><Loading rows={5} /></div>;
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public site */}
      <Route path="/" element={<Landing />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/dashboard" element={<PublicDashboard />} />
      <Route path="/challenges" element={<PublicChallenges />} />
      <Route path="/challenges/:id" element={<PublicChallenges />} />
      <Route path="/registry" element={<PublicRegistry />} />
      <Route path="/solutions" element={<PublicSolutions />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated workspace */}
      <Route path="/app" element={<Protected><Dashboard /></Protected>} />
      <Route path="/app/challenges" element={<Protected><Challenges /></Protected>} />
      <Route path="/app/challenges/new" element={<Protected roles={['NODAL_OFFICER', 'DEPT_HEAD', 'ADMIN']}><ChallengeForm /></Protected>} />
      <Route path="/app/challenges/:id" element={<Protected><ChallengeDetail /></Protected>} />
      <Route path="/app/challenges/:id/edit" element={<Protected roles={['NODAL_OFFICER', 'DEPT_HEAD', 'ADMIN']}><ChallengeForm /></Protected>} />
      <Route path="/app/challenges/:id/apply" element={<Protected roles={['STARTUP']}><ApplyForm /></Protected>} />

      <Route path="/app/applications" element={<Protected><Applications /></Protected>} />
      <Route path="/app/applications/:id" element={<Protected><ApplicationDetail /></Protected>} />

      <Route path="/app/evaluations" element={<Protected roles={['EVALUATOR', 'ADMIN']}><Evaluations /></Protected>} />

      <Route path="/app/pilots" element={<Protected><Pilots /></Protected>} />
      <Route path="/app/pilots/:id" element={<Protected><PilotDetail /></Protected>} />

      <Route path="/app/procurement" element={<Protected><Procurement /></Protected>} />
      <Route path="/app/procurement/:id" element={<Protected><Procurement /></Protected>} />

      <Route path="/app/catalogue" element={<Protected><Catalogue /></Protected>} />
      <Route path="/app/catalogue/:id" element={<Protected><Catalogue /></Protected>} />
      <Route path="/app/payments" element={<Protected><Payments /></Protected>} />
      <Route path="/app/registry" element={<Protected><Registry /></Protected>} />
      <Route path="/app/grievances" element={<Protected><Grievances /></Protected>} />
      <Route path="/app/profile" element={<Protected roles={['STARTUP']}><Profile /></Protected>} />
      <Route path="/app/audit" element={<Protected roles={['ADMIN', 'DEPT_HEAD']}><Audit /></Protected>} />
      <Route path="/app/admin" element={<Protected roles={['ADMIN']}><Admin /></Protected>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
