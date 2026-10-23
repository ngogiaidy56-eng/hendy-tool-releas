import React, { useEffect, useState } from 'react';
import StorefrontV2 from './interface/store/StorefrontV2.tsx';
import StudioWorkspace from './interface/admin/StudioWorkspace.tsx';

type AppView = 'store' | 'admin';

function resolveView(): AppView {
  const path = window.location.pathname.toLowerCase();
  const host = window.location.hostname.toLowerCase();
  if (path === '/admin' || path.startsWith('/admin/') || path === '/studio' || path.startsWith('/studio/')) return 'admin';
  if (host.startsWith('admin.') || host.startsWith('serverplus.') || host.startsWith('admin-plus.') || host.startsWith('studio.')) return 'admin';
  return 'store';
}

export default function App() {
  const [view, setView] = useState<AppView>(resolveView);

  useEffect(() => {
    const syncRoute = () => setView(resolveView());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  const openAdmin = () => {
    if (resolveView() === 'admin') {
      setView('admin');
      return;
    }
    window.history.pushState({}, '', '/admin');
    setView('admin');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const openStore = () => {
    const host = window.location.hostname.toLowerCase();
    if (host.startsWith('admin.') || host.startsWith('serverplus.') || host.startsWith('admin-plus.') || host.startsWith('studio.')) {
      const storeHost = host.replace(/^(admin|serverplus|admin-plus|studio)\./, '');
      window.location.href = window.location.protocol + '//' + storeHost + '/';
      return;
    }
    window.history.pushState({}, '', '/');
    setView('store');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return view === 'admin'
    ? <StudioWorkspace onReturnToStore={openStore} />
    : <StorefrontV2 onOpenAdmin={openAdmin} />;
}
