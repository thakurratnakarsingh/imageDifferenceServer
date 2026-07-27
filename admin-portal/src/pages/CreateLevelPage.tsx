import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, LinearProgress, MenuItem, TextField } from '@mui/material';
import CloudUploadRounded from '@mui/icons-material/CloudUploadRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Job } from '../types';

export default function CreateLevelPage() {
  const navigate = useNavigate(); const fileRef = useRef<HTMLInputElement>(null);
  const [file,setFile] = useState<File>(); const [preview,setPreview] = useState(''); const [job,setJob] = useState<Job>(); const [error,setError] = useState('');
  const [form,setForm] = useState({levelNumber:'',actressId:'',difficulty:'easy',timeLimit:'180',maximumLives:'5',maximumHints:'3',generationProvider:'local'});
  const actresses = useQuery({queryKey:['actresses'],queryFn:async()=> (await api.get('/admin/actresses')).data.data});
  useEffect(()=>()=>{ if(preview) URL.revokeObjectURL(preview); },[preview]);
  useEffect(() => {
    if (!job || ['completed','failed','cancelled'].includes(job.status)) return;
    const timer = window.setInterval(async()=> {
      const next = (await api.get(`/admin/puzzle-generator/jobs/${job.jobUuid}`)).data.data; setJob(next);
    }, 1200); return ()=>clearInterval(timer);
  },[job?.jobUuid,job?.status]);
  function select(next?: File) { if (!next) return; if (preview) URL.revokeObjectURL(preview); setFile(next); setPreview(URL.createObjectURL(next)); setError(''); }
  async function generate(e:React.FormEvent) {
    e.preventDefault(); if(!file) return setError('Choose one original image first.');
    const data = new FormData(); data.append('originalImage',file); Object.entries(form).forEach(([k,v])=>data.append(k,v));
    try { const response=(await api.post('/admin/puzzle-generator/generate',data)).data.data; setJob({jobUuid:response.jobId,levelId:response.levelId,status:response.status,progress:0,currentStep:'Queued'}); }
    catch(e:any){setError(e.response?.data?.message||'Generation could not start');}
  }
  const complete=job?.status==='completed', failed=job?.status==='failed';
  return <div className="page create-page"><div className="page-title"><div><span className="eyebrow">New level</span><h1>Make ten differences.</h1><p>All we need is one great original.</p></div><div className="step-pill">01 <span>Upload</span> · 02 <span>Generate</span> · 03 <span>Review</span></div></div>
  {error&&<Alert severity="error">{error}</Alert>} {failed&&<Alert severity="error">{job.errorMessage || 'Generation failed after all retries.'}</Alert>}
  <form className="create-grid" onSubmit={generate}><section className="panel upload-panel">
    <div className={`dropzone ${preview?'has-image':''}`} onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();select(e.dataTransfer.files[0]);}}>
      {preview?<><img src={preview}/><div className="replace">Choose another image</div></>:<><div className="upload-icon"><CloudUploadRounded/></div><h3>Drop your original here</h3><p>JPG, PNG or WebP · 720px minimum · 15MB max</p><button type="button">Browse files</button></>}
      <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>select(e.target.files?.[0])}/>
    </div>
    <div className="rights-note"><CheckCircleRounded/><span><b>Rights check</b> Only upload images your organization owns or is licensed to use.</span></div>
  </section>
  <section className="panel form-panel"><span className="section-number">Level details</span><div className="form-two">
    <TextField label="Level number" type="number" value={form.levelNumber} onChange={e=>setForm({...form,levelNumber:e.target.value})} inputProps={{min:1,max:1000}} required/>
    <TextField select label="Category" value={form.actressId} onChange={e=>setForm({...form,actressId:e.target.value})} required>{(actresses.data||[]).map((x:any)=><MenuItem key={x.id} value={x.id}>{x.name}</MenuItem>)}</TextField>
    <TextField select label="Difficulty" value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})}>{['easy','medium','hard','expert'].map(x=><MenuItem key={x} value={x}>{x[0].toUpperCase()+x.slice(1)}</MenuItem>)}</TextField>
    <TextField select label="Generation engine" value={form.generationProvider} onChange={e=>setForm({...form,generationProvider:e.target.value})}><MenuItem value="local">Local · deterministic</MenuItem><MenuItem value="hybrid">Hybrid · AI fallback</MenuItem><MenuItem value="ai">AI adapter</MenuItem></TextField>
    <TextField label="Timer (seconds)" type="number" value={form.timeLimit} onChange={e=>setForm({...form,timeLimit:e.target.value})}/>
    <TextField label="Lives" type="number" value={form.maximumLives} onChange={e=>setForm({...form,maximumLives:e.target.value})}/>
  </div>
  {job&&<div className={`job-progress ${complete?'done':''}`}><div><b>{complete?'Ten differences ready':job.currentStep}</b><span>{job.progress}%</span></div><LinearProgress variant="determinate" value={job.progress}/><small>{complete?'Dimensions, changed pixels, separation, and coordinates passed.':'You can leave this screen; the server job keeps running.'}</small></div>}
  {complete?<Button variant="contained" size="large" onClick={()=>navigate(`/admin/levels/${job.levelId}/review`)}>Open review studio</Button>:<Button variant="contained" size="large" type="submit" disabled={!file||Boolean(job&&!failed)} startIcon={<AutoAwesomeRounded/>}>{job&&!failed?'Generating…':'Generate modified image'}</Button>}
  </section></form></div>;
}
