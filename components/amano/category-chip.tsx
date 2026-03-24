import { cn } from "@/lib/utils";
import { MSymbol } from "@/components/amano/m-symbol";

export const CATEGORIES = [
  { id: "plomeria", label: "Plomería", icon: "water_drop" },
  { id: "changuitas", label: "Changuitas", icon: "handyman" },
  { id: "electricidad", label: "Electricidad", icon: "bolt" },
  { id: "pintura", label: "Pintura", icon: "format_paint" },
  { id: "limpieza", label: "Limpieza", icon: "mop" },
  { id: "fletes", label: "Fletes", icon: "local_shipping" },
  { id: "jardineria", label: "Jardinería", icon: "yard" },
  { id: "albanileria", label: "Albañilería", icon: "construction" },
  { id: "cerrajeria", label: "Cerrajería", icon: "key" },
  { id: "piletero", label: "Piletero", icon: "pool" },
  { id: "community-manager", label: "Community Manager", icon: "smartphone" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

interface CategoryChipProps {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
  onClick?: () => void;
}

export function CategoryChip({ label, icon, active = false, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-200 font-body font-semibold text-sm",
        active
          ? "bg-primary text-on-primary shadow-lg shadow-primary/20 scale-105"
          : "bg-surface-container-highest text-on-surface-variant"
      )}
    >
      <MSymbol icon={icon} size={16} filled={active} />
      {label}
    </button>
  );
}
