import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { App } from './routes/App';
import './styles.css';

const theme = createTheme({
  palette: { mode: 'dark', primary: { main: '#d8ff52', contrastText: '#071815' }, secondary: { main: '#57d6b3' }, background: { default: '#061310', paper: '#10231f' } },
  typography: { fontFamily: '"Inter", system-ui, sans-serif', h1: { fontFamily: '"DM Serif Display", Georgia, serif' }, h2: { fontFamily: '"DM Serif Display", Georgia, serif' }, button: { textTransform: 'none', fontWeight: 700 } },
  shape: { borderRadius: 14 }
});
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } });
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ThemeProvider theme={theme}><CssBaseline/><QueryClientProvider client={queryClient}><BrowserRouter><App/></BrowserRouter></QueryClientProvider></ThemeProvider></React.StrictMode>
);
