// Icono Material Symbol como componente React
interface MSymbolProps {
  icon: string;
  filled?: boolean;
  size?: number;
  className?: string;
}

export function MSymbol({ icon, filled = false, size = 24, className = "" }: MSymbolProps) {
  return (
    <span
      className={`material-symbol ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      }}
    >
      {icon}
    </span>
  );
}
