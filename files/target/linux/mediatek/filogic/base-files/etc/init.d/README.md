# Overlay files

Place pesa1234 overlay files here to be copied into the OpenWrt tree.

Key file to add:
- `advanced_setup` — init script for IRQ affinity, RPS, WED, ATF, HQoS

## How to extract

```bash
git clone --depth=1 --branch next-r4.8.3.rss.mtk https://github.com/pesa1234/openwrt.git /tmp/pesa1234
cp /tmp/pesa1234/target/linux/mediatek/filogic/base-files/etc/init.d/advanced_setup \
   files/target/linux/mediatek/filogic/base-files/etc/init.d/
```
