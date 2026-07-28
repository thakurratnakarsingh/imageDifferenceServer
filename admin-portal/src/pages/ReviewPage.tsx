import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Alert, Button, Chip, CircularProgress, TextField } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import AutorenewRounded from '@mui/icons-material/AutorenewRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import { api } from '../api/client';
import { DifferenceCanvas } from '../components/DifferenceCanvas';
import type { Difference, Level } from '../types';
import { canApprove } from '../utils/validation';
import { resolveMediaUrl } from '../utils/mediaUrl';

export default function ReviewPage() {
  const {id}=useParams(); const client=useQueryClient(); const query=useQuery({queryKey:['level',id],queryFn:async()=> (await api.get(`/admin/levels/${id}`)).data.data as Level});
  const refresh=()=>client.invalidateQueries({queryKey:['level',id]}); const level=query.data;
  async function approve(){await api.post(`/admin/puzzle-generator/levels/${id}/approve`);refresh();}
  async function regenerate(){await api.post(`/admin/puzzle-generator/levels/${id}/regenerate`);refresh();}
  if(query.isLoading||!level)return <div className="page centered"><CircularProgress/></div>;
  const valid=canApprove(level.validationStatus,level.differences.filter(x=>x.isActive).length,Boolean(level.modifiedImageUrl));
  const originalImageUrl=resolveMediaUrl(level.originalImageUrl);
  const modifiedImageUrl=resolveMediaUrl(level.modifiedImageUrl);
  return <div className="page"><div className="page-title review-title"><div><span className="eyebrow">Review studio · Level {level.levelNumber}</span><h1>Inspect every detail.</h1><p>Drag a marker to adjust its hit region. Publishing stays locked until all ten pass.</p></div><div className="review-actions"><Button variant="outlined" startIcon={<AutorenewRounded/>} onClick={regenerate}>Regenerate all</Button><Button variant="contained" startIcon={<CheckRounded/>} disabled={!valid} onClick={approve}>{level.reviewStatus==='approved'?'Approved & live':'Approve & publish'}</Button></div></div>
  {!valid&&<Alert severity="warning">This level cannot publish: it needs a passed pixel validation and exactly 10 active differences.</Alert>}
  <div className="review-status"><Chip label={`${level.differences.filter(x=>x.isActive).length}/10 differences`} color={valid?'success':'warning'}/><Chip label={`Validation: ${level.validationStatus}`}/><Chip label={`Review: ${level.reviewStatus}`}/></div>
  <div className="compare-grid"><section className="panel image-panel"><div className="image-label"><span>01</span><b>Original</b><em>Locked reference</em></div><img src={originalImageUrl} alt={`Original for level ${level.levelNumber}`}/></section>
  <section className="panel image-panel"><div className="image-label"><span>02</span><b>Modified + hit regions</b><em>Drag to reposition</em></div><div className="canvas-scroll"><DifferenceCanvas src={modifiedImageUrl} differences={level.differences} onChanged={refresh}/></div></section></div>
  <section className="panel difference-list"><div className="list-heading"><div><span className="eyebrow">Generated changes</span><h2>The ten.</h2></div><p>Each edit is independently tappable and server-validated.</p></div>
  <div className="difference-rows">{level.differences.map(d=><DifferenceRow key={d.id} levelId={level.id} d={d} refresh={refresh}/>)}</div></section></div>;
}
function DifferenceRow({levelId,d,refresh}:{levelId:number;d:Difference;refresh:()=>void}) {
  async function update(description:string){await api.put(`/admin/differences/${d.id}`,{description});refresh();}
  async function regen(){await api.post(`/admin/puzzle-generator/levels/${levelId}/regenerate-difference/${d.id}`);refresh();}
  async function remove(){await api.delete(`/admin/differences/${d.id}`);refresh();}
  return <div className={`difference-row ${!d.isActive?'disabled':''}`}><span className="diff-number">{String(d.differenceNumber).padStart(2,'0')}</span><div><b>{d.modificationType.replaceAll('_',' ')}</b><TextField variant="standard" defaultValue={d.description} onBlur={e=>update(e.target.value)} fullWidth/></div><em>{Math.round(Number(d.confidenceScore)*100)}% confidence</em><Button onClick={regen}><AutorenewRounded/> Regenerate</Button><Button color="error" onClick={remove}><DeleteOutlineRounded/></Button></div>;
}
