"use client";

/**
 * Formulario decorativo: equivale al onsubmit="return false;" del boceto.
 * Sin esto, el submit nativo recargaría la página.
 */
export function DecorativeForm({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form className={className} onSubmit={(e) => e.preventDefault()}>
      {children}
    </form>
  );
}
