const plugin = {

    meta: {
        name: "eslint-plugin-mmhmm",
        version: "1.0.0"
    },
    processors: {
        "sourcemaps": {
            meta: {
                name: "eslint-processor-mmhmm",
                version: "1.0.0"
            },
            // takes text of the file and filename
            preprocess(text, filename) {
                const results = [];
                const identifier = "//# sourceURL=";

                let current = null;

                const lines = text.split("\n");
                lines.forEach((line, lineNo) => {
                    if (line.startsWith(identifier) == false) {
                        if (current != null) {
                            current.text += line + "\n";
                            current.end += 1;
                        }
                        return;
                    }

                    const filename = line.substring(identifier.length);
                    current = {
                        filename: filename,
                        start: lineNo + 1,
                        end: lineNo + 1,
                        text: ""
                    };
                    results.push(current);
                });
                this._sourceMap = results;
                return [ { filename, text } ];
            },

            // takes a Message[][] and filename
            postprocess(messages, filename) {
                const allowed = [
                    // App'y
                    'gAppBuild', 'gHybrid', 'MmhmmCamera',
                    // DOM'y
                    'document', 'navigator', 'XMLHttpRequest', 'console', 'window', 'URL', 'Image',
                    'Node', 'FontFace', 'Event', 'Path2D', 'HTMLMediaElement', 'setTimeout', 'localStorage',
                    'performance', 'MediaStream', 'IDBKeyRange', 'EventTarget', 'ResizeObserver', 'OffscreenCanvas',
                    'clearTimeout', 'WebSocket', 'Intl', 'indexedDB', 'btoa', 'TextEncoder', 'NodeFilter',
                    'FileReader', 'AbortController', 'crypto', 'XMLSerializer', 'Request', 'MutationObserver',
                    'MediaSource', 'MediaRecorder', 'ImageData', 'Audio', 'removeEventListener', 'addEventListener',
                    'atob', 'Worker', 'WebAssembly', 'URLSearchParams', 'TextDecoder', 'PerformanceObserver',
                    'MediaStreamTrackEvent', 'HTMLImageElement', 'HTMLCanvasElement', 'CustomEvent', 'getScreenshareMedia',
                    'createImageBitmap', 'clearInterval', 'VideoFrame', 'TouchEvent', 'TextMetrics', 'Response',
                    'OverconstrainedError', 'MouseEvent', 'MediaStreamTrackProcessor', 'MediaStreamTrack',
                    'HTMLAudioElement', 'File', 'Element', 'DOMMatrix', 'DOMException', 'ClipboardItem', 'AbortSignal',
                    'Blob', 'postMessage', 'SVGCircleElement', 'SVGEllipseElement', 'SVGLineElement', 'SVGPathElement',
                    'SVGPolygonElement', 'SVGPolylineElement', 'SVGRectElement', 'SVGElement', 'structuredClone',
                    'setInterval', 'screen', 'caches', 'matchMedia', 'alert', 'DOMParser', 'sessionStorage', 'EyeDropper',
                    'fetch', 'IntersectionObserver', 'CSSStyleRule',
                    // third party
                    'KldIntersections', 'Hls', 'CircularBuffer', 'YT', 'Scamper',
                    'mixpanel', 'Sentry', 'MakePresignedRequest', 'statsig', 'libheif', 'DecodeGIF',
                    'InigoQuilez', 'Pickr', 'tippy'
                ];
                const sourceMap = this._sourceMap;
                const sourceFileAtLine = (line) => {
                    return sourceMap.find(entry => line >= entry.start && line <= entry.end);
                }

                return messages.flatMap(msgs => {
                    const good = msgs.filter(obj => {
                        if (obj.ruleId == "no-undef") {
                            const ignorable = allowed.some(cls => obj.message.startsWith(`'${cls}`));
                            return (ignorable == false);
                        }
                        return true;
                    });


                    good.forEach(msg => {
                        const file = sourceFileAtLine(msg.line);
                        if (file != null) {
                            msg.filename = file;
                            msg.message += ` {${file.filename}}`
                            msg.line -= file.start;
                        }
                    })
                    return good;
                })
            },

            supportsAutofix: false // (optional, defaults to false)
        }
    }
};

module.exports = plugin;
