import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Chip, CircularProgress } from '@mui/material';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import { api } from '../api/client';

export default function ResourcePages() {
  const {resource='levels'}=useParams();
  const endpoint=resource==='generation-jobs'?'/admin/puzzle-generator/jobs':resource==='actresses'?'/admin/actresses':resource==='levels'?'/admin/levels':null;
  const query=useQuery({queryKey:['resource',resource],queryFn:async()=>endpoint?(await api.get(endpoint)).data.data:[],enabled:Boolean(endpoint),refetchInterval:resource==='generation-jobs'?2500:false});
  const title=resource.replaceAll('-',' ');
  if(!endpoint)return <div className="page"><div className="page-title"><div><span className="eyebrow">Workspace</span><h1>{title[0].toUpperCase()+title.slice(1)}.</h1><p>This operational module is ready for API-backed configuration.</p></div></div><Alert severity="info">Use the REST endpoints documented in the README to connect organization-specific fields for this module.</Alert></div>;
  const rows=Array.isArray(query.data)?query.data:query.data?.rows||[];
  return <div className="page"><div className="page-title"><div><span className="eyebrow">Library</span><h1>{title[0].toUpperCase()+title.slice(1)}.</h1><p>{rows.length} records in this view.</p></div>{resource==='levels'&&<Link className="primary-link" to="/admin/levels/create"><AddRounded/> New level</Link>}</div>
  <section className="panel data-panel">{query.isLoading?<div className="centered"><CircularProgress/></div>:rows.length===0?<div className="empty-state">Nothing here yet.</div>:<div className="data-table">
    {rows.map((row:any)=><div className="data-row" key={row.id||row.jobUuid}><div className="data-primary"><span className="row-icon">{resource==='actresses'?(row.name?.[0]||'A'):(row.levelNumber||'J')}</span><div><b>{resource==='generation-jobs'?`Job ${row.jobUuid.slice(0,8)}`:row.name||row.title||`Level ${row.levelNumber}`}</b><small>{resource==='generation-jobs'?row.currentStep:`${row.country||row.difficulty||''} ${row.industry||''}`}</small></div></div><Chip size="small" label={row.status||row.reviewStatus||(row.isActive?'Active':'Inactive')}/>{resource==='generation-jobs'?<span className="progress-number">{row.progress}%</span>:resource==='levels'?<Button component={Link} to={`/admin/levels/${row.id}/review`} endIcon={<ArrowOutwardRounded/>}>Review</Button>:<span/>}</div>)}
  </div>}</section></div>;
}
