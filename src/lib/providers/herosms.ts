// ==================== HeroSMS Provider Integration ====================
// API Endpoint: https://hero-sms.com/stubs/handler_api.php
// API Style: SMS-Activate compatible (handler_api.php with action param)
//
// Available actions:
//   getBalance           - Get account balance
//   getNumber            - Buy a number (POST or GET)
//   setStatus            - Set order status (cancel, complete, etc.)
//   getStatus            - Get order status + SMS code
//   getPrices            - Get prices for all countries/services
//   getCountries         - Get list of available countries
//   getOperators         - Get operators for a country
//   getNumbersVirtNumber - Check available numbers count
//   getNumbersStatus     - Check status of available numbers
//
// Setup Steps for User:
// 1. Go to https://hero-sms.com and create an account
// 2. Navigate to Dashboard → API Settings
// 3. Copy your API key
// 4. In VerifyHub Admin → Providers → Add Provider:
//    - Name: HeroSMS
//    - API URL: https://hero-sms.com/stubs/handler_api.php
//    - API Key: paste your key

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
// HeroSMS uses numeric IDs (returned by getCountries). We map them to ISO codes.
// This mapping is built from the live API but stored statically for reliability.
const HERO_COUNTRY_MAP: Record<number, { iso: string; name: string; phone: string }> = {
  0: { iso: 'ru', name: 'Russia', phone: '7' },
  1: { iso: 'ua', name: 'Ukraine', phone: '380' },
  2: { iso: 'kz', name: 'Kazakhstan', phone: '7' },
  3: { iso: 'cn', name: 'China', phone: '86' },
  4: { iso: 'ph', name: 'Philippines', phone: '63' },
  5: { iso: 'mm', name: 'Myanmar', phone: '95' },
  6: { iso: 'id', name: 'Indonesia', phone: '62' },
  7: { iso: 'my', name: 'Malaysia', phone: '60' },
  8: { iso: 'ke', name: 'Kenya', phone: '254' },
  9: { iso: 'tz', name: 'Tanzania', phone: '255' },
  10: { iso: 'vn', name: 'Vietnam', phone: '84' },
  11: { iso: 'kg', name: 'Kyrgyzstan', phone: '996' },
  12: { iso: 'us', name: 'USA (Virtual)', phone: '1' },
  13: { iso: 'il', name: 'Israel', phone: '972' },
  14: { iso: 'hk', name: 'Hong Kong', phone: '852' },
  15: { iso: 'pl', name: 'Poland', phone: '48' },
  16: { iso: 'gb', name: 'United Kingdom', phone: '44' },
  17: { iso: 'mg', name: 'Madagascar', phone: '261' },
  18: { iso: 'cd', name: 'DR Congo', phone: '243' },
  19: { iso: 'ng', name: 'Nigeria', phone: '234' },
  20: { iso: 'mo', name: 'Macao', phone: '853' },
  21: { iso: 'eg', name: 'Egypt', phone: '20' },
  22: { iso: 'in', name: 'India', phone: '91' },
  23: { iso: 'ie', name: 'Ireland', phone: '353' },
  24: { iso: 'kh', name: 'Cambodia', phone: '855' },
  25: { iso: 'la', name: 'Laos', phone: '856' },
  26: { iso: 'ht', name: 'Haiti', phone: '509' },
  27: { iso: 'ci', name: 'Ivory Coast', phone: '225' },
  28: { iso: 'gm', name: 'Gambia', phone: '220' },
  29: { iso: 'rs', name: 'Serbia', phone: '381' },
  30: { iso: 'ye', name: 'Yemen', phone: '967' },
  31: { iso: 'za', name: 'South Africa', phone: '27' },
  32: { iso: 'ro', name: 'Romania', phone: '40' },
  33: { iso: 'co', name: 'Colombia', phone: '57' },
  34: { iso: 'ee', name: 'Estonia', phone: '372' },
  35: { iso: 'az', name: 'Azerbaijan', phone: '994' },
  36: { iso: 'ca', name: 'Canada', phone: '1' },
  37: { iso: 'ma', name: 'Morocco', phone: '212' },
  38: { iso: 'gh', name: 'Ghana', phone: '233' },
  39: { iso: 'ar', name: 'Argentina', phone: '54' },
  40: { iso: 'uz', name: 'Uzbekistan', phone: '998' },
  41: { iso: 'cm', name: 'Cameroon', phone: '237' },
  42: { iso: 'td', name: 'Chad', phone: '235' },
  43: { iso: 'de', name: 'Germany', phone: '49' },
  44: { iso: 'lt', name: 'Lithuania', phone: '370' },
  45: { iso: 'hr', name: 'Croatia', phone: '385' },
  46: { iso: 'se', name: 'Sweden', phone: '46' },
  47: { iso: 'iq', name: 'Iraq', phone: '964' },
  48: { iso: 'nl', name: 'Netherlands', phone: '31' },
  49: { iso: 'lv', name: 'Latvia', phone: '371' },
  50: { iso: 'at', name: 'Austria', phone: '43' },
  51: { iso: 'by', name: 'Belarus', phone: '375' },
  52: { iso: 'th', name: 'Thailand', phone: '66' },
  53: { iso: 'sa', name: 'Saudi Arabia', phone: '966' },
  54: { iso: 'mx', name: 'Mexico', phone: '52' },
  55: { iso: 'tw', name: 'Taiwan', phone: '886' },
  56: { iso: 'es', name: 'Spain', phone: '34' },
  57: { iso: 'ir', name: 'Iran', phone: '98' },
  58: { iso: 'dz', name: 'Algeria', phone: '213' },
  59: { iso: 'si', name: 'Slovenia', phone: '386' },
  60: { iso: 'bd', name: 'Bangladesh', phone: '880' },
  61: { iso: 'sn', name: 'Senegal', phone: '221' },
  62: { iso: 'tr', name: 'Turkey', phone: '90' },
  63: { iso: 'cz', name: 'Czech Republic', phone: '420' },
  64: { iso: 'lk', name: 'Sri Lanka', phone: '94' },
  65: { iso: 'pe', name: 'Peru', phone: '51' },
  66: { iso: 'pk', name: 'Pakistan', phone: '92' },
  67: { iso: 'nz', name: 'New Zealand', phone: '64' },
  68: { iso: 'gn', name: 'Guinea', phone: '224' },
  69: { iso: 'ml', name: 'Mali', phone: '223' },
  70: { iso: 've', name: 'Venezuela', phone: '58' },
  71: { iso: 'et', name: 'Ethiopia', phone: '251' },
  72: { iso: 'mn', name: 'Mongolia', phone: '976' },
  73: { iso: 'br', name: 'Brazil', phone: '55' },
  74: { iso: 'af', name: 'Afghanistan', phone: '93' },
  75: { iso: 'ug', name: 'Uganda', phone: '256' },
  76: { iso: 'ao', name: 'Angola', phone: '244' },
  77: { iso: 'cy', name: 'Cyprus', phone: '357' },
  78: { iso: 'fr', name: 'France', phone: '33' },
  79: { iso: 'pg', name: 'Papua', phone: '675' },
  80: { iso: 'mz', name: 'Mozambique', phone: '258' },
  81: { iso: 'np', name: 'Nepal', phone: '977' },
  82: { iso: 'be', name: 'Belgium', phone: '32' },
  83: { iso: 'bg', name: 'Bulgaria', phone: '359' },
  84: { iso: 'hu', name: 'Hungary', phone: '36' },
  85: { iso: 'md', name: 'Moldova', phone: '373' },
  86: { iso: 'it', name: 'Italy', phone: '39' },
  87: { iso: 'py', name: 'Paraguay', phone: '595' },
  88: { iso: 'hn', name: 'Honduras', phone: '504' },
  89: { iso: 'tn', name: 'Tunisia', phone: '216' },
  90: { iso: 'ni', name: 'Nicaragua', phone: '505' },
  91: { iso: 'tl', name: 'Timor-Leste', phone: '670' },
  92: { iso: 'bo', name: 'Bolivia', phone: '591' },
  93: { iso: 'cr', name: 'Costa Rica', phone: '506' },
  94: { iso: 'gt', name: 'Guatemala', phone: '502' },
  95: { iso: 'ae', name: 'UAE', phone: '971' },
  96: { iso: 'zw', name: 'Zimbabwe', phone: '263' },
  97: { iso: 'pr', name: 'Puerto Rico', phone: '1' },
  98: { iso: 'sd', name: 'Sudan', phone: '249' },
  99: { iso: 'tg', name: 'Togo', phone: '228' },
  100: { iso: 'kw', name: 'Kuwait', phone: '965' },
  101: { iso: 'sv', name: 'El Salvador', phone: '503' },
  102: { iso: 'ly', name: 'Libya', phone: '218' },
  103: { iso: 'jm', name: 'Jamaica', phone: '1' },
  104: { iso: 'tt', name: 'Trinidad and Tobago', phone: '1' },
  105: { iso: 'ec', name: 'Ecuador', phone: '593' },
  106: { iso: 'sz', name: 'Swaziland', phone: '268' },
  107: { iso: 'om', name: 'Oman', phone: '968' },
  108: { iso: 'ba', name: 'Bosnia', phone: '387' },
  109: { iso: 'do', name: 'Dominican Republic', phone: '1' },
  110: { iso: 'sy', name: 'Syria', phone: '963' },
  111: { iso: 'qa', name: 'Qatar', phone: '974' },
  112: { iso: 'pa', name: 'Panama', phone: '507' },
  113: { iso: 'cu', name: 'Cuba', phone: '53' },
  114: { iso: 'mr', name: 'Mauritania', phone: '222' },
  115: { iso: 'sl', name: 'Sierra Leone', phone: '232' },
  116: { iso: 'jo', name: 'Jordan', phone: '962' },
  117: { iso: 'pt', name: 'Portugal', phone: '351' },
  118: { iso: 'bb', name: 'Barbados', phone: '1' },
  119: { iso: 'bi', name: 'Burundi', phone: '257' },
  120: { iso: 'bj', name: 'Benin', phone: '229' },
  121: { iso: 'bn', name: 'Brunei', phone: '673' },
  122: { iso: 'bs', name: 'Bahamas', phone: '1' },
  123: { iso: 'bw', name: 'Botswana', phone: '267' },
  124: { iso: 'bz', name: 'Belize', phone: '501' },
  125: { iso: 'cf', name: 'Central African Republic', phone: '236' },
  126: { iso: 'dm', name: 'Dominica', phone: '1' },
  127: { iso: 'gd', name: 'Grenada', phone: '1' },
  128: { iso: 'ge', name: 'Georgia', phone: '995' },
  129: { iso: 'gr', name: 'Greece', phone: '30' },
  130: { iso: 'gw', name: 'Guinea-Bissau', phone: '245' },
  131: { iso: 'gy', name: 'Guyana', phone: '592' },
  132: { iso: 'is', name: 'Iceland', phone: '354' },
  133: { iso: 'km', name: 'Comoros', phone: '269' },
  134: { iso: 'kn', name: 'Saint Kitts and Nevis', phone: '1' },
  135: { iso: 'lr', name: 'Liberia', phone: '231' },
  136: { iso: 'ls', name: 'Lesotho', phone: '266' },
  137: { iso: 'mw', name: 'Malawi', phone: '265' },
  138: { iso: 'na', name: 'Namibia', phone: '264' },
  139: { iso: 'ne', name: 'Niger', phone: '227' },
  140: { iso: 'rw', name: 'Rwanda', phone: '250' },
  141: { iso: 'sk', name: 'Slovakia', phone: '421' },
  142: { iso: 'sr', name: 'Suriname', phone: '597' },
  143: { iso: 'tj', name: 'Tajikistan', phone: '992' },
  144: { iso: 'mc', name: 'Monaco', phone: '377' },
  145: { iso: 'bh', name: 'Bahrain', phone: '973' },
  146: { iso: 're', name: 'Reunion', phone: '262' },
  147: { iso: 'zm', name: 'Zambia', phone: '260' },
  148: { iso: 'am', name: 'Armenia', phone: '374' },
  149: { iso: 'so', name: 'Somalia', phone: '252' },
  150: { iso: 'cg', name: 'Congo', phone: '242' },
  151: { iso: 'cl', name: 'Chile', phone: '56' },
  152: { iso: 'bf', name: 'Burkina Faso', phone: '226' },
  153: { iso: 'lb', name: 'Lebanon', phone: '961' },
  154: { iso: 'ga', name: 'Gabon', phone: '241' },
  155: { iso: 'al', name: 'Albania', phone: '355' },
  156: { iso: 'uy', name: 'Uruguay', phone: '598' },
  157: { iso: 'mu', name: 'Mauritius', phone: '230' },
  158: { iso: 'bt', name: 'Bhutan', phone: '975' },
  159: { iso: 'mv', name: 'Maldives', phone: '960' },
  160: { iso: 'gp', name: 'Guadeloupe', phone: '590' },
  161: { iso: 'tm', name: 'Turkmenistan', phone: '993' },
  162: { iso: 'gf', name: 'French Guiana', phone: '594' },
  163: { iso: 'fi', name: 'Finland', phone: '358' },
  164: { iso: 'lc', name: 'Saint Lucia', phone: '1' },
  165: { iso: 'lu', name: 'Luxembourg', phone: '352' },
  166: { iso: 'vc', name: 'Saint Vincent', phone: '1' },
  167: { iso: 'gq', name: 'Equatorial Guinea', phone: '240' },
  168: { iso: 'dj', name: 'Djibouti', phone: '253' },
  169: { iso: 'ag', name: 'Antigua and Barbuda', phone: '1' },
  170: { iso: 'ky', name: 'Cayman Islands', phone: '1' },
  171: { iso: 'me', name: 'Montenegro', phone: '382' },
  172: { iso: 'dk', name: 'Denmark', phone: '45' },
  173: { iso: 'ch', name: 'Switzerland', phone: '41' },
  174: { iso: 'no', name: 'Norway', phone: '47' },
  175: { iso: 'au', name: 'Australia', phone: '61' },
  176: { iso: 'er', name: 'Eritrea', phone: '291' },
  177: { iso: 'ss', name: 'South Sudan', phone: '211' },
  178: { iso: 'st', name: 'Sao Tome and Principe', phone: '239' },
  179: { iso: 'aw', name: 'Aruba', phone: '297' },
  180: { iso: 'ms', name: 'Montserrat', phone: '1' },
  181: { iso: 'ai', name: 'Anguilla', phone: '1' },
  182: { iso: 'jp', name: 'Japan', phone: '81' },
  183: { iso: 'mk', name: 'North Macedonia', phone: '389' },
  184: { iso: 'sc', name: 'Seychelles', phone: '248' },
  185: { iso: 'nc', name: 'New Caledonia', phone: '687' },
  186: { iso: 'cv', name: 'Cape Verde', phone: '238' },
  187: { iso: 'us', name: 'USA', phone: '1' },
  188: { iso: 'ps', name: 'Palestine', phone: '970' },
  189: { iso: 'fj', name: 'Fiji', phone: '679' },
  190: { iso: 'kr', name: 'South Korea', phone: '82' },
  196: { iso: 'sg', name: 'Singapore', phone: '65' },
  198: { iso: 'ws', name: 'Samoa', phone: '685' },
  199: { iso: 'mt', name: 'Malta', phone: '356' },
  201: { iso: 'gi', name: 'Gibraltar', phone: '350' },
  203: { iso: 'xk', name: 'Kosovo', phone: '383' },
  204: { iso: 'nu', name: 'Niue', phone: '683' },
}

// Reverse lookup: ISO code → HeroSMS numeric ID
const ISO_TO_HERO_ID: Record<string, number> = {}
for (const [idStr, info] of Object.entries(HERO_COUNTRY_MAP)) {
  ISO_TO_HERO_ID[info.iso] = parseInt(idStr, 10)
}

function countryCodeToFlag(code: string): string {
  const offset = 127397
  return code
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(char.charCodeAt(0) + offset))
    .join('')
}

// ==================== API Request ====================

const REQUEST_TIMEOUT = 30000

interface HeroApiResponse {
  response?: string  // Raw response string (e.g., "ACCESS_BALANCE:$5.23")
  status?: string    // Status code (e.g., "success")
  [key: string]: any
}

async function apiRequest(
  apiUrl: string,
  apiKey: string,
  action: string,
  params: Record<string, string> = {}
): Promise<HeroApiResponse> {
  const allParams = new URLSearchParams({
    api_key: apiKey,
    action,
    ...params,
  })

  const url = `${apiUrl}?${allParams.toString()}`
  console.log(`[HeroSMS] ${action}: ${url.substring(0, 200)}...`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`HeroSMS API HTTP ${response.status}: ${body.substring(0, 200)}`)
    }

    const text = await response.text()

    // Try parsing as JSON first
    try {
      const json = JSON.parse(text)
      // Check for error responses
      if (json.title === 'BAD_KEY' || json.title === 'BAD_ACTION' || json.title === 'ERROR') {
        throw new Error(`HeroSMS API error: ${json.title} - ${json.details || 'Unknown error'}`)
      }
      if (json.status === 'error') {
        throw new Error(`HeroSMS API error: ${json.message || json.error || 'Unknown error'}`)
      }
      return json
    } catch (parseErr) {
      // If it's not JSON, it's a colon-separated response (legacy SMS-Activate format)
      if (text.includes(':')) {
        return { response: text.trim() }
      }
      throw parseErr
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('HeroSMS API request timed out (30s)')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Parse colon-separated API response
 * Format: "ACTION_NAME:data1:data2:..."
 * Examples:
 *   "ACCESS_BALANCE:5.23"
 *   "ACCESS_NUMBER:id:phone:expiresAt:operator:service"  
 *   "STATUS_OK:code" or "STATUS_OK:text:code"
 *   "BAD_KEY", "NO_NUMBERS", "NO_BALANCE", etc.
 */
function parseResponse(data: HeroApiResponse): { action: string; parts: string[] } {
  const raw = data.response || ''
  if (!raw.includes(':')) {
    return { action: raw.trim(), parts: [] }
  }
  const colonIdx = raw.indexOf(':')
  return {
    action: raw.substring(0, colonIdx).trim(),
    parts: raw.substring(colonIdx + 1).split(':'),
  }
}

// ==================== HeroSMSProvider ====================

export class HeroSMSProvider implements SMSProvider {
  readonly name: string
  readonly apiUrl: string
  private apiKey: string

  constructor(config: ProviderConfig) {
    this.name = config.name || 'HeroSMS'
    this.apiUrl = (config.apiUrl || 'https://hero-sms.com/stubs/handler_api.php').replace(/\/+$/, '')
    this.apiKey = config.apiKey
  }

  // ---- Balance ----
  async getBalance(): Promise<ProviderBalance> {
    const data = await apiRequest(this.apiUrl, this.apiKey, 'getBalance')

    // JSON format
    if (data.balance !== undefined) {
      return {
        balance: parseFloat(String(data.balance || '0')),
        currency: String(data.currency || 'RUB'),
      }
    }

    // Colon-separated format: "ACCESS_BALANCE:5.23"
    const parsed = parseResponse(data)
    if (parsed.action === 'ACCESS_BALANCE' && parsed.parts.length > 0) {
      return {
        balance: parseFloat(parsed.parts[0]) || 0,
        currency: 'RUB',
      }
    }

    throw new Error(`Unexpected balance response: ${data.response || JSON.stringify(data)}`)
  }

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

  // ---- Buy Number ----
  async buyNumber(externalServiceId: string, country: string): Promise<BuyNumberResult> {
    try {
      // Resolve country to HeroSMS numeric ID
      const heroCountryId = ISO_TO_HERO_ID[country.toLowerCase()] ?? parseInt(country, 10)
      console.log(`[HeroSMS] buyNumber: service=${externalServiceId}, country=${country} -> heroId=${heroCountryId}`)

      const data = await apiRequest(this.apiUrl, this.apiKey, 'getNumber', {
        service: externalServiceId,
        country: String(heroCountryId),
      })

      // JSON format (getNumberV2 returns activationId & phoneNumber)
      if (data.activationId || data.phoneNumber) {
        return {
          success: true,
          phoneNumber: String(data.phoneNumber || data.phone || data.phone_number || ''),
          externalOrderId: String(data.activationId || data.id || data.order_id || ''),
          expiresAt: new Date(Date.now() + 20 * 60 * 1000),
        }
      }
      // JSON format (legacy)
      if (data.id || data.phone) {
        return {
          success: true,
          phoneNumber: String(data.phone || data.phone_number || ''),
          externalOrderId: String(data.id || data.order_id || ''),
          expiresAt: new Date(Date.now() + 20 * 60 * 1000),
        }
      }

      // Colon-separated format: "ACCESS_NUMBER:id:phone:expiresAt:operator:service"
      const parsed = parseResponse(data)
      if (parsed.action === 'ACCESS_NUMBER' && parsed.parts.length >= 2) {
        return {
          success: true,
          phoneNumber: parsed.parts[1],
          externalOrderId: parsed.parts[0],
          expiresAt: new Date(Date.now() + 20 * 60 * 1000),
        }
      }

      // Error responses
      if (parsed.action === 'NO_NUMBERS') {
        return { success: false, error: `No numbers available for ${externalServiceId} in ${country}` }
      }
      if (parsed.action === 'NO_BALANCE') {
        return { success: false, error: 'Insufficient balance on HeroSMS account' }
      }
      if (parsed.action === 'BAD_SERVICE') {
        return { success: false, error: `Invalid service: ${externalServiceId}` }
      }
      if (parsed.action === 'BAD_ACTION') {
        return { success: false, error: 'Invalid API action' }
      }
      if (parsed.action === 'BAD_KEY') {
        return { success: false, error: 'Invalid API key' }
      }
      if (parsed.action.startsWith('ERROR') || parsed.action.startsWith('BAD')) {
        return { success: false, error: `${parsed.action}${parsed.parts.length ? ': ' + parsed.parts.join(', ') : ''}` }
      }

      return { success: false, error: `Unexpected buy response: ${data.response || JSON.stringify(data)}` }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to buy number' }
    }
  }

  // ---- Check SMS ----
  async checkSms(externalOrderId: string): Promise<CheckSmsResult> {
    try {
      const data = await apiRequest(this.apiUrl, this.apiKey, 'getStatus', {
        id: externalOrderId,
      })

      // getStatusV2 JSON format: { sms: { code, text }, call: { code, ... } }
      if (data.sms && typeof data.sms === 'object' && data.sms.code) {
        return {
          status: 'received',
          smsCode: String(data.sms.code),
          smsText: String(data.sms.text || data.sms.code),
        }
      }
      // JSON format (getStatus)
      if (data.sms_code || data.code || data.sms) {
        const code = String(data.sms_code || data.code || data.sms || '')
        const codeMatch = code.match(/(\d{4,8})/)
        return {
          status: 'received',
          smsCode: codeMatch ? codeMatch[1] : code,
          smsText: String(data.sms_text || data.text || code),
        }
      }

      // Check JSON status field
      const jsonStatus = String(data.status || '').toUpperCase()
      if (jsonStatus === 'RECEIVED' || jsonStatus === 'COMPLETED' || jsonStatus === 'FINISHED' || jsonStatus === 'SUCCESS') {
        const code = String(data.code || data.sms || '')
        if (code) {
          const codeMatch = code.match(/(\d{4,8})/)
          return { status: 'received', smsCode: codeMatch ? codeMatch[1] : code, smsText: code }
        }
        return { status: 'received' }
      }
      if (jsonStatus === 'CANCELED' || jsonStatus === 'CANCELLED') {
        return { status: 'cancelled', error: 'Order was cancelled' }
      }
      if (jsonStatus === 'EXPIRED' || jsonStatus === 'TIMEOUT') {
        return { status: 'expired', error: 'Order has expired' }
      }

      // Colon-separated format
      const parsed = parseResponse(data)

      if (parsed.action === 'STATUS_OK' && parsed.parts.length > 0) {
        // "STATUS_OK:code" or "STATUS_OK:text:code"
        const codePart = parsed.parts[parsed.parts.length - 1]
        const codeMatch = codePart.match(/(\d{4,8})/)
        return {
          status: 'received',
          smsCode: codeMatch ? codeMatch[1] : codePart,
          smsText: parsed.parts.join(' '),
        }
      }

      if (parsed.action === 'STATUS_WAIT_CODE' || parsed.action === 'WAIT_CODE') {
        return { status: 'waiting' }
      }

      if (parsed.action === 'STATUS_CANCEL') {
        return { status: 'cancelled', error: 'Order was cancelled' }
      }

      if (parsed.action === 'STATUS_EXPIRED' || parsed.action === 'EXPIRED') {
        return { status: 'expired', error: 'Order has expired' }
      }

      // Default: waiting
      return { status: 'waiting' }
    } catch (err) {
      return { status: 'error', error: err instanceof Error ? err.message : 'Failed to check SMS' }
    }
  }

  // ---- Cancel Order ----
  async cancelOrder(externalOrderId: string): Promise<CancelOrderResult> {
    try {
      // setStatus action with status=8 means cancel in SMS-Activate format
      const data = await apiRequest(this.apiUrl, this.apiKey, 'setStatus', {
        id: externalOrderId,
        status: '8', // 8 = cancel
      })

      // JSON format
      if (data.success === true || data.status === 'success') {
        return { success: true, refunded: true }
      }
      if (data.refunded === true) {
        return { success: true, refunded: true }
      }

      // Colon-separated format
      const parsed = parseResponse(data)
      if (parsed.action === 'ACCESS_CANCEL') {
        return { success: true, refunded: true }
      }
      if (parsed.action === 'ACCESS_REFUND') {
        return { success: true, refunded: true }
      }

      // Error: already received or can't cancel
      return {
        success: false,
        error: data.response || `Cannot cancel: ${parsed.action}`,
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to cancel order' }
    }
  }

  // ---- Get Services (Price List) ----
  async getServices(): Promise<ServiceWithCountries[]> {
    try {
      console.log('[HeroSMS] getServices: fetching countries...')
      const countriesData = await apiRequest(this.apiUrl, this.apiKey, 'getCountries')

      // Build country lookup from API response (overrides static map)
      const countryLookup: Record<number, { iso: string; name: string; phone: string }> = { ...HERO_COUNTRY_MAP }

      if (Array.isArray(countriesData)) {
        for (const c of countriesData) {
          if (c.id !== undefined && c.eng) {
            const id = c.id
            // If we don't have a mapping for this ID, create a basic one
            if (!countryLookup[id]) {
              countryLookup[id] = {
                iso: `hero_${id}`,
                name: c.eng,
                phone: String(c.id), // Will be empty until we can determine
              }
            } else {
              // Update name from live data
              countryLookup[id].name = c.eng
            }
          }
        }
      }

      console.log('[HeroSMS] getServices: fetching prices (this may take a moment)...')
      const pricesData = await apiRequest(this.apiUrl, this.apiKey, 'getPrices', {
        country: '0',  // 0 = all countries
        service: '0',  // 0 = all services
      })

      const servicesMap = new Map<string, ServiceWithCountries>()

      // getPrices returns either:
      // 1. Array format: [{ "serviceId": { "countryId": { cost: N, count: M } } }]
      // 2. Plain object: { "serviceId": { "countryId": { cost: N, count: M } } }
      let pricesObj = pricesData
      if (Array.isArray(pricesObj)) {
        // Unwrap the array
        pricesObj = pricesObj.find((item: any) => typeof item === 'object' && item !== null) || {}
      }

      if (pricesObj && typeof pricesObj === 'object' && !Array.isArray(pricesObj)) {
        // Prices format: { "serviceId": { "countryId": { count: N, price: M, ... }, ... }, ... }
        for (const [serviceId, countries] of Object.entries(pricesObj)) {
          if (typeof countries !== 'object' || countries === null) continue
          if (serviceId === 'title' || serviceId === 'details') continue // Skip error fields

          for (const [countryIdStr, priceInfo] of Object.entries(countries as Record<string, any>)) {
            const countryId = parseInt(countryIdStr, 10)
            if (isNaN(countryId) || typeof priceInfo !== 'object' || priceInfo === null) continue

            const countryInfo = countryLookup[countryId]
            if (!countryInfo) continue

            const count = parseInt(String(priceInfo.count || priceInfo.available || '0')) || 0
            const price = parseFloat(String(priceInfo.price || priceInfo.cost || '0')) || 0

            // Skip if no available numbers
            if (count <= 0 && price <= 0) continue

            const isoCode = countryInfo.iso
            const countryEntry = {
              code: isoCode,
              name: countryInfo.name,
              phoneCode: countryInfo.phone,
              flag: countryCodeToFlag(isoCode),
              price: Math.round(price * 100) / 100,
              available: count > 0,
            }

            const existingService = servicesMap.get(serviceId)
            if (existingService) {
              existingService.countries.push(countryEntry)
            } else {
              servicesMap.set(serviceId, {
                externalId: serviceId,
                name: serviceId.charAt(0).toUpperCase() + serviceId.slice(1).replace(/_/g, ' '),
                category: 'General',
                countries: [countryEntry],
              })
            }
          }
        }
      }

      const services = Array.from(servicesMap.values())
      console.log(`[HeroSMS] getServices: found ${services.length} services across all countries`)

      return services
    } catch (err) {
      console.error('[HeroSMS] getServices error:', err)
      throw new Error(`Failed to fetch services from HeroSMS: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }
}

// ==================== SETUP GUIDE ====================
export const HEROSMS_SETUP_GUIDE = {
  providerName: 'HeroSMS',
  apiUrl: 'https://hero-sms.com/stubs/handler_api.php',
  steps: [
    {
      title: 'Create Account',
      description: 'Go to https://hero-sms.com and register for an account with your email.',
    },
    {
      title: 'Add Funds',
      description: 'Deposit funds into your HeroSMS account using available payment methods.',
    },
    {
      title: 'Get API Key',
      description: 'Go to Dashboard → API Settings. Copy your API key.',
    },
    {
      title: 'Add Provider in VerifyHub',
      description: 'In Admin → Providers → click "Add Provider". Fill in:\n• Name: HeroSMS\n• API URL: https://hero-sms.com/stubs/handler_api.php\n• API Key: paste your HeroSMS API key\n• Priority: 5 (lower = fallback)',
    },
    {
      title: 'Sync Services',
      description: 'After adding the provider, click "Sync Services" to import available countries and prices from HeroSMS.',
    },
    {
      title: 'Set Prices & Enable',
      description: 'Review synced services, set your markup percentage, and enable the ones you want to offer.',
    },
  ],
  apiDocs: 'https://hero-sms.com/stubs/handler_api.php',
  currency: 'RUB',
}
