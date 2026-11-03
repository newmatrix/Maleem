# Language files

- `eg.js`: Egyptian Arabic source catalog and language preview settings.
- `ar.js`: Modern Standard Arabic translations and rules.
- `en.js`: English translations and rules.

These local scripts load synchronously before the app, without network requests or `fetch`, including in Android WebView. Each registers `window.I18N[locale]`.

`x` maps source labels to translations. `p` contains ordered regular-expression rules for generated messages; `$1`, `$2`, etc. preserve captured amounts, names and dates. `ui` contains the language-picker preview; `days` handles its day counts. Do not translate user-entered names or notes.

All previous English patch dictionaries have been merged into `en.js`; there are no translation override blocks in `index.html`. Add new entries to these catalogs and test the actual screen, including save/error/undo states.

Compatibility: existing HTML and render functions still use Egyptian Arabic source labels as lookup keys and fallback text. This migration separates catalogs without rewriting every screen. It does not claim that all legacy rendering has been converted to semantic identifiers, or that previously missing translations have been completed.

The standalone preview embeds these files during packaging so it works offline as one HTML file. Edit the source catalogs, not the preview.
