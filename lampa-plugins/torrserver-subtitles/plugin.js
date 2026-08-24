(function () {
    'use strict'

    var PLUGIN_NAME = 'TorrServer Subtitles'
    var PLUGIN_VERSION = '1.1.0'
    var SETTING_NAME = 'torrserver_subtitles_lampa_style'
    var STYLE_ID = 'torrserver-subtitles-native-style'
    var SUBTITLE_SETTINGS = [
        'subtitles_size',
        'subtitles_stroke',
        'subtitles_backdrop',
        'player_subs_shift_time'
    ]

    if (window.LampaTorrserverSubtitles) return

    var session = null
    var latestPlayerData = null
    var webosTimers = []
    var lastStoredWebosStyle = ''

    var state = {
        version: PLUGIN_VERSION,
        active: false,
        nativeTracks: 0,
        bridgedTracks: 0,
        renderedFrames: 0,
        webosStyleApplications: 0,
        webosStyleAttempts: 0,
        webosStyleSuccesses: 0,
        webosStyleFailures: 0,
        settingsInstalled: false
    }

    window.LampaTorrserverSubtitles = state

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

    function storageValue(name, fallback) {
        try {
            return window.Lampa && Lampa.Storage ? Lampa.Storage.get(name, fallback) : fallback
        }
        catch (error) {
            return fallback
        }
    }

    function storageField(name, fallback) {
        try {
            var value = window.Lampa && Lampa.Storage ? Lampa.Storage.field(name) : fallback

            return typeof value === 'undefined' || value === '' ? fallback : value
        }
        catch (error) {
            return fallback
        }
    }

    function asBoolean(value) {
        return value === true || value === 'true' || value === 1 || value === '1'
    }

    function isTorrentPlayback(data) {
        if (!data) return false
        if (data.torrent_hash) return true

        try {
            var server = window.Lampa && Lampa.Torserver ? Lampa.Torserver.ip() : ''
            var url = String(data.url || '')

            return Boolean(server && url.indexOf(server) !== -1 && /\/(?:stream|gst)\//i.test(url))
        }
        catch (error) {
            return false
        }
    }

    function videoElement() {
        try {
            return window.Lampa && Lampa.PlayerVideo ? Lampa.PlayerVideo.video() : null
        }
        catch (error) {
            return null
        }
    }

    function webosServiceAvailable() {
        return Boolean(
            window.webOS &&
            window.webOS.service &&
            typeof window.webOS.service.request === 'function'
        )
    }

    function storedWebosStyle() {
        var value = storageValue('webos_subs_params', {})

        if (typeof value === 'string') {
            try {
                value = JSON.parse(value)
            }
            catch (error) {
                value = {}
            }
        }

        return value && typeof value === 'object' ? value : {}
    }

    function desiredWebosStyle() {
        var previous = storedWebosStyle()
        var sizes = {small: 1, normal: 2, large: 3}
        var size = storageField('subtitles_size', 'normal')
        var backdrop = asBoolean(storageField('subtitles_backdrop', false))

        return {
            color: typeof previous.color === 'number' ? previous.color : 2,
            font_size: sizes[size] !== undefined ? sizes[size] : sizes.normal,
            bg_color: 'black',
            position: typeof previous.position === 'number' ? previous.position : -1,
            bg_opacity: backdrop ? 140 : 0,
            char_opacity: typeof previous.char_opacity === 'number' ? previous.char_opacity : 255
        }
    }

    function persistWebosStyle(style) {
        var serialized = JSON.stringify(style)

        if (serialized === lastStoredWebosStyle) return

        try {
            if (window.Lampa && Lampa.Storage && typeof Lampa.Storage.set === 'function') {
                Lampa.Storage.set('webos_subs_params', style, true)
                lastStoredWebosStyle = serialized
            }
        }
        catch (error) {}
    }

    function requestWebosStyle(method, parameters) {
        state.webosStyleAttempts++

        try {
            window.webOS.service.request('luna://com.webos.media', {
                method: method,
                parameters: parameters,
                onSuccess: function () {
                    state.webosStyleSuccesses++
                },
                onFailure: function (result) {
                    state.webosStyleFailures++
                    state.lastWebosError = result && (result.errorText || result.errorCode) || 'Unknown webOS error'
                }
            })
        }
        catch (error) {
            state.webosStyleFailures++
            state.lastWebosError = error && error.message ? error.message : String(error)
        }
    }

    function applyWebosStyle() {
        if (!enabled() || !isTorrentPlayback(latestPlayerData) || !webosServiceAvailable()) return false

        var video = videoElement()

        if (!video || !video.mediaId) return false

        var style = desiredWebosStyle()
        var parameters = {
            mediaId: video.mediaId,
            color: style.color,
            fontSize: style.font_size,
            bgColor: style.bg_color,
            position: style.position,
            bgOpacity: style.bg_opacity,
            charOpacity: style.char_opacity
        }
        var methods = [
            'setSubtitleColor',
            'setSubtitleBackgroundColor',
            'setSubtitleFontSize',
            'setSubtitlePosition',
            'setSubtitleBackgroundOpacity',
            'setSubtitleCharacterOpacity'
        ]

        persistWebosStyle(style)

        methods.forEach(function (method) {
            requestWebosStyle(method, parameters)
        })

        state.webosStyleApplications++
        state.lastWebosStyle = style
        state.lastWebosMediaId = video.mediaId

        return true
    }

    function clearWebosTimers() {
        webosTimers.forEach(function (timer) {
            clearTimeout(timer)
        })

        webosTimers = []
    }

    function scheduleWebosStyle(delays) {
        ;(delays || [0]).forEach(function (delay) {
            var timer = setTimeout(function () {
                var index = webosTimers.indexOf(timer)

                if (index !== -1) webosTimers.splice(index, 1)

                applyWebosStyle()
            }, delay)

            webosTimers.push(timer)
        })
    }

    function subtitleContainer() {
        try {
            var render = window.Lampa && Lampa.PlayerVideo ? Lampa.PlayerVideo.render() : null

            return render && render.find ? render.find('.player-video__subtitles') : null
        }
        catch (error) {
            return null
        }
    }

    function dispatchSubtitle(text, force) {
        if (!session || !session.video) return
        if (!force && session.lastText === text) return

        session.lastText = text

        var event

        try {
            event = new Event('subtitle')
        }
        catch (error) {
            event = document.createEvent('Event')
            event.initEvent('subtitle', false, false)
        }

        event.text = text
        session.video.dispatchEvent(event)

        state.renderedFrames++
    }

    function clearSubtitle() {
        if (!session || session.lastText === '') return

        dispatchSubtitle('', true)
    }

    function escapeText(text) {
        var element = document.createElement('div')
        element.textContent = String(text || '')

        return element.innerHTML.replace(/\r?\n/g, '<br>')
    }

    function cueHtml(cue) {
        if (!cue) return ''

        try {
            if (typeof cue.getCueAsHTML === 'function') {
                var wrapper = document.createElement('div')
                var fragment = cue.getCueAsHTML()

                wrapper.appendChild(fragment)

                return wrapper.innerHTML.replace(/\r?\n/g, '<br>')
            }
        }
        catch (error) {}

        return escapeText(cue.text)
    }

    function cuesAt(track, time) {
        var result = []
        var cues = track && track.cues

        if (cues) {
            for (var index = 0; index < cues.length; index++) {
                var cue = cues[index]

                if (cue.startTime > time) break
                if (cue.startTime <= time && time < cue.endTime) result.push(cue)
            }

            return result
        }

        var active = track && track.activeCues

        if (active) {
            for (var position = 0; position < active.length; position++) result.push(active[position])
        }

        return result
    }

    function shiftedTime() {
        if (!session || !session.video) return 0

        var shift = parseInt(storageValue('player_subs_shift_time', '0'), 10)

        return session.video.currentTime - (isNaN(shift) ? 0 : shift)
    }

    function renderCurrent(force) {
        if (!session || !session.track || !enabled()) return

        var cues = cuesAt(session.track, shiftedTime())
        var text = cues.map(cueHtml).filter(Boolean).join('<br>')
        var container = subtitleContainer()

        if (container && container.removeClass) container.removeClass('hide')

        dispatchSubtitle(text, force)
    }

    function trackSupportsBridge(track) {
        return track && ('cues' in track || 'activeCues' in track)
    }

    function activateTrack(track) {
        if (!session || !track || !trackSupportsBridge(track)) return false

        if (session.track !== track) {
            session.track = track
            session.lastText = null
            state.bridgedTracks++
        }

        try {
            track.selected = true
            track.mode = 'hidden'
        }
        catch (error) {
            return false
        }

        if (track.mode !== 'hidden') return false

        renderCurrent(true)

        return true
    }

    function deactivateTrack() {
        if (!session || !session.track) return

        session.track = null
        clearSubtitle()
    }

    function scanTracks() {
        if (!session || session.scanning || !enabled()) return

        session.scanning = true

        try {
            var tracks = session.video.textTracks
            var showing = null

            state.nativeTracks = tracks ? tracks.length : 0

            if (tracks) {
                for (var index = 0; index < tracks.length; index++) {
                    if (tracks[index].mode === 'showing') {
                        showing = tracks[index]
                        break
                    }
                }
            }

            if (showing) activateTrack(showing)
            else if (session.track && session.track.mode === 'hidden') renderCurrent(false)
            else deactivateTrack()

            scanWebosSelection()
        }
        finally {
            session.scanning = false
        }
    }

    function scanWebosSelection() {
        if (!session || !session.webosSubtitles) return

        var selected = -999

        for (var index = 0; index < session.webosSubtitles.length; index++) {
            if (session.webosSubtitles[index].selected === true) {
                selected = session.webosSubtitles[index].index
                break
            }
        }

        if (selected === session.webosSelectedSubtitle) return

        session.webosSelectedSubtitle = selected
        scheduleWebosStyle([650, 1500])
    }

    function onWebosSubtitles(event) {
        if (!enabled() || !isTorrentPlayback(latestPlayerData)) return

        var video = videoElement()

        if (!session || session.video !== video) start(latestPlayerData)
        if (!session) return

        session.webosSubtitles = event && event.subs ? event.subs : []
        session.webosSelectedSubtitle = null

        persistWebosStyle(desiredWebosStyle())
        scheduleWebosStyle([0, 700, 1600])
    }

    function bind(target, eventName, callback) {
        if (!target || typeof target.addEventListener !== 'function') return

        target.addEventListener(eventName, callback)
        session.listeners.push([target, eventName, callback])
    }

    function removeListeners() {
        if (!session) return

        session.listeners.forEach(function (item) {
            item[0].removeEventListener(item[1], item[2])
        })

        session.listeners = []
    }

    function restoreNativeTrack() {
        if (!session || !session.track) return

        try {
            if (session.track.mode === 'hidden' && session.track.selected) {
                session.track.mode = 'showing'
            }
        }
        catch (error) {}
    }

    function stop(restoreNative) {
        clearWebosTimers()

        if (!session) {
            state.active = false
            return
        }

        clearInterval(session.interval)
        removeListeners()

        if (restoreNative) restoreNativeTrack()

        clearSubtitle()

        session = null
        state.active = false
    }

    function start(data) {
        latestPlayerData = data || latestPlayerData

        stop(false)

        if (!enabled() || !isTorrentPlayback(latestPlayerData)) return

        var video = videoElement()

        if (!video) return

        session = {
            video: video,
            track: null,
            lastText: null,
            scanning: false,
            listeners: [],
            interval: null,
            webosSubtitles: null,
            webosSelectedSubtitle: null
        }

        state.active = true

        bind(video, 'timeupdate', scanTracks)
        bind(video, 'seeking', scanTracks)
        bind(video, 'seeked', function () {
            scanTracks()
            scheduleWebosStyle([350, 1200])
        })
        bind(video, 'loadedmetadata', function () {
            scanTracks()
            scheduleWebosStyle([0, 700])
        })
        bind(video, 'loadeddata', function () {
            scanTracks()
            scheduleWebosStyle([0, 700])
        })
        bind(video.textTracks, 'change', scanTracks)
        bind(video.textTracks, 'addtrack', scanTracks)
        bind(video.textTracks, 'removetrack', scanTracks)

        session.interval = setInterval(scanTracks, 250)

        setTimeout(scanTracks, 0)
        setTimeout(updateNativeCueStyle, 0)
        scheduleWebosStyle([0, 700, 1600])
    }

    function updateNativeCueStyle() {
        var style = document.getElementById(STYLE_ID)

        if (!style) {
            style = document.createElement('style')
            style.id = STYLE_ID
            ;(document.head || document.documentElement).appendChild(style)
        }

        if (!enabled()) {
            style.textContent = ''
            return
        }

        var size = storageField('subtitles_size', 'normal')
        var fallbackSizes = {small: '2em', normal: '2.5em', large: '3em'}
        var container = document.querySelector('.player-video__subtitles')
        var computedSize = container && window.getComputedStyle ? window.getComputedStyle(container).fontSize : ''
        var fontSize = computedSize || fallbackSizes[size] || fallbackSizes.normal
        var backdrop = asBoolean(storageField('subtitles_backdrop', false))
        var stroke = asBoolean(storageField('subtitles_stroke', false))

        style.textContent = [
            '.player-video__video::cue {',
            '    color: #fff !important;',
            '    font-size: ' + fontSize + ' !important;',
            '    font-weight: 600 !important;',
            '    line-height: 1.25 !important;',
            '    background-color: ' + (backdrop ? 'rgba(0, 0, 0, .55)' : 'transparent') + ' !important;',
            '    text-shadow: ' + (stroke ? '0 2px 1px #000, 0 -2px 1px #000, -2px 1px 0 #000, 2px 0 1px #000' : 'none') + ' !important;',
            '}'
        ].join('\n')
    }

    function applySetting() {
        updateNativeCueStyle()

        if (enabled()) start(latestPlayerData)
        else stop(true)
    }

    function installSettings() {
        if (state.settingsInstalled || !window.Lampa || !Lampa.SettingsApi) return

        Lampa.SettingsApi.addParam({
            component: 'more',
            param: {
                name: SETTING_NAME,
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Оформлять torrent-субтитры как в Lampa',
                description: 'Размер, фон, обводка и сдвиг времени для встроенных дорожек'
            },
            onChange: function () {
                setTimeout(applySetting, 0)
            }
        })

        state.settingsInstalled = true
    }

    function ready() {
        installSettings()
        updateNativeCueStyle()

        try {
            if (Lampa.Player.opened()) start(Lampa.Player.playdata())
        }
        catch (error) {}
    }

    state.enabled = enabled
    state.isTorrentPlayback = isTorrentPlayback
    state.scan = scanTracks
    state.applyWebosStyle = applyWebosStyle
    state.stop = function () {
        stop(true)
    }

    if (window.Lampa && Lampa.Player && Lampa.Player.listener) {
        Lampa.Player.listener.follow('ready', start)
        Lampa.Player.listener.follow('destroy', function () {
            latestPlayerData = null
            stop(false)
        })
    }

    if (window.Lampa && Lampa.PlayerVideo && Lampa.PlayerVideo.listener) {
        Lampa.PlayerVideo.listener.follow('webos_subs', onWebosSubtitles)
    }

    if (window.Lampa && Lampa.Storage && Lampa.Storage.listener) {
        Lampa.Storage.listener.follow('change', function (event) {
            if (SUBTITLE_SETTINGS.indexOf(event.name) === -1) return

            setTimeout(function () {
                updateNativeCueStyle()
                renderCurrent(true)
                persistWebosStyle(desiredWebosStyle())
                scheduleWebosStyle([0, 700])
            }, 0)
        })
    }

    if (window.appready) ready()
    else if (window.Lampa && Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') ready()
        })
    }

    console.log(PLUGIN_NAME, 'started', PLUGIN_VERSION)
})()
