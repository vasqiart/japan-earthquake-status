export default function AccessExpired() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="min-h-screen flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <section className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-neutral-900 mb-4">
              Access expired
            </h1>
            <p className="text-sm text-neutral-700 leading-relaxed mb-6">
              Your pass is no longer valid. Please purchase again from the official page.
            </p>
            <div className="mb-6">
              <a
                href="#"
                className="inline-block px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Go to purchase page
              </a>
            </div>
            <p className="text-xs text-neutral-500 leading-snug">
              This site shows official information only. Please refer to JMA for guidance.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
