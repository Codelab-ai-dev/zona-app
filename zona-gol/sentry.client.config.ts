// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://a5e72479c23fdd444190dd12412156d5@o4510726280642560.ingest.us.sentry.io/4510726281887744",

  // Sampling rates
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1,

  // Replay - solo en producción y con rate bajo para no afectar performance
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  // Debug solo en desarrollo
  debug: false,

  // Integraciones básicas
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Filtrar errores no accionables
  beforeSend(event, hint) {
    const error = hint.originalException;

    if (error instanceof Error) {
      // Ignorar errores comunes de browser
      if (
        error.message?.includes("ResizeObserver") ||
        error.message?.includes("Loading chunk") ||
        error.message?.includes("cancelled") ||
        error.message?.includes("aborted")
      ) {
        return null;
      }
    }

    return event;
  },
});
