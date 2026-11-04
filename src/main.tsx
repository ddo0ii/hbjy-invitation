import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/gowun-dodum/400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import './styles.css';
import { App } from './App.tsx';
const Admin = lazy(() => import('./Admin.tsx').then(module => ({ default: module.Admin })));

createRoot(document.getElementById('root')!).render(
  <StrictMode><Suspense fallback={<p className="loading-page">초대장을 펼치고 있어요.</p>}>{window.location.pathname === '/admin' ? <Admin /> : <App />}</Suspense></StrictMode>,
);
