#!/usr/bin/env node
/* Writes docs/CODE-MAP.md: for every src-web/js file, what it is for and the functions / constants it defines at its top level.
     node tools/code-map.cjs           write docs/CODE-MAP.md
     node tools/code-map.cjs --check   fail if the file is out of date (used by CI) */
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..'), JS=path.join(ROOT,'src-web/js'), OUT=path.join(ROOT,'docs/CODE-MAP.md');
const WHAT={
 "000-constants": "Default categories (CATS) and the CAT lookup, safe localStorage wrappers (lsGet / lsSet).",
 "001-error-log": "Local error log: catches script errors, unhandled promises and console.error(Error) into a small cleaned list on the phone (errLog / errReport); outside the app data and the backups.",
 "010-state-and-storage": "Storage and the state S: persistence, member keys, save(); the translation engine (trText / TX / trNode) and language; payment methods; the currency table and custom currencies.",
 "020-theme-and-toast": "Theme / palette / font, toast messages, the list row of an expense.",
 "030-home": "Home (expenses) screen helpers: pay periods (periodOf, daysLeft), forecast and daily allowance, the eye toggle, closing a period, renderHome.",
 "031-reports": "Reports screen, report periods and the category detail.",
 "032-search": "Search over every movement and its filters.",
 "040-navigation-and-sheets": "Settings render, renderAll, tab navigation (go), the amount box with its calculator, category grid, note suggestions.",
 "050-expense-form": "Expense form (date menu, time wheels, funding and payment menus, openSheet / closeSheets) and account helpers (ACC, accBal, moneyTotals, exchange-rate lookups).",
 "060-accounts-and-money-card": "Accounts: list, sheet, reconciliation, transfers, cash withdrawals, the \"my money\" card, moving money to the budget.",
 "061-planned-and-installments": "Installments: add / edit / delete, one installment and paying it (plus PT_TXT and the income-in helper).",
 "062-income-and-budget": "Budget and pay-cycle helpers, income stats and the income list / sheet, InstaPay fee setting, shared-space settings (fb…), gold purchases, end-of-period forecast.",
 "070-voice-entry": "Voice entry: spoken numbers, dates, category guess, debt / gam'eya / installment phrases.",
 "080-settings-controls-and-alerts": "Settings controls, widgets and the Quick Settings tile, budget alerts, daily reminder time, low-balance alerts.",
 "081-lock-and-members": "PIN / password / fingerprint lock and the local members list.",
 "082-settings-pages": "Settings home list, one page per section, and the settings search.",
 "090-exports-and-cloud-backup": "Exports (Excel / PDF), file saving, the yearly report, backup file writing and restoring (applyBackup).",
 "091-import-from-files": "Importing expenses from Excel / CSV / PDF, category guess and the review sheet.",
 "092-categories": "Category management.",
 "093-trash": "Trash (30 days): trashPut is called by every delete function; restore, delete forever, empty, and the trash sheet.",
 "094-error-log-ui": "The error log card in the feedback page: count, see / copy the report, clear.",
 "096-polish-extras": "Home card for categories near or over their monthly limit (renderLimCard), «send this message as an example» for the bank-notification capture (capMask).",
"095-backup-encryption": "Optional backup encryption: AES-GCM with a key from a password (bkeSeal / bkOpen), the password prompt while restoring, and the settings row with its sheet.",
 "100-debts-and-gameyas": "Loans & debts and savings circles: lists, sheets, ledger, date helpers (relDay, addMonths), reminders text.",
 "110-profile-currency-income-payments": "Me / profile, app currency change and exchange rates, income list, payment methods.",
 "120-google-drive-updates-reminder": "Google Drive backup and restore (driveCall, restore sheet), app updates (check / download), the developer message and the periodic support reminder (nudge).",
 "130-fixed-planned-goals-photo": "Recurring (fixed) expenses with their schedule rules, planned expenses, goals, profile photo.",
 "140-native-sync-effects-welcome": "Syncing reminders / widget with Android, press pulse and vibration, welcome screen.",
 "150-shared-space": "The shared space (Firebase Firestore): create / join / approve, sharing choices, shared records.",
 "160-receipts": "Receipt photos (IndexedDB) and OCR.",
 "170-bank-notification-capture": "Payments captured from bank notifications: matching, review, refunds, InstaPay fee.",
 "180-monthly-summary-and-boot": "Notification-capture settings card, the monthly summary card and notification, and the start-up functions (bootRest / renderRest)."
};
const files=fs.readdirSync(JS).filter(f=>f.endsWith('.js')).sort();
let md='# خريطة الكود\n\nملف يتولّد تلقائيًا بـ `node tools/code-map.cjs`؛ لا تعدّله يدويًا.\nالتجميع: `src-web/js/*.js` بترتيب الاسم ← `app/src/main/assets/www/index.html` (انظر `docs/ARCHITECTURE.md`).\n\n| الملف | الأسطر | الغرض |\n|---|---:|---|\n';
let detail='';
for(const f of files){const id=f.replace(/\.js$/,''),src=fs.readFileSync(path.join(JS,f),'utf8').replace(/\r\n/g,'\n'),n=src.split('\n').length-1;
 md+=`| \`${f}\` | ${n} | ${WHAT[id]||'—'} |\n`;
 const names=[...src.matchAll(/^(?:async\s+)?function\s+(\w+)|^(?:const|let|var)\s+(\w+)/gm)].map(m=>m[1]||m[2]);
 detail+=`\n### ${f}\n${WHAT[id]||''}\n\n\`${names.join('` `')}\`\n`}
md+='\n## ما يُعرَّف في كل ملف (المستوى الأعلى)\n'+detail;
if(process.argv.includes('--check')){const cur=fs.existsSync(OUT)?fs.readFileSync(OUT,'utf8'):'';if(cur===md){console.log('OK: docs/CODE-MAP.md is up to date');process.exit(0)}console.error('docs/CODE-MAP.md is out of date. Run: node tools/code-map.cjs');process.exit(1)}
fs.writeFileSync(OUT,md);console.log('wrote docs/CODE-MAP.md ('+files.length+' files)');
