# OpenWrt для GL-MT6000

Автосборка OpenWrt для роутера GL.iNet MT6000 (MediaTek MT7986A, Filogic 830).

## Стратегия

- **Upstream:** официальный [openwrt/openwrt](https://github.com/openwrt/openwrt) ветка `main`
- **Патчи:** pesa1234 kernel + mt76 patches в `patches/` — копируются поверх upstream при сборке
- **Overlay files:** `files/` — накладываются на дерево OpenWrt (advanced_setup и др.)
- **Config:** `config/mt6000.diffconfig` — конфиг устройства + DAE kernel параметры

## Структура репо

```
config/
  mt6000.diffconfig       — конфиг сборки (target + DAE params + пакеты)
patches/
  kernel/                 — патчи для target/linux/mediatek/patches-6.12/
    README.md             — список патчей pesa1234 (RSS, WED, jumbo frames)
    *.patch               — сами патчи (добавить из pesa1234/openwrt)
  mt76/                   — патчи для package/kernel/mt76/patches/
    README.md             — список патчей (WED TX, ATF, iBF, VHT 256QAM)
    *.patch               — сами патчи
files/                    — overlay на дерево OpenWrt
  target/linux/mediatek/filogic/base-files/etc/init.d/
    advanced_setup        — IRQ affinity, RPS, WED, ATF (из pesa1234)
.github/workflows/
  build.yml               — GitHub Actions CI
```

## Что даёт pesa1234 (через патчи)

- **RSS** (Receive Side Scaling) — 4 Rx rings, ~30-40% throughput boost
- **WED** (Wireless Ethernet Dispatcher) — hardware WiFi offload
- **HW-ATF** (Airtime Fairness) — fair WiFi scheduling
- **iBF** (Implicit Beamforming) — better WiFi signal adaptation
- **advanced_setup** — автонастройка IRQ affinity, RPS по ядрам для MT6000
- **VHT 256QAM @ 2.4GHz** — максимальная скорость на 2.4GHz

## DAE kernel параметры

8 параметров не включены в upstream OpenWrt по умолчанию — добавлены в `config/mt6000.diffconfig`:
- `CONFIG_CGROUPS=y`, `CONFIG_CGROUP_BPF=y`
- `CONFIG_KPROBES=y`, `CONFIG_KPROBE_EVENTS=y`, `CONFIG_BPF_EVENTS=y`
- `CONFIG_BPF_STREAM_PARSER=y`
- `CONFIG_NET_SCH_INGRESS=m`, `CONFIG_NET_CLS_BPF=m`, `CONFIG_NET_CLS_ACT=y`
- `CONFIG_DEBUG_INFO_BTF=y` (требует `dwarves` — добавлен в CI)

## Как добавить патчи

```bash
# Клонировать pesa1234
git clone --depth=1 --branch next-r4.8.0.rss.mtk https://github.com/pesa1234/openwrt.git pesa1234

# Kernel patches
cp pesa1234/target/linux/mediatek/patches-6.12/999-*.patch patches/kernel/

# mt76 patches
cp pesa1234/package/kernel/mt76/patches/*.patch patches/mt76/

# advanced_setup overlay
cp pesa1234/target/linux/mediatek/filogic/base-files/etc/init.d/advanced_setup \
   files/target/linux/mediatek/filogic/base-files/etc/init.d/

git add patches/ files/
git commit -m "feat: add pesa1234 patches"
git push
```

## CI

Actions → [Build OpenWrt for GL-MT6000](../../actions/workflows/build.yml)

Артефакт доступен в Actions после сборки (~2-3 часа). Прошивать через LuCI → System → Flash Firmware.
