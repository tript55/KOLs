import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import Personas from './pages/Personas';
import Templates from './pages/Templates';
import Scheduler from './pages/Scheduler';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="posts" element={<Posts />} />
        <Route path="personas" element={<Personas />} />
        <Route path="templates" element={<Templates />} />
        <Route path="scheduler" element={<Scheduler />} />
      </Route>
    </Routes>
  );
}
