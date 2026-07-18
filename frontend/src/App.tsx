import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import Personas from './pages/Personas';
import Templates from './pages/Templates';
import Scheduler from './pages/Scheduler';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="posts" element={<Posts />} />
            <Route path="personas" element={<Personas />} />
            <Route path="templates" element={<Templates />} />
            <Route path="scheduler" element={<Scheduler />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
