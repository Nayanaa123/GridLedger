import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const adminLinks = [
  ['/admin', 'Dashboard', true],
  ['/admin/consumers', 'Consumers'],
  ['/admin/meters', 'Meters'],
  ['/admin/readings', 'Readings'],
  ['/admin/bills', 'Billing'],
  ['/admin/reports', 'Reports'],
  ['/admin/complaints', 'Complaints'],
];
const consumerLinks = [
  ['/my', 'My Account', true],
  ['/my/complaints', 'Complaints'],
];
const readerLinks = [['/reader', 'Readings', true]];

export default function Sidebar() {
  const { user } = useAuth();
  const links = user.role === 'admin' ? adminLinks : user.role === 'meter_reader' ? readerLinks : consumerLinks;

  const cls = ({ isActive }) =>
    `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand-500 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <aside className="bg-slate-900 md:fixed md:inset-y-0 md:left-0 md:w-56">
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="text-xl text-brand-400">⚡</span>
        <span className="text-lg font-bold text-white">GridLedger</span>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
        {links.map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end} className={cls}>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}