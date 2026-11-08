import { Redireccion } from "@/components/Redireccion";
export default function Inicio() {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=/historico/" />
      <Redireccion a="/historico/" />
    </>
  );
}
