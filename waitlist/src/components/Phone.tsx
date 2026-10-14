import type { ReactNode } from "react";

/**
 * Pantalla de móvil hecha en HTML. `data-ui` marca que dentro rigen las
 * convenciones de la app (esquinas redondeadas, controles).
 */
export default function Phone({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  return (
    <div
      data-ui
      role="img"
      aria-label={label}
      className={`relative w-[min(78vw,330px,calc((100svh-140px)*0.47))] shrink-0 rounded-[48px] bg-ink p-[10px] ${className}`}
    >
      <div className="flex aspect-[9/19] flex-col overflow-hidden rounded-[38px] bg-bg text-ink">
        <div aria-hidden="true" className="flex items-center justify-between px-7 pt-4 pb-1 text-[13px] font-semibold tabular">
          <span>10:24</span>
          <span className="h-[11px] w-[22px] rounded-[3px] border border-ink/70 p-[1.5px]">
            <span className="block h-full w-3/4 rounded-[1px] bg-ink" />
          </span>
        </div>
        <div aria-hidden="true" className="flex min-h-0 flex-1 flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
