import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

import { ErrorBoundary } from '../common/ErrorBoundary';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-warm-bg text-warm-text font-sans antialiased selection:bg-warm-secondary selection:text-warm-secondary-text">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};
