import React from 'react';
import StorefrontV2 from './interface/store/StorefrontV2.tsx';

/**
 * The public storefront is its own React entrypoint.
 * Admin has a separate admin.html + admin-main.tsx entry and is gated at the Worker.
 */
export default function App() {
  const openAdmin = () => window.location.assign('/admin');
  return <StorefrontV2 onOpenAdmin={openAdmin} />;
}
