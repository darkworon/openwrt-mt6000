# Реестр патчей pesa1234 для GL-MT6000

**Источник:** `pesa1234/openwrt`, ветка `next-r4.8.2.rss.mtk`

**Дата синхронизации:** 2026-05-05

**Статус:** реальные патчи лежат в `patches/kernel/` и `patches/mt76/`; старые root-level stub-файлы удалены.

## Как применяются

- `patches/kernel/*.patch` копируются в актуальный `target/linux/mediatek/patches-*` каталог OpenWrt.
- `patches/mt76/*.patch` и `patches/mt76-local/*.patch` копируются в `package/kernel/mt76/patches/`.
- `files/` копируется поверх дерева OpenWrt как overlay.
- `patches/mt76/EXCLUDED.md` хранит патчи pesa1234, которые намеренно не применяются.

## Kernel 999-серия

| Файл | Назначение |
|------|------------|
| `999-2701-arm64-dts-mt7981-add-rss-irqs.patch` | RSS IRQ vectors для mt7981 |
| `999-2710-net-ethernet-mtk_eth_soc-add-rss-lro-reg.patch` | RSS/LRO регистры |
| `999-2711-net-ethernet-mtk_eth_soc-add-rss-support.patch` | Основная реализация RSS |
| `999-2719-net-ethernet-mtk_eth_soc-change-napi-poll-weight.patch` | NAPI poll weight 256 |
| `999-2725-net-ethernet-mtk_eth_soc-change-default-rx-buffer-length.patch` | Увеличенный rx buffer length |
| `999-2728-net-ethernet-mtk_eth_soc-add-2500Mbps-maximum-rate-limit.patch` | 2500Mbps rate limit |
| `999-9901-fix-RSS-mt7986.patch` | RSS fix для mt7986 |
| `999-9902-disable-RSS-mt7981.patch` | Disable RSS для mt7981 |
| `999-9903-fix-ethtool-hash-function.patch` | ethtool hash function fix |
| `999-9907-2-mtk-use-net_prefetch-for-non-pagepool-path.patch` | net_prefetch для non-pagepool path |
| `999-9908-add-jumboframe-support.patch` | Jumbo frame support |
| `999-9909-enable-jumboframe-mt7981.patch` | Jumbo frames для mt7981 |
| `999-9910-net-ethernet-mtk_eth_soc-fix-napi-enable-order.patch` | NAPI enable order fix |
| `999-9911-net-ethernet-mtk_wed-fix-hwrro-double-free.patch` | WED HWRRO double-free fix |
| `999-9912-net-ethernet-mtk_wed-fix-wed1-rx-hang-after-ser.patch` | WED1 RX hang after SER fix |
| `999-9913-net-ethernet-mtk_wed-fix-ring-cleanup-on-module-reinsert.patch` | Ring cleanup при реинсерции модуля |
| `999-9914-net-ethernet-mtk_wed-avoid-wdma-double-init.patch` | Защита от двойной WDMA init |
| `999-9915-net-ethernet-mtk_eth_soc-improve-non-dsa-tx-queue-selection.patch` | Non-DSA TX queue selection |
| `999-9999-usb-power-control.patch` | USB power control |

## mt76

`patches/mt76/` содержит 93 применяемых патча из `pesa1234/openwrt/package/kernel/mt76/patches/`.
Патч `0018-*set_qos_map*` исключен через `patches/mt76/EXCLUDED.md`; вместо него `patches/mt76-local/0018-compat-*` оставляет только enum, который нужен последующим upstream-патчам как контекст.
`patches/mt76-local/9999-99-compat-*` адаптирует стек mt76 к текущему OpenWrt/mac80211 6.18.26 без патчей mac80211.

## Обновление

```bash
BRANCH=next-r4.8.2.rss.mtk
git clone --depth=1 --branch "$BRANCH" https://github.com/pesa1234/openwrt.git /tmp/pesa1234
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
cp /tmp/pesa1234/package/kernel/mt76/Makefile files/package/kernel/mt76/Makefile
echo "$BRANCH" > .pesa1234-branch
```
