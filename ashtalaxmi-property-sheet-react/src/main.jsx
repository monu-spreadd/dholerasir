import React from 'react';
import { createRoot } from 'react-dom/client';

// Fonts are bundled with the app (no Google Fonts request), so the PDF looks the same everywhere.
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/noto-sans-gujarati/500.css';
import '@fontsource/noto-sans-gujarati/600.css';

import './styles.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
