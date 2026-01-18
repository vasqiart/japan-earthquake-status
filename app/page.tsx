import { Suspense } from 'react';
import AccessGate from './_components/AccessGate';

export default function Page() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white">
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-neutral-600">Loading...</p>
        </div>
      </main>
    }>
      <AccessGate />
    </Suspense>
  );
}
