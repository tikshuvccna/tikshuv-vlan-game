/* VLAN Quest – save data, scoring, medals, achievements */
(function (VQ) {
  const KEY = 'vq_save_v1';
  const blank = () => ({
    v: 1, name: '', color: VQ.AVATAR_COLORS[0], created: Date.now(), lastPlayed: Date.now(),
    lessons: {}, // id -> true
    games: {}, // "chapter:level" -> {best, stars, plays}
    bonus: 0, // lesson checks, misc XP
    ach: {}, // id -> timestamp
    exam: { best: 0, passed: false, date: 0, attempts: 0 },
    cert: null, // {id, date}
    friends: [],
    stats: { plays: 0, maxCombo: 0, perfects: 0 },
    seenIntro: false,
  });
  const S = VQ.store = { data: blank(), listeners: [] };

  S.load = function () {
    try { const raw = localStorage.getItem(KEY); if (raw) S.data = Object.assign(blank(), JSON.parse(raw)); } catch (e) { S.data = blank(); }
    return S.data;
  };
  S.save = function () {
    S.data.lastPlayed = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(S.data)); } catch (e) { /* ignore */ }
    S.listeners.forEach((f) => f());
  };
  S.reset = function () { S.data = blank(); S.save(); };
  S.exists = () => { try { return !!localStorage.getItem(KEY) && !!S.load().name; } catch (e) { return false; } };

  // ---------- queries ----------
  S.game = (ch, lv) => S.data.games[ch + ':' + lv] || { best: 0, stars: 0, plays: 0 };
  S.lessonDone = (ch) => !!S.data.lessons[ch];
  S.medals = (ch) => VQ.LEVELS.map((l) => S.game(ch, l.id).stars > 0);
  S.chapterStars = (ch) => VQ.LEVELS.reduce((a, l) => a + S.game(ch, l.id).stars, 0);
  S.gameDone = (ch) => VQ.LEVELS.some((l) => S.game(ch, l.id).stars > 0);   // any level counts
  S.chapterDone = (ch) => S.lessonDone(ch) && S.gameDone(ch);
  S.unlocked = function (idx) {
    if (VQ.QS.unlockAll) return true;
    return idx === 0 || S.chapterDone(VQ.CHAPTERS[idx - 1].id);
  };
  S.lessonsCount = () => VQ.CHAPTERS.filter((c) => S.lessonDone(c.id)).length;
  S.allChaptersDone = () => VQ.CHAPTERS.every((c) => S.chapterDone(c.id));
  S.totalScore = function () {
    let t = 0;
    for (const c of VQ.CHAPTERS) for (const l of VQ.LEVELS) t += S.game(c.id, l.id).best;
    return t + S.lessonsCount() * 200 + S.data.bonus + (S.data.exam.best || 0) * 20;
  };
  S.medalCount = (lv) => VQ.CHAPTERS.filter((c) => S.game(c.id, lv).stars > 0).length;
  S.totalStars = () => VQ.CHAPTERS.reduce((a, c) => a + S.chapterStars(c.id), 0);
  S.rank = function () {
    const t = S.totalScore();
    let i = 0; VQ.RANKS.forEach((r, k) => { if (t >= r.at) i = k; });
    const cur = VQ.RANKS[i], next = VQ.RANKS[i + 1];
    return { idx: i, ...cur, next, progress: next ? (t - cur.at) / (next.at - cur.at) : 1, total: t };
  };
  S.trophies = function () {
    const out = [];
    for (const l of VQ.LEVELS) if (S.medalCount(l.id) === VQ.CHAPTERS.length) out.push({ id: l.id, icon: '🏆', name: 'גביע ' + l.medalName, color: l.color });
    if (S.data.exam.passed) out.push({ id: 'exam', icon: '📜', name: 'גביע המבחן', color: '#a78bfa' });
    if (S.data.cert) out.push({ id: 'cert', icon: '👑', name: 'גביע האלוף', color: '#fde047' });
    return out;
  };

  // ---------- mutations ----------
  S.finishLesson = function (ch) {
    const first = !S.data.lessons[ch];
    S.data.lessons[ch] = true;
    if (first) S.data.bonus += 0; // 200 pts counted in totalScore
    S.save();
    S.checkAchievements();
    return first;
  };
  S.addBonus = function (n) { S.data.bonus += n; S.save(); };
  S.recordGame = function (ch, lv, score, stars, extra) {
    const k = ch + ':' + lv, g = S.data.games[k] || { best: 0, stars: 0, plays: 0 };
    const rec = score > g.best, prevStars = g.stars;
    g.plays++; g.best = Math.max(g.best, score); g.stars = Math.max(g.stars, stars);
    S.data.games[k] = g;
    S.data.stats.plays++;
    if (extra && extra.combo) S.data.stats.maxCombo = Math.max(S.data.stats.maxCombo, extra.combo);
    if (extra && extra.perfect) S.data.stats.perfects++;
    S.save();
    return { record: rec, newStars: g.stars > prevStars };
  };
  S.unlock = function (id) {
    if (S.data.ach[id]) return false;
    S.data.ach[id] = Date.now(); S.save();
    const a = VQ.ACHIEVEMENTS.find((x) => x.id === id);
    if (a && VQ.ui) VQ.ui.achToast(a);
    return true;
  };
  S.checkAchievements = function () {
    const d = S.data;
    if (S.lessonsCount() >= 1) S.unlock('first_lesson');
    if (S.lessonsCount() >= 9) S.unlock('all_lessons');
    if (d.stats.plays >= 1) S.unlock('first_game');
    if (d.stats.maxCombo >= 10) S.unlock('combo10');
    if (d.stats.maxCombo >= 25) S.unlock('combo25');
    if (d.stats.perfects >= 1) S.unlock('perfect');
    if (S.totalStars() && Object.values(d.games).some((g) => g.stars >= 3)) S.unlock('three_stars');
    if (S.medalCount('easy') >= 9) S.unlock('bronze_all');
    if (S.medalCount('mid') >= 9) S.unlock('silver_all');
    if (S.medalCount('hard') >= 9) S.unlock('gold_all');
    if (S.medalCount('hard') >= 9) S.unlock('hard_win');
    if (S.game('flat', 'hard').stars) S.unlock('storm_hero');
    if (S.game('config', 'hard').stars) S.unlock('cli_master');
    if (S.game('verify', 'hard').stars) S.unlock('sherlock');
    if (d.exam.passed) S.unlock('exam_pass');
    if (d.exam.best >= 90) S.unlock('exam_ace');
    if (d.friends.length) S.unlock('friend');
    if (d.cert) S.unlock('champion');
  };

  // ---------- share codes (leaderboard between friends) ----------
  S.makeCode = function () {
    const d = S.data;
    const bests = [];
    for (const c of VQ.CHAPTERS) for (const l of VQ.LEVELS) bests.push(S.game(c.id, l.id).best);
    const payload = { n: d.name.slice(0, 20), t: S.totalScore(), s: S.totalStars(), b: bests, m: [S.medalCount('easy'), S.medalCount('mid'), S.medalCount('hard')], e: d.exam.best || 0, c: d.cert ? 1 : 0, d: Date.now() };
    const json = JSON.stringify(payload);
    const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return 'VQ1.' + b64 + '.' + VQ.hash(json).slice(0, 4);
  };
  S.parseCode = function (code) {
    try {
      code = code.trim();
      const m = code.match(/VQ1\.([A-Za-z0-9_-]+)\.([a-z0-9]{1,4})/);
      if (!m) return null;
      let b = m[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
      const json = decodeURIComponent(escape(atob(b)));
      if (VQ.hash(json).slice(0, 4) !== m[2]) return null;
      const p = JSON.parse(json);
      if (typeof p.n !== 'string' || typeof p.t !== 'number') return null;
      return p;
    } catch (e) { return null; }
  };
  S.addFriend = function (code) {
    const p = S.parseCode(code);
    if (!p) return null;
    const i = S.data.friends.findIndex((f) => f.n === p.n);
    if (i >= 0) { if (p.d >= S.data.friends[i].d) S.data.friends[i] = p; } else S.data.friends.push(p);
    S.save(); S.checkAchievements();
    return p;
  };
  S.removeFriend = function (name) { S.data.friends = S.data.friends.filter((f) => f.n !== name); S.save(); };

  // query switches (?unlock=1 for teachers/testing)
  const q = new URLSearchParams(location.search);
  VQ.QS = { unlockAll: q.get('unlock') === '1', debug: q.get('debug') === '1' };
})(window.VQ);
