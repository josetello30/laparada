// Escribe en el resumen del job los resultados JUnit y la cobertura.
import { readFileSync, readdirSync, existsSync } from 'node:fs'

const attr = (xml, a) => Number((xml.match(new RegExp(`${a}="(\\d+)"`)) ?? [])[1] ?? 0)
console.log('## Resultados de pruebas\n')
console.log('| Reporte | Pruebas | Fallidas | Omitidas |\n|---|---|---|---|')
if (existsSync('reports')) {
  for (const f of readdirSync('reports').filter((x) => x.endsWith('.xml'))) {
    const x = readFileSync(`reports/${f}`, 'utf8')
    console.log(`| ${f} | ${attr(x, 'tests')} | ${attr(x, 'failures') + attr(x, 'errors')} | ${attr(x, 'skipped')} |`)
  }
}
if (existsSync('coverage/coverage-summary.json')) {
  const c = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8')).total
  console.log(`\n**Cobertura** (reglas de negocio y validaciones): líneas ${c.lines.pct}% · ramas ${c.branches.pct}% · funciones ${c.functions.pct}%`)
}
