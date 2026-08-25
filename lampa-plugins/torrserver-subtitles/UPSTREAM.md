# Upstream provenance

- Project: `adambenhassen/lampa-improved-subtitles`
- Source URL: <https://github.com/adambenhassen/lampa-improved-subtitles>
- Version: `1.1.7`
- Commit: `e3fc07a6cd05ba33ebf769f89965712527b2fd39`
- Imported file: `subs.js`
- Imported SHA-256: `32c3ed6ce9895fcf1aa37d4f77edd975c17a22d44bd03edbf32024a844f1f7b5`
- Imported: `2026-08-25`
- License: MIT, Adam Benhassen

The bundled `matroska-subtitles` library is MIT licensed by Mathias Rasmussen;
its license is preserved in `LICENSE-matroska-subtitles`.

## Local changes

- Restrict extraction and UI interception to TorrServer playback.
- Expose runtime diagnostics through `window.LampaTorrserverSubtitles`.
- Render with Lampa's standard subtitle classes and appearance settings.
- Normalize embedded ASS font, size, and color to Lampa's appearance settings.
- Disable the native embedded subtitle track while the DOM renderer is active.
- Integrate automatic English selection with the local English Tracks plugin.
- Resolve track language and labels from Matroska, ffprobe, and webOS metadata.
- Restore player-panel focus after closing the subtitle picker.
- Add in-player and global settings for vertical position, outline, and
  SDR/HDR-aware subtitle color.
- Detect HDR from ffprobe, playback metadata, and TorrServer file names.
- Preserve external online-source handling by leaving `online_mod.js` untouched.
