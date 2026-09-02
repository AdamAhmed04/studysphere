import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuroraGround } from './components/AuroraGround';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { TimerProvider } from './contexts/TimerContext';
import { ToastProvider } from './contexts/ToastContext';
import './index.css';

// Auth and Timer mount their hook exactly once, so everything below reads the
// same auth state and drives the same Web Worker. Toast is outermost so any
// provider below it can report a failure.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/*
      * Outside ErrorBoundary and above every screen: the ground belongs to the
      * app, not to one view. Mounted here it is behind the sign-in page and
      * the error screen too, both of which are places you can end up before
      * anything else has rendered.
      */}
    <AuroraGround />
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <TimerProvider>
            <App />
          </TimerProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);
