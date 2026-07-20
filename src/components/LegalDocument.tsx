import Link from 'next/link'

type Section = { title: string; body: string[] }

export function LegalDocument({ title, updated, sections }: { title: string; updated: string; sections: Section[] }) {
  return (
    <main className="min-h-screen bg-[var(--bg-canvas)] px-5 py-8 text-[rgba(255,255,255,0.9)] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/login" className="text-sm font-semibold text-[#8DB8FF] hover:text-white">← RemindME</Link>
        <article className="rm-surface-elevated mt-8 rounded-[28px] p-6 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8DB8FF]">RemindME · draft for review</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-xs text-[rgba(255,255,255,0.5)]">Last updated {updated}</p>
          <div className="mt-10 space-y-8">
            {sections.map(section => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-[rgba(255,255,255,0.68)]">
                  {section.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  )
}
