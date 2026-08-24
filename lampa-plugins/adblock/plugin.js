(function () {
    'use strict'

    var PLUGIN_NAME = 'Lampa AdBlock'
    var PLUGIN_VERSION = '1.0.0'
    var SETTING_NAME = 'lampa_adblock_enabled'
    var AD_ENDPOINT = /\/api\/ad\/get\/(?:preroll|banner)(?:[/?#]|$)/i
    var VAST_FIELDS = [
        'vast_url',
        'vast_api',
        'vast_msg',
        'vast_region',
        'vast_platform',
        'vast_screen'
    ]

    if (window.LampaAdBlock) return

    var state = {
        version: PLUGIN_VERSION,
        blockedRequests: 0,
        strippedPlayers: 0,
        removedElements: 0,
        transportInstalled: false,
        playerHookInstalled: false,
        settingsInstalled: false
    }

    window.LampaAdBlock = state

    function enabled() {
        try {
            if (window.Lampa && Lampa.Storage) {
                return Lampa.Storage.get(SETTING_NAME, 'true') !== false
            }

            return window.localStorage.getItem(SETTING_NAME) !== 'false'
        }
        catch (error) {
            return true
        }
    }

    function setNativeFlag() {
        try {
            if (!window.lampa_settings) return

            window.lampa_settings.disable_features = window.lampa_settings.disable_features || {}
            window.lampa_settings.disable_features.ads = enabled()
        }
        catch (error) {}
    }

    function isAdvertEndpoint(url) {
        return AD_ENDPOINT.test(String(url || ''))
    }

    function installAjaxTransport() {
        var jq = window.jQuery || window.$

        if (state.transportInstalled || !jq || typeof jq.ajaxTransport !== 'function') return false

        jq.ajaxTransport('+*', function (options) {
            if (!enabled() || !isAdvertEndpoint(options.url)) return

            var timer = null

            return {
                send: function (headers, complete) {
                    state.blockedRequests++

                    timer = setTimeout(function () {
                        complete(
                            200,
                            'success',
                            {
                                json: {ad: []},
                                text: '{"ad":[]}'
                            },
                            'Content-Type: application/json\r\n'
                        )
                    }, 0)
                },
                abort: function () {
                    clearTimeout(timer)
                }
            }
        })

        state.transportInstalled = true

        return true
    }

    function stripVastData(event) {
        if (!enabled() || !event || !event.data) return

        var stripped = false

        VAST_FIELDS.forEach(function (field) {
            if (Object.prototype.hasOwnProperty.call(event.data, field)) {
                delete event.data[field]
                stripped = true
            }
        })

        if (stripped) state.strippedPlayers++
    }

    function installPlayerHook() {
        if (state.playerHookInstalled) return true
        if (!window.Lampa || !Lampa.Player || !Lampa.Player.listener) return false
        if (typeof Lampa.Player.listener.follow !== 'function') return false

        Lampa.Player.listener.follow('create', stripVastData)
        state.playerHookInstalled = true

        return true
    }

    function isOfficialBannerContainer(element) {
        if (!element || element.nodeType !== 1 || element.tagName !== 'DIV') return false
        if (!element.parentElement || !element.parentElement.classList.contains('player')) return false

        var style = element.style

        return style.position === 'absolute' &&
            style.top === '0px' &&
            style.left === '0px' &&
            style.width === '100%' &&
            style.height === '100%' &&
            style.zIndex === '10' &&
            style.pointerEvents === 'none'
    }

    function removeElement(element) {
        if (!element || !element.parentNode) return

        element.parentNode.removeChild(element)
        state.removedElements++
    }

    function cleanupAds() {
        if (!enabled() || !document.querySelectorAll) return

        Array.prototype.forEach.call(document.querySelectorAll('.ad-preroll'), removeElement)

        Array.prototype.forEach.call(document.querySelectorAll('.player > div'), function (element) {
            if (isOfficialBannerContainer(element)) removeElement(element)
        })
    }

    function installStyle() {
        if (document.getElementById('lampa-adblock-style')) return

        var style = document.createElement('style')
        style.id = 'lampa-adblock-style'
        style.textContent = [
            '.ad-preroll,',
            '.player .ima-ad-container,',
            '.player [id^="google_ads_iframe_"],',
            '.player iframe[src*="doubleclick.net"],',
            '.player iframe[src*="googlesyndication.com"] {',
            '    display: none !important;',
            '    visibility: hidden !important;',
            '    pointer-events: none !important;',
            '}'
        ].join('\n')

        ;(document.head || document.documentElement).appendChild(style)
    }

    function installObserver() {
        if (!window.MutationObserver || !document.documentElement) return

        var pending = false
        var schedule = window.requestAnimationFrame || function (callback) {
            return setTimeout(callback, 16)
        }

        var observer = new MutationObserver(function () {
            if (pending || !enabled()) return

            pending = true

            schedule(function () {
                pending = false
                cleanupAds()
            })
        })

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        })

        state.observer = observer
    }

    function installSettings() {
        if (state.settingsInstalled || !window.Lampa || !Lampa.SettingsApi) return false

        Lampa.SettingsApi.addParam({
            component: 'more',
            param: {
                name: SETTING_NAME,
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Блокировать рекламу',
                description: 'Preroll между эпизодами и баннер в плеере'
            },
            onChange: function () {
                setNativeFlag()

                if (enabled()) cleanupAds()

                setTimeout(function () {
                    window.location.reload()
                }, 300)
            }
        })

        state.settingsInstalled = true

        return true
    }

    function onReady() {
        installSettings()
        cleanupAds()
    }

    state.enabled = enabled
    state.isAdvertEndpoint = isAdvertEndpoint
    state.cleanup = cleanupAds

    setNativeFlag()
    installAjaxTransport()
    installPlayerHook()
    installStyle()
    installObserver()

    if (window.appready) onReady()
    else if (window.Lampa && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') onReady()
        })
    }

    console.log(PLUGIN_NAME, 'started', PLUGIN_VERSION)
})()
