# openwrt-mt6000

Custom OpenWrt build for **GL-iNet GL-MT6000** (Flint 2) с RSS, WED, DAE поддержкой.

## Цель

Независимая воспроизводимая сборка OpenWrt для GL-MT6000 на случай если форк pesa1234 перестанет поддерживаться.

Стратегия: **официальный openwrt/openwrt upstream** + патчи из pesa1234 как отдельный слой.

---

## Что внутри

### Патчи (`patches/`)

#### `patches/kernel/` — патчи ядра (серия 999-*)

Кастомные патчи pesa1234 поверх официального OpenWrt kernel 6.12:

| Патч | Описание |
|------|----------|
| `999-2700` | DTS mt7986: RSS IRQ-векторы в ethernet node |
| `999-2701` | DTS mt7981: RSS IRQ-векторы |
| `999-2710` | `mtk_eth_soc`: регистры RSS + LRO |
| `999-2711` | `mtk_eth_soc`: полная реализация RSS (Receive Side Scaling) — 4 Rx rings, +30-40% ethernet throughput |
| `999-2716` | `mtk_eth_soc`: конвертация cap_bit → u64 |
| `999-2719` | NAPI poll weight → 256 (влияет на peak throughput SW path) |
| `999-2725` | Увеличен дефолтный rx buffer length |
| `999-2728` | Поддержка 2500Mbps rate limit |
| `999-9901` | Fix RSS для mt7986 (Frank Wunderlich) |
| `999-9902` | Disable RSS для mt7981 (другой chipset) |
| `999-9903` | Fix ethtool hash function |
| `999-9907` | `net_prefetch` для non-pagepool пути |
| `999-9908` | Jumbo frame support |
| `999-9909` | Jumbo frames для mt7981 |
| `999-9910` | Fix NAPI enable order |
| `999-9911` | WED fix: hwrro double free |
| `999-9912` | WED fix: WED1 rx hang after SER |
| `999-9913` | WED fix: ring cleanup при реинсерции модуля |
| `999-9914` | WED fix: избежание двойной инициализации WDMA |
| `999-9999` | USB power control |

#### `patches/mt76/` — патчи WiFi драйвера mt76 (~93 патча)

- **WED TX support** (`2000-*`) — hardware WiFi offload
- **HW-ATF для mt7986** (`2004-*`) — Airtime Fairness через железо
- **iBF/eBF beamforming** (`1010-*`, `1012-*`, `1019-*`)
- **VHT 2.4GHz 256QAM** (`0000_100-*`) — увеличенная скорость на 2.4GHz
- **CSI support, air monitor, vendor commands** (`1001-*`, `1002-*`, `1014-*`)
- **WED RX token lookup fix** (`9602-*`)
- **Airtime fairness улучшения** (`9510-*`, `9512-*`)

### Overlay (`files/`)

#### `files/target/linux/mediatek/filogic/base-files/etc/init.d/advanced_setup`

Кастомный init-скрипт pesa1234 (START=99), не существует в upstream OpenWrt. При старте:
- Динамическое распределение **IRQ affinity** по ядрам CPU
- **RPS** (Receive Packet Steering)
- **WED hardware offload** (iptables FLOWOFFLOAD --hw)
- **ATF / HW-ATF** (Airtime Fairness)
- USB speed/power control
- **HQoS** (mtkhnat)

### Конфиг (`config/`)

#### `config/mt6000.diffconfig`

Минимальный diffconfig для GL-MT6000:
- `TARGET_mediatek`, `SUBTARGET_filogic`
- `TARGET_DEVICE_glinet_gl-mt6000`
- Пакеты: `dae`, `adguardhome`, `zerotier`, `kmod-nft-offload`

#### `config/dae-kernel.config`

Дополнительные kernel параметры для DAE (eBPF-based transparent proxy):
```
CONFIG_CGROUPS=y
CONFIG_KPROBES=y
CONFIG_DEBUG_INFO_BTF=y
CONFIG_BPF_STREAM_PARSER=y
CONFIG_NET_SCH_INGRESS=m
CONFIG_NET_CLS_BPF=m
CONFIG_NET_CLS_ACT=y
CONFIG_BPF_EVENTS=y
```

---

## CI/CD

### Расписание

| Workflow | Когда | Что делает |
|----------|-------|------------|
| `track-pesa1234.yml` | Вс + Ср 04:00 UTC | Сравнивает патчи с pesa1234, создаёт Issue если есть новые/изменённые/удалённые |
| `build.yml` | Пт 05:00 UTC | Полная сборка, создаёт GitHub Release с прошивкой |

### Как работает сборка (`build.yml`)

```
1. Клонировать openwrt/openwrt:main (официальный upstream)
2. Скопировать patches/kernel/*.patch → openwrt/target/linux/mediatek/patches-6.12/
3. Скопировать patches/mt76/*.patch → openwrt/package/kernel/mt76/patches/
4. Скопировать files/ → openwrt/ (advanced_setup и др.)
5. Скопировать config/mt6000.diffconfig → openwrt/.config
6. Вписать config/dae-kernel.config в openwrt/target/.../config-6.12
7. Обновить feeds (стандартные openwrt feeds)
8. make defconfig + make -j$(nproc)
9. Создать GitHub Release с прошивкой
```

### Как работает трекинг (`track-pesa1234.yml`)

```
1. Клонировать pesa1234/openwrt:next-r4.8.0.rss.mtk
2. Клонировать pesa1234/mt76
3. Сравнить patches/kernel/ с pesa1234/target/linux/mediatek/patches-6.12/999-*.patch
4. Сравнить patches/mt76/ с pesa1234/package/kernel/mt76/patches/
5. Если есть delta → создать GitHub Issue с подробным diff
```

---

## Как обновить патчи вручную

При появлении новых патчей у pesa1234 (track workflow создаст Issue):

```bash
# Клонировать pesa1234
git clone --depth=1 --branch next-r4.8.0.rss.mtk https://github.com/pesa1234/openwrt.git /tmp/pesa1234
git clone --depth=1 https://github.com/pesa1234/mt76.git /tmp/pesa1234-mt76

# Обновить kernel патчи (только серия 999-*)
cp /tmp/pesa1234/target/linux/mediatek/patches-6.12/999-*.patch patches/kernel/

# Обновить mt76 патчи
cp /tmp/pesa1234-mt76/patches/*.patch patches/mt76/

# Обновить advanced_setup
cp /tmp/pesa1234/target/linux/mediatek/filogic/base-files/etc/init.d/advanced_setup \
   files/target/linux/mediatek/filogic/base-files/etc/init.d/advanced_setup

# Закоммитить
git add patches/ files/
git commit -m "chore: sync patches from pesa1234 $(date +%Y-%m-%d)"
git push
```

---

## Как установить прошивку

1. Скачать последний release: https://github.com/darkworon/openwrt-mt6000/releases
2. Файл: `openwrt-mediatek-filogic-glinet_gl-mt6000-squashfs-sysupgrade.bin`
3. Через LuCI: System → Backup/Flash Firmware → Flash image
4. Или через SSH: `scp firmware.bin root@192.168.1.1:/tmp/ && ssh root@192.168.1.1 "sysupgrade /tmp/firmware.bin"`

---

## Зависимость от pesa1234

Репо отслеживает ветку `next-r4.8.0.rss.mtk`:
- `pesa1234/openwrt` — kernel + DTS патчи, advanced_setup
- `pesa1234/mt76` — WiFi драйвер патчи

Если pesa1234 перестанет обновляться:
- Текущие патчи продолжат работать с близкими версиями upstream
- При мажорном обновлении ядра (6.12 → 6.13+) может потребоваться ручная адаптация патчей
- Серия `999-*` — кастомный код, в upstream не принят
- mt76 патчи частично попадают в upstream со временем

---

*Последнее обновление: 2026-04-01*
