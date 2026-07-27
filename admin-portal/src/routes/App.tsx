import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
const Login = lazy(() => import('../pages/LoginPage'));
const Dashboard = lazy(() => import('../pages/DashboardPage'));
const Create = lazy(() => import('../pages/CreateLevelPage'));
const Review = lazy(() => import('../pages/ReviewPage'));
const Resources = lazy(() => import('../pages/ResourcePages'));

function Guard() { return localStorage.getItem('admin_token') ? <AdminLayout/> : <Navigate to="/admin/login" replace/>; }
export function App() {
  return <Suspense fallback={<div className="route-loader">Preparing your studio…</div>}><Routes>
    <Route path="/admin/login" element={<Login/>}/>
    <Route element={<Guard/>}>
      <Route path="/admin/dashboard" element={<Dashboard/>}/>
      <Route path="/admin/levels/create" element={<Create/>}/>
      <Route path="/admin/levels/:id/review" element={<Review/>}/>
      <Route path="/admin/levels/:id/differences" element={<Review/>}/>
      <Route path="/admin/levels/edit/:id" element={<Review/>}/>
      <Route path="/admin/:resource" element={<Resources/>}/>
      <Route path="/admin/actresses/create" element={<Resources/>}/>
      <Route path="/admin/actresses/edit/:id" element={<Resources/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/admin/dashboard" replace/>}/>
  </Routes></Suspense>;
}
