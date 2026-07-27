import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import CollectionsRounded from '@mui/icons-material/CollectionsRounded';
import ErrorRounded from '@mui/icons-material/ErrorRounded';
import { api } from '../api/client';

export default function DashboardPage() {
  const {data,isLoading} = useQuery({ queryKey:['dashboard'], queryFn: async()=> (await api.get('/admin/dashboard')).data.data });
  const d = data || {};
  return <div className="page"><div className="page-title"><div><span className="eyebrow">Monday, studio team</span><h1>Your puzzle universe.</h1><p>Everything important, at a glance.</p></div><Link className="primary-link" to="/admin/levels/create"><AutoAwesomeRounded/> Generate a level</Link></div>
  <div className="metric-grid">
    <Metric label="Total levels" value={d.levels} icon={<CollectionsRounded/>} tone="mint" loading={isLoading}/>
    <Metric label="Live puzzles" value={d.activeLevels} icon={<CheckCircleRounded/>} tone="lime" loading={isLoading}/>
    <Metric label="Awaiting review" value={d.draftLevels} icon={<AutoAwesomeRounded/>} tone="amber" loading={isLoading}/>
    <Metric label="Failed jobs" value={d.failedGenerationJobs} icon={<ErrorRounded/>} tone="coral" loading={isLoading}/>
  </div>
  <div className="dashboard-grid"><section className="panel feature-panel"><span className="eyebrow lime">Fast track</span><h2>Create tomorrow’s challenge.</h2><p>Upload one licensed original. The local engine discovers ten safe regions, performs diverse edits, checks every pixel, and prepares the review canvas.</p><Link to="/admin/levels/create">Start with one image <ArrowOutwardRounded/></Link><div className="orb orb-one"/><div className="orb orb-two"/></section>
  <section className="panel system-panel"><span className="eyebrow">System pulse</span><h3>Generation pipeline</h3>{['Safe-region analysis','Multi-type image edits','Pixel-mask validation','Admin approval gate'].map((x,i)=><div className="pulse-row" key={x}><span>{i+1}</span><b>{x}</b><em>Ready</em></div>)}</section></div></div>;
}
function Metric({label,value,icon,tone,loading}: any) { return <section className={`metric ${tone}`}><div>{icon}</div><span>{label}</span><strong>{loading?'—':value ?? 0}</strong><small>Across your studio</small></section>; }
