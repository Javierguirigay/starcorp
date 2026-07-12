import { AppShell } from "@/components/layout/AppShell";
import { FinanzasProvider } from "@/components/finanzas/FinanzasProvider";
import { FacturacionProvider } from "@/components/facturacion/FacturacionProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <FinanzasProvider>
        <FacturacionProvider>{children}</FacturacionProvider>
      </FinanzasProvider>
    </AppShell>
  );
}
