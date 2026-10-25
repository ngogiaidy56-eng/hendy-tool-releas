# Upstream source snapshot

This directory mirrors `ngogiaidy56-eng/hendy-server-app-store` main. It preserves the upstream application, Pages Functions, D1 migration, admin/user components, and automation scripts. Pages Functions inside this directory are not part of the deployment root and are not deployed directly.

Refresh with `npm run sync:app-store` or the repository workflow **Sync App Store upstream**. The sync excludes generated AI Studio media, binary installers/media, local environments/secrets, `node_modules`, build output, and `firebase-applet-config.json`.

The live target architecture remains the Worker API plus three independent Pages. Port API functionality from the snapshot into the Worker intentionally before changing the production route contract.
