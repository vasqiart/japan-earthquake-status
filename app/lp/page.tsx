import { Suspense } from 'react';
import LandingClient from './LandingClient';

export const dynamic = "force-dynamic";

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingClient />
    </Suspense>
  );
}
