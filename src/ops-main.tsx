import { createRoot } from 'react-dom/client';
import OperationsConsole from './interface/operations/OperationsConsole.tsx';
import './ops.css';

const root = document.getElementById('root');
if (!root) throw new Error('Operations root element is missing.');
createRoot(root).render(<OperationsConsole />);
