# خريطة الكود

ملف يتولّد تلقائيًا بـ `node tools/code-map.cjs`؛ لا تعدّله يدويًا.
التجميع: `src-web/js/*.js` بترتيب الاسم ← `app/src/main/assets/www/index.html` (انظر `docs/ARCHITECTURE.md`).

| الملف | الأسطر | الغرض |
|---|---:|---|
| `000-constants.js` | 147 | Default categories (CATS) and the CAT lookup, safe localStorage wrappers (lsGet / lsSet). |
| `001-error-log.js` | 37 | Local error log: catches script errors, unhandled promises and console.error(Error) into a small cleaned list on the phone (errLog / errReport); outside the app data and the backups. |
| `010-state-and-storage.js` | 529 | Storage and the state S: persistence, member keys, save(); the translation engine (trText / TX / trNode) and language; payment methods; the currency table and custom currencies. |
| `020-theme-and-toast.js` | 118 | Theme / palette / font, toast messages, the list row of an expense. |
| `030-home.js` | 177 | Home (expenses) screen helpers: pay periods (periodOf, daysLeft), forecast and daily allowance, the eye toggle, closing a period, renderHome. |
| `031-reports.js` | 121 | Reports screen, report periods and the category detail. |
| `032-search.js` | 132 | Search over every movement and its filters. |
| `040-navigation-and-sheets.js` | 186 | Settings render, renderAll, tab navigation (go), the amount box with its calculator, category grid, note suggestions. |
| `050-expense-form.js` | 286 | Expense form (date menu, time wheels, funding and payment menus, openSheet / closeSheets) and account helpers (ACC, accBal, moneyTotals, exchange-rate lookups). |
| `060-accounts-and-money-card.js` | 382 | Accounts: list, sheet, reconciliation, transfers, cash withdrawals, the "my money" card, moving money to the budget. |
| `061-planned-and-installments.js` | 119 | Installments: add / edit / delete, one installment and paying it (plus PT_TXT and the income-in helper). |
| `062-income-and-budget.js` | 432 | Budget and pay-cycle helpers, income stats and the income list / sheet, InstaPay fee setting, shared-space settings (fb…), gold purchases, end-of-period forecast. |
| `070-voice-entry.js` | 491 | Voice entry: spoken numbers, dates, category guess, debt / gam'eya / installment phrases. |
| `080-settings-controls-and-alerts.js` | 281 | Settings controls, widgets and the Quick Settings tile, budget alerts, daily reminder time, low-balance alerts. |
| `081-lock-and-members.js` | 241 | PIN / password / fingerprint lock and the local members list. |
| `082-settings-pages.js` | 86 | Settings home list, one page per section, and the settings search. |
| `090-exports-and-cloud-backup.js` | 344 | Exports (Excel / PDF), file saving, the yearly report, backup file writing and restoring (applyBackup). |
| `091-import-from-files.js` | 403 | Importing expenses from Excel / CSV / PDF, category guess and the review sheet. |
| `092-categories.js` | 196 | Category management. |
| `093-trash.js` | 74 | Trash (30 days): trashPut is called by every delete function; restore, delete forever, empty, and the trash sheet. |
| `094-error-log-ui.js` | 14 | The error log card in the feedback page: count, see / copy the report, clear. |
| `095-backup-encryption.js` | 94 | Optional backup encryption: AES-GCM with a key from a password (bkeSeal / bkOpen), the password prompt while restoring, and the settings row with its sheet. |
| `100-debts-and-gameyas.js` | 548 | Loans & debts and savings circles: lists, sheets, ledger, date helpers (relDay, addMonths), reminders text. |
| `110-profile-currency-income-payments.js` | 381 | Me / profile, app currency change and exchange rates, income list, payment methods. |
| `120-google-drive-updates-reminder.js` | 320 | Google Drive backup and restore (driveCall, restore sheet), app updates (check / download), the developer message and the periodic support reminder (nudge). |
| `130-fixed-planned-goals-photo.js` | 187 | Recurring (fixed) expenses with their schedule rules, planned expenses, goals, profile photo. |
| `140-native-sync-effects-welcome.js` | 127 | Syncing reminders / widget with Android, press pulse and vibration, welcome screen. |
| `150-shared-space.js` | 603 | The shared space (Firebase Firestore): create / join / approve, sharing choices, shared records. |
| `160-receipts.js` | 215 | Receipt photos (IndexedDB) and OCR. |
| `170-bank-notification-capture.js` | 321 | Payments captured from bank notifications: matching, review, refunds, InstaPay fee. |
| `180-monthly-summary-and-boot.js` | 171 | Notification-capture settings card, the monthly summary card and notification, and the start-up functions (bootRest / renderRest). |

## ما يُعرَّف في كل ملف (المستوى الأعلى)

### 000-constants.js
Default categories (CATS) and the CAT lookup, safe localStorage wrappers (lsGet / lsSet).

`CATS` `CAT_GROUPS` `CATS_MORE` `CAT` `mem` `lsGet` `lsSet`

### 001-error-log.js
Local error log: catches script errors, unhandled promises and console.error(Error) into a small cleaned list on the phone (errLog / errReport); outside the app data and the backups.

`ERRLOG_KEY` `errAddr` `errText` `errStack` `errLogRead` `errBurst` `errLog` `logErr` `errClear` `errWhen` `errReport`

### 010-state-and-storage.js
Storage and the state S: persistence, member keys, save(); the translation engine (trText / TX / trNode) and language; payment methods; the currency table and custom currencies.

`storageWarnAt` `storageFull` `persist` `MKEY` `mbKey` `rcDbName` `fbAppName` `MB` `ME` `KEY` `mbSave` `mbSyncName` `fileTag` `S` `AB` `syncT` `save` `syncCats` `LANG_NAMES` `LANG` `I18D` `HAS_AR` `dayCount` `trText` `trKey` `TX` `userTextCache` `isUserText` `TR_ATTRS` `trNode` `langSel` `LANG_UI` `langPaint` `PAYS` `PAY` `payOf` `CURRENCIES` `CS` `CUR_BASE` `CUR_SKIP` `CUR_DN` `curNameAr` `curNameEn` `curAddCustom` `curMerge` `esc` `cleanE` `colr` `fmt` `money` `pad` `dayKey` `monKey` `LOC` `monthName` `monthOnly` `dayName` `timeStr` `daysIn` `nextMonth` `ofMonth` `sum` `byCat` `uid` `isId` `idOr` `numIn` `intIn` `str` `isDK` `isMK` `isPhoto` `MAXAMT` `r2` `cleanOwner` `cleanExpense` `cleanDebt` `cleanGam` `cleanIncome` `cleanGoal` `cleanFixed` `cleanPlan` `cleanIplan` `cleanRefund` `FXLOG_KEY` `cleanFixedLog` `cleanCat` `ACC_TYPES` `cleanAcc` `cleanTr` `cleanBMove` `budOf` `budgetExpenses` `budgetSpent` `freeIncomeBalance` `freeIncomeActive` `incomeFundLabel` `incomeChangeError` `changeIncome` `paintExpenseFund` `paintIncomeFund` `cleanInst` `cleanInflow` `GOLD_KS` `cleanGold` `cleanManRates` `cleanIpFee` `cleanGoldPx` `cleanInstPay` `cleanPay` `cleanCap` `cleanCapCur` `cleanProfile` `RT` `ratesLoad` `rateFor` `manRate` `usdRate` `ratesDone` `ratesRefresh` `TRASH_DAYS` `TRASH_CLEAN` `cleanTrash` `CLEAN`

### 020-theme-and-toast.js
Theme / palette / font, toast messages, the list row of an expense.

`ACCENTS` `STYLES` `styleId` `LOOKS` `lookId` `FONTS` `fontId` `PRESSES` `TRANSES` `pressId` `transId` `applyTheme` `toastT` `toast` `ICON_MORE` `justAdded` `itemRow`

### 030-home.js
Home (expenses) screen helpers: pay periods (periodOf, daysLeft), forecast and daily allowance, the eye toggle, closing a period, renderHome.

`payLen` `wk` `unitPrev` `unitBefore` `endWord` `repPd` `periodOf` `periodAt` `daysTxt` `ofPeriod` `daysLeft` `periodRange` `periodLabel` `greet` `countUp` `forecastLine` `dailyAllowance` `dailyLine` `EYE_ON` `EYE_OFF` `paintEye` `cleanClosed` `closeInfo` `renderCloseCard` `openClose` `homeExpenseView` `homeExpenseRow` `closeHomeExpenseMenu` `renderHome`

### 031-reports.js
Reports screen, report periods and the category detail.

`repP` `repPrev` `repNext` `repDays` `repRange` `repName` `repShort` `repAllWord` `repSheetName` `curMonth` `renderReports` `renderDetail` `reportCategoryId` `openReportCategory` `renderReportCategory` `repMainY` `showSub` `showDetail`

### 032-search.js
Search over every movement and its filters.

`normAr` `sfNum` `sfDay` `sfSelected` `sfCategoryLabel` `sfGet` `sfFill` `sfPass` `searchOthers` `sfCompare` `renderSearch` `SF_CHEV` `sfPaintPicks` `sfChoiceId` `sfCloseChoice` `sfCalendarPaint` `sfCalendarChoose` `searchT` `SQ` `sqActive` `sqPaint` `srBack` `openSearch`

### 040-navigation-and-sheets.js
Settings render, renderAll, tab navigation (go), the amount box with its calculator, category grid, note suggestions.

`renderSettings` `renderAll` `tab` `fabIdleTimer` `fabRest` `fabWake` `TABS` `tabY` `go` `selCat` `capOpen` `rcStage` `amtIn` `OPS` `cleanExpr` `evalExpr` `readAmt` `setCalc` `showCalc` `calcEquals` `buildPad` `renderCatGrid` `noteSuggestions` `renderNoteSug` `markCat` `fxPending`

### 050-expense-form.js
Expense form (date menu, time wheels, funding and payment menus, openSheet / closeSheets) and account helpers (ACC, accBal, moneyTotals, exchange-rate lookups).

`todayKey` `yestKey` `selDay` `expenseClock` `expenseTimestamp` `CHEV` `paintDate` `closeDateMenu` `expenseWheelMark` `expenseWheelsRead` `expenseWheelsSet` `dsId` `openDateSheet` `moveExpenseTo` `tsForDay` `closeFundMenu` `paintPay` `closePayMenu` `openSheet` `ipFeeSync` `ipFeePaint` `closeSheets` `ACC` `curSym` `accDisp` `accBal` `accUsed` `debtAccRows` `goldAccRows` `toAcc` `toMain` `moneyTotals` `accRatesAsked` `accEnsureRates` `mvState` `selAcc` `ACC_NONE_NOTE` `paintAccRow` `closeAccMenu` `positionAccMenu`

### 060-accounts-and-money-card.js
Accounts: list, sheet, reconciliation, transfers, cash withdrawals, the "my money" card, moving money to the budget.

`accLow` `renderAccounts` `accSav` `accMoves` `paintAccHist` `paintAccType` `openAccSheet` `rcnFor` `rcnState` `rcnPaint` `openRecon` `trEdit` `trNum` `trAvailOf` `trSides` `trCalcIn` `trPaint` `trCaps` `NEWCASH` `cashAccFor` `trMode` `openCashMove` `openTrSheet` `paintHomeChips` `renderMoney` `mvDir` `mvOpt` `openMv` `mvPaint` `EPS` `itemPaid` `itemRem` `itemDone` `instTotal` `instPaidSum` `instRemSum` `instNext` `instOf` `ensureInstCat` `addMonthDK` `instMonth` `instLate` `instCard` `renderInsts`

### 061-planned-and-installments.js
Installments: add / edit / delete, one installment and paying it (plus PT_TXT and the income-in helper).

`instEdit` `instEvery` `instPaintLab` `instAutoMonthly` `openInstSheet` `deleteInst` `iiFor` `instPayList` `openItemSheet` `ipFor` `openInstPay` `incomeIn` `PT_TXT`

### 062-income-and-budget.js
Budget and pay-cycle helpers, income stats and the income list / sheet, InstaPay fee setting, shared-space settings (fb…), gold purchases, end-of-period forecast.

`obligations30` `inflowStats` `reservePerPayment` `paintPayType` `incomeVisibleCount` `renderIncome` `inEdit` `inNum` `iplPending` `openInSheet` `IN_BASE` `inKey` `inSrcOptions` `paintInChips` `KIND_ITEMS` `closeKindMenu` `openKindMenu` `paintIpFee` `FB` `fbKind` `fbName` `fbPaint` `fbAttachOn` `fbBody` `fbBrowser` `GOLD_K` `goldPer` `gdTitle` `sgn` `sgnCol` `goldStats` `goldNow` `renderGold` `gdEdit` `gdPaintK` `gdPer` `openGold` `forecastEnd` `renderForecast` `renderMoneyReport` `repTab` `paintRepTab` `mePage` `ME_TITLES` `ME_ICO` `ME_GROUPS` `meGo` `renderMeHome`

### 070-voice-entry.js
Voice entry: spoken numbers, dates, category guess, debt / gam'eya / installment phrases.

`vNorm` `vStem` `VW` `VTH` `VCUR` `VDAY_Y` `VFILL` `vUnit` `vFrac` `voiceWordRuns` `VSYN` `voiceCat` `learnedCat` `vK2` `parseEnglishVoice` `parseVoice` `IN_VERB` `OUT_VERB` `IN_NOUN` `parseVoiceIn` `voiceOpen` `voiceClose` `voiceCancel` `voiceApply` `vK` `vMap` `VMON` `VWDAYS` `VORD` `VNEXT` `vMonOf` `vNumAt` `vHas` `vAllNums` `voiceDate` `vStopPre` `vFutureVerb` `vIsStop` `vName` `vAfterBecause` `parseVoiceDebt` `parseVoiceGam` `vCurSkip` `parseVoiceInst` `VOB_HINT` `obVoiceResult` `delExpense` `menuFor` `openMenu` `closeMenu`

### 080-settings-controls-and-alerts.js
Settings controls, widgets and the Quick Settings tile, budget alerts, daily reminder time, low-balance alerts.

`motionOpt` `wgPin` `pctPaint` `notifT` `notifKind` `showNotif` `fmtRemAt` `askNotif` `TP_H` `tpMark` `tpRead` `tpPreview` `tpBuild` `tpSet` `checkRemind` `checkCatAlerts` `lowItems` `checkLow` `checkAlerts` `WIPE_OPTS` `wipeSel` `paintWipe` `openWipe` `PIN_ITER` `b64e` `b64d` `SHA_K` `sha256` `hmac256` `pbkdf2js` `pinDerive` `pinMake` `hasPin` `LK` `lkS` `lkSave` `lkHas` `pinCheck`

### 081-lock-and-members.js
PIN / password / fingerprint lock and the local members list.

`pinWait` `pinFailed` `pinOk` `waitTxt` `applySecure` `pinMode` `dots` `shake` `credMode` `credPaint` `credOpen` `pinPadOpen` `credVerify` `lockOff` `lockBuf` `lockMsgPaint` `unlockApp` `splashQ` `afterSplash` `lockPaintKind` `lockPassTry` `mbPickFrom` `mbPickOpen` `mbPickClose` `mbInitial` `mbGo` `lockShowFor` `mbPicked` `quickAddWanted` `runQuickAdd` `askBio` `renderMembers` `mbDelete` `mbKind` `digitsEn` `mbNorm` `mbKindSet` `mbNewId`

### 082-settings-pages.js
Settings home list, one page per section, and the settings search.

`setPage` `pageY` `pageTo` `pageTopSmooth` `SET_T_NAMES` `setGo` `SET_THEME` `setSub` `renderSetHome` `SET_IDX` `setVisiblePage` `setSearch` `setHits`

### 090-exports-and-cloud-backup.js
Exports (Excel / PDF), file saving, the yearly report, backup file writing and restoring (applyBackup).

`downloads` `mimeOf` `toB64` `saveFile` `reportTimes` `monthsWithData` `reportHasData` `_ld` `loadScript` `needLib` `XL` `exportXlsx` `pdfMoneyHtml` `exportPdf` `pdfRun` `yearReportHtml` `exportYearPdf` `openYearReport` `expFmt` `db` `backupDoc` `backupData` `restoreReloadT` `applyBackup` `bkParse` `bkRestore` `IMP_MAX_BYTES` `impErr` `AR_NORM` `impDigits` `IMP_TOTAL` `IMP_CUR` `IMP_AMT_RE` `IMP_DATE_RE` `IMP_TIME_RE` `impDate` `impTime`

### 091-import-from-files.js
Importing expenses from Excel / CSV / PDF, category guess and the review sheet.

`impNum` `impLine` `IMP_KW` `IMP_NEW` `IMP_KWN` `impKw` `impToks` `impScore` `impHistory` `impGuessCat` `IMP_H` `impHeader` `impHasLetters` `impTxt` `impFromSheets` `impFromLines` `impCsv` `impDecode` `impXlsx` `IMP_EXTRA_WORDS` `impVocab` `impFixLamAlef` `impPdf` `impParse` `IMP` `impPrepare` `impCatOpts` `impRender`

### 092-categories.js
Category management.

`EMOJIS` `COLORS` `catEdit` `renderCatList` `sortSuppress` `sortable` `commitCatOrder` `paintCatSheet` `openCatSheet` `catSugList` `catSugGroups` `openCatSug` `sugRows` `deleteCat`

### 093-trash.js
Trash (30 days): trashPut is called by every delete function; restore, delete forever, empty, and the trash sheet.

`TRASH_LABEL` `TRASH_ARR` `trashAll` `trashLetGo` `trashSweep` `trashPut` `trashDel` `trashRestore` `trashForever` `trashEmpty` `trashInfo` `trashAgo` `renderTrash` `openTrash`

### 094-error-log-ui.js
The error log card in the feedback page: count, see / copy the report, clear.

`errPaint`

### 095-backup-encryption.js
Optional backup encryption: AES-GCM with a key from a password (bkeSeal / bkOpen), the password prompt while restoring, and the settings row with its sheet.

`BKE_KEY` `bkeOk` `bkeB64` `bkeCfg` `bkeOn` `bkeAad` `bkeDerive` `bkeSave` `bkeSeal` `bkSniffEnc` `bkeIsEnv` `bkeDecrypt` `bkOpen` `bkePassRes` `bkePrompt` `bkePassDone` `bkePassClose` `bkePaint` `openBkEnc`

### 100-debts-and-gameyas.js
Loans & debts and savings circles: lists, sheets, ledger, date helpers (relDay, addMonths), reminders text.

`obTab` `todayStart` `dkToTs` `diffDays` `relDay` `dueCls` `addMonths` `shortDate` `dkToDMY` `mkToMY` `parseDMY` `parseMY` `cleanMoney` `bindMoney` `debtPaid` `debtAdded` `debtTotal` `debtRem` `openSheetEl` `ensureGamCat` `gamTurns` `gamShares` `gamMonthly` `gamRecvd` `gamSetRecv` `GAM_ORD` `gamInfo` `isMine` `debtCur` `debtSym` `debtToAcc` `debtTotalsHtml` `renderDebts` `debtCard` `gamSummary` `gamCard` `dueItems` `paintObFixed` `renderUpcoming` `checkDue` `debtEdit` `convertDebt` `paintDebtCurrency` `debtAccountPreview` `closeDebtCurrency` `paintDir` `accOptsHtml` `accLabFor` `paintDebtAcc` `openDebtSheet` `deleteDebt` `openPaySheet` `addFor` `dWho` `dAddPaint` `openDebtAdd` `debtRemind` `debtLedger` `openDebtLog` `gamEdit` `gamMonthOpts` `gamReadTurns` `fillTurns` `turnHint` `gamSumm` `WP_MONTHS` `wpCloseAll` `wheelField` `openGamSheet` `deleteGam` `HOME_BLOCKS` `applyHomeShow` `renderHomeToggles` `pkCb` `pickAcc` `toggleGamPaid`

### 110-profile-currency-income-payments.js
Me / profile, app currency change and exchange rates, income list, payment methods.

`streaks` `incomeTotal` `paintHomeAv` `renderMe` `applyCurrency` `fillCurSelects` `WORLD_CUR` `curPool` `curAddPaint` `openCurAdd` `curPickCustom` `CURX` `CUR_NAME` `CUR_SHARED_TYPES` `curHasMoney` `curSharedBlock` `curFmtRate` `curManualAsk` `curManK` `curManPaint` `curAsk` `curScaleAll` `curApply` `curRestore` `curFixPending` `formCfg` `GOAL_EMOJIS` `openForm` `openIncome` `deleteIncome` `renderPayReport` `payLabel` `PAY_EMOJIS` `renderPayList` `lpTimer` `lpClear` `openPayForm` `deletePay` `autoBkLabel` `autoBkBusy` `bkTo` `bkDue` `bkMake` `bkHasData` `maybeAutoBackup` `backupNow`

### 120-google-drive-updates-reminder.js
Google Drive backup and restore (driveCall, restore sheet), app updates (check / download), the developer message and the periodic support reminder (nudge).

`DRIVE_ERR` `driveErrMsg` `driveCbs` `driveCall` `driveSend` `bkWhen` `paintDrive` `RS` `RS_ERR` `rsOpen` `rsView` `rsBusy` `openRestore` `rsGroups` `rsFetch` `rsApply` `autoBkPaint` `UPDK` `UPD` `updLocal` `updLocalSet` `updLatest` `updForced` `updLabel` `UPD_ERR` `updPaintBar` `paintUpd` `updStart` `updInstall` `updSheetOpen` `updManualCheck` `updShowT` `updOffer` `updBoot` `NUDGE_KEY` `NUDGES` `NUDGE_CUR` `nudgeState` `nudgeSave` `nudgeDue` `nudgeBusy` `nudgeOffer` `nudgeGo` `nudgeBoot`

### 130-fixed-planned-goals-photo.js
Recurring (fixed) expenses with their schedule rules, planned expenses, goals, profile photo.

`fixedEvery` `fixedEveryLabel` `fixedScheduled` `fixedOcc` `fixedUnit` `fixedRuleLabel` `fixedOccurrences` `fixedDueItems` `fixedPendingIn` `openFixed` `deleteFixed` `openPlan` `deletePlan` `openIPlan` `deleteIPlan` `openGoal` `deleteGoal` `depositGoal` `removePhoto`

### 140-native-sync-effects-welcome.js
Syncing reminders / widget with Android, press pulse and vibration, welcome screen.

`syncWidget` `syncNative` `wlMode` `wlGo` `wlModeSet` `showWelcome` `hideWelcome`

### 150-shared-space.js
The shared space (Firebase Firestore): create / join / approve, sharing choices, shared records.

`FB_CFG` `SP_ABC` `SP_SHARE_META` `SP_EXTRA_TYPES` `spMemberIds` `fbP` `SP_RETRY_MS` `spCurrencyBlocked` `spExtraUnsubs` `spMe` `expenseCanManage` `expenseReadOnly` `cloudAmt` `hashE` `SP_CODE_LEN` `spFmt` `spCodeOk` `spNorm` `spGen` `withTimeout` `spBlankPrefs` `spNormPrefs` `spDraftPrefs` `spPrefSame` `spShareLabels` `spLocalExpenses` `spCountLocal` `spErrMsg` `fbInit` `spSetStatus` `spTypeRows` `spRenderSetupTypes` `spRenderShareTypes` `spRenderSharedData` `renderSpace` `spManageOn` `spManage` `spQueue` `spStop` `spStopJoinWatch` `spActivateJoin` `spWatchJoinRequest` `spDecideRequest` `spPurgeOthers` `spDetach` `spLocalLeave` `spReadOnce` `spWipeSpace` `spIsClosed` `SP_CLOSED_MSG` `spRemovedCheck` `spCheckRemoved` `spRemoveMember` `spClearOldId` `spApply` `spIncoming` `spPushBusy` `spRestoreReadOnlyExpenses` `spPush` `spStable` `spByTag` `spItemClean` `spClone` `rpK` `spReportRows` `spBuildLocalRows` `spDocId` `spBase` `spMergeList` `spMergeMap` `spMerge3` `spApplyShared` `spTypesBusy` `spPushTypes` `spEnsureMemberProfile` `spListen` `spListenInner` `openSpPanel` `spPanelClose` `armBtn` `spLeaving` `copyText` `RC` `rcDB` `rcTx` `rcPut` `rcGet` `rcDel`

### 160-receipts.js
Receipt photos (IndexedDB) and OCR.

`rcPrune` `rcShrink` `rcThumbUrl` `rcSetThumb` `rcPaint` `rcCommit` `OCR_TOTAL` `OCR_BEST` `OCR_SKIP` `OCR_NOTNAME` `OCR_MERCH` `ocrNums` `ocrParse` `ocrWait` `ocrRun` `ocrTok` `rcRead` `rcPicked` `rcViewUrl` `rcViewOpen` `rcViewClose` `blobToDataUrl` `rcExport` `RC_DATAURL` `rcImport` `rcLoad` `CAP_SHOW` `capExpanded` `capPull` `capCurrency` `capCur` `capAmount` `capReference` `capAgo` `capPay` `capCat`

### 170-bank-notification-capture.js
Payments captured from bank notifications: matching, review, refunds, InstaPay fee.

`capDigits` `capNorm` `capHints` `capPhoneOf` `capMatch` `capNoPair` `capView` `CAP_CASH_STRONG` `capIsCash` `capDebtCands` `capDebtMatch` `CAP_REFUND` `capPlan` `capLabel` `renderCaps` `ipFeeOf` `capIpFee` `capConfirm` `caFor` `openCapAsk` `caPre` `caPaint` `capDrop` `rfCands` `rfLabel` `rfExp` `openRefund` `rfAccOpts` `rfCalc` `rfPaint` `expToCash` `capRemove`

### 180-monthly-summary-and-boot.js
Notification-capture settings card, the monthly summary card and notification, and the start-up functions (bootRest / renderRest).

`capState` `renderCapSettings` `openCapSheet` `sumForce` `sumRecurring` `sumData` `sumPct` `sumDiffTxt` `sumWanted` `renderSummary` `sumNotif` `bootRest` `renderRest`
