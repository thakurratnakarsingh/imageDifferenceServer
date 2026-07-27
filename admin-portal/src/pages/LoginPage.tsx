import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, TextField } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { api } from '../api/client';

export default function LoginPage() {
  const navigate = useNavigate(); const [email,setEmail] = useState('admin@example.com'); const [password,setPassword] = useState('password');
  const [error,setError] = useState(''); const [loading,setLoading] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try { const { data } = await api.post('/auth/admin/login',{email,password}); localStorage.setItem('admin_token',data.data.token); navigate('/admin/dashboard'); }
    catch (e: any) { setError(e.response?.data?.message || 'Could not sign in'); } finally { setLoading(false); }
  }
  return <div className="login-page"><section className="login-story"><div className="story-top"><span className="brand-mark">10</span> Difference Studio</div><div>
    <span className="eyebrow lime">Puzzle production, reimagined</span><h1>One image in.<br/>Ten moments of<br/><em>wonder</em> out.</h1>
    <p>Generate, inspect, and publish fair visual puzzles from one beautifully simple workspace.</p>
  </div><div className="story-stat"><strong>10×</strong><span>automatic, validated<br/>differences per level</span></div></section>
  <section className="login-panel"><form onSubmit={submit}><span className="eyebrow">Admin portal</span><h2>Welcome back.</h2><p>Sign in to continue crafting new levels.</p>
    {error && <Alert severity="error">{error}</Alert>}
    <TextField label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} fullWidth required/>
    <TextField label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} fullWidth required/>
    <Button type="submit" variant="contained" size="large" endIcon={<ArrowForwardRounded/>} disabled={loading}>{loading?'Signing in…':'Enter studio'}</Button>
    <small>Development: admin@example.com / password</small></form></section></div>;
}
