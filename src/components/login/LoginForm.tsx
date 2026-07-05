"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";

/**
 * Formulario de inicio de sesión (fase boceto: no valida).
 * Desviación deliberada respecto al PHP: el original hacía GET a
 * dashboard.php dejando las credenciales en la URL; aquí se navega
 * con router.push sin enviar nada.
 */
export function LoginForm() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push("/dashboard");
      }}
      className="mt-8 space-y-5"
    >
      <div>
        <label htmlFor="usuario" className="mb-1.5 block text-sm font-600 text-navy-900">
          Usuario o correo
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <input
            id="usuario"
            name="usuario"
            type="text"
            autoComplete="username"
            placeholder="administradora@starcorp.com"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="clave" className="block text-sm font-600 text-navy-900">
            Contraseña
          </label>
          <a href="#" className="text-xs font-600 text-navy-600 hover:text-gold-600">
            ¿Olvidaste tu clave?
          </a>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <input
            id="clave"
            name="clave"
            type={showPwd ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-navy-500 focus:ring-2 focus:ring-navy-100"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="Mostrar u ocultar contraseña"
          >
            {showPwd ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-navy-800 focus:ring-navy-300"
        />
        Mantener sesión iniciada
      </label>

      <button
        type="submit"
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3 text-sm font-600 text-white transition hover:bg-navy-800 active:scale-[.99]"
      >
        Entrar al panel
        <ArrowRight className="h-[18px] w-[18px] transition group-hover:translate-x-0.5" />
      </button>
    </form>
  );
}
