import { redirect } from "next/navigation";

/** Alte Adresse. Bleibt bestehen, damit Lesezeichen, der Service-Worker-Cache
 *  und die Manifest-Verknüpfungen weiter funktionieren. */
export default function Page() {
  redirect("/du");
}
