import { Fragment } from "react";
import { ChevronRight } from "lucide-react";

/**
 * Encabezado de página: breadcrumb opcional + título.
 * Equivale al bloque "Encabezado de página" de includes/header.php.
 */
export function PageHeader({
  title,
  breadcrumb = [],
}: {
  title: string;
  breadcrumb?: string[];
}) {
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
      {breadcrumb.length > 0 && (
        <nav className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
          {breadcrumb.map((crumb, i) => (
            <Fragment key={i}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              <span className={i === breadcrumb.length - 1 ? "font-medium text-navy-700" : ""}>
                {crumb}
              </span>
            </Fragment>
          ))}
        </nav>
      )}
      <h1 className="font-display text-xl font-700 tracking-tight text-navy-950 sm:text-2xl">
        {title}
      </h1>
    </div>
  );
}
