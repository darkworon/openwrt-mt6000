#!/usr/bin/env bash
set -euo pipefail

mode="${1:-image}"
case "$mode" in
  package|image)
    ;;
  *)
    echo "usage: $0 [package|image]" >&2
    exit 1
    ;;
esac

repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
workdir="${WORKDIR:-$repo_dir/.work}"
openwrt_dir="${OPENWRT_DIR:-$workdir/openwrt}"
openwrt_dae_dir="${OPENWRT_DAE_DIR:-$workdir/openwrt-dae}"
luci_app_dae_dir="${LUCI_APP_DAE_DIR:-$workdir/luci-app-dae}"

openwrt_repo="${OPENWRT_REPO:-https://github.com/openwrt/openwrt.git}"
openwrt_ref="${OPENWRT_REF:-main}"
openwrt_dae_repo="${OPENWRT_DAE_REPO:-https://github.com/darkworon/openwrt-dae.git}"
openwrt_dae_ref="${OPENWRT_DAE_REF:-main}"
luci_app_dae_repo="${LUCI_APP_DAE_REPO:-https://github.com/darkworon/openwrt-mt6000-luci-app-dae.git}"
luci_app_dae_ref="${LUCI_APP_DAE_REF:-main}"

dae_source_url="${DAE_SOURCE_URL:-https://github.com/daeuniverse/dae.git}"
dae_source_ref="${DAE_SOURCE_REF:-main}"
jobs="${JOBS:-$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 2)}"
ccache_dir="${CCACHE_DIR:-$workdir/ccache}"

log() {
  printf '==> %s\n' "$*" >&2
}

clone_or_update() {
  local repo=$1
  local ref=$2
  local dir=$3

  if [[ ! -d "$dir/.git" ]]; then
    rm -rf "$dir"
    git clone --depth=1 --branch "$ref" "$repo" "$dir"
  else
    git -C "$dir" fetch --depth=1 origin "$ref"
    git -C "$dir" reset --hard FETCH_HEAD
    git -C "$dir" clean -ffd
  fi
}

resolve_dae_source_version() {
  if [[ -n "${DAE_SOURCE_VERSION:-}" && "${DAE_SOURCE_VERSION}" != "latest" ]]; then
    log "Using pinned dae source: $DAE_SOURCE_VERSION"
    return
  fi

  local commit
  commit="$(git ls-remote "$dae_source_url" "refs/heads/$dae_source_ref" | awk '{print $1}')"
  if [[ -z "$commit" ]]; then
    commit="$(git ls-remote "$dae_source_url" "$dae_source_ref" | awk 'NR == 1 {print $1}')"
  fi
  [[ -n "$commit" ]] || {
    echo "error: cannot resolve DAE_SOURCE_REF=$dae_source_ref from $dae_source_url" >&2
    exit 1
  }

  export DAE_SOURCE_VERSION="$commit"
  log "Resolved dae $dae_source_ref to $DAE_SOURCE_VERSION"
}

apply_overlay() {
  log "Applying MT6000 kernel and mt76 patches"

  local kernel_target
  kernel_target="$(find "$openwrt_dir/target/linux/mediatek" -maxdepth 1 -type d -name 'patches-*' | sort -V | tail -n1)"
  [[ -n "$kernel_target" ]] || {
    echo "error: no mediatek kernel patch directory found" >&2
    exit 1
  }

  cp "$repo_dir"/patches/kernel/*.patch "$kernel_target"/ 2>/dev/null || true

  mkdir -p "$openwrt_dir/package/kernel/mt76/patches"
  cp "$repo_dir"/patches/mt76/*.patch "$openwrt_dir/package/kernel/mt76/patches"/ 2>/dev/null || true
  cp "$repo_dir"/patches/mt76-local/*.patch "$openwrt_dir/package/kernel/mt76/patches"/ 2>/dev/null || true

  if [[ -d "$repo_dir/files" ]]; then
    log "Applying OpenWrt overlay files"
    rsync -a "$repo_dir/files/" "$openwrt_dir/"
  fi

  cp "$repo_dir/config/feeds.conf.default" "$openwrt_dir/feeds.conf.default"
  cp "$repo_dir/config/mt6000.diffconfig" "$openwrt_dir/.config"
}

install_custom_packages() {
  log "Installing custom dae package"
  "$openwrt_dae_dir/scripts/install-package.sh" "$openwrt_dir"

  log "Installing luci-app-dae package"
  mkdir -p "$openwrt_dir/package/custom/luci-app-dae"
  rsync -a --delete "$luci_app_dae_dir/luci-app-dae/" "$openwrt_dir/package/custom/luci-app-dae/"
}

verify_dae_kernel_config() {
  log "Checking DAE kernel config"
  (
    cd "$openwrt_dir"
    for param in CONFIG_CGROUPS CONFIG_KPROBES CONFIG_DEBUG_INFO_BTF \
      CONFIG_BPF_STREAM_PARSER CONFIG_NETKIT CONFIG_NET_SCH_INGRESS \
      CONFIG_NET_CLS_BPF CONFIG_NET_CLS_ACT CONFIG_BPF_EVENTS; do
      grep "^$param" .config || echo "warning: $param is not set in .config" >&2
    done
  )
}

collect_artifacts() {
  log "Artifacts"
  find "$openwrt_dir/bin" -type f \
    \( -name '*dae*' -o -name '*sysupgrade*.bin' -o -name 'sha256sums' -o -name '*.manifest' \) \
    -print | sort
}

mkdir -p "$workdir" "$ccache_dir"

resolve_dae_source_version

log "Cloning OpenWrt: $openwrt_repo $openwrt_ref"
clone_or_update "$openwrt_repo" "$openwrt_ref" "$openwrt_dir"

log "Cloning openwrt-dae: $openwrt_dae_repo $openwrt_dae_ref"
clone_or_update "$openwrt_dae_repo" "$openwrt_dae_ref" "$openwrt_dae_dir"

log "Cloning luci-app-dae: $luci_app_dae_repo $luci_app_dae_ref"
clone_or_update "$luci_app_dae_repo" "$luci_app_dae_ref" "$luci_app_dae_dir"

apply_overlay

log "Updating feeds"
(
  cd "$openwrt_dir"
  ./scripts/feeds update -a
  ./scripts/feeds install -a
)

install_custom_packages

log "Expanding config"
make -C "$openwrt_dir" defconfig
verify_dae_kernel_config

log "Building tools, toolchain and target"
make -C "$openwrt_dir" -j"$jobs" CCACHE_DIR="$ccache_dir" USE_CCACHE=1 \
  tools/install toolchain/install target/compile

if [[ "$mode" == "package" ]]; then
  log "Building dae package only"
  make -C "$openwrt_dir" -j"$jobs" CCACHE_DIR="$ccache_dir" USE_CCACHE=1 \
    package/dae/clean package/dae/compile V=s
  make -C "$openwrt_dir" -j"$jobs" CCACHE_DIR="$ccache_dir" USE_CCACHE=1 \
    package/index
else
  log "Building all packages and firmware image"
  make -C "$openwrt_dir" -j"$jobs" CCACHE_DIR="$ccache_dir" USE_CCACHE=1 \
    package/compile
  make -C "$openwrt_dir" -j"$jobs" CCACHE_DIR="$ccache_dir" USE_CCACHE=1 \
    package/install package/index
  make -C "$openwrt_dir" -j1 V=s CCACHE_DIR="$ccache_dir" USE_CCACHE=1 \
    target/install
fi

collect_artifacts
