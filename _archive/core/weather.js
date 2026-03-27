// 전투 날씨 시스템
export const WEATHER_TYPES = {
  clear:    { name: '맑음', boost: null, weaken: null, effect: null },
  rain:     { name: '비', boost: 'water', weaken: 'fire', effect: 'heal_water' },
  sun:      { name: '쾌청', boost: 'fire', weaken: 'water', effect: 'heal_fire' },
  snow:     { name: '눈', boost: 'ice', weaken: 'grass', effect: 'slow' },
  sandstorm:{ name: '모래바람', boost: 'rock', weaken: 'flying', effect: 'chip_damage' },
  fog:      { name: '안개', boost: 'spirit', weaken: 'normal', effect: 'accuracy_down' },
};

export function getLocationWeather(locationType, timeOfDay, magiDensity) {
  // Deterministic weather based on location + time
  if (locationType === 'cave') return 'clear'; // no weather indoors
  if (locationType === 'gym') return 'clear';

  const seed = (Date.now() / 3600000) | 0; // changes hourly
  const roll = ((seed * 7 + (timeOfDay === 'night' ? 3 : 0)) % 10);

  if (magiDensity > 0.7) return 'fog'; // high magi = fog
  if (roll < 2) return 'rain';
  if (roll < 4) return 'sun';
  if (roll < 5 && locationType === 'route') return 'sandstorm';
  return 'clear';
}

export function getWeatherDamageMultiplier(weather, skillType) {
  const w = WEATHER_TYPES[weather];
  if (!w) return 1;
  if (w.boost === skillType) return 1.3; // +30% for boosted type
  if (w.weaken === skillType) return 0.7; // -30% for weakened type
  return 1;
}
