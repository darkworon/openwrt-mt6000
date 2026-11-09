import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import {runInNewContext} from 'node:vm'

const source = readFileSync(new URL('./plugin.js', import.meta.url), 'utf8')

function setup() {
    const video = {tagName: 'VIDEO', isConnected: true, videoWidth: 1920, videoHeight: 800}
    const sizes = []
    const listeners = new Map()
    const frames = []
    const timers = new Map()
    const state = {video, size: 'default', now: 1000}
    const document = {
        hidden: false,
        addEventListener(name, callback, capture) {
            if (name !== 'visibilitychange') assert.equal(capture, true)
            listeners.set(name, callback)
        }
    }
    const window = {
        Lampa: {
            PlayerVideo: {video: () => state.video, size: size => sizes.push(size)},
            Storage: {get(name) {
                assert.equal(name, 'player_size')
                return state.size
            }}
        },
        requestAnimationFrame: callback => frames.push(callback),
        setTimeout(callback) {
            const id = Symbol()
            timers.set(id, callback)
            return id
        },
        clearTimeout: id => timers.delete(id)
    }

    runInNewContext(source, {window, document, Date: {now: () => state.now}})

    return {
        state, video, document, sizes,
        fire: (name, target = video) => listeners.get(name)({target}),
        frame: () => frames.splice(0).forEach(callback => callback()),
        timeout: () => [...timers.values()].forEach(callback => callback())
    }
}

test('restores video geometry on play after a pause without a visibility event', () => {
    const {state, sizes, fire, frame} = setup()
    fire('playing')
    fire('pause')
    state.now += 10_000
    fire('playing')
    assert.deepEqual(sizes, ['cover'])
    frame()
    assert.deepEqual(sizes, ['cover'])
    frame()
    fire('playing')
    assert.deepEqual(sizes, ['cover', 'default'])
})

test('refreshes the paused picture on wake and preserves an explicit size', () => {
    const {state, video, document, sizes, fire, frame} = setup()
    state.size = 'cover'
    video.paused = true
    document.hidden = true
    fire('visibilitychange')
    assert.deepEqual(sizes, [])
    document.hidden = false
    fire('visibilitychange')
    frame()
    frame()
    assert.deepEqual(sizes, ['default', 'cover'])
})

test('ignores initial playback, short pauses, seeks and unrelated video', () => {
    const {state, video, sizes, fire} = setup()
    fire('playing')
    fire('pause')
    state.now += 700
    fire('playing')
    video.seeking = true
    fire('pause')
    video.seeking = false
    state.now += 10_000
    fire('playing')
    fire('pause', {...video})
    state.now += 10_000
    fire('playing')
    assert.deepEqual(sizes, [])
})

test('restores the current preference if a frame never arrives', () => {
    const {state, sizes, fire, frame, timeout} = setup()
    fire('pause')
    state.now += 10_000
    fire('playing')
    state.size = 's115'
    timeout()
    frame()
    frame()
    assert.deepEqual(sizes, ['cover', 's115'])
})

test('does not resize a replacement player when the old refresh finishes', () => {
    const {state, video, sizes, fire, frame} = setup()
    fire('pause')
    state.now += 10_000
    fire('playing')
    state.video = {...video}
    frame()
    frame()
    assert.deepEqual(sizes, ['cover'])
})
