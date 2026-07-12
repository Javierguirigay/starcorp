import { AppShell } from "@/components/layout/AppShell";
import { FinanzasProvider } from "@/components/finanzas/FinanzasProvider";
import { FacturacionProvider } from "@/components/facturacion/FacturacionProvider";
import { OrdenesProvider } from "@/components/ordenes/OrdenesProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <FinanzasProvider>
        <FacturacionProvider>
          <OrdenesProvider>{children}</OrdenesProvider>
        </FacturacionProvider>
      </FinanzasProvider>
    </AppShell>
  );
}
