import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import { LoginForm } from "@/components/login/LoginForm";
import { LogoMark } from "@/components/ui/LogoMark";

export const metadata: Metadata = {
  title: `Iniciar sesión · ${APP_NAME}`,
};

export default function LoginPage() {
  return (
    <div className="flex min-h-full bg-navy-950">
      {/* Panel de marca */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-navy-950 p-12 lg:flex xl:w-[55%]">
        <div className="chevron-field absolute inset-0 opacity-60"></div>
        {/* halo dorado */}
        <div className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl"></div>

        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-900 ring-1 ring-white/10">
            <LogoMark className="h-6 w-6" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg font-700 tracking-tight text-white">
              STARCORP <span className="text-gold-500">GROUP</span>
            </p>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
              Conglomerado empresarial
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-700 leading-tight tracking-tight text-white">
            Un solo panel para
            <br />
            todo el conglomerado.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-300">
            Control operativo y administrativo de las empresas del grupo: nómina, finanzas,
            facturación, retenciones, inventario y asignación de equipos en campo.
          </p>
          {/* Aquí NO va el listado de empresas del conglomerado: esta página es
              pública (previa al login) y sus nombres —y los de las personas del
              grupo— no deben quedar expuestos. Solo se muestran ya dentro del
              sistema (selector del topbar, Finanzas). */}
        </div>

        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} {APP_NAME}. Todos los derechos reservados.
        </p>
      </div>

      {/* Panel del formulario */}
      <div className="flex w-full flex-col justify-center bg-slate-100 px-6 py-12 lg:w-1/2 xl:w-[45%]">
        <div className="mx-auto w-full max-w-sm">
          {/* Marca compacta (visible en móvil) */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-950">
              <LogoMark className="h-5 w-5" />
            </span>
            <p className="font-display text-base font-700 text-navy-950">
              STARCORP <span className="text-gold-600">GROUP</span>
            </p>
          </div>

          <h1 className="font-display text-2xl font-700 tracking-tight text-navy-950">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ingresa tus credenciales para acceder al panel.
          </p>

          <LoginForm />

          <p className="mt-8 text-center text-xs text-slate-400">
            ¿Problemas para acceder? Contacta a soporte interno del grupo.
          </p>
        </div>
      </div>
    </div>
  );
}
