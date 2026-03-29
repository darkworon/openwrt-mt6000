# Реестр патчей pesa1234 для GL-MT6000

**Источник:** pesa1234/openwrt, ветка `next-r4.8.0.rss.mtk`  
**Дата анализа:** 2026-03-29  
**Статус:** stub-файлы — требуют извлечения из форка pesa1234

## Как применяются

Workflow (`build.yml`) делает `git apply` для каждого `patches/*.patch`.  
Stub-файлы (< 200 байт) пропускаются автоматически — они здесь как placeholder/документация.  
После извлечения реального контента из pesa1234 — заменить соответствующие `.patch` файлы.

## Как извлечь патчи из pesa1234

```bash
git clone --depth=1 --branch next-r4.8.0.rss.mtk https://github.com/pesa1234/openwrt.git pesa1234-openwrt
ls pesa1234-openwrt/target/linux/mediatek/patches-6.12/999-*.patch
# скопировать нужные в patches/
```

---

## 1. Ethernet RSS (Receive Side Scaling) — target/linux/mediatek/patches-6.12/

| Файл | Описание | Статус |
|------|----------|--------|
| `999-2700-dts-mt7986-rss-irq-vectors.patch` | DTS mt7986: RSS IRQ-векторы в ethernet node | stub |
| `999-2701-dts-mt7981-rss-irq-vectors.patch` | DTS mt7981: RSS IRQ-векторы | stub |
| `999-2710-mtk-eth-rss-lro-registers.patch` | mtk_eth_soc: регистры для RSS + LRO | stub |
| `999-2711-mtk-eth-rss-full-implementation.patch` | mtk_eth_soc: полная реализация RSS (468 строк) | stub |
| `999-2716-mtk-eth-cap-bit-u64.patch` | mtk_eth_soc: конвертация cap_bit в u64 | stub |
| `999-2719-napi-poll-weight-256.patch` | NAPI poll weight → 256 (throughput) | stub |
| `999-2725-rx-buffer-length.patch` | Дефолтный rx buffer length увеличен | stub |
| `999-2728-rate-limit-2500mbps.patch` | Поддержка 2500Mbps rate limit | stub |
| `999-9901-rss-fix-mt7986.patch` | Fix RSS для mt7986 (Frank Wunderlich) | stub |
| `999-9902-disable-rss-mt7981.patch` | Disable RSS для mt7981 | stub |
| `999-9903-ethtool-hash-fix.patch` | Fix ethtool hash function | stub |
| `999-9907-net-prefetch-non-pagepool.patch` | net_prefetch на non-pagepool пути | stub |
| `999-9908-jumbo-frames.patch` | Jumbo frame support | stub |
| `999-9909-jumbo-frames-mt7981.patch` | Jumbo frames для mt7981 | stub |
| `999-9910-napi-enable-order.patch` | Fix NAPI enable order | stub |

## 2. WED (Wireless Ethernet Dispatcher) bugfixes

| Файл | Описание | Статус |
|------|----------|--------|
| `999-9911-wed-hwrro-double-free.patch` | WED fix: hwrro double free | stub |
| `999-9912-wed-rx-hang-after-ser.patch` | WED fix: WED1 rx hang after SER | stub |
| `999-9913-wed-ring-cleanup-reinsertion.patch` | WED fix: ring cleanup при реинсерции модуля | stub |
| `999-9914-wed-wdma-double-init.patch` | WED fix: избежание двойной инициализации WDMA | stub |

## 3. Прочие

| Файл | Описание | Статус |
|------|----------|--------|
| `999-9999-usb-power-control.patch` | USB power control | stub |

## 4. mt76 WiFi patches (package/kernel/mt76/patches/)

Эти патчи применяются к пакету mt76, а не к ядру.  
В текущей схеме НЕ применяются через git apply (нужно отдельно).  
Документированы для справки:

| Описание | Статус |
|----------|--------|
| WED TX support (2000-серия) | не применяется |
| HW-ATF для mt7986 (2004-серия) | не применяется |
| iBF/eBF testmode (1010, 1012, 1019) | не применяется |
| Airtime Fairness (2005, 9510, 9512) | не применяется |
| VHT 2.4GHz 256QAM | не применяется |
| WED RX token lookup fix (9602) | не применяется |

## 5. init.d скрипт advanced_setup

**Файл:** `target/linux/mediatek/filogic/base-files/etc/init.d/advanced_setup`  
**Функции:** динамическое IRQ affinity, RPS, WED FLOWOFFLOAD, ATF, USB, HQoS  
**Для GL-MT6000:** отдельная функция `gl_mt6000()` с точными IRQ номерами:  
- eth_rx0=221, rx1=222, rx2=223, rx3=224, tx=229  
- wifi1_irq=237 (WED) / 245 (no WED)  
**Статус:** требует отдельного добавления в rootfs (не через git apply)
