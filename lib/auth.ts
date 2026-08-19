"use client";

import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  ready: boolean;
  setSession: (session: Session | null) => void;
  setReady: (ready: boolean) => void;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  ready: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setReady: (ready) => set({ ready }),
}));

/** Supabase-Fehlermeldungen sind englisch und technisch — hier auf Klartext bringen. */
export function authMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "E-Mail oder Passwort stimmt nicht.";
  if (m.includes("email not confirmed")) return "Bestätige zuerst die E-Mail, die wir dir geschickt haben.";
  if (m.includes("user already registered")) return "Diese E-Mail hat schon ein Konto — melde dich einfach an.";
  if (m.includes("password should be at least")) return "Das Passwort braucht mindestens 6 Zeichen.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "Diese E-Mail-Adresse sieht nicht richtig aus.";
  if (m.includes("rate limit") || m.includes("too many")) return "Zu viele Versuche. Warte kurz und probier es nochmal.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Keine Verbindung zum Server.";
  return message;
}

export async function signUp(email: string, password: string) {
  if (!supabase) throw new Error("Cloud ist nicht eingerichtet.");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(authMessage(error.message));
  return data;
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error("Cloud ist nicht eingerichtet.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(authMessage(error.message));
  return data;
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(authMessage(error.message));
}

/** Zuruecksetzen-Mail anfordern. Der Link fuehrt zurueck aufs Konto, wo das
 *  neue Passwort gesetzt wird — detectSessionInUrl loest den Token ein. */
export async function sendPasswordReset(email: string) {
  if (!supabase) throw new Error("Cloud ist nicht eingerichtet.");
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/account` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(authMessage(error.message));
}

export async function updatePassword(password: string) {
  if (!supabase) throw new Error("Cloud ist nicht eingerichtet.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(authMessage(error.message));
}

/** Aendert die Adresse erst nach Bestaetigung ueber beide Postfaecher. */
export async function updateEmail(email: string) {
  if (!supabase) throw new Error("Cloud ist nicht eingerichtet.");
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/account` : undefined;
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo });
  if (error) throw new Error(authMessage(error.message));
}
