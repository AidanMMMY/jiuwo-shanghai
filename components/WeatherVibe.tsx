import type { WeatherData, WeatherRecommendation } from '@/lib/weather';

interface WeatherVibeProps {
  weather: WeatherData | null;
  recommendation: WeatherRecommendation | null;
  isZh?: boolean;
}

export default function WeatherVibe({ weather, recommendation, isZh = false }: WeatherVibeProps) {
  if (!weather || !recommendation) return null;

  const label = isZh ? '上海此刻' : 'Shanghai now';
  const drinkLabel = isZh ? '来一杯' : 'Try';
  const spotLabel = isZh ? '坐这儿' : 'Sit here';

  return (
    <section className="px-6 pt-20 pb-4 bg-[#0a0a0a]">
      <div className="mx-auto max-w-3xl">
        <div className="relative rounded-lg border border-[#1a1a1a] bg-[#0e0e0e] p-6 md:p-8 overflow-hidden">
          {/* Subtle ambient glow */}
          <div
            className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-[0.03] pointer-events-none"
            style={{ background: 'radial-gradient(circle, #c9a227, transparent 70%)', filter: 'blur(40px)' }}
          />

          <div className="relative z-10">
            {/* Weather header */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl" role="img" aria-label="weather">
                {weather.code >= 95 ? '⛈️' : weather.code >= 71 ? '❄️' : weather.code >= 51 || (weather.code >= 80 && weather.code <= 82) ? '🌧️' : weather.code >= 45 ? '🌫️' : weather.code >= 2 ? '☁️' : '☀️'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-[#a0a0a0]">{label}</span>
                <span className="text-lg font-medium text-[#f5f5f0]">{weather.temp}°C</span>
                <span className="text-sm text-[#666]">· {recommendation.weather}</span>
              </div>
            </div>

            {/* Recommendation quote */}
            <blockquote className="text-base md:text-lg text-[#f5f5f0]/90 leading-relaxed italic mb-5">
              {isZh
                ? `${recommendation.weather}天，${recommendation.vibe}，来杯${recommendation.drink}。`
                : `A ${recommendation.weather.toLowerCase()} day. ${recommendation.vibe}. Have a ${recommendation.drink}.`}
            </blockquote>

            {/* Tags */}
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs tracking-wider text-[#c9a227]/80 border border-[#c9a227]/20 rounded-full px-3 py-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v6m0 0l3-3m-3 3l-3-3" />
                  <path d="M7 10v10a2 2 0 002 2h6a2 2 0 002-2V10" />
                </svg>
                {drinkLabel}: {recommendation.drink}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs tracking-wider text-[#a0a0a0] border border-[#333] rounded-full px-3 py-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                </svg>
                {spotLabel}: {recommendation.vibe}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
