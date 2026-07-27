import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import CollectionsRounded from '@mui/icons-material/CollectionsRounded';
import PeopleRounded from '@mui/icons-material/PeopleRounded';
import MovieFilterRounded from '@mui/icons-material/MovieFilterRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';

const items = [
  ['/admin/dashboard','Overview',<DashboardRounded/>], ['/admin/levels','Levels',<CollectionsRounded/>],
  ['/admin/levels/create','Generate puzzle',<AutoAwesomeRounded/>], ['/admin/generation-jobs','Generation jobs',<MovieFilterRounded/>],
  ['/admin/actresses','Categories',<PeopleRounded/>], ['/admin/settings','Settings',<TuneRounded/>]
] as const;
export function AdminLayout() {
  const navigate = useNavigate();
  return <div className="admin-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">10</span><span>Difference<br/><small>Studio</small></span></div>
      <nav>{items.map(([to,label,icon]) => <NavLink key={to} to={to} className={({isActive}) => isActive ? 'active' : ''}>{icon}<span>{label}</span></NavLink>)}</nav>
      <button className="logout" onClick={() => { localStorage.removeItem('admin_token'); navigate('/admin/login'); }}><LogoutRounded/> Sign out</button>
    </aside>
    <main className="main"><header><div><span className="eyebrow">Content operations</span><b>Find 10 Differences</b></div><div className="admin-avatar">DA</div></header><Outlet/></main>
  </div>;
}
