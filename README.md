# OpenWrt Custom Build for GL-iNet MT6000

Автоматическая сборка OpenWrt для роутера GL-iNet GL-MT6000 (MT7986A / Filogic 830).

## Архитектура

**Upstream:** официальный [openwrt/openwrt](https://github.com/openwrt/openwrt) (ветка main)

Патчи pesa1234 хранятся **в этом репо** как `patches/*.patch` и применяются в CI через `git apply`.  
Это обеспечивает независимость от доступности форка pesa1234: если его ветка исчезнет — наша сборка продолжает работать.

## Структура репо

```
.github/workflows/
  build.yml             — CI: checkout openwrt/openwrt → apply patches → build
config/
  mt6000.diffconfig     — TARGET_mediatek + glinet_gl-mt6000 + пакеты
  dae-kernel.config     — DAE (eBPF) kernel параметры
patches/
  REGISTRY.md           — реестр патчей с описанием
  999-*.patch           — патчи из pesa1234 (stub → заменить реальными)
```

## Что добавляется поверх upstream OpenWrt

### Патчи ядра (из pesa1234/openwrt)

- **RSS (Receive Side Scaling):** 4 Rx rings для ethernet MT7986
- **WED bugfixes:** hwrro double free, rx hang after SER, ring cleanup, WDMA
- **NAPI:** poll weight 256, fix enable order
- **Ethernet:** jumbo frames, rx buffer length, 2500Mbps rate limit
- **Misc:** USB power control

### DAE kernel параметры (config/dae-kernel.config)

Параметры ядра, необходимые для работы [daed](https://github.com/daeuniverse/daed) (eBPF transparent proxy):

| Параметр | Назначение |
|----------|-----------|
| `CONFIG_CGROUPS=y` | cgroups |
| `CONFIG_CGROUP_BPF=y` | BPF attachment к cgroups |
| `CONFIG_KPROBES=y` | kprobes |
| `CONFIG_KPROBE_EVENTS=y` | tracing через kprobes |
| `CONFIG_BPF_EVENTS=y` | BPF tracing events |
| `CONFIG_BPF_STREAM_PARSER=y` | sockmap / sk_skb |
| `CONFIG_NET_SCH_INGRESS=m` | TC ingress |
| `CONFIG_NET_CLS_BPF=m` | BPF classifier |
| `CONFIG_NET_CLS_ACT=y` | TC actions |
| `CONFIG_DEBUG_INFO_BTF=y` | BTF для CO-RE |

## Скачать прошивку

[Actions](../../actions) → последний успешный build → **Artifacts**.

## Прошивка

**LuCI → System → Backup/Flash Firmware** или:
```bash
sysupgrade -v openwrt-mediatek-filogic-glinet_gl-mt6000-*.bin
```

## Добавление реальных патчей

Stub-патчи (`patches/*.patch`) нужно заменить реальным содержимым из pesa1234:

```bash
git clone --depth=1 --branch next-r4.8.0.rss.mtk https://github.com/pesa1234/openwrt.git pesa1234-src
for f in patches/999-*.patch; do
  name=$(basename "$f")
  src="pesa1234-src/target/linux/mediatek/patches-6.12/$name"
  [ -f "$src" ] && cp "$src" "$f" && echo "OK: $name"
done
```

## Credits

- [pesa1234/openwrt](https://github.com/pesa1234/openwrt) — RSS/WED/ATF patches
- [OpenWrt Project](https://openwrt.org)
