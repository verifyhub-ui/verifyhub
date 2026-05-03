// ==================== 5SIM Provider Integration ====================
// API Documentation: https://5sim.net/docs
//
// IMPORTANT API NOTES:
// - New API (v1): Uses Bearer JWT tokens. Supports: profile, countries, prices, check, cancel
// - Buy endpoint: /v1/user/buy currently returns 404; use old API handler_api.php as fallback
// - Old API: http://api1.5sim.net/stubs/handler_api.php?api_key=...&action=getNumber
//   May be blocked by Cloudflare from some IPs
//
// Setup Steps for User:
// 1. Go to https://5sim.net and create an account
// 2. Navigate to Settings → API Keys
// 3. Click "Generate new API key" (returns a JWT token)
// 4. Copy the JWT token
// 5. In VerifyHub Admin → Providers → Add Provider:
//    - Name: 5sim
//    - API URL: https://5sim.net/v1
//    - API Key: paste your JWT token

import type {
  SMSProvider,
  ProviderConfig,
  BuyNumberResult,
  CheckSmsResult,
  CancelOrderResult,
  ProviderBalance,
  ProviderTestResult,
  ServiceWithCountries,
} from './types'

// ==================== Country Mappings ====================
// Maps 5sim lowercase slugs (returned by /guest/countries) to ISO 3166-1 alpha-2 codes
const SLUG_TO_ISO: Record<string, string> = {
  afghanistan: 'af', albania: 'al', algeria: 'dz', angola: 'ao',
  antiguaandbarbuda: 'ag', argentina: 'ar', armenia: 'am', aruba: 'aw',
  australia: 'au', austria: 'at', azerbaijan: 'az', bahamas: 'bs',
  bahrain: 'bh', bangladesh: 'bd', barbados: 'bb', belgium: 'be',
  belize: 'bz', benin: 'bj', bhutane: 'bt', bih: 'ba',
  bolivia: 'bo', botswana: 'bw', brazil: 'br', bulgaria: 'bg',
  burkinafaso: 'bf', burundi: 'bi', cambodia: 'kh', cameroon: 'cm',
  canada: 'ca', capeverde: 'cv', chad: 'td', chile: 'cl',
  colombia: 'co', comoros: 'km', congo: 'cg', costarica: 'cr',
  croatia: 'hr', cyprus: 'cy', czech: 'cz', denmark: 'dk',
  djibouti: 'dj', dominicana: 'do', easttimor: 'tl', ecuador: 'ec',
  egypt: 'eg', england: 'gb', equatorialguinea: 'gq', estonia: 'ee',
  ethiopia: 'et', finland: 'fi', france: 'fr', frenchguiana: 'gf',
  gabon: 'ga', gambia: 'gm', georgia: 'ge', germany: 'de',
  ghana: 'gh', greece: 'gr', guadeloupe: 'gp', guatemala: 'gt',
  guinea: 'gn', guineabissau: 'gw', guyana: 'gy', haiti: 'ht',
  honduras: 'hn', hongkong: 'hk', hungary: 'hu', india: 'in',
  indonesia: 'id', ireland: 'ie', israel: 'il', italy: 'it',
  ivorycoast: 'ci', jamaica: 'jm', jordan: 'jo', kazakhstan: 'kz',
  kenya: 'ke', kuwait: 'kw', kyrgyzstan: 'kg', laos: 'la',
  latvia: 'lv', lesotho: 'ls', liberia: 'lr', lithuania: 'lt',
  luxembourg: 'lu', macau: 'mo', madagascar: 'mg', malawi: 'mw',
  malaysia: 'my', maldives: 'mv', mauritania: 'mr', mauritius: 'mu',
  mexico: 'mx', moldova: 'md', mongolia: 'mn', montenegro: 'me',
  morocco: 'ma', mozambique: 'mz', namibia: 'na', nepal: 'np',
  netherlands: 'nl', newcaledonia: 'nc', newzealand: 'nz', nicaragua: 'ni',
  nigeria: 'ng', northmacedonia: 'mk', norway: 'no', oman: 'om',
  pakistan: 'pk', panama: 'pa', papuanewguinea: 'pg', paraguay: 'py',
  peru: 'pe', philippines: 'ph', poland: 'pl', portugal: 'pt',
  puertorico: 'pr', reunion: 're', romania: 'ro', rwanda: 'rw',
  saintkittsandnevis: 'kn', saintlucia: 'lc', saintvincentandgrenadines: 'vc',
  salvador: 'sv', samoa: 'ws', saudiarabia: 'sa', senegal: 'sn',
  serbia: 'rs', seychelles: 'sc', sierraleone: 'sl', singapore: 'sg',
  slovakia: 'sk', slovenia: 'si', solomonislands: 'sb', southafrica: 'za',
  spain: 'es', srilanka: 'lk', suriname: 'sr', swaziland: 'sz',
  sweden: 'se', taiwan: 'tw', tajikistan: 'tj', tanzania: 'tz',
  thailand: 'th', tit: 'tt', togo: 'tg', tunisia: 'tn',
  turkmenistan: 'tm', uganda: 'ug', uruguay: 'uy', usa: 'us',
  uzbekistan: 'uz', venezuela: 've', vietnam: 'vn', zambia: 'zm',
}

// Reverse mapping: ISO alpha-2 → 5sim slug (used when buying numbers)
const ISO_TO_SLUG: Record<string, string> = {
  af: 'afghanistan', al: 'albania', dz: 'algeria', ao: 'angola',
  ag: 'antiguaandbarbuda', ar: 'argentina', am: 'armenia', aw: 'aruba',
  au: 'australia', at: 'austria', az: 'azerbaijan', bs: 'bahamas',
  bh: 'bahrain', bd: 'bangladesh', bb: 'barbados', be: 'belgium',
  bz: 'belize', bj: 'benin', bt: 'bhutane', ba: 'bih',
  bo: 'bolivia', bw: 'botswana', br: 'brazil', bg: 'bulgaria',
  bf: 'burkinafaso', bi: 'burundi', kh: 'cambodia', cm: 'cameroon',
  ca: 'canada', cv: 'capeverde', td: 'chad', cl: 'chile',
  co: 'colombia', km: 'comoros', cg: 'congo', cr: 'costarica',
  hr: 'croatia', cy: 'cyprus', cz: 'czech', dk: 'denmark',
  dj: 'djibouti', do: 'dominicana', tl: 'easttimor', ec: 'ecuador',
  eg: 'egypt', gb: 'england', gq: 'equatorialguinea', ee: 'estonia',
  et: 'ethiopia', fi: 'finland', fr: 'france', gf: 'frenchguiana',
  ga: 'gabon', gm: 'gambia', ge: 'georgia', de: 'germany',
  gh: 'ghana', gr: 'greece', gp: 'guadeloupe', gt: 'guatemala',
  gn: 'guinea', gw: 'guineabissau', gy: 'guyana', ht: 'haiti',
  hn: 'honduras', hk: 'hongkong', hu: 'hungary', in: 'india',
  id: 'indonesia', ie: 'ireland', il: 'israel', it: 'italy',
  ci: 'ivorycoast', jm: 'jamaica', jo: 'jordan', kz: 'kazakhstan',
  ke: 'kenya', kw: 'kuwait', kg: 'kyrgyzstan', la: 'laos',
  lv: 'latvia', ls: 'lesotho', lr: 'liberia', lt: 'lithuania',
  lu: 'luxembourg', mo: 'macau', mg: 'madagascar', mw: 'malawi',
  my: 'malaysia', mv: 'maldives', mr: 'mauritania', mu: 'mauritius',
  mx: 'mexico', md: 'moldova', mn: 'mongolia', me: 'montenegro',
  ma: 'morocco', mz: 'mozambique', na: 'namibia', np: 'nepal',
  nl: 'netherlands', nc: 'newcaledonia', nz: 'newzealand', ni: 'nicaragua',
  ng: 'nigeria', mk: 'northmacedonia', no: 'norway', om: 'oman',
  pk: 'pakistan', pa: 'panama', pg: 'papuanewguinea', py: 'paraguay',
  pe: 'peru', ph: 'philippines', pl: 'poland', pt: 'portugal',
  pr: 'puertorico', re: 'reunion', ro: 'romania', rw: 'rwanda',
  kn: 'saintkittsandnevis', lc: 'saintlucia', vc: 'saintvincentandgrenadines',
  sv: 'salvador', ws: 'samoa', sa: 'saudiarabia', sn: 'senegal',
  rs: 'serbia', sc: 'seychelles', sl: 'sierraleone', sg: 'singapore',
  sk: 'slovakia', si: 'slovenia', sb: 'solomonislands', za: 'southafrica',
  es: 'spain', lk: 'srilanka', sr: 'suriname', sz: 'swaziland',
  se: 'sweden', tw: 'taiwan', tj: 'tajikistan', tz: 'tanzania',
  th: 'thailand', tt: 'tit', tg: 'togo', tn: 'tunisia',
  tm: 'turkmenistan', ug: 'uganda', uy: 'uruguay', us: 'usa',
  uz: 'uzbekistan', ve: 'venezuela', vn: 'vietnam', zm: 'zambia',
}

// Legacy numeric ID → 5sim slug mapping (old API format, kept for backward compatibility)
const NUMERIC_ID_TO_SLUG: Record<string, string> = {
  '0': 'russia', '1': 'ukraine', '2': 'kazakhstan', '3': 'china', '4': 'philippines', '5': 'indonesia',
  '6': 'usa', '7': 'england', '8': 'india', '9': 'germany', '10': 'netherlands', '11': 'france',
  '12': 'poland', '13': 'canada', '14': 'brazil', '15': 'spain', '16': 'malaysia', '17': 'thailand',
  '18': 'nigeria', '19': 'kenya', '20': 'greece', '21': 'portugal', '22': 'czech', '23': 'romania',
  '24': 'sweden', '25': 'ireland', '26': 'italy', '27': 'belgium', '28': 'denmark', '29': 'austria',
  '30': 'switzerland', '31': 'finland', '32': 'norway', '33': 'estonia', '34': 'latvia', '35': 'lithuania',
  '36': 'bulgaria', '37': 'croatia', '38': 'hungary', '39': 'slovakia', '40': 'slovenia', '41': 'mexico',
  '42': 'colombia', '43': 'argentina', '44': 'chile', '45': 'peru', '46': 'egypt', '47': 'southafrica',
  '48': 'vietnam', '49': 'japan', '50': 'korea', '51': 'australia', '52': 'newzealand', '53': 'singapore',
  '54': 'hongkong', '55': 'taiwan', '56': 'pakistan', '57': 'bangladesh', '58': 'myanmar', '59': 'cambodia',
  '60': 'srilanka', '61': 'nepal', '62': 'iran', '63': 'iraq', '64': 'saudiarabia', '65': 'uae',
  '66': 'israel', '67': 'turkey', '68': 'georgia', '69': 'armenia', '70': 'azerbaijan', '71': 'uzbekistan',
  '72': 'turkmenistan', '73': 'moldova', '74': 'belarus', '75': 'serbia', '76': 'bih', '77': 'northmacedonia',
  '78': 'albania', '79': 'montenegro', '80': 'iceland', '81': 'luxembourg', '82': 'malta', '83': 'cyprus',
}

const COUNTRY_PHONE_CODES: Record<string, string> = {
  af: '93', al: '355', dz: '213', ao: '244', ag: '1', ar: '54', am: '374',
  aw: '297', au: '61', at: '43', az: '994', bs: '1', bh: '973', bd: '880',
  bb: '1', be: '32', bz: '501', bj: '229', bt: '975', ba: '387', bo: '591',
  bw: '267', br: '55', bg: '359', bf: '226', bi: '257', kh: '855', cm: '237',
  ca: '1', cv: '238', td: '235', cl: '56', co: '57', km: '269', cg: '242',
  cr: '506', hr: '385', cy: '357', cz: '420', dk: '45', dj: '253', do: '1',
  tl: '670', ec: '593', eg: '20', gb: '44', gq: '240', ee: '372', et: '251',
  fi: '358', fr: '33', gf: '594', ga: '241', gm: '220', ge: '995', de: '49',
  gh: '233', gr: '30', gp: '590', gt: '502', gn: '224', gw: '245', gy: '592',
  ht: '509', hn: '504', hk: '852', hu: '36', in: '91', id: '62', ie: '353',
  il: '972', it: '39', ci: '225', jm: '1', jo: '962', kz: '7', ke: '254',
  kw: '965', kg: '996', la: '856', lv: '371', ls: '266', lr: '231', lt: '370',
  lu: '352', mo: '853', mg: '261', mw: '265', my: '60', mv: '960', mr: '222',
  mu: '230', mx: '52', md: '373', mn: '976', me: '382', ma: '212', mz: '258',
  na: '264', np: '977', nl: '31', nc: '687', nz: '64', ni: '505', ng: '234',
  mk: '389', no: '47', om: '968', pk: '92', pa: '507', pg: '675', py: '595',
  pe: '51', ph: '63', pl: '48', pt: '351', pr: '1', re: '262', ro: '40',
  rw: '250', kn: '1', lc: '1', vc: '1', sv: '503', ws: '685', sa: '966',
  sn: '221', rs: '381', sc: '248', sl: '232', sg: '65', sk: '421', si: '386',
  sb: '677', za: '27', es: '34', lk: '94', sr: '597', sz: '268', se: '46',
  tw: '886', tj: '992', tz: '255', th: '66', tt: '1', tg: '228', tn: '216',
  tm: '993', ug: '256', uy: '598', us: '1', uz: '998', ve: '58', vn: '84', zm: '260',
}

const COUNTRY_NAMES: Record<string, string> = {
  af: 'Afghanistan', al: 'Albania', dz: 'Algeria', ao: 'Angola',
  ag: 'Antigua and Barbuda', ar: 'Argentina', am: 'Armenia', aw: 'Aruba',
  au: 'Australia', at: 'Austria', az: 'Azerbaijan', bs: 'Bahamas',
  bh: 'Bahrain', bd: 'Bangladesh', bb: 'Barbados', be: 'Belgium',
  bz: 'Belize', bj: 'Benin', bt: 'Bhutan', ba: 'Bosnia',
  bo: 'Bolivia', bw: 'Botswana', br: 'Brazil', bg: 'Bulgaria',
  bf: 'Burkina Faso', bi: 'Burundi', kh: 'Cambodia', cm: 'Cameroon',
  ca: 'Canada', cv: 'Cape Verde', td: 'Chad', cl: 'Chile',
  co: 'Colombia', km: 'Comoros', cg: 'Congo', cr: 'Costa Rica',
  hr: 'Croatia', cy: 'Cyprus', cz: 'Czech Republic', dk: 'Denmark',
  dj: 'Djibouti', do: 'Dominican Republic', tl: 'East Timor', ec: 'Ecuador',
  eg: 'Egypt', gb: 'United Kingdom', gq: 'Equatorial Guinea', ee: 'Estonia',
  et: 'Ethiopia', fi: 'Finland', fr: 'France', gf: 'French Guiana',
  ga: 'Gabon', gm: 'Gambia', ge: 'Georgia', de: 'Germany',
  gh: 'Ghana', gr: 'Greece', gp: 'Guadeloupe', gt: 'Guatemala',
  gn: 'Guinea', gw: 'Guinea-Bissau', gy: 'Guyana', ht: 'Haiti',
  hn: 'Honduras', hk: 'Hong Kong', hu: 'Hungary', in: 'India',
  id: 'Indonesia', ie: 'Ireland', il: 'Israel', it: 'Italy',
  ci: 'Ivory Coast', jm: 'Jamaica', jo: 'Jordan', kz: 'Kazakhstan',
  ke: 'Kenya', kw: 'Kuwait', kg: 'Kyrgyzstan', la: 'Laos',
  lv: 'Latvia', ls: 'Lesotho', lr: 'Liberia', lt: 'Lithuania',
  lu: 'Luxembourg', mo: 'Macau', mg: 'Madagascar', mw: 'Malawi',
  my: 'Malaysia', mv: 'Maldives', mr: 'Mauritania', mu: 'Mauritius',
  mx: 'Mexico', md: 'Moldova', mn: 'Mongolia', me: 'Montenegro',
  ma: 'Morocco', mz: 'Mozambique', na: 'Namibia', np: 'Nepal',
  nl: 'Netherlands', nc: 'New Caledonia', nz: 'New Zealand', ni: 'Nicaragua',
  ng: 'Nigeria', mk: 'North Macedonia', no: 'Norway', om: 'Oman',
  pk: 'Pakistan', pa: 'Panama', pg: 'Papua New Guinea', py: 'Paraguay',
  pe: 'Peru', ph: 'Philippines', pl: 'Poland', pt: 'Portugal',
  pr: 'Puerto Rico', re: 'Reunion', ro: 'Romania', rw: 'Rwanda',
  kn: 'Saint Kitts and Nevis', lc: 'Saint Lucia', vc: 'Saint Vincent',
  sv: 'El Salvador', ws: 'Samoa', sa: 'Saudi Arabia', sn: 'Senegal',
  rs: 'Serbia', sc: 'Seychelles', sl: 'Sierra Leone', sg: 'Singapore',
  sk: 'Slovakia', si: 'Slovenia', sb: 'Solomon Islands', za: 'South Africa',
  es: 'Spain', lk: 'Sri Lanka', sr: 'Suriname', sz: 'Swaziland',
  se: 'Sweden', tw: 'Taiwan', tj: 'Tajikistan', tz: 'Tanzania',
  th: 'Thailand', tt: 'Trinidad and Tobago', tg: 'Togo', tn: 'Tunisia',
  tm: 'Turkmenistan', ug: 'Uganda', uy: 'Uruguay', us: 'United States',
  uz: 'Uzbekistan', ve: 'Venezuela', vn: 'Vietnam', zm: 'Zambia',
}

// Country code to flag emoji
function countryCodeToFlag(code: string): string {
  const offset = 127397
  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(char.charCodeAt(0) + offset))
    .join('')
}

/**
 * Convert a country identifier to the 5sim API slug.
 * Accepts: ISO alpha-2 ('us', 'gb'), numeric ID ('0', '6'), or already a slug ('usa').
 */
function to5simSlug(country: string): string {
  if (country.length > 2 && isNaN(Number(country))) {
    return country.toLowerCase()
  }
  if (NUMERIC_ID_TO_SLUG[country]) {
    return NUMERIC_ID_TO_SLUG[country]
  }
  if (ISO_TO_SLUG[country.toLowerCase()]) {
    return ISO_TO_SLUG[country.toLowerCase()]
  }
  return country.toLowerCase()
}

/**
 * Convert a 5sim slug to ISO alpha-2 code.
 */
function slugToIso(slug: string): string {
  return SLUG_TO_ISO[slug] || slug.substring(0, 2).toLowerCase()
}

// ==================== API Request Helpers ====================

interface ApiResponse {
  [key: string]: any
}

const REQUEST_TIMEOUT = 30000

/**
 * New API request (v1) - uses Bearer JWT token in Authorization header
 */
async function v1Request(
  apiUrl: string,
  token: string,
  endpoint: string,
  params: Record<string, string> = {},
  method: 'GET' | 'POST' = 'GET'
): Promise<ApiResponse> {
  const url = new URL(`${apiUrl}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  console.log(`[5sim] ${method} ${url.pathname}${url.search}`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      // Check if it's an HTML error page (e.g., 404 from Next.js)
      if (body.trimStart().startsWith('<')) {
        throw new Error(`5sim API HTTP ${response.status}: endpoint not found`)
      }
      throw new Error(`5sim API HTTP ${response.status}: ${body || response.statusText}`)
    }

    const data = await response.json()

    // 5sim returns errors in various shapes
    if (typeof data === 'string' && data.includes(':')) {
      // Old-style response like "NO_NUMBERS", "NO_BALANCE", "ACCESS_NUMBER:id:phone"
      return { raw: data }
    }

    if (data.error) {
      throw new Error(
        `5sim API error: ${data.error}${data.error_description ? ` - ${data.error_description}` : ''}${data.error_code ? ` (code: ${data.error_code})` : ''}`
      )
    }
    if (data.status === 'error' && data.message) {
      throw new Error(`5sim API error: ${data.message}`)
    }

    return data
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('5sim API request timed out (30s)')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Old API request - uses api_key query parameter
 * Endpoint: http://api1.5sim.net/stubs/handler_api.php
 * May be blocked by Cloudflare from some IPs
 */
async function legacyRequest(
  token: string,
  action: string,
  extraParams: Record<string, string> = {}
): Promise<ApiResponse> {
  const params = new URLSearchParams({
    api_key: token,
    action,
    ...extraParams,
  })

  const url = `https://api1.5sim.net/stubs/handler_api.php?${params.toString()}`
  console.log(`[5sim] LEGACY ${action}: ${url.substring(0, 150)}...`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`5sim Legacy API HTTP ${response.status}: ${body.substring(0, 100)}`)
    }

    const text = await response.text()

    // Old API returns plain text responses like:
    // "ACCESS_NUMBER:12345:12345678901" or "NO_NUMBERS" or "NO_BALANCE"
    return { raw: text }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('5sim Legacy API request timed out (30s)')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

// ==================== FiveSimProvider ====================

export class FiveSimProvider implements SMSProvider {
  readonly name: string
  readonly apiUrl: string
  private token: string

  constructor(config: ProviderConfig) {
    this.name = config.name || '5sim'
    this.apiUrl = (config.apiUrl || 'https://5sim.net/v1').replace(/\/+$/, '')
    this.token = config.apiKey
  }

  /**
   * Get account balance using GET /v1/user/profile
   * Confirmed working: returns { id, email, balance, rating, currency, ... }
   */
  async getBalance(): Promise<ProviderBalance> {
    const data = await v1Request(this.apiUrl, this.token, '/user/profile')
    return {
      balance: parseFloat(String(data.balance || '0')),
      currency: String(data.currency || 'RUB'),
    }
  }

  /**
   * Test connection by fetching profile/balance
   */
  async testConnection(): Promise<ProviderTestResult> {
    const start = Date.now()
    try {
      const balance = await this.getBalance()
      return {
        success: true,
        balance,
        responseTime: Date.now() - start,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Connection failed',
        responseTime: Date.now() - start,
      }
    }
  }

  /**
   * Buy a phone number.
   * Uses the legacy API (handler_api.php with action=getNumber) as the primary method
   * since /v1/user/buy currently returns 404 on 5sim's API.
   *
   * Old API response format:
   *   "ACCESS_NUMBER:$id:$phone" on success
   *   "NO_NUMBERS" if no numbers available
   *   "NO_BALANCE" if insufficient funds
   *   "BAD_SERVICE" / "BAD_COUNTRY" for invalid params
   *
   * country: ISO alpha-2 ('us', 'gb'), 5sim slug ('usa'), or numeric ID ('6')
   * externalServiceId: 5sim service identifier (e.g. 'telegram', 'whatsapp')
   */
  async buyNumber(
    externalServiceId: string,
    country: string
  ): Promise<BuyNumberResult> {
    try {
      const countrySlug = to5simSlug(country)
      console.log(`[5sim] buyNumber: service=${externalServiceId}, country=${country} -> slug=${countrySlug}`)

      // Try the new v1 API first (in case 5sim adds it back)
      try {
        const data = await v1Request(this.apiUrl, this.token, '/user/buy', {
          country: countrySlug,
          service: externalServiceId,
          operator: 'any',
        })

        if (data.id && data.phone) {
          return {
            success: true,
            phoneNumber: String(data.phone),
            externalOrderId: String(data.id),
            expiresAt: new Date(Date.now() + 20 * 60 * 1000),
          }
        }
      } catch (err) {
        console.log(`[5sim] v1 buy endpoint unavailable: ${err instanceof Error ? err.message : 'unknown'}, trying legacy API...`)
      }

      // Fall back to legacy API
      try {
        const result = await legacyRequest(this.token, 'getNumber', {
          service: externalServiceId,
          country: countrySlug,
          operator: 'any',
        })

        const raw = String(result.raw || '')
        if (raw.startsWith('ACCESS_NUMBER:')) {
          const parts = raw.split(':')
          const orderId = parts[1]
          const phone = parts[2]
          return {
            success: true,
            phoneNumber: phone,
            externalOrderId: orderId,
            expiresAt: new Date(Date.now() + 20 * 60 * 1000),
          }
        }

        if (raw.startsWith('NO_NUMBERS')) {
          return {
            success: false,
            error: `No numbers available for ${externalServiceId} in ${countrySlug}`,
          }
        }

        if (raw.startsWith('NO_BALANCE')) {
          return {
            success: false,
            error: 'Insufficient balance on 5sim account',
          }
        }

        if (raw.startsWith('BAD_SERVICE')) {
          return {
            success: false,
            error: `Invalid service: ${externalServiceId}`,
          }
        }

        if (raw.startsWith('BAD_COUNTRY')) {
          return {
            success: false,
            error: `Invalid country: ${countrySlug}`,
          }
        }

        return {
          success: false,
          error: `Unexpected buy response: ${raw}`,
        }
      } catch (err) {
        return {
          success: false,
          error: `Legacy API unavailable: ${err instanceof Error ? err.message : 'unknown'}. The buy endpoint may be blocked by Cloudflare from your server IP.`,
        }
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to buy number',
      }
    }
  }

  /**
   * Check SMS status using GET /v1/user/check/{id}
   * 5sim returns:
   *   - { sms: [ { code: "123456", text: "Your code is 123456" } ] } when SMS received
   *   - "order not found" (string) for invalid order IDs
   *   Order status can be checked via the status field
   */
  async checkSms(externalOrderId: string): Promise<CheckSmsResult> {
    try {
      const data = await v1Request(
        this.apiUrl,
        this.token,
        `/user/check/${externalOrderId}`
      )

      // Check for string error responses (e.g., "order not found")
      if (typeof data.raw === 'string') {
        if (data.raw.includes('not found')) {
          return { status: 'error', error: 'Order not found' }
        }
        // Try to parse it as a potential code
        const codeMatch = data.raw.match(/(\d{4,8})/)
        if (codeMatch) {
          return { status: 'received', smsCode: codeMatch[1], smsText: data.raw }
        }
        return { status: 'error', error: data.raw }
      }

      // 5sim returns sms codes in data.sms array
      if (data.sms && Array.isArray(data.sms) && data.sms.length > 0) {
        const latestSms = data.sms[data.sms.length - 1]

        let smsCode: string | undefined
        let smsText: string | undefined

        if (typeof latestSms === 'string') {
          smsText = latestSms
          const codeMatch = latestSms.match(/(\d{4,8})/)
          smsCode = codeMatch ? codeMatch[1] : undefined
        } else if (typeof latestSms === 'object' && latestSms !== null) {
          smsText = String(latestSms.text || latestSms.code || '')
          const codeSource = String(latestSms.code || latestSms.text || '')
          const codeMatch = codeSource.match(/(\d{4,8})/)
          smsCode = codeMatch ? codeMatch[1] : (latestSms.code ? String(latestSms.code) : undefined)
        }

        return { status: 'received', smsCode, smsText }
      }

      // Check order status
      const status = String(data.status || '').toUpperCase()
      if (status === 'RECEIVED' || status === 'FINISHED' || status === 'SUCCESS') {
        return { status: 'received' }
      }
      if (status === 'TIMEOUT' || status === 'EXPIRED') {
        return { status: 'expired', error: 'Order timed out' }
      }
      if (status === 'CANCELED' || status === 'CANCELLED') {
        return { status: 'cancelled', error: 'Order was cancelled' }
      }

      return { status: 'waiting' }
    } catch (err) {
      return {
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to check SMS',
      }
    }
  }

  /**
   * Cancel an order using GET /v1/user/cancel/{id}
   * Returns "order not found" for invalid IDs (as plain text)
   */
  async cancelOrder(externalOrderId: string): Promise<CancelOrderResult> {
    try {
      const data = await v1Request(
        this.apiUrl,
        this.token,
        `/user/cancel/${externalOrderId}`
      )

      if (typeof data.raw === 'string' && data.raw.includes('not found')) {
        return { success: false, error: 'Order not found' }
      }

      if (data.error) {
        return { success: false, error: `Cancel failed: ${data.error}` }
      }

      const status = String(data.status || '').toUpperCase()
      return {
        success: true,
        refunded:
          status === 'CANCELED' ||
          status === 'CANCELLED' ||
          data.cancel === true ||
          data.refund === true,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to cancel order',
      }
    }
  }

  /**
   * Get available services and their countries with pricing.
   *
   * Uses:
   *   1. GET /v1/guest/countries - returns { slug: { iso: {code: 1}, prefix: {+code: 1}, text_en, ... } }
   *   2. GET /v1/guest/prices   - returns { slug: { service: { operator: { cost, count, rate, ... } } } }
   *
   * NOTE: The prices endpoint returns ALL countries at once, so we only need one request.
   * Country info comes from /guest/countries to get ISO codes and phone prefixes.
   */
  async getServices(): Promise<ServiceWithCountries[]> {
    try {
      // Step 1: Fetch countries list for metadata (ISO codes, phone prefixes, names)
      console.log('[5sim] getServices: fetching countries list...')
      const countriesData = await v1Request(this.apiUrl, this.token, '/guest/countries')

      // Parse countries - it's an object keyed by slug
      const countryInfoMap: Record<string, { isoCode: string; phonePrefix: string; name: string }> = {}

      if (countriesData && typeof countriesData === 'object' && !Array.isArray(countriesData)) {
        for (const [slug, info] of Object.entries(countriesData)) {
          if (typeof info !== 'object' || info === null) continue

          // Extract ISO code from { "us": 1 } format
          let isoCode = ''
          if (info.iso && typeof info.iso === 'object') {
            const isoKeys = Object.keys(info.iso)
            if (isoKeys.length > 0) isoCode = isoKeys[0].toLowerCase()
          }

          // Extract phone prefix from { "+1": 1 } format
          let phonePrefix = ''
          if (info.prefix && typeof info.prefix === 'object') {
            const prefixKeys = Object.keys(info.prefix)
            if (prefixKeys.length > 0) phonePrefix = prefixKeys[0].replace('+', '')
          }

          const name = String(info.text_en || info.text || slug)

          countryInfoMap[slug] = { isoCode, phonePrefix, name }
        }
      }

      console.log(`[5sim] getServices: found ${Object.keys(countryInfoMap).length} countries`)

      // Step 2: Fetch prices for all countries at once
      console.log('[5sim] getServices: fetching prices...')
      const pricesData = await v1Request(this.apiUrl, this.token, '/guest/prices')

      const servicesMap = new Map<string, ServiceWithCountries>()

      if (pricesData && typeof pricesData === 'object') {
        for (const [countrySlug, countryServices] of Object.entries(pricesData)) {
          if (typeof countryServices !== 'object' || countryServices === null) continue

          // Get ISO code and metadata for this country
          const info = countryInfoMap[countrySlug]
          const isoCode = info?.isoCode || slugToIso(countrySlug)
          const phoneCode = info?.phonePrefix || COUNTRY_PHONE_CODES[isoCode] || ''
          const countryName = info?.name || COUNTRY_NAMES[isoCode] || countrySlug.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
          const flag = countryCodeToFlag(isoCode)

          for (const [serviceName, operators] of Object.entries(countryServices as Record<string, any>)) {
            if (typeof operators !== 'object' || operators === null) continue

            // Find cheapest operator with count > 0
            let bestPrice = Infinity
            let bestCount = 0

            for (const [, opData] of Object.entries(operators as Record<string, any>)) {
              if (opData && typeof opData === 'object') {
                const price = parseFloat(String(opData.cost ?? opData.price ?? '0')) || 0
                const count = parseInt(String(opData.count ?? '0')) || 0
                if (count > 0 && price < bestPrice) {
                  bestPrice = price
                  bestCount = count
                }
              }
            }

            // Only include services with available numbers
            if (bestCount > 0 && bestPrice < Infinity) {
              const existingService = servicesMap.get(serviceName)
              const countryEntry = {
                code: isoCode,
                name: countryName,
                phoneCode,
                flag,
                price: Math.round(bestPrice * 100) / 100,
                available: true,
              }

              if (existingService) {
                existingService.countries.push(countryEntry)
              } else {
                servicesMap.set(serviceName, {
                  externalId: serviceName,
                  name: serviceName.charAt(0).toUpperCase() + serviceName.slice(1).replace(/_/g, ' '),
                  category: 'General',
                  countries: [countryEntry],
                })
              }
            }
          }
        }
      }

      const services = Array.from(servicesMap.values())
      console.log(`[5sim] getServices: found ${services.length} services across all countries`)

      return services
    } catch (err) {
      console.error('[5sim] getServices error:', err)
      throw new Error(
        `Failed to fetch services from 5sim: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    }
  }
}

// ==================== SETUP GUIDE ====================
export const FIVESIM_SETUP_GUIDE = {
  providerName: '5sim',
  apiUrl: 'https://5sim.net/v1',
  steps: [
    {
      title: 'Create Account',
      description: 'Go to https://5sim.net and click "Sign Up". Register with your email or social accounts.',
    },
    {
      title: 'Add Funds',
      description: 'Deposit funds into your 5sim account using available payment methods (crypto, card, etc.).',
    },
    {
      title: 'Generate API Key',
      description: 'Go to Settings → API → Generate API Key. Copy the JWT token shown. This is your API key.',
    },
    {
      title: 'Add Provider in VerifyHub',
      description:
        'In Admin → Providers → click "Add Provider". Fill in:\n• Name: 5sim\n• API URL: https://5sim.net/v1\n• API Key: paste your 5sim JWT token\n• Priority: 10 (higher = preferred)',
    },
    {
      title: 'Sync Services',
      description:
        'After adding the provider, click "Sync Services" to import available countries and prices from 5sim.',
    },
    {
      title: 'Set Prices & Enable',
      description:
        'Review synced services, set your markup percentage, and enable the ones you want to offer.',
    },
  ],
  apiDocs: 'https://5sim.net/docs',
  currency: 'RUB',
}
