# Intentionally excluded patches

Patches from pesa1234 that we deliberately do not apply.
The track-pesa1234.yml workflow will skip these when reporting new/changed patches.

`patches/mt76-local/0018-compat-*` keeps only the `MCU_EXT_CMD_SET_QOS_MAP`
enum needed by later upstream patches; it does not add the removed mac80211 op.

## mt76 patches

| Patch | Reason |
|-------|--------|
| `0018-wifi-mt76-mt7915-update-fix-inconsistent-QoS-mapping-betwee.patch` | Adds `set_qos_map` to `ieee80211_ops`; current OpenWrt/mac80211 no longer exposes that op. Not needed for home router use. |
