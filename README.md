# STARCORP GROUP — Sistema de control operativo y administrativo

Migración a **Next.js (App Router) + React + TypeScript + Tailwind CSS** del
boceto PHP que vive en `../starcorp` (que sigue funcionando en XAMPP como
referencia).

Fase actual: **UI fiel al boceto con datos de ejemplo tipados**. Supabase
está preparado (esquema, RLS y seeds en `supabase/`) pero las pantallas aún
no lo consumen — ver [docs/supabase.md](docs/supabase.md).

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de producción (verifica TypeScript)
```

No hacen falta variables de entorno en esta fase. Cuando se conecte
Supabase, copia `.env.example` a `.env.local` y completa los valores.

## Probar los dos roles

Igual que en el boceto (config.php), cambia el rol en
[`src/lib/config.ts`](src/lib/config.ts):

```ts
export const USUARIO_ACTUAL: Usuario = {
  nombre: "Administradora",
  rol: "administradora", // cámbialo a 'operaciones'
  inicial: "A",
};
```

- **administradora**: ve todos los módulos.
- **operaciones**: ve panel, inventario, equipos, mantenimiento y asignación
  (sin finanzas, nómina, facturas ni retenciones).

## Estructura

```
src/
├── app/
│   ├── page.tsx                     Login (simulado: lleva al dashboard)
│   └── (app)/                       Rutas con sidebar + topbar
│       ├── dashboard/
│       └── loter/
│           ├── administracion/      nomina · finanzas · facturas ·
│           │                        retenciones · inventario · equipos ·
│           │                        mantenimiento
│           └── operaciones/asignacion-equipos/
├── components/
│   ├── layout/                      AppShell, Sidebar (gating por rol),
│   │                                Topbar, PageHeader
│   ├── nomina/                      Módulo completo (reducer + modales)
│   ├── retenciones/  asignacion/  inventario/  login/
│   └── ui/                          Modal, Toast, KpiCard, etc.
└── lib/
    ├── config.ts                    Constantes + usuario simulado (rol)
    ├── types.ts                     Tipos del dominio
    ├── permissions.ts               puede(rol, area)
    ├── format.ts                    Formato/parseo es-VE determinista
    ├── data/                        Datos de ejemplo (transcritos del PHP)
    ├── negocio/                     Cálculos: nómina, retención IVA, fechas
    └── supabase/client.ts           Cliente listo para la fase de conexión
supabase/
├── migrations/                      Tipos, tablas + índices, RLS
└── seed.sql                         Datos de ejemplo en SQL
```

## Reglas de negocio preservadas del boceto

- **Nómina**: salario diario = base mensual ÷ 30 (ambas categorías); período
  semanal = 7 días, quincenal = 15; descuento = faltas × diario;
  neto = (días − faltas) × diario. Conversión Bs con tasa editable.
- **Retención IVA**: alícuota fija 16%; retención 75% o 100% (default 100);
  montos en formato es-VE (puntos de miles, coma decimal).
- **Asignaciones**: días = diferencia inclusiva de ambos extremos; IDs S-00x
  autoincrementales continuando el historial.

## Deploy en Vercel

1. Inicializa git y sube el repo a GitHub:
   ```bash
   git init && git add -A && git commit -m "Migración Next.js"
   ```
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el
   repo. Vercel detecta Next.js solo; no hay que tocar nada del build.
3. (Opcional en esta fase) En **Settings → Environment Variables** agrega
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Deploy**.
