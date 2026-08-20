"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { detectLang } from "@/lib/dict";
import { useInstall, isStandalone } from "@/lib/install";
import { useNet, netMessage } from "@/lib/net";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { mergeData, pullRemote, pushRemote } from "@/lib/sync";
import { FlowLayer } from "./FlowLayer";
import { InstallPopup } from "./InstallPopup";
import { ToastHost } from "./Toast";
import { UpdatePrompt } from "./UpdatePrompt";

export function Providers({ children }: { children: React.ReactNode }) {
  const setSession = useAuth((s) => s.setSession);
  const setReady = useAuth((s) => s.setReady);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncing = useRef(false);

  /* Service Worker — nur im Produktions-Build, sonst kämpft er mit dem Dev-Server */
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const onLoad = () => void navigator.serviceWorker.register("/sw.js").catch(() => {});
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  /* Netzstatus. navigator.onLine gibt es beim Server-Render nicht, deshalb
     erst im Effekt setzen — sonst weicht die Hydration ab. */
  useEffect(() => {
    const apply = () => useNet.getState().setOnline(navigator.onLine);
    apply();
    window.addEventListener("online", apply);
    window.addEventListener("offline", apply);
    return () => {
      window.removeEventListener("online", apply);
      window.removeEventListener("offline", apply);
    };
  }, []);

  /* Installierbarkeit. Chrome feuert beforeinstallprompt einmal und erwartet,
     dass wir das Ereignis aufheben — ohne preventDefault zeigt der Browser
     seine eigene Leiste und das Ereignis ist fuer uns verloren. */
  useEffect(() => {
    const install = useInstall.getState();
    install.setStandalone(isStandalone());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      install.setPrompt(e as never);
    };
    const onInstalled = () => install.setJustInstalled(true);
    const mq = window.matchMedia("(display-mode: standalone)");
    const onMode = () => install.setStandalone(isStandalone());

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    mq.addEventListener("change", onMode);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener("change", onMode);
    };
  }, []);

  /* Sprache. Nur beim allerersten Start: danach ist sie eine gespeicherte
     Entscheidung und darf nicht mehr vom Browser überschrieben werden.
     Setzt ausserdem <html lang>, damit Vorlesehilfen richtig aussprechen. */
  useEffect(() => {
    const current = useStore.getState().data.profile?.lang;
    if (!current) {
      useStore.getState().setProfile({ lang: detectLang() });
    }
    const apply = () => {
      document.documentElement.lang = useStore.getState().data.profile?.lang ?? "de";
    };
    apply();
    return useStore.subscribe(apply);
  }, []);

  /* Anmeldestatus */
  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => sub.subscription.unsubscribe();
  }, [setSession, setReady]);

  /* Beim Anmelden: zusammenführen statt überschreiben, dann hochladen */
  useEffect(() => {
    if (!supabase) return;
    const run = async (userId: string) => {
      if (syncing.current) return;
      syncing.current = true;
      useNet.getState().setSync("syncing");
      try {
        const remote = await pullRemote(userId);
        const local = useStore.getState().data;
        const merged = remote ? mergeData(local, remote) : local;
        useStore.getState().setData(merged);
        await pushRemote(userId, merged);
        useStore.getState().setLastSynced(Date.now());
        useNet.getState().setSync("ok");
      } catch (err) {
        /* Offline oder Tabelle fehlt — die App läuft lokal weiter. Anders als
           bisher verschwindet der Fehler nicht lautlos: die Konto-Seite zeigt
           ihn im Klartext. */
        useNet.getState().setSync("error", netMessage(err));
      } finally {
        syncing.current = false;
      }
    };

    const unsub = useAuth.subscribe((s) => {
      if (s.user?.id) void run(s.user.id);
    });
    const current = useAuth.getState().user?.id;
    if (current) void run(current);

    const retry = () => {
      const id = useAuth.getState().user?.id;
      if (id && !document.hidden && navigator.onLine) void run(id);
    };
    document.addEventListener("visibilitychange", retry);
    /* Sobald das Netz zurückkommt, wird sofort nachgeholt statt erst beim
       nächsten Fokuswechsel. */
    window.addEventListener("online", retry);
    return () => {
      unsub();
      document.removeEventListener("visibilitychange", retry);
      window.removeEventListener("online", retry);
    };
  }, []);

  /* Änderungen gebündelt hochladen */
  useEffect(() => {
    if (!supabase) return;
    return useStore.subscribe((state, prev) => {
      if (state.data === prev.data) return;
      const userId = useAuth.getState().user?.id;
      if (!userId) return;
      useNet.getState().setPending(true);
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(async () => {
        useNet.getState().setSync("syncing");
        try {
          await pushRemote(userId, useStore.getState().data);
          useStore.getState().setLastSynced(Date.now());
          useNet.getState().setSync("ok");
        } catch (err) {
          /* Bleibt offen und geht beim nächsten Online-Ereignis oder
             Fokuswechsel mit — lokal sind die Daten längst sicher. */
          useNet.getState().setSync("error", netMessage(err));
        }
      }, 3500);
    });
  }, []);

  return (
    <>
      {children}
      <FlowLayer />
      <ToastHost />
      <UpdatePrompt />
      <InstallPopup />
    </>
  );
}
