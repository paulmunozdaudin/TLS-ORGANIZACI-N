const TABS = ["Personas", "Ideas", "Comunidades"] as const;

/** Barra inferior de la app dentro de los mockups. */
export default function AppTabBar({ active }: { active: (typeof TABS)[number] }) {
  return (
    <div className="mt-3 grid grid-cols-3 px-2 pt-2 pb-5">
      {TABS.map((t) => (
        <span
          key={t}
          className={`flex flex-col items-center gap-1 text-[13px] ${t === active ? "font-semibold text-ink" : "text-muted"}`}
        >
          <span className={`block size-1.5 rounded-full ${t === active ? "bg-accent" : "bg-transparent"}`} />
          {t}
        </span>
      ))}
    </div>
  );
}
