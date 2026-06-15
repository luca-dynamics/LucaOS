export function WebPostBootLoading() {
  return (
    <section
      className="relative z-10 flex min-h-dvh w-full items-center justify-center px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-6"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/45 px-6 py-10 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-7 flex h-8 w-8 items-center justify-center" aria-hidden="true">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-100 shadow-[0_0_24px_8px_rgba(207,250,254,0.42)] motion-safe:animate-pulse" />
        </div>
        <h1 className="text-2xl font-medium tracking-tight text-white">
          Preparing LucaOS
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/65">
          Starting Luca&apos;s web session…
        </p>
      </div>
    </section>
  );
}
