export default function LandingDetailsPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Details</h1>
          <a
            href="/lp"
            className="text-sm text-black/70 underline decoration-black/20 underline-offset-4 hover:text-black"
          >
            ← Back to LP
          </a>
        </div>

        <div className="space-y-10">
          <section className="rounded-2xl border border-black/10 p-6">
            <h2 className="text-lg font-semibold">What you get</h2>
            <ul className="mt-4 space-y-2 text-sm text-black/70">
              <li>• Real-time-ish updates (official source based)</li>
              <li>• Simple intensity guide (JMA)</li>
              <li>• Mobile-friendly, no account</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-black/10 p-6">
            <h2 className="text-lg font-semibold">FAQ</h2>

            <div className="mt-4 space-y-5 text-sm">
              <div>
                <div className="font-medium">Is this official?</div>
                <div className="mt-1 text-black/70">
                  We use official sources and update when they publish.
                </div>
              </div>

              <div>
                <div className="font-medium">Do I need an account?</div>
                <div className="mt-1 text-black/70">No.</div>
              </div>

              <div>
                <div className="font-medium">When does it expire?</div>
                <div className="mt-1 text-black/70">
                  Your pass expires automatically based on the plan.
                </div>
              </div>
            </div>
          </section>

          <footer className="text-xs text-black/40">
            We update when official information is published. After an event, please wait a moment.
          </footer>
        </div>
      </div>
    </main>
  );
}
