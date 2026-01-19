'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import AccessExpired from '@/app/components/AccessExpired';
import ServicePage from './ServicePage';

export default function AccessGate() {
  const searchParams = useSearchParams();
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null); // null = checking, true = allowed, false = denied
  const [isCheckingAccess, setIsCheckingAccess] = useState<boolean>(true);
  const [devToken, setDevToken] = useState<string>('');

  // Verify access token on mount
  useEffect(() => {
    const verifyAccess = async (token: string) => {
      setIsCheckingAccess(true);
      try {
        // Use relative path to work with any port (3000, 3001, etc.)
        // Use ?t= parameter (unified)
        const response = await fetch(`/api/access/verify?t=${encodeURIComponent(token)}`);
        
        if (!response.ok) {
          console.error('Access verification failed:', response.status, response.statusText);
          setIsAllowed(false);
          setIsCheckingAccess(false);
          return;
        }

        const data = await response.json();

        if (data.ok === true) {
          setIsAllowed(true);
        } else {
          setIsAllowed(false);
        }
      } catch (error) {
        console.error('Access verification error:', error);
        setIsAllowed(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    // Check for token in URL (both ?token= and ?t= for backward compatibility)
    const token = searchParams.get('t') || searchParams.get('token');

    if (token) {
      verifyAccess(token);
    } else {
      setIsAllowed(false);
      setIsCheckingAccess(false);
    }
  }, [searchParams]);

  // Handle dev token input
  const handleDevTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devToken.trim()) return;

    setIsCheckingAccess(true);
    try {
      const response = await fetch(`/api/access/verify?t=${encodeURIComponent(devToken.trim())}`);
      
      if (!response.ok) {
        console.error('Access verification failed:', response.status, response.statusText);
        setIsAllowed(false);
        setIsCheckingAccess(false);
        return;
      }

      const data = await response.json();

      if (data.ok === true) {
        setIsAllowed(true);
        // Update URL with token (use ?t= parameter)
        const url = new URL(window.location.href);
        url.searchParams.set('t', devToken.trim());
        window.history.pushState({}, '', url.toString());
      } else {
        setIsAllowed(false);
      }
    } catch (error) {
      console.error('Access verification error:', error);
      setIsAllowed(false);
    } finally {
      setIsCheckingAccess(false);
    }
  };

  // Show loading state while checking access
  if (isCheckingAccess) {
    return (
      <main className="min-h-screen bg-white">
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-neutral-600">Checking access...</p>
        </div>
      </main>
    );
  }

  // Show expired screen if access is denied
  if (!isAllowed) {
    // Development mode: show token input
    if (process.env.NODE_ENV === 'development') {
      return (
        <main className="min-h-screen bg-white">
          <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
              <AccessExpired />
              <div className="mt-6 rounded-xl border border-black/10 bg-white p-6">
                <h2 className="text-sm font-medium text-black mb-3">Development: Enter Token</h2>
                <form onSubmit={handleDevTokenSubmit} className="space-y-3">
                  <input
                    type="text"
                    value={devToken}
                    onChange={(e) => setDevToken(e.target.value)}
                    placeholder="Enter token (e.g., test123)"
                    className="w-full px-3 py-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                  />
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-black/90 transition-colors"
                  >
                    Verify Token
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      );
    }

    // Production: show expired screen only
    return <AccessExpired />;
  }

  // Show main service page if access is allowed
  return <ServicePage />;
}
