import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, LinearProgress, MenuItem, TextField } from '@mui/material';
import CloudUploadRounded from '@mui/icons-material/CloudUploadRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import CropRounded from '@mui/icons-material/CropRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Job } from '../types';
import { ImageCropDialog } from '../components/ImageCropDialog';

interface ImageInfo {
  width: number;
  height: number;
  sizeMb: number;
  isValid: boolean;
  issues: string[];
}

const supportedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const supportedExtension = /\.(jpe?g|png|webp)$/i;
const minimumDimension = 720;
const maximumDimension = 4096;
const maximumSizeMb = 15;

export default function CreateLevelPage() {
  const navigate = useNavigate(); const fileRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const [file,setFile] = useState<File>(); const [preview,setPreview] = useState(''); const [job,setJob] = useState<Job>(); const [error,setError] = useState('');
  const [isSubmitting,setIsSubmitting] = useState(false);
  const [imageInfo,setImageInfo] = useState<ImageInfo>(); const [cropOpen,setCropOpen] = useState(false);
  const [form,setForm] = useState({levelNumber:'',actressId:searchParams.get('categoryId') || '',difficulty:'easy',timeLimit:'180',maximumLives:'5',maximumHints:'3',generationProvider:'local'});
  const actresses = useQuery({queryKey:['actresses'],queryFn:async()=> (await api.get('/admin/actresses')).data.data});
  useEffect(()=>()=>{ if(preview) URL.revokeObjectURL(preview); },[preview]);
  useEffect(() => {
    if (!job || ['completed','failed','cancelled'].includes(job.status)) return;
    const timer = window.setInterval(async()=> {
      try {
        const next = (await api.get(`/admin/puzzle-generator/jobs/${job.jobUuid}`)).data.data;
        setJob(next);
      } catch (requestError: any) {
        setError(requestError.response?.data?.message || 'Could not check generation progress. The server job may still be running.');
      }
    }, 1200); return ()=>clearInterval(timer);
  },[job?.jobUuid,job?.status]);
  async function select(next?: File) {
    if (!next) return;
    if (!supportedTypes.has(next.type.toLowerCase()) && !supportedExtension.test(next.name)) {
      setError('Only JPG, PNG, or WebP images can be edited and uploaded.');
      return;
    }
    if (next.size > 50 * 1024 * 1024) {
      setError('This image is larger than 50 MB. Compress it before opening the crop editor.');
      return;
    }
    try {
      const dimensions = await inspectImage(next);
      const sizeMb = next.size / (1024 * 1024);
      const issues: string[] = [];
      if (dimensions.width < minimumDimension || dimensions.height < minimumDimension) issues.push(`minimum size is ${minimumDimension} × ${minimumDimension}`);
      if (dimensions.width > maximumDimension || dimensions.height > maximumDimension) issues.push(`maximum size is ${maximumDimension} × ${maximumDimension}`);
      if (sizeMb > maximumSizeMb) issues.push(`file must be ${maximumSizeMb} MB or smaller`);
      const nextInfo = { ...dimensions, sizeMb, issues, isValid: issues.length === 0 };
      setFile(next);
      setPreview(URL.createObjectURL(next));
      setImageInfo(nextInfo);
      setError(nextInfo.isValid ? '' : 'This image does not meet upload requirements yet. Use Edit & crop to prepare it.');
      if (!nextInfo.isValid) setCropOpen(true);
    } catch {
      setError('The selected image could not be opened. Choose another JPG, PNG, or WebP file.');
    }
  }
  function applyCrop(croppedFile: File, width: number, height: number) {
    setFile(croppedFile);
    setPreview(URL.createObjectURL(croppedFile));
    setImageInfo({ width, height, sizeMb: croppedFile.size / (1024 * 1024), isValid: true, issues: [] });
    setCropOpen(false);
    setError('');
  }
  async function generate(e:React.FormEvent) {
    e.preventDefault();
    setError('');
    const levelNumber = Number(form.levelNumber);
    if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 1000) return setError('Enter a level number between 1 and 1000.');
    if (!form.actressId) return setError('Choose a category before generating the level.');
    if(!file) return setError('Choose one original image first.');
    if (!imageInfo?.isValid) return setError('Edit and crop the image before generating the level.');
    const data = new FormData(); data.append('originalImage',file); Object.entries(form).forEach(([k,v])=>data.append(k,v));
    setIsSubmitting(true);
    try {
      const response=(await api.post('/admin/puzzle-generator/generate',data)).data.data;
      setJob({jobUuid:response.jobId,levelId:response.levelId,status:response.status,progress:0,currentStep:'Queued'});
    } catch(e:any) {
      setError(e.response?.data?.message || (e.request ? 'The server did not respond. Check that the API is running and try again.' : 'Generation could not start'));
    } finally {
      setIsSubmitting(false);
    }
  }
  async function retryGeneration() {
    if (!job) return;
    setError('');
    setIsSubmitting(true);
    try {
      const response=(await api.post(`/admin/puzzle-generator/jobs/${job.jobUuid}/retry`)).data.data;
      setJob(current => current && { ...current, ...response, status:'pending', progress:0, currentStep:'Queued' });
    } catch(e:any) {
      setError(e.response?.data?.message || 'Generation retry could not start.');
    } finally {
      setIsSubmitting(false);
    }
  }
  const complete=job?.status==='completed';
  const failed=job?.status==='failed'||job?.status==='cancelled';
  const running=Boolean(job&&!complete&&!failed);
  return <div className="page create-page"><div className="page-title"><div><span className="eyebrow">New level</span><h1>Make ten differences.</h1><p>All we need is one great original.</p></div><div className="step-pill">01 <span>Upload</span> · 02 <span>Generate</span> · 03 <span>Review</span></div></div>
  {error&&<Alert severity="error">{error}</Alert>} {failed&&<Alert severity="error">{job.errorMessage || 'Generation failed after all retries.'}</Alert>}
  <form className="create-grid" onSubmit={generate} noValidate><section className="panel upload-panel">
    <div className={`dropzone ${preview?'has-image':''}`} onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();select(e.dataTransfer.files[0]);}}>
      {preview?<><img src={preview}/><div className="image-preview-actions" onClick={e=>e.stopPropagation()}>
        <Button variant="contained" startIcon={<CropRounded/>} onClick={()=>setCropOpen(true)}>Edit & crop</Button>
        <Button variant="outlined" startIcon={<ReplayRounded/>} onClick={()=>fileRef.current?.click()}>Replace</Button>
      </div></>:<><div className="upload-icon"><CloudUploadRounded/></div><h3>Drop your original here</h3><p>JPG, PNG or WebP · 720–4096px · 15MB max</p><button type="button">Browse files</button></>}
      <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{select(e.target.files?.[0]);e.currentTarget.value='';}}/>
    </div>
    {imageInfo&&<div className={`image-quality ${imageInfo.isValid?'ready':'needs-edit'}`}>
      <div><b>{imageInfo.isValid?'Image ready':'Editing required'}</b><span>{imageInfo.width} × {imageInfo.height} · {imageInfo.sizeMb.toFixed(1)} MB</span></div>
      <small>{imageInfo.isValid?'Meets server upload requirements.':imageInfo.issues.join(' · ')}</small>
      {!imageInfo.isValid&&<Button size="small" startIcon={<CropRounded/>} onClick={()=>setCropOpen(true)}>Fix image</Button>}
    </div>}
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
  {isSubmitting&&!job&&<div className="job-progress"><div><b>Uploading original image</b><span>Starting…</span></div><LinearProgress/><small>The generation job will start as soon as the upload completes.</small></div>}
  {job&&<div className={`job-progress ${complete?'done':''}`}><div><b>{complete?'Ten differences ready':failed?'Generation stopped':job.currentStep}</b><span>{job.progress}%</span></div><LinearProgress variant="determinate" value={job.progress}/><small>{complete?'Dimensions, changed pixels, separation, and coordinates passed.':failed?'Retry this same job; the level and uploaded original are already saved.':'You can leave this screen; the server job keeps running.'}</small></div>}
  {complete
    ? <Button variant="contained" size="large" type="button" onClick={()=>navigate(`/admin/levels/${job.levelId}/review`)}>Open review studio</Button>
    : failed
      ? <Button variant="contained" size="large" type="button" disabled={isSubmitting} onClick={retryGeneration} startIcon={<ReplayRounded/>}>{isSubmitting?'Restarting…':'Retry generation'}</Button>
      : <Button variant="contained" size="large" type="submit" disabled={isSubmitting||running} startIcon={<AutoAwesomeRounded/>}>{isSubmitting?'Uploading…':running?'Generating…':'Generate modified image'}</Button>}
  </section></form>
  <ImageCropDialog file={file} open={cropOpen} onClose={()=>setCropOpen(false)} onApply={applyCrop}/>
  </div>;
}

async function inspectImage(file: File) {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return dimensions;
    } catch {
      // Older browsers and a few JPEG encodings need the HTMLImageElement fallback.
    }
  }
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      reject(new Error('Invalid image'));
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;
  });
}
