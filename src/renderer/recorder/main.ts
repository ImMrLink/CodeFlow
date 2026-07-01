// Hidden window that owns the microphone. Records, then decodes to 16 kHz mono
// and sends a WAV buffer to main — the format both cloud STT and local whisper.cpp accept.
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

/** Decode the recorded blob and resample to 16 kHz mono Float32. */
async function toPcm16kMono(blob: Blob): Promise<Float32Array> {
  const arr = await blob.arrayBuffer()
  const ctx = new AudioContext()
  const decoded = await ctx.decodeAudioData(arr)
  await ctx.close()
  const frames = Math.max(1, Math.ceil(decoded.duration * 16000))
  const offline = new OfflineAudioContext(1, frames, 16000)
  const src = offline.createBufferSource()
  src.buffer = decoded
  src.connect(offline.destination)
  src.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}

/** Encode Float32 samples as a 16-bit PCM WAV. */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let o = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    o += 2
  }
  return buffer
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
        window.codeflow.sendAudio(new ArrayBuffer(0), '')
        return
      }
      const mime = r.mimeType
      r.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: mime })
          const pcm = await toPcm16kMono(blob)
          const wav = encodeWav(pcm, 16000)
          log(`encoded 16kHz WAV: ${wav.byteLength} bytes`)
          window.codeflow.sendAudio(wav, 'audio/wav')
        } catch (e) {
          log(`WAV encode failed: ${(e as Error).message}`)
          window.codeflow.recorderError((e as Error).message)
        }
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
