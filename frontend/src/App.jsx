import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './AppContext';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Habits from './pages/Habits';
import Mood from './pages/Mood';
import Stats from './pages/Stats';
import Exercises from './pages/Exercises';
import Settings from './pages/Settings';

// без входа внутрь приложения не пускаем
function Guard() {
  const { user } = useApp();
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/register" element={<Auth mode="register" />} />
      <Route element={<Guard />}>
        <Route path="/" element={<Habits />} />
        <Route path="/mood" element={<Mood />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/exercises" element={<Exercises />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
