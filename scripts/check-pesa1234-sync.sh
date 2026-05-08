#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PESA_OPENWRT_URL="${PESA_OPENWRT_URL:-https://github.com/pesa1234/openwrt.git}"
PESA_PACKAGES_URL="${PESA_PACKAGES_URL:-https://github.com/pesa1234/packages.git}"
PESA_LUCI_URL="${PESA_LUCI_URL:-https://github.com/pesa1234/luci.git}"
OUR_PACKAGES_URL="${OUR_PACKAGES_URL:-https://github.com/darkworon/openwrt-mt6000-packages.git}"
OUR_LUCI_URL="${OUR_LUCI_URL:-https://github.com/darkworon/openwrt-mt6000-luci.git}"
PACKAGES_BRANCH="${PACKAGES_BRANCH:-next-r4.mtk}"
LUCI_BRANCH="${LUCI_BRANCH:-next-v4}"

fail=0

mark_fail() {
  echo "FAIL: $*"
  fail=1
}

latest_pesa_branch() {
  git ls-remote --heads "$PESA_OPENWRT_URL" 'refs/heads/next-r*.rss.mtk' |
    awk -F/ '{print $NF}' |
    sort -V |
    tail -n1
}

check_feed_ref() {
  local name="$1"
  local fork_url="$2"
  local upstream_url="$3"
  local branch="$4"
  local fork_sha upstream_sha

  fork_sha="$(git ls-remote "$fork_url" "refs/heads/$branch" | awk '{print $1}')"
  upstream_sha="$(git ls-remote "$upstream_url" "refs/heads/$branch" | awk '{print $1}')"

  if [ -z "$fork_sha" ] || [ -z "$upstream_sha" ]; then
    mark_fail "$name: unable to resolve $branch"
    return
  fi

  if [ "$fork_sha" != "$upstream_sha" ]; then
    mark_fail "$name fork is not synced with upstream"
    echo "  fork:     $fork_sha $fork_url $branch"
    echo "  upstream: $upstream_sha $upstream_url $branch"
  else
    echo "OK: $name $branch @ $fork_sha"
  fi
}

compare_dirs() {
  local label="$1"
  local ours="$2"
  local upstream="$3"
  local diff_file="$4"

  if ! diff -qr "$ours" "$upstream" > "$diff_file"; then
    mark_fail "$label differs from pesa1234"
    sed -n '1,120p' "$diff_file"
  else
    echo "OK: $label"
  fi
}

compare_file() {
  local label="$1"
  local ours="$2"
  local upstream="$3"

  if [ ! -f "$ours" ]; then
    mark_fail "$label missing locally"
  elif ! cmp -s "$ours" "$upstream"; then
    mark_fail "$label differs from pesa1234"
  else
    echo "OK: $label"
  fi
}

kernel_patch_excluded() {
  local name="$1"
  [ -f patches/kernel/EXCLUDED.md ] && grep -Fq -- "$name" patches/kernel/EXCLUDED.md
}

cd "$ROOT"

latest_branch="$(latest_pesa_branch)"
tracked_branch="$(cat .pesa1234-branch 2>/dev/null || true)"

if [ -z "$latest_branch" ]; then
  mark_fail "unable to resolve latest pesa1234 next-r*.rss.mtk branch"
elif [ "$tracked_branch" != "$latest_branch" ]; then
  mark_fail ".pesa1234-branch is $tracked_branch, latest is $latest_branch"
else
  echo "OK: tracked pesa1234/openwrt branch $tracked_branch"
fi

check_feed_ref packages "$OUR_PACKAGES_URL" "$PESA_PACKAGES_URL" "$PACKAGES_BRANCH"
check_feed_ref luci "$OUR_LUCI_URL" "$PESA_LUCI_URL" "$LUCI_BRANCH"

tmp_root="$(mktemp -d)"
trap 'rm -rf "$tmp_root"' EXIT

if [ -n "$latest_branch" ]; then
  git clone --depth=1 --branch "$latest_branch" "$PESA_OPENWRT_URL" "$tmp_root/pesa-openwrt" >/dev/null

  kernel_dir="$(find "$tmp_root/pesa-openwrt/target/linux/mediatek" -maxdepth 1 -type d -name 'patches-*' | sort -V | tail -n1)"
  mkdir -p "$tmp_root/pesa-kernel" "$tmp_root/our-kernel" "$tmp_root/pesa-mt76" "$tmp_root/our-mt76"
  for patch in "$kernel_dir"/999-*.patch; do
    name="$(basename "$patch")"
    if kernel_patch_excluded "$name"; then
      echo "OK: kernel patch excluded by policy: $name"
      continue
    fi
    cp "$patch" "$tmp_root/pesa-kernel/"
  done
  cp patches/kernel/*.patch "$tmp_root/our-kernel/"
  rm -f "$tmp_root/our-kernel/EXCLUDED.md"

  for patch in "$tmp_root/pesa-openwrt"/package/kernel/mt76/patches/*.patch; do
    name="$(basename "$patch")"
    if grep -Fq -- "$name" patches/mt76/EXCLUDED.md; then
      echo "OK: mt76 excluded by policy: $name"
      continue
    fi
    cp "$patch" "$tmp_root/pesa-mt76/"
  done
  cp patches/mt76/*.patch "$tmp_root/our-mt76/"

  compare_dirs "kernel patches" "$tmp_root/our-kernel" "$tmp_root/pesa-kernel" "$tmp_root/kernel.diff"
  compare_dirs "mt76 patches" "$tmp_root/our-mt76" "$tmp_root/pesa-mt76" "$tmp_root/mt76.diff"

  compare_file \
    advanced_setup \
    files/target/linux/mediatek/filogic/base-files/etc/init.d/advanced_setup \
    "$tmp_root/pesa-openwrt/target/linux/mediatek/filogic/base-files/etc/init.d/advanced_setup"

  compare_file \
    package/kernel/mt76/Makefile \
    files/package/kernel/mt76/Makefile \
    "$tmp_root/pesa-openwrt/package/kernel/mt76/Makefile"

  echo "OK: local mt76 compat patches are outside pesa sync: $(find patches/mt76-local -maxdepth 1 -name '*.patch' | wc -l | tr -d ' ')"
fi

exit "$fail"
