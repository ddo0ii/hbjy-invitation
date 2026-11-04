import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/500.css';
import '@fontsource/noto-serif-kr/400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import './styles.css';
import { App } from './App.tsx';
const Admin = lazy(() => import('./Admin.tsx').then(module => ({ default: module.Admin })));

createRoot(document.getElementById('root')!).render(
  <StrictMode><Suspense fallback={<p className="loading-page">잠시만 기다려 주세요.</p>}>{window.location.pathname === '/admin' ? <Admin /> : <App />}</Suspense></StrictMode>,
);
