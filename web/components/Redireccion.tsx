"use client";
import { useEffect } from "react";
export function Redireccion({ a }: { a: string }) {
  useEffect(() => { window.location.replace(a + window.location.search); }, [a]);
  return <p className="note">Redirigiendo a <a href={a}>{a}</a>…</p>;
}
