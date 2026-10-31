import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <p className="text-sm text-slate-500">
        Signed in as <span className="font-semibold text-slate-800">{user.name}</span>{' '}
        <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-600">{user.role}</span>
      </p>
      <button onClick={handleLogout} className="btn-ghost !py-1.5">
        Log out
      </button>
    </header>
  );
}
