import { useSearchParams } from "react-router-dom";
import Lab from "../components/labs/Lab";

/** base64url (RFC 4648 §5) of UTF-8 text, as the mobile app writes it. */
function decode(param: string) {
  try {
    const bin = atob(param.replace(/-/g, "+").replace(/_/g, "/"));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return "";
  }
}

/**
 * One lab on its own, without the site chrome: /labo?c=<base64url of the ```lab JSON>.
 * The mobile app shows lesson labs through this page, in an embedded web view.
 */
export default function LabPage() {
  const [params] = useSearchParams();
  const source = decode(params.get("c") ?? "");
  return (
    <main className="min-h-screen bg-white px-3 py-3">
      <div className="prose-lesson mx-auto max-w-3xl">
        {source ? <Lab source={source} /> : <p>Ce labo est introuvable.</p>}
      </div>
    </main>
  );
}
