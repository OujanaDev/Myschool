import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

/* « Continuer avec Google » through Google Identity Services: the script is loaded once, the official button is
   rendered by Google and hands back an ID token, which the API verifies (POST /auth/google). The whole block stays
   hidden when the API has no Google client id. */

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GSI_SRC = "https://accounts.google.com/gsi/client";
let gsiLoading: Promise<void> | null = null;
let clientIdPromise: Promise<string | null> | null = null;

function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiLoading) {
    gsiLoading = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = GSI_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => {
        gsiLoading = null;
        reject(new Error("Google indisponible"));
      };
      document.head.appendChild(s);
    });
  }
  return gsiLoading;
}

function googleClientId() {
  if (!clientIdPromise) {
    clientIdPromise = api
      .get<{ googleClientId: string | null }>("/auth/config")
      .then((c) => c.googleClientId)
      .catch(() => null);
  }
  return clientIdPromise;
}

export function GoogleButton({
  text = "continue_with",
  standalone = false,
  onCredential,
  onError,
}: {
  text?: "continue_with" | "signin_with" | "signup_with";
  /** The button is the main action of the page: no « ou » divider above it. */
  standalone?: boolean;
  /** Receives Google's ID token; the caller exchanges it for a session. */
  onCredential: (credential: string) => Promise<void> | void;
  onError?: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const latest = useRef({ onCredential, onError });
  latest.current = { onCredential, onError };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const clientId = await googleClientId();
      if (!clientId || cancelled) return;
      try {
        await loadGsi();
      } catch (err: any) {
        latest.current.onError?.(err.message);
        return;
      }
      if (cancelled || !host.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: "popup",
        callback: async (r: { credential?: string }) => {
          if (!r.credential) return;
          try {
            await latest.current.onCredential(r.credential);
          } catch (err: any) {
            latest.current.onError?.(err.message || "Connexion Google impossible");
          }
        },
      });
      host.current.innerHTML = "";
      window.google.accounts.id.renderButton(host.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text,
        locale: "fr",
        width: Math.min(400, Math.max(200, host.current.clientWidth || 320)),
      });
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <div className={ready ? "mt-6" : "hidden"}>
      {!standalone && (
        <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
          <span className="h-px flex-1 bg-slate-200" />
          ou
          <span className="h-px flex-1 bg-slate-200" />
        </div>
      )}
      <div ref={host} className="flex justify-center" />
    </div>
  );
}
