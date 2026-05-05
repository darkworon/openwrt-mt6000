# openwrt-mt6000

Автономная CI/CD система для сборки OpenWrt под **GL-iNet GL-MT6000** (Flint 2).

## Зачем это нужно

[pesa1234](https://github.com/pesa1234) поддерживает форк OpenWrt с кастомными патчами для MT6000 (RSS, WED, ATF). Это лучшая прошивка для Flint 2, но зависеть от одного человека рискованно — если он уйдёт, патчи устареют.

**Цель:** независимая воспроизводимая сборка. Мы "воруем" наработки pesa1234 в виде патчей, храним у себя и собираем на официальном `openwrt/openwrt` upstream. Если pesa1234 исчезнет — у нас есть всё для продолжения.

---

## Архитектура репозиториев

```
darkworon/openwrt-mt6000          ← этот репо (ПРИВАТНЫЙ)
  │  исходники: патчи, конфиги, overlay, CI
  │
  ├─ feeds используют:
  │    darkworon/packages          ← форк pesa1234/packages (ветка next-r4.mtk)
  │    darkworon/luci              ← форк pesa1234/luci (ветка next-v4)
  │
  └─ CI публикует в:
       darkworon/openwrt-mt6000-releases  ← (ПУБЛИЧНЫЙ)
         ├─ GitHub Releases: прошивка .bin + пакеты .tar.gz (5 последних)
         └─ GitHub Pages: APK index.json (ссылки на Release assets)
```

### Почему releases репо публичный

GitHub Pages работает только на публичных репо (Free plan). Прошивка для конкретного железа — не секрет. Исходники (патчи, конфиги) — в приватном репо.

---

## Что внутри прошивки

### Патчи ядра (`patches/kernel/` — серия 999-*)

Кастомные патчи pesa1234 поверх официального OpenWrt kernel 6.18:

| Группа | Патчи | Эффект |
|--------|-------|--------|
| RSS (Receive Side Scaling) | 999-2701..2728, 999-9901..9910 | +30-40% ethernet throughput, 4 Rx rings |
| WED bugfixes | 999-9911..9915 | Hardware WiFi offload стабильность |
| NAPI/misc | 999-9907..9910 | Jumbo frames, NAPI poll weight, buffer tuning |
| USB | 999-9999 | USB power control |

### Патчи WiFi (`patches/mt76/` — 93 upstream-патча + 1 local compat)

- **WED TX support** — hardware WiFi offload
- **HW-ATF** — Airtime Fairness через железо
- **iBF/eBF beamforming** — направленный сигнал
- **VHT 256QAM на 2.4GHz** — повышенная скорость
- **WED/CSI/vendor fixes** — различные исправления

### Overlay (`files/`)

**`advanced_setup`** — init-скрипт (START=99), не существует в upstream:
- IRQ affinity по ядрам CPU
- RPS (Receive Packet Steering)
- WED hardware offload (iptables FLOWOFFLOAD --hw)
- ATF/HW-ATF (Airtime Fairness)
- USB speed/power control

**`etc/hotplug.d/ntp/25-zerotier`** — hotfix для роутера без RTC:
- после первого валидного NTP sync за boot один раз перезапускает ZeroTier;
- повторные NTP `stratum` events игнорирует через `/var/state/zerotier-ntp-restarted`;
- предотвращает постоянный flap `zt0` и firewall reload, которые роняют dae-routed client traffic.

### Конфиг (`config/`)

**`mt6000.diffconfig`:**
- Target: `mediatek/filogic`, device: `glinet_gl-mt6000`
- Пакеты: `dae`, `adguardhome`, `zerotier-one`, `kmod-nft-offload`

**`dae-kernel.config`** — параметры ядра для DAE (eBPF transparent proxy):
```
CONFIG_CGROUPS=y, CONFIG_KPROBES=y, CONFIG_DEBUG_INFO_BTF=y,
CONFIG_BPF_STREAM_PARSER=y, CONFIG_NET_SCH_INGRESS=m,
CONFIG_NET_CLS_BPF=m, CONFIG_NET_CLS_ACT=y, CONFIG_BPF_EVENTS=y
```

---

## CI/CD Pipeline

### Расписание

| Workflow | Триггер | Что делает |
|----------|---------|------------|
| `validate.yml` | Push в patches/ | Быстрая валидация патчей (~20-40 мин), уведомление в Telegram при ошибке |
| `track-pesa1234.yml` | Вс + Ср 04:00 UTC, ручной | Проверяет обновления у pesa1234, создаёт Issue (пропускает EXCLUDED.md) |
| `build.yml` | Пт 05:00 UTC, push в patches/config/files, ручной | Полная сборка и публикация |

### Как работает сборка (build.yml)

```
1. Клонировать openwrt/openwrt:main (официальный upstream)
2. Скопировать patches/kernel/*.patch → актуальный target/linux/mediatek/patches-*/
3. Скопировать patches/mt76/*.patch и patches/mt76-local/*.patch → package/kernel/mt76/patches/
4. Скопировать files/ → openwrt/ (advanced_setup и др.)
5. feeds.conf → darkworon/packages:next-r4.mtk + darkworon/luci:next-v4
6. make defconfig + проверка DAE параметров
7. make tools + toolchain + target + packages + image
8. Smoke test: firmware > 10MB, dae + zerotier в manifest
9. Публикация Release в openwrt-mt6000-releases (прошивка + пакеты)
10. Обновление APK index.json на GitHub Pages
11. Ротация: оставить 5 последних релизов и Pages entries
12. Telegram уведомление (✅/❌ + ссылка на release)
```

### Как работает трекинг (track-pesa1234.yml)

```
1. Найти последнюю ветку next-r4.*.rss.mtk у pesa1234 (динамически)
2. Сравнить с .pesa1234-branch (что мы отслеживаем сейчас)
3. Клонировать pesa1234/openwrt (актуальная ветка)
4. Сравнить patches/kernel/ с pesa1234 999-* патчами
5. Сравнить patches/mt76/ с pesa1234/openwrt package/kernel/mt76/patches/
6. Сравнить feeds.conf.default
7. Если есть delta → создать GitHub Issue с описанием и командами для обновления
```

---

## APK совместимость

**Ключевое правило:** `kmod-*` пакеты привязаны к точному `vermagic` ядра (хеш конфига сборки). Пакеты от одного билда несовместимы с прошивкой другого билда.

**Как мы решаем:**
- `CONFIG_VERSION_REPO` зашивается в прошивку при сборке
- Роутер с этой прошивкой автоматически обращается к APK репо **своего** билда
- URL формат: `https://darkworon.github.io/openwrt-mt6000-releases/packages/{build-tag}/`
- После sysupgrade: новая прошивка несёт новый URL

**Ротация:** храним 5 последних билдов. Кто не обновлялся > 5 недель — теряет совместимый APK репо (нормально для snapshot-сборок).

---

## Secrets (в darkworon/openwrt-mt6000)

| Secret | Описание |
|--------|----------|
| `TG_BOT_TOKEN` | @jarvis_vetva_bot токен — уведомления о билде |
| `RELEASES_TOKEN` | GitHub PAT — для пуша в openwrt-mt6000-releases |

---

## Как обновить патчи вручную

При появлении Issue от track workflow:

```bash
# 1. Найти актуальную ветку
BRANCH=$(gh api "repos/pesa1234/openwrt/branches?per_page=100" \
  --jq '[.[].name | select(test("next-r[0-9]+\\.[0-9]+\\.[0-9]+\\.rss\\.mtk"))] | sort | last')

# 2. Клонировать
git clone --depth=1 --branch $BRANCH https://github.com/pesa1234/openwrt.git /tmp/pesa1234

# 3. Обновить патчи
KERNEL_DIR=$(ls -d /tmp/pesa1234/target/linux/mediatek/patches-* | sort -V | tail -n1)
rm -f patches/kernel/*.patch patches/mt76/*.patch
cp "$KERNEL_DIR"/999-*.patch patches/kernel/
for f in /tmp/pesa1234/package/kernel/mt76/patches/*.patch; do
  name=$(basename "$f")
  grep -Fq "$name" patches/mt76/EXCLUDED.md && continue
  cp "$f" patches/mt76/
done
cp /tmp/pesa1234/target/linux/mediatek/filogic/base-files/etc/init.d/advanced_setup \
   files/target/linux/mediatek/filogic/base-files/etc/init.d/advanced_setup
cp /tmp/pesa1234/package/kernel/mt76/Makefile \
   files/package/kernel/mt76/Makefile

# 4. Обновить tracked branch
echo "$BRANCH" > .pesa1234-branch

# 5. Коммит
git add patches/ files/ .pesa1234-branch
git commit -m "chore: sync patches from pesa1234 $BRANCH $(date +%Y-%m-%d)"
git push
```

---

## Как установить прошивку

1. Скачать из [Releases](https://github.com/darkworon/openwrt-mt6000-releases/releases) → `*-squashfs-sysupgrade.bin`
2. **LuCI:** System → Backup/Flash Firmware → Flash image → выбрать `.bin`
3. **SSH:** `scp firmware.bin root@192.168.1.1:/tmp/ && ssh root@192.168.1.1 "sysupgrade /tmp/firmware.bin"`
4. Проверить sha256: `sha256sum firmware.bin` → сверить с `sha256sums` в assets

---

## Bootstrap с нуля (если нужно пересоздать)

```bash
# 1. Создать приватный репо openwrt-mt6000
gh repo create darkworon/openwrt-mt6000 --private

# 2. Создать публичный репо releases
gh repo create darkworon/openwrt-mt6000-releases --public

# 3. Включить Pages в releases репо (gh-pages ветка)
gh api repos/darkworon/openwrt-mt6000-releases/pages -X POST \
  --input - <<< '{"source":{"branch":"gh-pages","path":"/"}}'

# 4. Убедиться что есть форки packages и luci
# darkworon/packages (fork pesa1234/packages, ветка next-r4.mtk)
# darkworon/luci (fork pesa1234/luci, ветка next-v4)

# 5. Установить секреты
gh secret set TG_BOT_TOKEN --repo darkworon/openwrt-mt6000 --body "<token>"
gh secret set RELEASES_TOKEN --repo darkworon/openwrt-mt6000 --body "<github-pat>"

# 6. Запустить первый билд
gh workflow run build.yml --repo darkworon/openwrt-mt6000
```

---

## Техдолг

| ID | Описание | Приоритет |
|----|----------|-----------|
| TD-001 | Выделить отдельного Telegram бота для build уведомлений (сейчас @jarvis_vetva_bot) | Low |
| TD-002 | Зашить `CONFIG_VERSION_REPO` в `mt6000.diffconfig` (сейчас APK URL только в release notes) | Medium |
| TD-003 | Автоматизировать смену ветки `darkworon/openwrt` в sync-forks.yml при появлении новой `next-r*.rss.mtk` | Medium |

---

## Связанные репозитории

| Репо | Роль |
|------|------|
| [openwrt/openwrt](https://github.com/openwrt/openwrt) | Официальный upstream (клонируется при каждом билде) |
| [pesa1234/openwrt](https://github.com/pesa1234/openwrt) | Источник патчей (отслеживается, не используется напрямую) |
| [pesa1234/mt76](https://github.com/pesa1234/mt76) | Источник WiFi патчей (отслеживается) |
| [darkworon/packages](https://github.com/darkworon/packages) | Наш форк feeds/packages |
| [darkworon/luci](https://github.com/darkworon/luci) | Наш форк feeds/luci |
| [darkworon/openwrt-mt6000-immortalwrt-packages](https://github.com/darkworon/openwrt-mt6000-immortalwrt-packages) | Форк immortalwrt/packages — содержит пакет `dae` |
| [darkworon/openwrt-mt6000-luci-app-dae](https://github.com/darkworon/openwrt-mt6000-luci-app-dae) | Форк sbwml/luci-app-dae — LuCI интерфейс для dae |
| [darkworon/openwrt-mt6000-releases](https://github.com/darkworon/openwrt-mt6000-releases) | Прошивки и APK repo |

*Последнее обновление: 2026-04-03*
