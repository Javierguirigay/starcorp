/**
 * Chevron corporativo STARCORP. Los colores varían según el fondo
 * (login/asignación usan navy-600 #2B5B8C, el sidebar usa navy-800 #163454).
 */
export function LogoMark({
  className = "h-5 w-5",
  top = "#2B5B8C",
}: {
  className?: string;
  top?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M3 5h18l-9 7-9-7z" fill={top} />
      <path d="M5 12h14l-7 7-7-7z" fill="#F2A900" />
    </svg>
  );
}
