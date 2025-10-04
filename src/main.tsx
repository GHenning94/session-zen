import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/premium.css'
import './hooks/useThemeFlashPrevention'

createRoot(document.getElementById("root")!).render(<App />);
