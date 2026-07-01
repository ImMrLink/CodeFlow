import { app } from 'electron'
import { execFile } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, readdirSync, promises as fsp } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline as streamPipeline } from 'node:stream/promises'
import { join, dirname } from 'node:path'
import { dbg } from '../debug'

// Pinned whisper.cpp Windows CPU build (runtime AVX/AVX2 dispatch — runs on ~all modern x64).
const WHISPER_ZIP =
  'https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.1/whisper-bin-x64.zip'
const MODEL_BASE = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/'

export type ProgressCb = (message: string) => void

const baseDir = () => join(app.getPath('userData'), 'whisper')
const binDir = () => join(baseDir(), 'bin')
const modelsDir = () => join(baseDir(), 'models')
const defaultExe = () => join(binDir(), 'whisper-cli.exe')
const modelPath = (file: string) => join(modelsDir(), file)

let cachedExe: string | null = null

function findFileSync(dir: string, name: string): string | null {
  const stack = [dir]
  const target = name.toLowerCase()
  while (stack.length) {
    const d = stack.pop() as string
    let entries
    try {
      entries = readdirSync(d, { withFileTypes: true })
    } catch {
      continue
    }
    for (const e of entries) {
      const full = join(d, e.name)
      if (e.isDirectory()) stack.push(full)
      else if (e.name.toLowerCase() === target) return full
    }
  }
  return null
}

function engineReady(): boolean {
  if (cachedExe && existsSync(cachedExe)) return true
  if (existsSync(defaultExe())) return true
  return Boolean(findFileSync(binDir(), 'whisper-cli.exe'))
}

function resolveExe(): string {
  if (cachedExe && existsSync(cachedExe)) return cachedExe
  const direct = defaultExe()
  if (existsSync(direct)) return (cachedExe = direct)
  const found = findFileSync(binDir(), 'whisper-cli.exe')
  if (!found) throw new Error('whisper-cli.exe not found after extraction')
  return (cachedExe = found)
}

export function localStatus(modelFile: string): { engine: boolean; model: boolean; modelFile: string } {
  return { engine: engineReady(), model: existsSync(modelPath(modelFile)), modelFile }
}

async function download(url: string, dest: string, label: string, onProgress?: ProgressCb): Promise<void> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}) for ${url}`)
  const total = Number(res.headers.get('content-length')) || 0
  let loaded = 0
  let lastPct = -1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node = Readable.fromWeb(res.body as any)
  node.on('data', (c: Buffer) => {
    loaded += c.length
    if (!onProgress) return
    if (total) {
      const pct = Math.round((loaded / total) * 100)
      if (pct !== lastPct) {
        lastPct = pct
        onProgress(`${label} ${pct}%`)
      }
    } else {
      onProgress(`${label} ${(loaded / 1e6).toFixed(0)} MB`)
    }
  })
  mkdirSync(dirname(dest), { recursive: true })
  await streamPipeline(node, createWriteStream(dest))
}

function extractZip(zip: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Expand-Archive -Path '${zip}' -DestinationPath '${dest}' -Force`
      ],
      { windowsHide: true },
      (err) => (err ? reject(err) : resolve())
    )
  })
}

export async function ensureBinary(onProgress?: ProgressCb): Promise<void> {
  if (engineReady()) return
  mkdirSync(binDir(), { recursive: true })
  const zip = join(baseDir(), 'whisper-bin-x64.zip')
  dbg('[whisper] downloading engine')
  await download(WHISPER_ZIP, zip, 'Downloading engine', onProgress)
  onProgress?.('Extracting engine…')
  dbg('[whisper] extracting engine')
  await extractZip(zip, binDir())
  await fsp.rm(zip, { force: true }).catch(() => {})
  resolveExe() // throws if the exe still isn't found
}

export async function ensureModel(modelFile: string, onProgress?: ProgressCb): Promise<void> {
  const dest = modelPath(modelFile)
  if (existsSync(dest)) return
  mkdirSync(modelsDir(), { recursive: true })
  dbg(`[whisper] downloading model ${modelFile}`)
  await download(MODEL_BASE + modelFile, dest, `Downloading model (${modelFile})`, onProgress)
}

export async function ensureReady(modelFile: string, onProgress?: ProgressCb): Promise<void> {
  await ensureBinary(onProgress)
  await ensureModel(modelFile, onProgress)
}

function runWhisper(exe: string, model: string, wav: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      exe,
      ['-m', model, '-f', wav, '-l', 'en', '-nt', '-np'],
      { windowsHide: true, cwd: dirname(exe), maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error((stderr || err.message).slice(0, 300)))
        const text = stdout
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .join(' ')
          .trim()
        resolve(text)
      }
    )
  })
}

/** Ensure the engine+model exist, then transcribe a 16 kHz mono WAV buffer to text. */
export async function transcribeLocal(
  wav: Buffer,
  modelFile: string,
  onProgress?: ProgressCb
): Promise<string> {
  await ensureReady(modelFile, onProgress)
  onProgress?.('Transcribing (local)…')
  const exe = resolveExe()
  const tmpWav = join(app.getPath('temp'), `codeflow-${Date.now()}.wav`)
  await fsp.writeFile(tmpWav, wav)
  try {
    return await runWhisper(exe, modelPath(modelFile), tmpWav)
  } finally {
    fsp.rm(tmpWav, { force: true }).catch(() => {})
  }
}
