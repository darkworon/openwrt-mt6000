# Excluded kernel patches

Patches listed here are tracked from `pesa1234/openwrt` but deliberately not
applied to the MT6000 build.

## 999-9915-net-ethernet-mtk_eth_soc-improve-non-dsa-tx-queue-selection.patch

Quarantined after the 2026-05-08 update test on GL-MT6000.

Symptoms on the router with this patch applied:

- WAN `eth1` initially negotiated down to 10Mb/s:
  `RTL8221B-VB-CG ... Downshift occurred ... actual speed 10Mbps`.
- Repeated `mtk_soc_eth ... NETDEV WATCHDOG ... transmit queue N timed out`
  events on both `eth1` and `eth0`.
- Manual `ethtool -r eth1` restored the WAN link to 1Gb/s, but watchdog
  events point at the driver TX queue path rather than LuCI/packages/config.

This patch changes non-DSA TX queue selection to hash across TX queues. The
last known-good personal build based on `next-r4.7.1.rss.mtk` did not include
it. Keep it out until the regression is bisected or upstream/pesa confirms a
fix.
