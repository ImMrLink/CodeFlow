// Hidden window that owns the microphone and records audio clips on command.
const log = (m: string) => window.codeflow.recorderLog(m)

let stream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let chunks: BlobPart[] = []

log('recorder renderer loaded')

function pickMime(): string {
  const prefs = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
  for (const m of prefs) {
    if (MediaRecorder.isTypeSupported(m)) return m
  }
  return ''
}

async function ensureStream(): Promise<MediaStream> {
  if (stream) return stream
  log('requesting microphone via getUserMedia…')
  stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
  })
  log('microphone stream acquired')
  return stream
}

window.codeflow.onRecord(async (cmd) => {
  try {
    if (cmd.action === 'start') {
      log('start command received')
      const s = await ensureStream()
      chunks = []
      const mime = pickMime()
      recorder = new MediaRecorder(s, mime ? { mimeType: mime } : undefined)
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }
      recorder.start()
      log(`MediaRecorder started (mime=${recorder.mimeType})`)
    } else if (cmd.action === 'stop') {
      log('stop command received')
      const r = recorder
      recorder = null
      if (!r) {
        log('no active recorder; sending empty')
        window.codeflow.sendAudio(new ArrayBuffer(0), '')
        return
      }
      const mime = r.mimeType
      r.onstop = async () => {
        const blob = new Blob(chunks, { type: mime })
        const buf = await blob.arrayBuffer()
        log(`recording stopped, sending ${buf.byteLength} bytes`)
        window.codeflow.sendAudio(buf, mime)
      }
      r.stop()
    } else if (cmd.action === 'cancel') {
      log('cancel command received')
      const r = recorder
      recorder = null
      if (r) {
        r.onstop = null
        r.stop()
      }
      chunks = []
    }
  } catch (e) {
    log(`ERROR: ${(e as Error).message}`)
    window.codeflow.recorderError((e as Error).message)
  }
})
