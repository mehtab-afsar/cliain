const STATS = [
  { value: "24/7", label: "Always answering, day or night" },
  { value: "<15s", label: "Average reply time" },
  { value: "0", label: "Missed calls, by design" },
];

export function ProofStripSection() {
  return (
    <section className="bg-foreground text-background">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 divide-y divide-background/15 px-6 py-12 sm:grid-cols-3 sm:gap-6 sm:divide-x sm:divide-y-0 sm:py-14">
        {STATS.map((stat) => (
          <div key={stat.label} className="pt-10 text-center first:pt-0 sm:px-6 sm:pt-0">
            <p className="font-display-xl text-5xl tracking-tight sm:text-6xl">
              {stat.value}
            </p>
            <p className="mt-2 font-mono text-xs tracking-wide text-background/70 uppercase">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
