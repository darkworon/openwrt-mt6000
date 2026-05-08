# Kernel patches (pesa1234 series)

Patches applied to the active `target/linux/mediatek/patches-*` directory during build.

## Source

Fork of pesa1234/openwrt, branch `next-r4.8.2.rss.mtk`.

## Patch series

### RSS (Receive Side Scaling) — 999-27xx
- `999-2701` — DTS mt7981: RSS IRQ vectors
- `999-2710` — mtk_eth_soc: RSS + LRO registers
- `999-2711` — mtk_eth_soc: full RSS implementation
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

### Quarantined
- `999-9915` — non-DSA Tx queue selection; see `patches/kernel/EXCLUDED.md`

### Misc
- `999-9999` — USB power control

## How to add patches

1. Extract patch from pesa1234/openwrt:
   ```bash
   git clone --depth=1 --branch next-r4.8.2.rss.mtk https://github.com/pesa1234/openwrt.git /tmp/pesa1234
   KERNEL_DIR=$(ls -d /tmp/pesa1234/target/linux/mediatek/patches-* | sort -V | tail -n1)
   cp "$KERNEL_DIR"/999-*.patch patches/kernel/
   ```

2. Commit to this repo — CI will pick them up automatically.
