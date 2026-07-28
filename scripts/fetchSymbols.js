import { writeFileSync, existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { fetchNSESymbols, fetchFOSymbols, NIFTY_TOTAL_MARKET_URL } from './symbolSources.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function fetchAndSaveIndex(name, url, outputFile) {
  try {
    console.log(`Fetching ${name}...`)
    const symbols = await fetchNSESymbols(url)
    writeFileSync(outputFile, JSON.stringify(symbols, null, 2), 'utf-8')
    console.log(`✅ ${name}: ${symbols.length} symbols saved`)
    return symbols
  } catch (err) {
    console.error(`❌ Failed to fetch ${name}: ${err.message}`)
    if (existsSync(outputFile)) {
      const existing = JSON.parse(readFileSync(outputFile, 'utf-8'))
      console.log(`   Keeping existing file with ${existing.length} symbols`)
      return existing
    }
    return []
  }
}

async function main() {
  console.log('Fetching NSE symbol lists...\n')

  // Broad universe of all NSE-listed equities — the sole source for symbol/ISIN
  // resolution and for ranking Top Gainers/Losers. Not exposed to the UI by name.
  const universe = await fetchAndSaveIndex(
    'NSE Stock Universe',
    NIFTY_TOTAL_MARKET_URL,
    resolve(__dirname, '../src/data/niftyUniverse.json')
  )

  // F&O stocks via Dhan scrip master (NSE changed fo_mktlots.csv to PDF)
  const foOutputFile = resolve(__dirname, '../src/data/niftyFO.json')
  try {
    console.log('Fetching F&O list from Dhan scrip master...')
    const universeLookup = new Map(universe.map(s => [s.symbol, s]))
    const foSymbols = await fetchFOSymbols(universeLookup)
    writeFileSync(foOutputFile, JSON.stringify(foSymbols, null, 2), 'utf-8')
    console.log(`✅ F&O: ${foSymbols.length} symbols saved`)
  } catch (err) {
    console.error(`❌ Failed to fetch F&O list: ${err.message}`)
    if (!existsSync(foOutputFile)) writeFileSync(foOutputFile, '[]', 'utf-8')
  }
}

main()
