# NTP hotplug hooks

`25-zerotier` restarts ZeroTier once after the first valid NTP sync in a boot.

The router has no RTC, so ZeroTier can start with an invalid clock and fail
control-plane/TLS setup. The restart must be one-shot: recurring NTP `stratum`
events otherwise flap `zt0`, trigger firewall reloads, and disrupt dae-routed
client traffic.
