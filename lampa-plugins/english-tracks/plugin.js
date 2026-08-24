(function () {
    'use strict'

    var PLUGIN_NAME = 'Lampa English Tracks'
    var PLUGIN_VERSION = '1.0.0'
    var SETTING_ENABLED = 'english_tracks_enabled'
    var SETTING_REMEMBER = 'english_tracks_remember'
    var PREFERENCES_KEY = 'english_tracks_preferences'
    var MAX_PREFERENCES = 200

    if (window.LampaEnglishTracks) return

    var current = null
    var settingsInstalled = false

    var state = {
        version: PLUGIN_VERSION,
        audioSelections: 0,
        subtitleSelections: 0,
        savedPreferences: 0,
        restoredPreferences: 0
    }

    window.LampaEnglishTracks = state

    function storageGet(name, fallback) {
        try {
            return window.Lampa && Lampa.Storage ? Lampa.Storage.get(name, fallback) : fallback
        }
        catch (error) {
            return fallback
        }
    }

    function storageSet(name, value) {
        try {
            if (window.Lampa && Lampa.Storage) Lampa.Storage.set(name, value)
        }
        catch (error) {}
    }

    function enabled() {
        return storageGet(SETTING_ENABLED, 'true') !== false
    }

    function remember() {
        return storageGet(SETTING_REMEMBER, 'true') !== false
    }

    function normalize(value) {
        var text = String(value || '').toLowerCase().replace(/<[^>]*>/g, ' ')

        try {
            text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        }
        catch (error) {}

        return text
            .replace(/ё/g, 'е')
            .replace(/[^a-zа-я0-9]+/g, ' ')
            .replace(/^\s+|\s+$/g, '')
            .replace(/\s+/g, ' ')
    }

    function firstValue(values) {
        for (var i = 0; i < values.length; i++) {
            if (values[i] !== undefined && values[i] !== null && String(values[i]).trim()) {
                return String(values[i])
            }
        }

        return ''
    }

    function tokens(value) {
        var text = normalize(value)

        return text ? text.split(' ') : []
    }

    function hasToken(value, variants) {
        var list = tokens(value)

        return variants.some(function (variant) {
            return list.indexOf(variant) !== -1
        })
    }

    function hasStem(value, variants) {
        var list = tokens(value)

        return variants.some(function (variant) {
            return list.some(function (item) {
                return item.indexOf(variant) === 0
            })
        })
    }

    function canonicalLanguage(value) {
        var text = normalize(value)
        var list = tokens(text)

        if (list.some(function (item) {
            return ['en', 'eng', 'english'].indexOf(item) !== -1
        }) || hasStem(text, ['англ'])) return 'en'

        if (list.some(function (item) {
            return ['ru', 'rus', 'russian', 'рус'].indexOf(item) !== -1
        }) || hasStem(text, ['русск'])) return 'ru'

        if (list.some(function (item) {
            return ['uk', 'ukr', 'ukrainian'].indexOf(item) !== -1
        }) || hasStem(text, ['украинск'])) return 'uk'

        if (list.some(function (item) {
            return ['es', 'spa', 'spanish'].indexOf(item) !== -1
        }) || hasStem(text, ['испанск'])) return 'es'

        if (list.some(function (item) {
            return ['fr', 'fra', 'fre', 'french'].indexOf(item) !== -1
        }) || hasStem(text, ['французск'])) return 'fr'

        if (list.some(function (item) {
            return ['de', 'deu', 'ger', 'german'].indexOf(item) !== -1
        }) || hasStem(text, ['немецк'])) return 'de'

        if (list.length === 1 && /^[a-z]{2,3}$/.test(list[0])) return list[0]

        return text
    }

    function toArray(list) {
        if (!list) return []
        if (Array.isArray(list)) return list

        var result = []
        var length = typeof list.length === 'number' ? list.length : 0

        for (var i = 0; i < length; i++) result.push(list[i])

        return result
    }

    function activityMovie() {
        var activity = storageGet('activity', '{}')

        return activity && activity.movie ? activity.movie : {}
    }

    function movieFromData(data) {
        return data && data.card ? data.card : activityMovie()
    }

    function originalLanguage() {
        var movie = movieFromData(current ? current.data : null)

        return canonicalLanguage(movie.original_language || movie.language || '')
    }

    function contentKey(data) {
        data = data || {}

        var movie = movieFromData(data)
        var id = movie.id || movie.imdb_id || movie.kinopoisk_id
        var type = movie.original_name || movie.name ? 'tv' : 'movie'

        if (id) return type + ':' + id
        if (data.torrent_hash) return 'torrent:' + data.torrent_hash

        var title = firstValue([
            movie.original_title,
            movie.original_name,
            movie.title,
            movie.name,
            data.first_title,
            data.title
        ])

        title = normalize(title)
            .replace(/\bs\d+e\d+\b/g, '')
            .replace(/\bseason\s*\d+\b/g, '')
            .replace(/\bepisode\s*\d+\b/g, '')
            .replace(/\s+/g, ' ')
            .replace(/^\s+|\s+$/g, '')

        return title ? 'title:' + title : ''
    }

    function translation(kind, index) {
        var data = current ? current.data : null
        var translate = data && data.translate
        var list = translate && typeof translate === 'object'
            ? translate[kind === 'audio' ? 'tracks' : 'subs']
            : null

        return Array.isArray(list) && list[index] ? list[index] : {}
    }

    function descriptor(item, index, kind) {
        item = item || {}

        var translationIndex = kind === 'subtitles' && item.index !== undefined && item.index >= 0
            ? item.index
            : index
        var extra = translation(kind, translationIndex)
        var languageSource = firstValue([
            item.language,
            item.lang,
            item.srclang,
            extra.language,
            extra.lang,
            extra.srclang
        ])
        var labelSource = firstValue([item.label, extra.label])
        var nameSource = firstValue([item.name, extra.name])
        var titleSource = firstValue([item.title, extra.title])
        var text = normalize([
            languageSource,
            labelSource,
            nameSource,
            titleSource,
            extra.language,
            extra.label,
            extra.name
        ].join(' '))

        var language = canonicalLanguage(languageSource)

        if (!language || language === 'und') language = canonicalLanguage(text)

        return {
            index: item.index !== undefined && item.index !== null ? item.index : index,
            language: language,
            label: normalize(labelSource),
            name: normalize(nameSource),
            text: text.slice(0, 240)
        }
    }

    function isOriginal(value) {
        return hasToken(value, ['original', 'originals', 'оригинал', 'оригинальная', 'оригинальный'])
    }

    function englishScore(item, index, kind) {
        if (!item || item.index === -1) return -1

        var info = descriptor(item, index, kind)
        var score = 0

        if (info.language === 'en') score += 500
        if (canonicalLanguage(info.text) === 'en') score += 350
        if (originalLanguage() === 'en' && isOriginal(info.text)) score += 240

        if (kind === 'subtitles') {
            if (hasToken(info.text, ['full', 'complete', 'полные', 'полный'])) score += 35
            if (hasToken(info.text, ['forced', 'force', 'форсированные', 'надписи'])) score -= 25
            if (hasToken(info.text, ['signs', 'songs'])) score -= 15
        }
        else {
            if (hasToken(info.text, ['commentary', 'comments', 'комментарии'])) score -= 80
            if (hasToken(info.text, ['description', 'descriptive', 'audiodescription', 'тифлокомментарий'])) score -= 80
        }

        return score
    }

    function englishCandidate(items, kind) {
        var bestIndex = -1
        var bestScore = 0

        items.forEach(function (item, index) {
            var score = englishScore(item, index, kind)

            if (score > bestScore) {
                bestScore = score
                bestIndex = index
            }
        })

        return bestIndex
    }

    function loadPreferences() {
        var preferences = storageGet(PREFERENCES_KEY, '{}')

        return preferences && typeof preferences === 'object' && !Array.isArray(preferences)
            ? preferences
            : {}
    }

    function preference(kind) {
        if (!remember() || !current || !current.key) return null

        var entry = loadPreferences()[current.key]

        return entry && entry[kind] ? entry[kind] : null
    }

    function preferenceCandidate(items, kind, saved) {
        if (!saved) return -1
        if (saved.off) return -2

        var bestIndex = -1
        var bestScore = -1

        items.forEach(function (item, index) {
            if (!item || item.index === -1) return

            var info = descriptor(item, index, kind)
            var score = 0

            if (saved.language && info.language === saved.language) score += 400
            if (saved.label && info.label === saved.label) score += 260
            if (saved.name && info.name === saved.name) score += 260
            if (saved.text && info.text === saved.text) score += 320
            if (saved.index !== undefined && info.index === saved.index) score += 20

            if (score > bestScore) {
                bestScore = score
                bestIndex = index
            }
        })

        if (bestScore >= 200) return bestIndex
        if (bestScore >= 20 && !saved.language && !saved.label && !saved.name && !saved.text) return bestIndex

        return -1
    }

    function setProperty(item, name, value) {
        try {
            item[name] = value
        }
        catch (error) {}
    }

    function disableAudio(items) {
        items.forEach(function (item) {
            setProperty(item, 'enabled', false)
            setProperty(item, 'selected', false)
        })
    }

    function disableSubtitles(items) {
        items.forEach(function (item) {
            if (item.index !== -1) setProperty(item, 'mode', 'disabled')
            setProperty(item, 'selected', false)
        })
    }

    function showSubtitles(status) {
        try {
            if (window.Lampa && Lampa.PlayerVideo && typeof Lampa.PlayerVideo.subsview === 'function') {
                Lampa.PlayerVideo.subsview(status)
            }
        }
        catch (error) {}
    }

    function applyAudio(items) {
        if (!enabled() || !items.length) return

        var saved = preference('audio')
        var index = preferenceCandidate(items, 'audio', saved)

        if (index >= 0) state.restoredPreferences++
        else index = englishCandidate(items, 'audio')

        if (index < 0 || !items[index]) return

        disableAudio(items)
        setProperty(items[index], 'enabled', true)
        setProperty(items[index], 'selected', true)

        state.audioSelections++
        state.lastAudio = descriptor(items[index], index, 'audio')
    }

    function applySubtitles(items) {
        if (!enabled() || !items.length) return

        var saved = preference('subtitles')
        var index = preferenceCandidate(items, 'subtitles', saved)

        if (index === -2) {
            disableSubtitles(items)
            showSubtitles(false)
            state.restoredPreferences++
            state.lastSubtitles = {off: true}
            return
        }

        if (index >= 0) state.restoredPreferences++
        else index = englishCandidate(items, 'subtitles')

        if (index < 0 || !items[index]) return

        disableSubtitles(items)
        setProperty(items[index], 'mode', 'showing')
        setProperty(items[index], 'selected', true)
        showSubtitles(true)

        state.subtitleSelections++
        state.lastSubtitles = descriptor(items[index], index, 'subtitles')
    }

    function trimPreferences(preferences) {
        var keys = Object.keys(preferences)

        if (keys.length <= MAX_PREFERENCES) return

        keys.sort(function (left, right) {
            return (preferences[right].updated || 0) - (preferences[left].updated || 0)
        })

        keys.slice(MAX_PREFERENCES).forEach(function (key) {
            delete preferences[key]
        })
    }

    function savePreference(kind, value) {
        if (!remember() || !current || !current.key || !value) return

        var preferences = loadPreferences()
        var entry = preferences[current.key] || {}
        var previous = entry[kind]

        if (JSON.stringify(previous || null) === JSON.stringify(value)) return

        entry[kind] = value
        entry.updated = Date.now()
        preferences[current.key] = entry

        trimPreferences(preferences)
        storageSet(PREFERENCES_KEY, preferences)

        state.savedPreferences++
    }

    function selectedAudio(items) {
        for (var i = 0; i < items.length; i++) {
            try {
                if (items[i].selected === true || items[i].enabled === true) return i
            }
            catch (error) {}
        }

        return -1
    }

    function selectedSubtitles(items) {
        for (var i = 0; i < items.length; i++) {
            try {
                if (items[i].index === -1 && items[i].selected === true) return -2
                if (items[i].selected === true || items[i].mode === 'showing') return i
            }
            catch (error) {}
        }

        return -1
    }

    function compactDescriptor(item, index, kind) {
        var info = descriptor(item, index, kind)

        return {
            index: info.index,
            language: info.language,
            label: info.label,
            name: info.name,
            text: info.text
        }
    }

    function captureSelections() {
        if (!enabled() || !remember() || !current) return

        if (current.tracks && current.tracks.length) {
            var audioIndex = selectedAudio(current.tracks)

            if (audioIndex >= 0) {
                savePreference('audio', compactDescriptor(current.tracks[audioIndex], audioIndex, 'audio'))
            }
        }

        if (current.subtitles && current.subtitles.length) {
            var subtitleIndex = selectedSubtitles(current.subtitles)

            if (subtitleIndex === -2) savePreference('subtitles', {off: true})
            else if (subtitleIndex >= 0) {
                savePreference('subtitles', compactDescriptor(current.subtitles[subtitleIndex], subtitleIndex, 'subtitles'))
            }
        }
    }

    function beginPlayback(data) {
        captureSelections()

        current = {
            data: data || {},
            key: contentKey(data || {}),
            tracks: null,
            subtitles: null
        }

        state.currentKey = current.key
    }

    function updatePlayback(data) {
        if (!current) beginPlayback(data)
        else {
            current.data = data || current.data
            current.key = contentKey(current.data)
            state.currentKey = current.key
        }

        if (data && Array.isArray(data.voiceovers)) {
            current.tracks = data.voiceovers
            applyAudio(current.tracks)
        }
    }

    function onTracks(event) {
        if (!current) updatePlayback(Lampa.Player.playdata ? Lampa.Player.playdata() : {})

        current.tracks = toArray(event && event.tracks)
        applyAudio(current.tracks)
    }

    function onSubtitles(event) {
        if (!current) updatePlayback(Lampa.Player.playdata ? Lampa.Player.playdata() : {})

        current.subtitles = toArray(event && event.subs)
        applySubtitles(current.subtitles)
    }

    function onVideoDestroy() {
        captureSelections()

        if (current) {
            current.tracks = null
            current.subtitles = null
        }
    }

    function onPlayerDestroy() {
        captureSelections()
        current = null
        state.currentKey = ''
    }

    function clearPreferences() {
        storageSet(PREFERENCES_KEY, {})

        if (current) {
            current.lastAudio = null
            current.lastSubtitles = null
        }

        if (window.Lampa && Lampa.Noty) Lampa.Noty.show('Сохранённые дорожки очищены')
    }

    function installSettings() {
        if (settingsInstalled || !window.Lampa || !Lampa.SettingsApi) return false

        Lampa.SettingsApi.addParam({
            component: 'more',
            param: {type: 'title'},
            field: {name: 'English Tracks'}
        })

        Lampa.SettingsApi.addParam({
            component: 'more',
            param: {
                name: SETTING_ENABLED,
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Английские дорожки по умолчанию',
                description: 'Аудио и полные субтитры при запуске плеера'
            }
        })

        Lampa.SettingsApi.addParam({
            component: 'more',
            param: {
                name: SETTING_REMEMBER,
                type: 'trigger',
                default: true
            },
            field: {
                name: 'Запоминать ручной выбор',
                description: 'Отдельно для каждого фильма или сериала'
            }
        })

        Lampa.SettingsApi.addParam({
            component: 'more',
            param: {
                name: 'english_tracks_reset',
                type: 'button'
            },
            field: {name: 'Очистить сохранённые дорожки'},
            onChange: clearPreferences
        })

        settingsInstalled = true

        return true
    }

    function installHooks() {
        if (!window.Lampa || !Lampa.Player || !Lampa.PlayerVideo) return false

        Lampa.Player.listener.follow('create', function (event) {
            beginPlayback(event && event.data)
        })
        Lampa.Player.listener.follow('start', updatePlayback)
        Lampa.Player.listener.follow('destroy', onPlayerDestroy)

        Lampa.PlayerVideo.listener.follow('tracks', onTracks)
        Lampa.PlayerVideo.listener.follow('subs', onSubtitles)
        Lampa.PlayerVideo.listener.follow('destroy', onVideoDestroy)

        return true
    }

    state.enabled = enabled
    state.remember = remember
    state.capture = captureSelections
    state.clear = clearPreferences
    state.preferences = loadPreferences

    installHooks()

    setInterval(captureSelections, 1000)

    if (window.appready) installSettings()
    else if (window.Lampa && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') installSettings()
        })
    }

    console.log(PLUGIN_NAME, 'started', PLUGIN_VERSION)
})()
