/* Lesson 9 – verifying VLANs: commands and real-world tests */
(function (VQ) {
  const M = VQ.M, V3 = M.V3, sim = VQ.sim;
  function fullTopo() {
    const { buildTopo, LAYOUT, STEPS, silentApply } = VQ.lab8;
    const t = buildTopo(); const s = { sw1: new sim.Session(t.devs.sw1), sw2: new sim.Session(t.devs.sw2), r1: new sim.Session(t.devs.r1) };
    silentApply(t, s, STEPS.length); t.devs.sw1.saved = t.devs.sw1.runningConfig();
    return { t, s };
  }
  const T = [
    ['sw1', ['show vlan brief']],
    ['sw1', ['show interfaces trunk']],
    ['sw1', ['show interfaces fastEthernet 0/1 switchport']],
    ['sw1', ['show ip interface brief', 'show interfaces status']],
    ['sw1', ['show mac address-table']],
  ];
  const CHECK = ['1️⃣ הפורט UP?  ‏(show interfaces status)', '2️⃣ הפורט ב-VLAN הנכון?  ‏(show vlan brief)', '3️⃣ ה-VLAN קיים?  ‏(show vlan brief)', '4️⃣ ה-Trunk מעביר את ה-VLAN?  ‏(show interfaces trunk)', '5️⃣ Native VLAN זהה בשני הצדדים?', '6️⃣ ה-Gateway / SVI פעיל?  ‏(show ip interface brief)'];
  VQ.lesson('verify', {
    narrow: true,
    build(L) {
      const st = L.stage; M.grid(st, 90, 0x16305a); M.stars(st, 300, 80);
      L.net = L.makeNet();
      const { t, s } = fullTopo(); L.topo = t; L.sess = s;
      L.lab = new VQ.Lab3D(st, t, VQ.lab8.LAYOUT, L.net);
      L.hosts = { s1: new sim.HostShell(t, 's1'), g1: new sim.HostShell(t, 'g1'), f1: new sim.HostShell(t, 'f1') };
      L.term = new VQ.Terminal({
        title: '⌨️ CLI + מחשבים', tabs: [{ id: 'sw1', label: 'SW1', session: s.sw1 }, { id: 'sw2', label: 'SW2', session: s.sw2 }, { id: 'r1', label: 'R1', session: s.r1 }, { id: 's1', label: '💻 דנה', session: L.hosts.s1 }, { id: 'g1', label: '💻 אורח', session: L.hosts.g1 }],
        chips: VQ.Terminal.suggest,
        onCommand: (sess, line, out, tab) => { L.lab.sync(); if (/^ping\s/i.test(line) && sess.mode === 'host') L.lab.ping(tab.id, line.trim().split(/\s+/)[1], { speed: 7 }); },
      }).mount(VQ.ui.layer('gamehud'));
      L.term.setChipsEnabled(false);
      st.setCam([0.3, 12.5, 20], [0.3, 0.3, -1]);
      st.setInset(0, 0, window.innerWidth > 900 ? -Math.min(560, window.innerWidth * 0.46) : 0);
      L.play = async (tab, cmds, tok) => {
        const alive = () => L.tok === tok; L.term.select(tab);
        for (const c of cmds) { if (!(await L.term.type(c, 32, alive))) return false; await new Promise((r) => setTimeout(r, 350)); if (!alive()) return false; }
        return true;
      };
    },
    steps: [
      {
        t: 'שתי דרכים לבדוק',
        x: 'הגדרנו VLAN-ים — אבל איך יודעים שזה **באמת** עובד? יש שתי דרכים משלימות: **1) בדיקה בפקודות** — מה המתג אומר על עצמו (`show …`). **2) בדיקה בפועל** — האם מחשב אמיתי מצליח לתקשר: `ping`, `ipconfig`, נוריות על הפורט, כתובת IP שהתקבלה. צריך את שתיהן: הגדרה יכולה להיראות נכונה ועדיין לא לעבוד.',
        enter(L) { L.term.select('sw1'); L.term.setChipsEnabled(false); L.cam([0.3, 12.5, 20], [0.3, 0.3, -1]); VQ.bigNote(L, '🔍 בפקודות      🧪 בפועל', [-5, 3.6, -3], { size: 0.7 }); },
      },
      {
        t: 'show vlan brief',
        x: 'הפקודה הראשונה והחשובה: `show vlan brief`. בודקים: האם ה-VLAN **קיים** ובסטטוס `active`? האם הפורטים הנכונים ברשימה של כל VLAN? ⚠️ **פורטי Trunk לא מופיעים כאן** — זו בעיה קלאסית בבחינות: אם לא רואים את Gi0/1 באף VLAN, זה לא באג.',
        enter(L) { const tok = L.tok; L.play(T[0][0], T[0][1], tok); VQ.bigNote(L, 'VLAN קיים? פורטים נכונים?', [-5, 3.6, -3], { size: 0.5, border: '#38bdf8' }); },
      },
      {
        t: 'show interfaces trunk',
        x: '`show interfaces trunk` מציג את כל ה-Trunk-ים. שלוש נקודות בדיקה: **Native vlan** — זהה בשני הצדדים? **Vlans allowed on trunk** — ה-VLAN שלי ברשימה? **Allowed and active** — הוא גם קיים בפועל במתג? אם VLAN חסר ברשימה השלישית — התעבורה שלו לא תעבור.',
        enter(L) { const tok = L.tok; L.play(T[1][0], T[1][1], tok); VQ.bigNote(L, 'Native • Allowed • Active', [-5, 3.6, -3], { size: 0.5, border: '#fde047' }); },
      },
      {
        t: 'בדיקת פורט בודד',
        x: '`show interfaces fa0/1 switchport` נותן תמונה מלאה של פורט: `Administrative Mode` (מה הגדרנו) מול `Operational Mode` (מה קורה בפועל), ו-`Access Mode VLAN` — לאיזה VLAN שייך. מגלים כאן למשל פורט שנשאר `dynamic auto` ולא `static access`.',
        enter(L) { const tok = L.tok; L.play(T[2][0], T[2][1], tok); VQ.bigNote(L, 'Admin מול Operational', [-5, 3.6, -3], { size: 0.5, border: '#4ade80' }); },
      },
      {
        t: 'סטטוס ממשקים וכתובות',
        x: '`show ip interface brief` מראה לכל ממשק `Status` ו-`Protocol`. אחרי הגדרה תקינה תראו `up/up`. `administratively down` = מישהו הקליד `shutdown`. `down/down` = אין כבל או אין פורט פעיל ב-VLAN. `show interfaces status` מראה לכל פורט VLAN וסטטוס (`connected`, `notconnect`, `inactive`).',
        enter(L) { const tok = L.tok; L.play(T[3][0], T[3][1], tok); },
      },
      {
        t: 'טבלת MAC',
        x: '`show mac address-table` מראה איזו כתובת MAC נלמדה על איזה פורט **ובאיזה VLAN**. אם המחשב של דנה מופיע ב-VLAN 10 על `Fa0/1` — הפורט והחיווט תקינים. MAC של מכשיר משכבה אחרת יופיע על פורט ה-Trunk. מחשב שחסר בטבלה — אין תעבורה ממנו.',
        enter(L) { const tok = L.tok; L.lab.ping('s1', '192.168.10.13', { speed: 9 }); L.play(T[4][0], T[4][1], tok); },
      },
      {
        t: 'בדיקה בפועל: ping ו-ipconfig',
        x: 'עכשיו הצד השני. במחשב של דנה: `ipconfig` (האם קיבלה כתובת מה-Subnet הנכון?) ו-`ping`. ping למחשב באותו VLAN (192.168.10.13) — אמור לעבור. ping למחלקה אחרת (192.168.20.11) — עובר **רק** דרך הנתב. ובנוסף: נורית ירוקה על הפורט = קישור פיזי תקין.',
        prompt: 'הקלידו במחשב של דנה: ping 192.168.20.11',
        enter(L) {
          const tok = L.tok; L.term.select('s1'); L.term.setChipsEnabled(true);
          (async () => {
            await L.play('s1', ['ipconfig', 'ping 192.168.10.13'], tok);
            if (L.tok !== tok) return;
            L.term.sys('# עכשיו תורכם: ping 192.168.20.11');
            const prev = L.term.opts.onCommand;
            L.term.opts.onCommand = (sess, line, out, tab) => { prev(sess, line, out, tab); if (L.tok === tok && /^ping\s+192\.168\.20\.11/.test(line.trim())) { L.unlock(); } };
            L.onCleanup(() => { L.term.opts.onCommand = prev; });
          })();
        },
      },
      {
        t: 'מה כשזה לא עובד?',
        x: 'האורח (VLAN 30) לא אמור להגיע למכירות: ה-ping שלו נכשל — וזה בדיוק **מה שרצינו**. בדיקה טובה בודקת גם מה **צריך להיחסם**. כשמשהו לא עובד כשצריך — עוברים על הרשימה מלמעלה למטה (אחד אחד).',
        enter(L) {
          const tok = L.tok; L.term.setChipsEnabled(false);
          L.play('g1', ['ipconfig', 'ping 192.168.10.11'], tok);
          CHECK.forEach((c, i) => L.wait(1.5 + i * 0.7).then(() => { VQ.bigNote(L, c, [-4, 0.8 + (5 - i) * 0.9, -6], { size: 0.36, border: '#a3e635' }); VQ.sfx.play('pop'); }));
        },
      },
      {
        t: 'בדיקת הבנה (1)',
        x: '',
        q: { q: 'ב-`show vlan brief` לא רואים את Gi0/1 באף VLAN. מה הסיבה הסבירה?', o: ['הפורט מקולקל', 'הפורט מוגדר Trunk, ופורטי Trunk לא מופיעים ברשימת ה-VLAN', 'ה-VLAN לא קיים', 'הפורט כבוי'], a: 1, why: 'פורטי Trunk משרתים הרבה VLAN-ים ולכן לא נרשמים תחת VLAN מסוים. הם מופיעים ב-show interfaces trunk.' },
        enter(L) { L.term.setChipsEnabled(false); },
      },
      {
        t: 'בדיקת הבנה (2)',
        x: '',
        q: { q: 'מחשב מקבל Request timed out כשהוא שולח ping ל-Gateway שלו. מה הבדיקה הראשונה הכי הגיונית?', o: ['להחליף את המחשב', 'לבדוק שהפורט UP ובאמת שייך ל-VLAN הנכון (show vlan brief / show interfaces status)', 'לאתחל את הנתב', 'למחוק את כל ה-VLAN-ים'], a: 1, why: 'מתחילים מהבסיס: קישור פיזי, VLAN של הפורט, ורק אחר כך Trunk ו-Gateway.' },
        enter(L) { L.term.setChipsEnabled(false); },
      },
    ],
  });
})(window.VQ);
