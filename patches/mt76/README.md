# mt76 patches (pesa1234 series)

Patches applied to `package/kernel/mt76/patches/` during build.

## Source

Fork of pesa1234/openwrt. mt76 patches live in `package/kernel/mt76/patches/`.

## Patch series

### WED TX support — 2000-*
- WED TX hardware offload for mt7915

### HW-ATF (Airtime Fairness) — 2004-*
- HW ATF support for mt7986
- MCU_EXT_CMD_SET_FEATURE_CTRL, VOW commands, debugfs vow node

### Misc ATF — 2005-*, 9510-*, 9512-*
- Conditionally hide airtime fairness
- Get airtime from MCU
- Airtime filter for spike

### iBF (Implicit Beamforming) — 1010-*, 1012-*, 1019-*
- testmode iBF command mode support
- iBF/eBF cal and cert commands
- ibf control vendor cmd

### VHT 2.4GHz 256QAM
- `0000_100-enable-vht-2g-qam256.patch`

### WED RX fix
- `9602-*` — WED find rx token by physical address

## How to add patches

```bash
git clone --depth=1 --branch next-r4.8.0.rss.mtk https://github.com/pesa1234/openwrt.git
cp pesa1234/openwrt/package/kernel/mt76/patches/*.patch patches/mt76/
```
