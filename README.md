# OpenWrt для GL-MT6000

Автосборка OpenWrt для роутера GL.iNet MT6000 (MediaTek MT7986A, Filogic 830).

## Основа

- **Upstream:** [pesa1234/openwrt](https://github.com/pesa1234/openwrt) ветка `next-r4.8.0.rss.mtk`
- **Что добавляет pesa1234:** RSS (4 Rx rings), WED hardware offload, ATF, custom IRQ/RPS tuning, WPA3, VHT 2.4GHz 256QAM
- **Что добавляем мы:** DAE (eBPF transparent proxy) kernel params + пакеты

## Что собирается

- `mt6000.diffconfig` — конфиг для GL-MT6000 + DAE kernel параметры
- Прошивка: `openwrt-mediatek-filogic-glinet_gl-mt6000-*.bin`

## Как использовать

Скачать артефакт из последнего успешного CI run → Actions → последний build → Artifacts.

Для прошивки: **Luci → System → Backup/Flash Firmware** или `sysupgrade -v <firmware.bin>`.

## DAE kernel параметры

8 параметров добавлены в `mt6000.diffconfig` (отсутствуют в pesa1234 по умолчанию):
- `CONFIG_CGROUPS=y`, `CONFIG_CGROUP_BPF=y`
- `CONFIG_KPROBES=y`, `CONFIG_KPROBE_EVENTS=y`, `CONFIG_BPF_EVENTS=y`
- `CONFIG_BPF_STREAM_PARSER=y`
- `CONFIG_NET_SCH_INGRESS=m`, `CONFIG_NET_CLS_BPF=m`, `CONFIG_NET_CLS_ACT=y`
- `CONFIG_DEBUG_INFO_BTF=y` (требует `dwarves` в CI — уже добавлен)

## Структура

```
mt6000.diffconfig       — конфигурация сборки
.github/workflows/
  build.yml             — GitHub Actions workflow
```
