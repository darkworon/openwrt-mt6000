(function () {
    'use strict'

    if (window.LampaResumeVideoSize) return
    window.LampaResumeVideoSize = true

    var pauseTimes = new WeakMap()
    var hiddenVideo = null
    var refresh = null

    function currentVideo() {
        var player = window.Lampa && window.Lampa.PlayerVideo
        var video = player && typeof player.video === 'function' && player.video()

        if (video && video.tagName === 'VIDEO' && video.isConnected &&
            video !== document.pictureInPictureElement) return video
    }

    function refreshSize(video) {
        if (document.hidden || !video.videoWidth || !video.videoHeight) return
        if (refresh && refresh.video === video) return
        if (refresh) refresh.restore()

        var lampa = window.Lampa
        var player = lampa.PlayerVideo
        if (typeof player.size !== 'function' || !lampa.Storage) return

        function savedSize() {
            return lampa.Storage.get('player_size', 'default')
        }

        var job = {video: video, restore: restore}
        refresh = job

        function restore() {
            if (refresh !== job) return
            refresh = null
            window.clearTimeout(job.timeout)
            if (currentVideo() === video) player.size(savedSize())
        }

        // Give the video surface one frame at a different size before restoring it.
        player.size(savedSize() === 'cover' ? 'default' : 'cover')
        job.timeout = window.setTimeout(restore, 200)
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(restore)
        })
    }

    document.addEventListener('pause', function (event) {
        var video = event.target
        if (video !== currentVideo()) return

        if (video.ended || video.seeking) pauseTimes.delete(video)
        else pauseTimes.set(video, Date.now())
    }, true)

    document.addEventListener('playing', function (event) {
        var video = event.target
        if (video !== currentVideo() || !pauseTimes.has(video)) return

        var pausedAt = pauseTimes.get(video)
        pauseTimes.delete(video)
        // Some Fire TV setups never report visibility changes when only the TV sleeps.
        if (Date.now() - pausedAt >= 1500) refreshSize(video)
    }, true)

    document.addEventListener('visibilitychange', function () {
        var video = currentVideo()
        if (document.hidden) {
            if (refresh) refresh.restore()
            hiddenVideo = video && video.paused && !video.ended ? video : null
        }
        else {
            if (video && video === hiddenVideo && video.paused) refreshSize(video)
            hiddenVideo = null
        }
    })
})()
