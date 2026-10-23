/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SAMPLE_PROJECTS } from './utils/sampleProjects.ts';
import { ProjectTemplate } from './types/index.ts';
import {
  useScreenFit,
  ResponsiveLayout,
  AppStoreView,
  ServerPlusConsole,
  SecurityGate,
  GoogleDriveModal,
} from './interface/index.ts';

const ALLOWED_ADMIN_IPS = ['103.149.28.4', '127.0.0.1', '14.162.140.89'];
export const PRIMARY_CLOUDFLARE_PAGES_DOMAIN = 'hendytools.pages.dev';

export default function App() {
  const [currentView, setCurrentView] = useState<'store' | 'admin-plus'>('store');
  const [showSecurityGate, setShowSecurityGate] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [clientIp, setClientIp] = useState('103.149.28.4');
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [apps] = useState<ProjectTemplate[]>(SAMPLE_PROJECTS);

  // Responsive Screen Fit Hook: automatically tracks viewport size and breakpoint under the hood
  const {
    breakpoint,
    fitMode,
    scaleFactor,
  } = useScreenFit();

  const isAuthorizedIp = ALLOWED_ADMIN_IPS.includes(clientIp);

  // Auto-detect route from URL hash, pathname, or Cloudflare Pages domain
  useEffect(() => {
    const handleUrlRoute = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      const host = window.location.hostname;

      // Cloudflare Pages subdomain or standard path routing
      const isAdminRoute =
        path.startsWith('/admin') ||
        path.startsWith('/serverplus') ||
        hash === '#admin' ||
        hash === '#serverplus' ||
        host.startsWith('admin.') ||
        host.startsWith('serverplus.') ||
        host.startsWith('admin-plus.');

      if (isAdminRoute) {
        if (isAuthorizedIp || hasAdminAccess) {
          setCurrentView('admin-plus');
        } else {
          setShowSecurityGate(true);
        }
      } else {
        setCurrentView('store');
      }
    };

    handleUrlRoute();
    window.addEventListener('hashchange', handleUrlRoute);
    window.addEventListener('popstate', handleUrlRoute);
    return () => {
      window.removeEventListener('hashchange', handleUrlRoute);
      window.removeEventListener('popstate', handleUrlRoute);
    };
  }, [isAuthorizedIp, hasAdminAccess]);

  const handleRequestAdminAccess = () => {
    if (isAuthorizedIp || hasAdminAccess) {
      setCurrentView('admin-plus');
      window.location.hash = '#admin';
    } else {
      setShowSecurityGate(true);
    }
  };

  const handleGrantAccess = () => {
    setHasAdminAccess(true);
    setShowSecurityGate(false);
    setCurrentView('admin-plus');
    window.location.hash = '#admin';
  };

  const handleReturnToStore = () => {
    setCurrentView('store');
    window.location.hash = '';
  };

  return (
    <ResponsiveLayout fitMode={fitMode} breakpoint={breakpoint} scaleFactor={scaleFactor}>
      {/* Air-gapped Interface Views (ScreenFitBar is hidden per user instruction) */}
      {currentView === 'store' ? (
        <AppStoreView
          apps={apps}
          onRequestAdminAccess={handleRequestAdminAccess}
        />
      ) : (
        <ServerPlusConsole
          onReturnToStore={handleReturnToStore}
          onOpenDriveModal={() => setShowDriveModal(true)}
          clientIp={clientIp}
        />
      )}

      {/* Security Gate Modal for Admin Console Access */}
      {showSecurityGate && (
        <SecurityGate
          clientIp={clientIp}
          isAuthorizedIp={isAuthorizedIp}
          onGrantAccess={handleGrantAccess}
          onCancel={() => setShowSecurityGate(false)}
          onSimulateIpChange={(newIp) => setClientIp(newIp)}
        />
      )}

      {/* Google Drive Workspace API Integration Modal (Managed within Admin Interface) */}
      {showDriveModal && (
        <GoogleDriveModal onClose={() => setShowDriveModal(false)} />
      )}
    </ResponsiveLayout>
  );
}
