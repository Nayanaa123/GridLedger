import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { homeFor } from './utils/home';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import Consumers from './pages/Consumers';
import Meters from './pages/Meters';
import Readings from './pages/Readings';
import Bills from './pages/Bills';
import Reports from './pages/Reports';
import Complaints from './pages/Complaints';
import ConsumerDashboard from './pages/ConsumerDashboard';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homeFor(user.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="consumers" element={<Consumers />} />
        <Route path="meters" element={<Meters />} />
        <Route path="readings" element={<Readings />} />
        <Route path="bills" element={<Bills />} />
        <Route path="reports" element={<Reports />} />
        <Route path="complaints" element={<Complaints />} />
      </Route>

      <Route
        path="/my"
        element={
          <ProtectedRoute role="consumer">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ConsumerDashboard />} />
        <Route path="complaints" element={<Complaints />} />
      </Route>

      <Route
        path="/reader"
        element={
          <ProtectedRoute role="meter_reader">
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Readings />} />
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  );
}