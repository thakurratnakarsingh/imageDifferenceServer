import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Switch, TextField, Tooltip
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import ListAltRounded from '@mui/icons-material/ListAltRounded';
import { api } from '../api/client';

interface Category {
  id: number;
  name: string;
  slug: string;
  country: string;
  industry: string;
  description?: string | null;
  isActive: boolean;
  levelCount: number;
}

type CategoryForm = Omit<Category, 'id' | 'levelCount'>;

const emptyForm: CategoryForm = {
  name: '',
  slug: '',
  country: '',
  industry: '',
  description: '',
  isActive: true,
};

const slugify = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

export default function CategoryManagementPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number>();
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [error, setError] = useState('');

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/admin/actresses')).data.data as Category[],
  });

  const save = useMutation({
    mutationFn: async () => editingId
      ? api.put(`/admin/actresses/${editingId}`, form)
      : api.post('/admin/actresses', form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['levels'] });
      closeDialog();
    },
    onError: (failure: any) => setError(failure.response?.data?.message || 'Category could not be saved'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/actresses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: (failure: any) => setError(failure.response?.data?.message || 'Category could not be deleted'),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.patch(`/admin/actresses/${id}/status`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: (failure: any) => setError(failure.response?.data?.message || 'Status could not be changed'),
  });

  function openCreate() {
    setEditingId(undefined);
    setForm(emptyForm);
    setError('');
    setDialogOpen(true);
  }

  function openEdit(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      country: category.country,
      industry: category.industry,
      description: category.description || '',
      isActive: category.isActive,
    });
    setError('');
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(undefined);
    setForm(emptyForm);
    setError('');
  }

  function deleteCategory(category: Category) {
    setError('');
    if (window.confirm(`Delete “${category.name}”? Categories with levels cannot be deleted.`)) {
      remove.mutate(category.id);
    }
  }

  const rows = categories.data || [];

  return <div className="page management-page">
    <div className="page-title">
      <div>
        <span className="eyebrow">Content structure</span>
        <h1>Categories.</h1>
        <p>Add, edit, activate, and organize the categories used by every level.</p>
      </div>
      <Button variant="contained" startIcon={<AddRounded/>} onClick={openCreate}>Add category</Button>
    </div>

    {error && !dialogOpen && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

    <section className="panel management-panel">
      <div className="management-summary">
        <span>{rows.length} categories</span>
        <span>{rows.reduce((total, category) => total + Number(category.levelCount || 0), 0)} linked levels</span>
      </div>
      {categories.isLoading
        ? <div className="centered"><CircularProgress/></div>
        : categories.isError
          ? <Alert severity="error">Categories could not be loaded.</Alert>
          : rows.length === 0
            ? <div className="empty-state">No categories yet. Add the first category to begin.</div>
            : <div className="management-list">
              {rows.map(category => <div className="management-row category-management-row" key={category.id}>
                <div className="data-primary">
                  <span className="row-icon">{category.name.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <b>{category.name}</b>
                    <small>{category.country} · {category.industry} · /{category.slug}</small>
                  </div>
                </div>
                <Chip size="small" label={`${category.levelCount || 0} levels`} variant="outlined"/>
                <div className="status-control">
                  <Switch
                    checked={category.isActive}
                    onChange={(_, isActive) => changeStatus.mutate({ id: category.id, isActive })}
                    size="small"
                  />
                  <span>{category.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="row-actions">
                  <Tooltip title="View levels">
                    <IconButton component={Link} to={`/admin/levels?categoryId=${category.id}`}><ListAltRounded/></IconButton>
                  </Tooltip>
                  <Tooltip title="Edit category">
                    <IconButton onClick={() => openEdit(category)}><EditRounded/></IconButton>
                  </Tooltip>
                  <Tooltip title={category.levelCount ? 'Deactivate categories that have levels' : 'Delete category'}>
                    <span>
                      <IconButton disabled={Boolean(category.levelCount) || remove.isPending} onClick={() => deleteCategory(category)}>
                        <DeleteOutlineRounded/>
                      </IconButton>
                    </span>
                  </Tooltip>
                </div>
              </div>)}
            </div>}
    </section>

    <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
      <form onSubmit={event => { event.preventDefault(); save.mutate(); }}>
        <DialogTitle>{editingId ? 'Edit category' : 'Add category'}</DialogTitle>
        <DialogContent className="dialog-form">
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Category name"
            value={form.name}
            onChange={event => {
              const name = event.target.value;
              setForm(current => ({ ...current, name, slug: editingId ? current.slug : slugify(name) }));
            }}
            required
            autoFocus
          />
          <TextField label="Slug" value={form.slug} onChange={event => setForm({ ...form, slug: slugify(event.target.value) })} required/>
          <div className="dialog-two">
            <TextField label="Country" value={form.country} onChange={event => setForm({ ...form, country: event.target.value })} required/>
            <TextField label="Industry" value={form.industry} onChange={event => setForm({ ...form, industry: event.target.value })} required/>
          </div>
          <TextField label="Description" value={form.description || ''} onChange={event => setForm({ ...form, description: event.target.value })} multiline minRows={3}/>
          <label className="dialog-switch">
            <Switch checked={form.isActive} onChange={(_, isActive) => setForm({ ...form, isActive })}/>
            Available for new and existing levels
          </label>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : editingId ? 'Update category' : 'Add category'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  </div>;
}
