export interface WeatherData {
  temp: number;
  code: number;
  isDay: boolean;
  humidity: number;
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
      `https://api.open-meteo.com/v1/forecast?latitude=${SHANGHAI_LAT}&longitude=${SHANGHAI_LON}&current=temperature_2m,relative_humidity_2m,weather_code,is_day&timezone=Asia/Shanghai`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      temp: Math.round(data.current.temperature_2m),
      code: data.current.weather_code,
      isDay: data.current.is_day === 1,
      humidity: data.current.relative_humidity_2m,
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
  else if (code >= 71 || (code >= 85 && code <= 86)) key = 'snow';
  else if (code >= 45) key = 'fog';
  else if (code >= 2) key = 'cloudy';

  return labels[key][isZh ? 'zh' : 'en'];
}

/**
 * 上海体感温度分层
 * 高湿让热更闷热、冷更湿冷
 */
function getTempCategory(temp: number, humidity: number): 'hot' | 'mild' | 'cold' {
  let effective = temp;
  if (humidity > 85) {
    if (temp > 20) effective += 3;   // 闷热：黄梅天、台风天
    else if (temp < 12) effective -= 2; // 湿冷：冬天大雾雨
  }

  if (effective >= 28) return 'hot';   // 盛夏
  if (effective >= 10) return 'mild';  // 春秋 + 暖冬
  return 'cold';                       // 寒冬
}

export function getWeatherRecommendation(
  code: number,
  temp: number,
  humidity: number,
  isZh: boolean
): WeatherRecommendation {
  const weather = getWeatherLabel(code, isZh);
  const category = getTempCategory(temp, humidity);

  let weatherKey = 'clear';
  if (code >= 95) weatherKey = 'storm';
  else if (code >= 51 || (code >= 80 && code <= 82)) weatherKey = 'rain';
  else if (code >= 71 || (code >= 85 && code <= 86)) weatherKey = 'snow';
  else if (code >= 45) weatherKey = 'fog';
  else if (code >= 2) weatherKey = 'cloudy';

  const recKey = `${weatherKey}_${category}`;

  const recommendations: Record<string, { en: WeatherRecommendation; zh: WeatherRecommendation }> = {
    /* ── 晴天 ── */
    clear_hot: {
      en: { weather, drink: 'Gin & Tonic / White Wine', vibe: 'Outdoor seats on the street, watching the city walk by' },
      zh: { weather, drink: '金汤力 / 白葡萄酒', vibe: '沿街外摆，看路人走过' },
    },
    clear_mild: {
      en: { weather, drink: 'Gin & Tonic / White Wine', vibe: 'Outdoor seats, the breeze is just right' },
      zh: { weather, drink: '金汤力 / 白葡萄酒', vibe: '沿街外摆，微风正好' },
    },
    clear_cold: {
      en: { weather, drink: 'As Tears Go By / Pu-erh Ripe Tea', vibe: 'By the heater, watching the quiet street outside' },
      zh: { weather, drink: '旺角卡门 / 普洱熟茶', vibe: '暖气旁，看窗外冷清的街道' },
    },

    /* ── 多云 / 阴天 ── */
    cloudy_hot: {
      en: { weather, drink: 'The Wizard of Oz / Gin & Tonic', vibe: 'The bar counter, close enough to hear the shaker' },
      zh: { weather, drink: '绿野仙踪 / 金汤力', vibe: '吧台，近到能听见摇酒壶的声音' },
    },
    cloudy_mild: {
      en: { weather, drink: 'Peated Whisky', vibe: 'The bar counter, watching the bartender at work' },
      zh: { weather, drink: '泥煤威士忌', vibe: '吧台，看调酒师的手法' },
    },
    cloudy_cold: {
      en: { weather, drink: 'Whiskey Sour / Rock Oolong', vibe: 'The bar counter, warm light on your hands' },
      zh: { weather, drink: '威士忌酸 / 岩茶', vibe: '吧台，灯光温暖' },
    },

    /* ── 雾 ── */
    fog_mild: {
      en: { weather, drink: 'Hot Tea / Low-ABV', vibe: 'The wall-facing seat, your own little corner' },
      zh: { weather, drink: '热茶 / 低度酒', vibe: '靠墙的位置，自己的小角落' },
    },
    fog_cold: {
      en: { weather, drink: 'Pu-erh Ripe Tea', vibe: 'Deep inside, the fog erases everything outside' },
      zh: { weather, drink: '普洱熟茶', vibe: '室内深处，大雾把窗外的一切都抹掉了' },
    },

    /* ── 雨 ── */
    rain_hot: {
      en: { weather, drink: 'The Wizard of Oz / Gin & Tonic', vibe: 'The window seat, rain outside but summer heat lingers' },
      zh: { weather, drink: '绿野仙踪 / 金汤力', vibe: '靠窗，外面下雨但暑气未消' },
    },
    rain_mild: {
      en: { weather, drink: 'As Tears Go By / Rock Oolong', vibe: 'The window seat, rain tapping the glass' },
      zh: { weather, drink: '旺角卡门 / 岩茶', vibe: '靠窗口，雨敲在玻璃上' },
    },
    rain_cold: {
      en: { weather, drink: 'Pu-erh Ripe Tea / As Tears Go By', vibe: 'The warmest seat inside, listening to the rain' },
      zh: { weather, drink: '普洱熟茶 / 旺角卡门', vibe: '室内最暖处，听雨' },
    },

    /* ── 雷雨 ── */
    storm_hot: {
      en: { weather, drink: 'Short Drink (shoot it)', vibe: 'The deepest seat inside, away from the storm' },
      zh: { weather, drink: '短饮鸡尾酒（一口干）', vibe: '室内最深处，躲开雷声' },
    },
    storm_mild: {
      en: { weather, drink: 'Short Drink (shoot it)', vibe: 'The deepest seat inside, thunder rolling far away' },
      zh: { weather, drink: '短饮鸡尾酒（一口干）', vibe: '室内最深处，雷声在远处' },
    },

    /* ── 雪 / 冻雨（上海极少，兜底） ── */
    snow_cold: {
      en: { weather, drink: 'Pu-erh Ripe Tea', vibe: 'The deepest seat inside, back to the wall' },
      zh: { weather, drink: '普洱熟茶', vibe: '室内最深处，背靠着墙' },
    },
  };

  const rec = recommendations[recKey];
  if (rec) return rec[isZh ? 'zh' : 'en'];

  // fallback：先找同天气的 mild，再最终兜底 clear_mild
  const mildKey = `${weatherKey}_mild`;
  if (recommendations[mildKey]) return recommendations[mildKey][isZh ? 'zh' : 'en'];

  return recommendations.clear_mild[isZh ? 'zh' : 'en'];
}

export function getWeatherIcon(code: number): string {
  if (code >= 95) return '⛈️';
  if (code >= 71 || (code >= 85 && code <= 86)) return '❄️';
  if (code >= 51 || (code >= 80 && code <= 82)) return '🌧️';
  if (code >= 45) return '🌫️';
  if (code >= 2) return '☁️';
  return '☀️';
}
