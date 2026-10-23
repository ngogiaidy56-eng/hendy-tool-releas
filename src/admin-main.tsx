import { createRoot } from 'react-dom/client';
import StudioWorkspace from './interface/admin/StudioWorkspace.tsx';
import './admin.css';

const root = document.getElementById('root');
if (!root) throw new Error('Admin root element is missing.');

createRoot(root).render(
  <StudioWorkspace onReturnToStore={() => window.location.assign('/')} />
);