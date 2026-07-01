// Hidden window that owns the microphone and records audio clips on command.
let stream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let chunks: BlobPart[] = []

function pickMime(): string {
  const prefs = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
  for (const m of prefs) {
    if (MediaRecorder.isTypeSupported(m)) return m
  }
  return ''
}

async function ensureStream(): Promise<MediaStream> {
  if (stream) return stream
  stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
  })
  return stream
}

window.codeflow.onRecord(async (cmd) => {
  try {
    if (cmd.action === 'start') {
      const s = await ensureStream()
      chunks = []
      const mime = pickMime()
      recorder = new MediaRecorder(s, mime ? { mimeType: mime } : undefined)
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }
      recorder.start()
    } else if (cmd.action === 'stop') {
      const r = recorder
      recorder = null
      if (!r) {
        window.codeflow.sendAudio(new ArrayBuffer(0), '')
        return
      }
      const mime = r.mimeType
      r.onstop = async () => {
        const blob = new Blob(chunks, { type: mime })
        const buf = await blob.arrayBuffer()
        window.codeflow.sendAudio(buf, mime)
      }
      r.stop()
    } else if (cmd.action === 'cancel') {
      const r = recorder
      recorder = null
      if (r) {
        r.onstop = null
        r.stop()
      }
      chunks = []
    }
  } catch (e) {
    window.codeflow.recorderError((e as Error).message)
  }
})
