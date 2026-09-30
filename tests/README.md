# בדיקות (Playwright)

```bash
npm i -D playwright && npx http-server -p 8123 -c-1 .   # בטרמינל אחד
node tests/smoke.js      # כל 9 השיעורים + כל 27 משחק/רמה
node tests/sol.js mid    # פתרון מלא של "מפקד הקונפיגורציה" (easy|mid|hard) דרך ה-CLI
node tests/dtest.js      # 9 תיקי הבלש: נכשלים לפני התיקון ועוברים אחריו
node tests/flow.js 1280 720 d   # מסלול מלא: כותרת ← מפה ← שיעור ← משחק ← מבחן ← תעודה ← מובילים
node tests/bots.js       # בוטים שמשחקים בכמה מהמשחקים
```
