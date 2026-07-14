import { AppShell } from "@/components/layout/AppShell";
import { FinanzasProvider } from "@/components/finanzas/FinanzasProvider";
import { FacturacionProvider } from "@/components/facturacion/FacturacionProvider";
import { OrdenesProvider } from "@/components/ordenes/OrdenesProvider";
import { InventarioProvider } from "@/components/inventario/InventarioProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <FinanzasProvider>
        <FacturacionProvider>
          <OrdenesProvider>
            <InventarioProvider>{children}</InventarioProvider>
          </OrdenesProvider>
        </FacturacionProvider>
      </FinanzasProvider>
    </AppShell>
  );
}
