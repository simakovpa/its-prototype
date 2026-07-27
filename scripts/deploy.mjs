import { rmSync, cpSync, existsSync } from 'node:fs'
if (existsSync('docs')) rmSync('docs', { recursive: true, force: true })
cpSync('dist', 'docs', { recursive: true })
console.log('docs/ обновлена из dist/')
