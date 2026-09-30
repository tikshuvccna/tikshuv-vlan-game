/* VLAN Quest – static game data */
(function (VQ) {
  VQ.LEVELS = [
    { id: 'easy', name: 'מתחילים', en: 'ROOKIE', mult: 1, medal: '🥉', medalName: 'ארד', color: '#cd7f32', blurb: 'רגוע, עם עזרה והנחיות' },
    { id: 'mid', name: 'מתקדמים', en: 'PRO', mult: 1.6, medal: '🥈', medalName: 'כסף', color: '#cbd5e1', blurb: 'יותר מהיר, פחות רמזים' },
    { id: 'hard', name: 'אגדות', en: 'LEGEND', mult: 2.5, medal: '🥇', medalName: 'זהב', color: '#fbbf24', blurb: 'אתגר אמיתי לגיימרים' },
  ];
  VQ.level = (id) => VQ.LEVELS.find((l) => l.id === id);

  // VLAN identities used across the whole game (same colours everywhere!)
  VQ.VLANS = {
    1: { name: 'default', he: 'ברירת מחדל', hex: 0x94a3b8 },
    10: { name: 'SALES', he: 'מכירות', hex: 0x38bdf8 },
    20: { name: 'FINANCE', he: 'כספים', hex: 0x4ade80 },
    30: { name: 'GUEST', he: 'אורחים', hex: 0xfb923c },
    50: { name: 'VOICE', he: 'טלפוניה', hex: 0xf472b6 },
    99: { name: 'MGMT', he: 'ניהול', hex: 0xc084fc },
    999: { name: 'NATIVE', he: 'Native', hex: 0xe2e8f0 },
  };
  VQ.vhex = (id) => (VQ.VLANS[id] ? VQ.VLANS[id].hex : 0xffffff);
  VQ.vcss = (id) => VQ.css(VQ.vhex(id));

  VQ.CHAPTERS = [
    { id: 'flat', n: 1, icon: '🌪️', color: 0xf87171, title: 'הרשת השטוחה', sub: 'החיים בלי VLAN', game: 'storm', gameTitle: 'סערת השידורים',
      learn: ['מהו Broadcast ולמה הוא "רועש"', 'מה קורה כשכולם באותה רשת', 'למה זה בעיית ביצועים ואבטחה'] },
    { id: 'before', n: 2, icon: '🕰️', color: 0xfbbf24, title: 'הדרך הישנה', sub: 'מה היה לפני VLAN', game: 'cables', gameTitle: 'משבר הכבלים',
      learn: ['Hub → Switch → מתג לכל מחלקה', 'העלות של הפרדה פיזית', 'איך נולד תקן 802.1Q'] },
    { id: 'what', n: 3, icon: '🎨', color: 0x38bdf8, title: 'מה זה VLAN?', sub: 'איך זה עובד — בלי ועם', game: 'painter', gameTitle: 'צבע את הרשת',
      learn: ['מתג אחד = כמה רשתות לוגיות', 'הקצאת פורטים (Access) ל-VLAN', 'VLAN = Broadcast Domain = Subnet'] },
    { id: 'trunk', n: 4, icon: '🛣️', color: 0x4ade80, title: 'Trunk ותיוג 802.1Q', sub: 'אוטוסטרדה של VLAN-ים', game: 'tags', gameTitle: 'מיון תגיות',
      learn: ['Access מול Trunk', 'התג של 802.1Q ומה יש בו', 'Native VLAN ורשימת Allowed'] },
    { id: 'devices', n: 5, icon: '🖥️', color: 0xc084fc, title: 'מי עובד עם VLAN?', sub: 'סיור בין המכשירים', game: 'sorter', gameTitle: 'מיון מכשירים',
      learn: ['מתג L2 / L3, נתב, AP, טלפון, חומת אש', 'מי מודע ל-VLAN ומי לא', 'מי לא יכול בכלל (Hub…)'] },
    { id: 'intervlan', n: 6, icon: '🧭', color: 0xf472b6, title: 'ניתוב בין VLAN', sub: 'איך VLAN-ים מדברים', game: 'maze', gameTitle: 'מבוך החבילה',
      learn: ['למה VLAN-ים לא רואים זה את זה', 'Router-on-a-stick', 'מתג L3 ו-SVI'] },
    { id: 'proscons', n: 7, icon: '⚖️', color: 0xfb923c, title: 'יתרונות וחסרונות', sub: 'התמונה המלאה', game: 'runner', gameTitle: 'רץ ה-VLAN',
      learn: ['ביצועים, אבטחה, גמישות, עלות', 'מורכבות, טעויות ו-VLAN Hopping', 'מתי כן ומתי לא'] },
    { id: 'config', n: 8, icon: '⌨️', color: 0x22d3ee, title: 'הגדרה ב-Cisco', sub: 'CLI צעד אחר צעד', game: 'commander', gameTitle: 'מפקד הקונפיגורציה',
      learn: ['vlan, name, access, trunk, native', 'Router-on-a-stick ו-SVI', 'שמירת קונפיגורציה'] },
    { id: 'verify', n: 9, icon: '🔍', color: 0xa3e635, title: 'בדיקה ואימות', sub: 'בפקודות ובמציאות', game: 'detective', gameTitle: 'הבלש של הרשת',
      learn: ['show vlan brief / interfaces trunk', 'ping, ipconfig, נוריות, MAC table', 'שיטה לאיתור תקלות'] },
  ];
  VQ.chapter = (id) => VQ.CHAPTERS.find((c) => c.id === id);

  VQ.RANKS = [
    { at: 0, name: 'מתלמד רשת', icon: '🐣' },
    { at: 1500, name: 'טכנאי רשת', icon: '🔧' },
    { at: 5000, name: 'טכנאי בכיר', icon: '🛠️' },
    { at: 10000, name: 'מהנדס רשת', icon: '📡' },
    { at: 20000, name: 'ארכיטקט רשת', icon: '🏛️' },
    { at: 35000, name: 'אגדת ה-VLAN', icon: '👑' },
  ];

  VQ.AVATAR_COLORS = [0x38bdf8, 0x4ade80, 0xf472b6, 0xfbbf24, 0xc084fc, 0xf87171];

  VQ.ACHIEVEMENTS = [
    { id: 'first_lesson', icon: '📘', name: 'צעד ראשון', desc: 'סיימו שיעור ראשון' },
    { id: 'first_game', icon: '🎮', name: 'שחקן חדש', desc: 'סיימו מיני־משחק ראשון' },
    { id: 'all_lessons', icon: '🎓', name: 'תלמיד חרוץ', desc: 'סיימו את כל 9 השיעורים' },
    { id: 'three_stars', icon: '🌟', name: 'שלושה כוכבים', desc: 'קבלו 3 כוכבים במשחק כלשהו' },
    { id: 'combo10', icon: '🔥', name: 'קומבו 10', desc: 'הגיעו לרצף של 10 הצלחות' },
    { id: 'combo25', icon: '☄️', name: 'קומבו 25', desc: 'הגיעו לרצף של 25 הצלחות' },
    { id: 'perfect', icon: '💎', name: 'מושלם', desc: 'סיימו משחק בלי טעות אחת' },
    { id: 'no_hints', icon: '🧠', name: 'בלי רמזים', desc: 'סיימו משחק CLI/בלש בלי רמזים' },
    { id: 'hard_win', icon: '🐉', name: 'אגדה', desc: 'סיימו כל משחק ברמת "אגדות"' },
    { id: 'bronze_all', icon: '🥉', name: 'אספן ארד', desc: 'מדליית ארד בכל 9 התחנות' },
    { id: 'silver_all', icon: '🥈', name: 'אספן כסף', desc: 'מדליית כסף בכל 9 התחנות' },
    { id: 'gold_all', icon: '🥇', name: 'אספן זהב', desc: 'מדליית זהב בכל 9 התחנות' },
    { id: 'cli_master', icon: '⌨️', name: 'נינג׳ת CLI', desc: 'סיימו את "מפקד הקונפיגורציה" ברמת אגדות' },
    { id: 'sherlock', icon: '🕵️', name: 'שרלוק הרשת', desc: 'סיימו את הבלש ברמת אגדות' },
    { id: 'storm_hero', icon: '⚡', name: 'עוצר הסערה', desc: 'עברו את "סערת השידורים" ברמת אגדות' },
    { id: 'exam_pass', icon: '📜', name: 'עברתי את המבחן', desc: 'עברו את מבחן הסיום' },
    { id: 'exam_ace', icon: '🏅', name: 'מצטיין', desc: 'ציון 90+ במבחן הסיום' },
    { id: 'friend', icon: '🤝', name: 'חברותא', desc: 'הוסיפו חבר ללוח המובילים' },
    { id: 'champion', icon: '👑', name: 'אלוף ה-VLAN', desc: 'קבלו את התעודה המלאה' },
  ];
})(window.VQ);
