// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production.
  // For performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,

  // Enable debug mode in development
  debug: false,

  // Replay configuration for session recording
  replaysOnErrorSampleRate: 1.0, // Always capture replay when error occurs
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0, // Sample 10% of sessions in production

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content for privacy
      maskAllText: false,
      // Block all media (images, videos, etc.) for privacy
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
    Sentry.feedbackIntegration({
      // Customize the feedback button
      colorScheme: "dark",
      buttonLabel: "Reportar problema",
      submitButtonLabel: "Enviar reporte",
      cancelButtonLabel: "Cancelar",
      formTitle: "Reportar un problema",
      nameLabel: "Nombre",
      namePlaceholder: "Tu nombre",
      emailLabel: "Email",
      emailPlaceholder: "tu@email.com",
      messageLabel: "Descripción del problema",
      messagePlaceholder: "¿Qué pasó? ¿Qué esperabas que pasara?",
      successMessageText: "¡Gracias por tu reporte!",
    }),
  ],

  // Filter out specific errors that are not actionable
  beforeSend(event, hint) {
    const error = hint.originalException;

    // Ignore specific known errors
    if (error instanceof Error) {
      // Ignore ResizeObserver errors (common browser noise)
      if (error.message?.includes("ResizeObserver")) {
        return null;
      }

      // Ignore chunk loading errors (usually network issues)
      if (error.message?.includes("Loading chunk")) {
        return null;
      }

      // Ignore cancelled requests
      if (error.message?.includes("cancelled") || error.message?.includes("aborted")) {
        return null;
      }
    }

    return event;
  },

  // Environment tag
  environment: process.env.NODE_ENV,

  // Release version (set via CI/CD ideally)
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
});
