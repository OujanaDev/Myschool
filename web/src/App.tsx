import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import Layout from "./components/Layout";
import { useAuth } from "./lib/auth";
import { Spinner } from "./components/ui";
import Home from "./pages/Home";
import { Login, Register } from "./pages/Auth";
import Explore from "./pages/Explore";
import LevelPage from "./pages/LevelPage";
import SubjectPage from "./pages/SubjectPage";
import SearchPage from "./pages/SearchPage";
import Dashboard from "./pages/Dashboard";
import StudyPlanPage from "./pages/StudyPlanPage";
import PremiumPage from "./pages/PremiumPage";
import ProfilePage from "./pages/ProfilePage";
import PrivacyPage from "./pages/PrivacyPage";

const LessonPage = lazy(() => import("./pages/LessonPage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const LabPage = lazy(() => import("./pages/LabPage"));
const LessonEmbedPage = lazy(() => import("./pages/LessonEmbedPage"));
// Loaded on demand: the maths renderer (KaTeX) only ships with lessons and quizzes, and students never download the admin editors.
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminLevels = lazy(() => import("./pages/admin/AdminLevels"));
const AdminSubjects = lazy(() => import("./pages/admin/AdminSubjects"));
const AdminLevelSubject = lazy(() => import("./pages/admin/AdminLevelSubject"));
const AdminLessonEditor = lazy(() => import("./pages/admin/AdminLessonEditor"));
const AdminQuizEditor = lazy(() => import("./pages/admin/AdminQuizEditor"));
const AdminLessons = lazy(() => import("./pages/admin/AdminLessons"));
const AdminQuizzes = lazy(() => import("./pages/admin/AdminQuizzes"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RequireAuth({ children, admin = false }: { children: React.ReactElement; admin?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/inscription" element={<Register />} />
          <Route path="/explorer" element={<Explore />} />
          <Route path="/niveau/:slug" element={<LevelPage />} />
          <Route path="/niveau/:slug/:subjectSlug" element={<SubjectPage />} />
          <Route path="/cours/:id" element={<LessonPage />} />
          <Route path="/qcm/:id" element={<QuizPage />} />
          <Route path="/recherche" element={<SearchPage />} />
          <Route path="/premium" element={<PremiumPage />} />
          <Route path="/confidentialite" element={<PrivacyPage />} />
          <Route path="/tableau-de-bord" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/plan-etude" element={<RequireAuth><StudyPlanPage /></RequireAuth>} />
          <Route path="/profil" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        </Route>
        <Route path="/labo" element={<LabPage />} />
        <Route path="/embed/lecon" element={<LessonEmbedPage />} />
        <Route path="/admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
          <Route index element={<AdminDashboard />} />
          <Route path="niveaux" element={<AdminLevels />} />
          <Route path="matieres" element={<AdminSubjects />} />
          <Route path="programme/:id" element={<AdminLevelSubject />} />
          <Route path="cours" element={<AdminLessons />} />
          <Route path="cours/nouveau" element={<AdminLessonEditor />} />
          <Route path="cours/:id" element={<AdminLessonEditor />} />
          <Route path="qcm" element={<AdminQuizzes />} />
          <Route path="qcm/nouveau" element={<AdminQuizEditor />} />
          <Route path="qcm/:id" element={<AdminQuizEditor />} />
          <Route path="utilisateurs" element={<AdminUsers />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}
