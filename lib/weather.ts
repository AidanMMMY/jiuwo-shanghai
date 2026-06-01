export interface WeatherData {
  temp: number;
  code: number;
  isDay: boolean;
}

export interface WeatherRecommendation {
  weather: string;
  drink: string;
  vibe: string;
}

const SHANGHAI_LAT = 31.2304;
const SHANGHAI_LON = 121.4737;

export async function getShanghaiWeather(): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${SHANGHAI_LAT}&longitude=${SHANGHAI_LON}&current_weather=true&timezone=Asia/Shanghai`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      temp: Math.round(data.current_weather.temperature),
      code: data.current_weather.weathercode,
      isDay: data.current_weather.is_day === 1,
    };
  } catch {
    return null;
  }
}

function getWeatherLabel(code: number, isZh: boolean): string {
  const labels: Record<string, Record<string, string>> = {
    clear: { en: 'Clear', zh: '晴' },
    cloudy: { en: 'Cloudy', zh: '多云' },
    fog: { en: 'Foggy', zh: '雾' },
    rain: { en: 'Rainy', zh: '雨' },
    storm: { en: 'Stormy', zh: '雷雨' },
    snow: { en: 'Snowy', zh: '雪' },
  };

  let key = 'clear';
  if (code >= 95) key = 'storm';
  else if (code >= 51 || (code >= 80 && code <= 82)) key = 'rain';
  else if (code >= 71) key = 'snow';
  else if (code >= 45) key = 'fog';
  else if (code >= 2) key = 'cloudy';

  return labels[key][isZh ? 'zh' : 'en'];
}

export function getWeatherRecommendation(
  code: number,
  isZh: boolean
): WeatherRecommendation {
  const weather = getWeatherLabel(code, isZh);

  const recommendations: Record<
    string,
    { en: WeatherRecommendation; zh: WeatherRecommendation }
  > = {
    clear: {
      en: { weather, drink: 'Gin & Tonic / White Wine', vibe: 'Outdoor seats on the street, watching the city walk by' },
      zh: { weather, drink: '金汤力 / 白葡萄酒', vibe: '沿街外摆，看路人走过' },
    },
    cloudy: {
      en: { weather, drink: 'Peated Whisky', vibe: 'The bar counter, close enough to hear the shaker' },
      zh: { weather, drink: '泥煤威士忌', vibe: '吧台，近到能听见摇酒壶的声音' },
    },
    fog: {
      en: { weather, drink: 'Hot Tea / Low-ABV', vibe: 'The wall-facing seat, your own little corner' },
      zh: { weather, drink: '热茶 / 低度酒', vibe: '靠墙的位置，自己的小角落' },
    },
    rain: {
      en: { weather, drink: 'Hot Toddy / Rock Oolong', vibe: 'The window seat, rain tapping the glass' },
      zh: { weather, drink: '热托蒂 / 岩茶', vibe: '靠窗口，雨敲在玻璃上' },
    },
    storm: {
      en: { weather, drink: 'Short Drink (shoot it)', vibe: 'The deepest seat inside, away from the storm' },
      zh: { weather, drink: '短饮鸡尾酒（一口干）', vibe: '室内最深处，躲开雷声' },
    },
    snow: {
      en: { weather, drink: 'Mulled Wine', vibe: 'The deepest seat inside, back to the wall' },
      zh: { weather, drink: '热红酒', vibe: '室内最深处，背靠着墙' },
    },
  };

  let key = 'clear';
  if (code >= 95) key = 'storm';
  else if (code >= 51 || (code >= 80 && code <= 82)) key = 'rain';
  else if (code >= 71) key = 'snow';
  else if (code >= 45) key = 'fog';
  else if (code >= 2) key = 'cloudy';

  return recommendations[key][isZh ? 'zh' : 'en'];
}

export function getWeatherIcon(code: number): string {
  if (code >= 95) return '⛈️';
  if (code >= 71) return '❄️';
  if (code >= 51 || (code >= 80 && code <= 82)) return '🌧️';
  if (code >= 45) return '🌫️';
  if (code >= 2) return '☁️';
  return '☀️';
}
