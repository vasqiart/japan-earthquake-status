'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { UI_THEME } from '@/lib/uiTheme';

export default function LandingClient() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const paid = searchParams.get('paid');
  const canceled = searchParams.get('canceled');

  const handleBuy = async (plan: 'day' | 'week') => {
    setIsLoading(plan);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (data.ok && data.url) {
        window.location.href = data.url;
      } else {
        console.error('Checkout failed:', data);
        setIsLoading(null);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setIsLoading(null);
    }
  };

  return (
    <main className={`min-h-[100svh] ${UI_THEME.PAGE_BG} ${UI_THEME.TEXT_TITLE}`}>
      <div className="min-h-[100svh] flex items-center py-10 sm:py-0">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10 w-full">
        <div className="grid w-full grid-cols-1 gap-10 md:grid-cols-2 md:gap-12">
          {/* Left - Hero */}
          <section className="flex flex-col justify-center text-center sm:text-left">
            <div className="mb-6 flex items-center gap-3 justify-center sm:justify-start">
              <span className={`h-10 w-[2px] ${UI_THEME.ACCENT_RED_CLASS}`} />
              <span className={`text-xs tracking-[0.22em] ${UI_THEME.TEXT_SUBTLE}`}>
                FOR TRAVELERS IN JAPAN
              </span>
            </div>

            <h1 className={`whitespace-nowrap leading-tight text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight ${UI_THEME.TEXT_TITLE}`}>
              Japan Earthquake Status
            </h1>

            <p className={`mt-4 max-w-xl text-base leading-relaxed sm:text-lg ${UI_THEME.TEXT_BODY} mx-auto sm:mx-0`}>
              <span className="block sm:inline">Clear earthquake information</span>
              <span className={`block sm:inline ${UI_THEME.TEXT_MUTED}`}>
                — updated when official information is published.
              </span>
            </p>

            <ul className={`mt-6 space-y-2 text-sm sm:text-[15px] ${UI_THEME.TEXT_MUTED} mx-auto sm:mx-0`}>
              <li className="flex gap-3">
                <span className="mt-[6px] h-[6px] w-[6px] rounded-full bg-black/30" />
                <span className="leading-snug">Earthquake information based on data from the Japan Meteorological Agency (JMA)</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-[6px] h-[6px] w-[6px] rounded-full bg-black/30" />
                <span className="leading-snug">Simple intensity guide</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-[6px] h-[6px] w-[6px] rounded-full bg-black/30" />
                <span className="leading-snug">Mobile-friendly, no account</span>
              </li>
            </ul>

            <p className={`mt-6 text-xs ${UI_THEME.TEXT_SUBTLE}`}>
              We update when official information is published. Please wait a moment after an event.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4 justify-center sm:justify-start">
              <a
                href="/lp/details"
                className={`text-sm ${UI_THEME.TEXT_BODY} underline decoration-black/20 underline-offset-4 hover:text-black`}
              >
                Learn more →
              </a>
            </div>

            {paid === '1' && (
              <p className={`mt-4 text-xs ${UI_THEME.TEXT_MUTED}`}>
                Email sent if payment succeeded.
              </p>
            )}
          </section>

          {/* Right - Pricing */}
          <section className="flex flex-col justify-center">
            <div className={`${UI_THEME.ROUNDED_LARGE} ${UI_THEME.BORDER_CLASS} ${UI_THEME.CARD_BG_SUBTLE} p-5 ${UI_THEME.SHADOW_SUBTLE} backdrop-blur md:p-7`}>
              <div className="mb-5 flex items-center justify-between">
                <h2 className={`text-sm font-medium tracking-[0.18em] ${UI_THEME.TEXT_MUTED}`}>
                  PRICING
                </h2>
                <span className={`text-xs ${UI_THEME.TEXT_DISABLED}`}>Link = pass</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Day */}
                <div className={`${UI_THEME.ROUNDED_CARD} ${UI_THEME.BORDER_CLASS} p-4`}>
                  <div className={`text-sm font-medium ${UI_THEME.TEXT_TITLE} text-center sm:text-left`}>Day Pass</div>
                  <div className={`mt-2 text-3xl font-semibold ${UI_THEME.TEXT_TITLE} text-center sm:text-left`}>$2</div>
                  <div className={`mt-1 text-xs ${UI_THEME.TEXT_SUBTLE} text-center sm:text-left`}>24 hours</div>

                  <button
                    onClick={() => handleBuy('day')}
                    disabled={isLoading !== null}
                    className={`mt-4 w-full ${UI_THEME.ROUNDED_BUTTON} ${UI_THEME.BORDER_CLASS} ${
                      isLoading === 'day'
                        ? 'bg-black/[0.03] text-black/35 cursor-wait'
                        : 'bg-black text-white hover:bg-black/90'
                    } px-3 py-2 text-sm font-medium transition-colors`}
                  >
                    {isLoading === 'day' ? 'Loading...' : 'Buy'}
                  </button>
                </div>

                {/* Week */}
                <div className={`${UI_THEME.ROUNDED_CARD} ${UI_THEME.BORDER_CLASS} p-4`}>
                  <div className={`text-sm font-medium ${UI_THEME.TEXT_TITLE} text-center sm:text-left`}>Week Pass</div>
                  <div className={`mt-2 text-3xl font-semibold ${UI_THEME.TEXT_TITLE} text-center sm:text-left`}>$7</div>
                  <div className={`mt-1 text-xs ${UI_THEME.TEXT_SUBTLE} text-center sm:text-left`}>7 days</div>

                  <button
                    onClick={() => handleBuy('week')}
                    disabled={isLoading !== null}
                    className={`mt-4 w-full ${UI_THEME.ROUNDED_BUTTON} ${UI_THEME.BORDER_CLASS} ${
                      isLoading === 'week'
                        ? 'bg-black/[0.03] text-black/35 cursor-wait'
                        : 'bg-black text-white hover:bg-black/90'
                    } px-3 py-2 text-sm font-medium transition-colors`}
                  >
                    {isLoading === 'week' ? 'Loading...' : 'Buy'}
                  </button>
                </div>
              </div>

              <div className={`mt-5 ${UI_THEME.ROUNDED_CARD} ${UI_THEME.BORDER_CLASS} ${UI_THEME.CARD_BG} p-4`}>
                <div className={`text-xs font-medium ${UI_THEME.TEXT_BODY}`}>Note</div>
                <p className={`mt-1 text-xs leading-relaxed ${UI_THEME.TEXT_MUTED}`}>
                  This link is your pass.
                </p>
              </div>
            </div>

            <p className={`mt-4 text-center text-[11px] ${UI_THEME.TEXT_DISABLED}`}>
              © {new Date().getFullYear()} Japan Earthquake Status
            </p>
          </section>
        </div>

        {/* Service Preview - Full width, below Hero and Pricing */}
        <div className="w-full my-16 md:my-20">
          <div className={`mx-auto max-w-5xl ${UI_THEME.ROUNDED_CARD} ${UI_THEME.BORDER_CLASS} ${UI_THEME.CARD_BG} p-12`}>
            <div className="text-center">
              <p className={`text-sm ${UI_THEME.TEXT_MUTED}`}>
                Service preview will appear here (coming soon).
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}
