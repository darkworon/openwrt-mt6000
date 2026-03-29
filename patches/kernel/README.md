# Kernel patches (pesa1234 series)

Patches applied to `target/linux/mediatek/patches-6.12/` during build.

## Source

Fork of pesa1234/openwrt, branch `next-r4.8.0.rss.mtk`.

## Patch series

### RSS (Receive Side Scaling) — 999-27xx
- `999-2700` — DTS mt7986: RSS IRQ vectors in ethernet node
- `999-2701` — DTS mt7981: RSS IRQ vectors
- `999-2710` — mtk_eth_soc: RSS + LRO registers
- `999-2711` — mtk_eth_soc: full RSS implementation
- `999-2716` — mtk_eth_soc: cap_bit → u64
- `999-2719` — NAPI poll weight → 256 (peak throughput)
- `999-2725` — default rx buffer length increase
- `999-2728` — 2500Mbps rate limit support

### RSS fixes — 999-99xx
- `999-9901` — Fix RSS for mt7986 (Frank Wunderlich)
- `999-9902` — Disable RSS for mt7981 (different chipset)
- `999-9903` — Fix ethtool hash function
- `999-9907` — net_prefetch on non-pagepool path
- `999-9908` — Jumbo frame support
- `999-9909` — Jumbo frames for mt7981
- `999-9910` — Fix NAPI enable order

### WED fixes — 999-991x
- `999-9911` — WED: hwrro double free
- `999-9912` — WED: WED1 rx hang after SER
- `999-9913` — WED: ring cleanup on module reinsertion
- `999-9914` — WED: avoid double WDMA init

### Misc
- `999-9999` — USB power control

## How to add patches

1. Extract patch from pesa1234/openwrt:
   ```bash
   git clone --depth=1 --branch next-r4.8.0.rss.mtk https://github.com/pesa1234/openwrt.git
   cp pesa1234/openwrt/target/linux/mediatek/patches-6.12/999-*.patch patches/kernel/
   ```

2. Commit to this repo — CI will pick them up automatically.
