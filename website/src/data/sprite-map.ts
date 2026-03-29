/**
 * Maps creature IDs to sprite filenames in /sprites/creatures/.
 * Entries with null values use the CSS gradient fallback.
 * Populate this map as sprites are matched to creatures.
 */
export const spriteMap: Record<number, string | null> = {
  1: 'vivicinder',    // 신더
  2: 'ignibus',       // 이그니온
  3: 'firomenis',     // 이프리트
  4: 'axolightl',     // 아쿠아젤
  5: 'hydrovor',      // 토렌트
  6: 'kelpie',        // 리바이어선
  7: 'budaye',        // 시드링
  8: 'sampsage',      // 트렌트
  9: 'dragarbor',     // 엘더 트렌트
  10: 'bolt',         // 스파크 래트
  11: 'foxfire',      // 썬더 폭스
  12: 'goanat',       // 어스 몰
  13: 'conglolem',    // 아이언 골렘
  14: 'birdling',     // 게일 스패로
  15: 'cardiwing',    // 스톰 호크
  16: 'gliffin',      // 가루다
  17: 'fungoos',      // 톡시캡
  18: 'ouroboros',    // 하이드라
  19: 'wigglin',      // 위습
  20: 'scourge',      // 데스 나이트
  21: 'chenipode',    // 리프 크롤러
  22: 'cataspike',    // 베놈 맨티스
  23: 'nymfear',      // 베놈 퀸
  24: 'rockiite',     // 록 터틀
  25: 'brickhemoth',  // 바스티온
  26: 'dinoflop',     // 해츨링
  27: 'devidra',      // 와이번
  28: 'sauragon',     // 엘더 드래곤
  29: 'luxlamp',      // 루미나
  30: 'solarix',      // 셀레스티아
  31: 'shneko',       // 섀도 캣
  32: 'lunight',      // 다크 울프
  33: 'chromeye',     // 아이언 오브
  34: 'chrome_robo',  // 아이언 나이트
  35: 'squeaker',     // 에코 래트 (fallback)
  36: 'seawasp',      // 세이렌
  37: 'conifrost',    // 프로스트 폭스
  38: 'angesnow',     // 아이스 퀸
  39: 'noctalo',      // 나이트메어
  40: 'lightmare',    // 헬 페가수스
  41: 'cherubat',     // 픽시
  42: 'rainicorn',    // 세라프
  43: 'tendog',       // 배틀 하운드
  44: 'enduros',      // 글래디에이터
  45: 'bansaken',     // 아수라
  46: 'coppi',        // 코럴
  47: 'delfeco',      // 크리스탈 코럴
  48: 'araignee',     // 볼트 스파이더
  49: 'volttle',      // 볼트 타란튤라
  50: 'squabbit',     // 루나 래빗
  51: 'cateye',       // 네뷸라 폭스
  52: 'boltnu',       // 볼트 하운드
  53: 'mk01_robo',    // 썬더 워리어
  54: 'agnsher',      // 라이트닝 로드
  55: 'snaki',        // 샌드 바이퍼
  56: 'pythock',      // 데저트 코브라
  57: 'fribbit',      // 프로스트 커브
  58: 'sambear',      // 글레이셜 베어
  59: 'miaownolux',   // 프리즘 캣
  60: 'grumpi',       // 솔라 그리폰
  61: 'rhincus',      // 록 라이노
  62: 'boxorox',      // 스톤 타이탄
  63: 'noctula',      // 팬텀 폭스
  64: 'txin',         // 나인테일
  65: 'gectile',      // 스틸 스콜피온
  66: 'manosting',    // 스콜피온 킹
  67: 'nudiflot',     // 옥토퍼프
  68: 'karkinos',     // 크라켄
  69: 'eyenserp',     // 윈드 서펜트
  70: 'cocrune',      // 게일 바이퍼
  71: 'devidin',      // 포실 드레이크
  72: 'deviraptor',   // 프로토 와이번
  73: 'dracune',      // 에이언 드래곤
  74: 'birdee',       // 소닉 버드
  75: 'cardinale',    // 썬더버드
  76: 'elofly',       // 일렉 일
  77: 'wrougon',      // 스톰 서펜트
  78: 'snokari',      // 매머스 커브
  79: 'snowrilla',    // 글레이셜 매머스
  80: 'cochini',      // 코스믹 젤리
  81: 'meteoreny',    // 네뷸라 드래곤
  82: 'chibiro',      // 미스틱 아울
  83: 'prophetoise',  // 오라클
  84: 'frondly',      // 시드 터틀
  85: 'cairfrey',     // 가이아 터틀
  86: 'brewdin',      // 포이즌 토드
  87: 'galumph',      // 스웜프 로드
  88: 'banling',      // 블러드 배트
  89: 'banvengeance', // 노스페라투
  90: 'tikoal',       // 살라만더
  91: 'volcanono',    // 피닉스
  92: 'komodraw',     // 아비스 드래곤
  93: 'dandylion',    // 유그드라실
  94: 'agnidon',      // 썬더 드래곤
  95: 'agnigon',      // 크로노스
  96: 'jemuar',       // 아스트랄 드래곤
  97: 'teddisun',     // 래디언트 드래곤
  98: 'cackleen',     // 니드호그
  99: 'cardiling',    // 아르케
  100: 'flisces',     // 하모니아
  101: 'legko',       // 스트레이
  102: 'corvix',      // 나이트 스토커
};

export function getSpriteUrl(creatureId: number): string | null {
  const name = spriteMap[creatureId];
  if (!name) return null;
  return `/sprites/creatures/${name}.png`;
}
