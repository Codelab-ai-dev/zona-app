// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,

  // Enable debug mode in development
  debug: false,

  // Environment tag
  environment: process.env.NODE_ENV,

  // Release version (set via CI/CD ideally)
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Filter out specific errors
  beforeSend(event, hint) {
    const error = hint.originalException;

    if (error instanceof Error) {
      // Ignore auth token refresh errors (handled gracefully in app)
      if (
        error.message?.includes("Refresh Token") ||
        error.message?.includes("refresh_token")
      ) {
        return null;
      }

      // Ignore network timeouts (transient)
      if (error.message?.includes("ETIMEDOUT")) {
        return null;
      }
    }

    return event;
  },
});
