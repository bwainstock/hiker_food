# Host Trail Rations on Cloudflare Workers

Trail Rations will deploy its Vite app as Cloudflare Workers Static Assets
through Workers Builds rather than GitHub Pages. GitHub Pages can host the
current browser-local app, but one Worker gives the public static launch branch
previews and a same-origin path to add `/api/*`, Better Auth with Google, and D1
for Accounts, Plan synchronization, Personal Foods, and Catalog Food authoring
without an early hosting migration; a custom domain will precede the Account
release.

Catalog Foods will be authored in D1 and published as a deterministic,
versioned static snapshot committed to Git, preserving fast anonymous loads,
reproducible deployments, and app-and-catalog rollback together. The project
will start on Cloudflare Free with monitored usage and manual upgrades,
continue local editing with an explicit unsynced state during cloud failures,
keep previews away from production D1, and defer Apple sign-in, community
publishing, a catalog admin UI, a multi-Plan UI, and remote staging.
