// Кросс-платформенная замена "rm -rf docs && cp -r dist docs" —
// работает одинаково в Windows, macOS и Linux, без внешних зависимостей.
import { rmSync, cpSync, existsSync } from 'node:fs'

if (existsSync('docs')) {
  rmSync('docs', { recursive: true, force: true })
}
cpSync('dist', 'docs', { recursive: true })
console.log('docs/ обновлена из dist/')
