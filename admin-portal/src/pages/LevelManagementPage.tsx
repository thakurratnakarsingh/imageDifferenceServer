import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Switch, TextField, Tooltip
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import RateReviewRounded from '@mui/icons-material/RateReviewRounded';
import { api } from '../api/client';

interface Category {
  id: number;
  name: string;
  isActive: boolean;
}

interface ManagedLevel {
  id: number;
  levelNumber: number;
  actressId: number;
  title: string;
  difficulty: string;
  timeLimit: number;
  maximumLives: number;
  maximumHints: number;
  completionBonus: number;
  reviewStatus: string;
  validationStatus: string;
  isActive: boolean;
  Actress?: Category;
}

interface LevelForm {
  levelNumber: string;
  actressId: string;
  title: string;
  difficulty: string;
  timeLimit: string;
  maximumLives: string;
  maximumHints: string;
  completionBonus: string;
}

export default function LevelManagementPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ManagedLevel>();
  const [form, setForm] = useState<LevelForm>();
  const [error, setError] = useState('');

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/admin/actresses')).data.data as Category[],
  });

  const levels = useQuery({
    queryKey: ['levels', categoryId, status, search],
    queryFn: async () => (await api.get('/admin/levels', {
      params: {
        limit: 100,
        actressId: categoryId || undefined,
        status: status || undefined,
        search: search.trim() || undefined,
      },
    })).data,
  });

  const rows = useMemo(() => (levels.data?.data || []) as ManagedLevel[], [levels.data]);
  const total = Number(levels.data?.meta?.total || rows.length);

  const update = useMutation({
    mutationFn: () => api.put(`/admin/levels/${editing!.id}`, {
      levelNumber: Number(form!.levelNumber),
      actressId: Number(form!.actressId),
      title: form!.title,
      difficulty: form!.difficulty,
      timeLimit: Number(form!.timeLimit),
      maximumLives: Number(form!.maximumLives),
      maximumHints: Number(form!.maximumHints),
      completionBonus: Number(form!.completionBonus),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['levels'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditing(undefined);
      setForm(undefined);
      setError('');
    },
    onError: (failure: any) => setError(failure.response?.data?.message || 'Level could not be updated'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/levels/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['levels'] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (failure: any) => setError(failure.response?.data?.message || 'Level could not be deleted'),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.patch(`/admin/levels/${id}/status`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['levels'] }),
    onError: (failure: any) => setError(failure.response?.data?.message || 'Only approved levels can be activated'),
  });

  function selectCategory(next: string) {
    setCategoryId(next);
    const params = new URLSearchParams(searchParams);
    if (next) params.set('categoryId', next);
    else params.delete('categoryId');
    setSearchParams(params, { replace: true });
  }

  function openEdit(level: ManagedLevel) {
    setError('');
    setEditing(level);
    setForm({
      levelNumber: String(level.levelNumber),
      actressId: String(level.actressId),
      title: level.title,
      difficulty: level.difficulty,
      timeLimit: String(level.timeLimit),
      maximumLives: String(level.maximumLives),
      maximumHints: String(level.maximumHints),
      completionBonus: String(level.completionBonus),
    });
  }

  function deleteLevel(level: ManagedLevel) {
    setError('');
    if (window.confirm(`Delete level ${level.levelNumber} — “${level.title}”? This cannot be undone.`)) {
      remove.mutate(level.id);
    }
  }

  const createLink = categoryId ? `/admin/levels/create?categoryId=${categoryId}` : '/admin/levels/create';

  return <div className="page management-page">
    <div className="page-title">
      <div>
        <span className="eyebrow">Puzzle library</span>
        <h1>Levels.</h1>
        <p>See every level, filter by category, and control its metadata and availability.</p>
      </div>
      <Button component={Link} to={createLink} variant="contained" startIcon={<AddRounded/>}>Add level</Button>
    </div>

    {error && !editing && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

    <section className="panel management-panel">
      <div className="management-toolbar">
        <TextField select label="Category" value={categoryId} onChange={event => selectCategory(event.target.value)} size="small">
          <MenuItem value="">All categories</MenuItem>
          {(categories.data || []).map(category => <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>)}
        </TextField>
        <TextField select label="Review status" value={status} onChange={event => setStatus(event.target.value)} size="small">
          <MenuItem value="">All statuses</MenuItem>
          {['draft', 'needs_review', 'approved', 'rejected'].map(value =>
            <MenuItem key={value} value={value}>{value.replace('_', ' ')}</MenuItem>)}
        </TextField>
        <TextField label="Search levels" value={search} onChange={event => setSearch(event.target.value)} size="small" placeholder="Title or category"/>
        <span className="toolbar-count">{total} levels</span>
      </div>

      {levels.isLoading
        ? <div className="centered"><CircularProgress/></div>
        : levels.isError
          ? <Alert severity="error">Levels could not be loaded.</Alert>
          : rows.length === 0
            ? <div className="empty-state">No levels match this category or filter.</div>
            : <div className="management-list">
              {rows.map(level => <div className="management-row level-management-row" key={level.id}>
                <div className="data-primary">
                  <span className="row-icon">{level.levelNumber}</span>
                  <div>
                    <b>{level.title}</b>
                    <small>{level.Actress?.name || 'Uncategorized'} · {level.difficulty} · {level.timeLimit}s</small>
                  </div>
                </div>
                <div className="level-state">
                  <Chip size="small" label={level.reviewStatus.replace('_', ' ')} color={level.reviewStatus === 'approved' ? 'success' : 'default'}/>
                  <small>{level.validationStatus}</small>
                </div>
                <div className="status-control">
                  <Switch
                    size="small"
                    checked={level.isActive}
                    onChange={(_, isActive) => changeStatus.mutate({ id: level.id, isActive })}
                  />
                  <span>{level.isActive ? 'Live' : 'Hidden'}</span>
                </div>
                <div className="row-actions">
                  <Tooltip title="Review puzzle">
                    <IconButton component={Link} to={`/admin/levels/${level.id}/review`}><RateReviewRounded/></IconButton>
                  </Tooltip>
                  <Tooltip title="Edit level">
                    <IconButton onClick={() => openEdit(level)}><EditRounded/></IconButton>
                  </Tooltip>
                  <Tooltip title="Delete level">
                    <IconButton onClick={() => deleteLevel(level)} disabled={remove.isPending}><DeleteOutlineRounded/></IconButton>
                  </Tooltip>
                </div>
              </div>)}
            </div>}
    </section>

    <Dialog open={Boolean(editing && form)} onClose={() => { setEditing(undefined); setForm(undefined); setError(''); }} fullWidth maxWidth="md">
      {form && <form onSubmit={event => { event.preventDefault(); update.mutate(); }}>
        <DialogTitle>Edit level {editing?.levelNumber}</DialogTitle>
        <DialogContent className="dialog-form">
          {error && <Alert severity="error">{error}</Alert>}
          <div className="dialog-two">
            <TextField label="Level number" type="number" value={form.levelNumber} onChange={event => setForm({ ...form, levelNumber: event.target.value })} inputProps={{ min: 1, max: 1000 }} required/>
            <TextField select label="Category" value={form.actressId} onChange={event => setForm({ ...form, actressId: event.target.value })} required>
              {(categories.data || []).map(category => <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>)}
            </TextField>
          </div>
          <TextField label="Title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required/>
          <div className="dialog-two">
            <TextField select label="Difficulty" value={form.difficulty} onChange={event => setForm({ ...form, difficulty: event.target.value })}>
              {['easy', 'medium', 'hard', 'expert'].map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
            <TextField label="Timer (seconds)" type="number" value={form.timeLimit} onChange={event => setForm({ ...form, timeLimit: event.target.value })}/>
            <TextField label="Lives" type="number" value={form.maximumLives} onChange={event => setForm({ ...form, maximumLives: event.target.value })}/>
            <TextField label="Hints" type="number" value={form.maximumHints} onChange={event => setForm({ ...form, maximumHints: event.target.value })}/>
          </div>
          <TextField label="Completion bonus" type="number" value={form.completionBonus} onChange={event => setForm({ ...form, completionBonus: event.target.value })}/>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditing(undefined); setForm(undefined); setError(''); }}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Update level'}</Button>
        </DialogActions>
      </form>}
    </Dialog>
  </div>;
}
