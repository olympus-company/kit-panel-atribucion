export function AnatomyComparison({ win, lose }: { win: string[]; lose: string[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#1c2338] p-5">
      <h2 className="text-xl font-black tracking-normal">Anatomía de llamada</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Column title="Ganadora" items={win} tone="text-green-300" />
        <Column title="Perdida" items={lose} tone="text-red-300" />
      </div>
    </section>
  )
}

function Column({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><strong className={tone}>{title}</strong><ul className="mt-3 space-y-2 text-sm text-[#a4adc3]">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>
}
