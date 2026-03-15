import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { SnackbarProvider } from 'notistack';

// Chrome/CRA dev overlay can show this as a blocking error.
// It is typically harmless and triggered by rapid layout reflows.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener(
    'error',
    (e) => {
      const message = String(e?.message || '');
      if (message.includes('ResizeObserver loop limit exceeded') || message.includes('ResizeObserver loop completed')) {
        e.stopImmediatePropagation();
      }
    },
    true
  );
}

const iconStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 10 };
const circleIcon = (bg, fg, char) => (
  <span style={{ ...iconStyle, width: 22, height: 22, borderRadius: '50%', background: bg }}>
    <span style={{ color: fg, fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{char}</span>
  </span>
);

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <SnackbarProvider
        maxSnack={2}
        autoHideDuration={2500}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        iconVariant={{
          success: circleIcon('#166534', '#fff', '✓'),
          warning: <span style={{ ...iconStyle, fontSize: 20, lineHeight: 1 }}>⚠</span>,
          error: circleIcon('#fff', '#ef4444', '✕'),
          info: circleIcon('#1e40af', '#fff', 'i'),
        }}
      >
        <Router>
          <App />
        </Router>
      </SnackbarProvider>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);