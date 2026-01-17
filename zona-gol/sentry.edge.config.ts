// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Enable debug mode in development
  debug: false,

  // Environment tag
  environment: process.env.NODE_ENV,

  // Release version (set via CI/CD ideally)
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
});
