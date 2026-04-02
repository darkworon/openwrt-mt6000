# Intentionally excluded patches

Patches from pesa1234 that we deliberately do not apply.
The track-pesa1234.yml workflow will skip these when reporting new/changed patches.

## mt76 patches

| Patch | Reason |
|-------|--------|
| `0018-wifi-mt76-mt7915-update-fix-inconsistent-QoS-mapping-betwee.patch` | Adds `set_qos_map` to `ieee80211_ops` which was removed in kernel 6.12.79. Not needed for home router use. |
