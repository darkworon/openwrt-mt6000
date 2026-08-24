# Lampa plugins

Исходники пользовательского bundle для Lampa хранятся отдельно:

- `adblock/plugin.js` — блокировка preroll и player-banner;
- `torrserver-subtitles/plugin.js` — штатное оформление Lampa для встроенных
  субтитров TorrServer.

Состав и порядок сборки задаёт `bundle.sources.json`. Новый плагин сначала
добавляется отдельным исходником, затем явно включается в этот манифест.

Сборка:

```sh
node lampa-plugins/build.mjs
```

Готовый `l.js` не редактируется вручную. После проверки он зеркалируется в
репозиторий `darkworon/darkworon.github.io` и устанавливается в Lampa по адресу:

```text
https://darkworon.github.io/l.js
```
