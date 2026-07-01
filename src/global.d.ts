import type { CodeflowApi } from './preload/index'

declare global {
  interface Window {
    codeflow: CodeflowApi
  }
}

export {}
