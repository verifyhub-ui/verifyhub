// ==================== SMS-Man Provider Integration ====================
// API Endpoint: https://api.sms-man.com/rent-api/
// API Style: Token-based REST (query parameter auth)
//
// Available endpoints:
//   get-balance          - Get account balance
//   limits               - Get available numbers + pricing for country/type
//   get-number           - Rent a number
//   get-number (partial) - Rent number with app ID for specific app
//   set-status           - Cancel/complete order (status: reject, close, repeat)
//   get-all-sms          - Get SMS messages for a request
//   get-all-requests     - Get all active requests
//
// Setup Steps for User:
// 1. Go to https://sms-man.com and create an account
// 2. Navigate to Profile → API Settings
// 3. Copy your API token
// 4. In VerifyHub Admin → Providers → Add Provider:
//    - Name: SMS-Man
//    - API URL: https://api.sms-man.com
//    - API Key: paste your token

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
// SMS-Man uses numeric country_id. We map them to ISO codes.
const SMSMAN_COUNTRY_MAP: Record<number, { iso: string; name: string; phone: string }> = {
  1: { iso: 'ru', name: 'Russia', phone: '7' },
  2: { iso: 'ua', name: 'Ukraine', phone: '380' },
  3: { iso: 'kz', name: 'Kazakhstan', phone: '7' },
  4: { iso: 'id', name: 'Indonesia', phone: '62' },
  5: { iso: 'ph', name: 'Philippines', phone: '63' },
  6: { iso: 'my', name: 'Malaysia', phone: '60' },
  7: { iso: 'ke', name: 'Kenya', phone: '254' },
  8: { iso: 'tz', name: 'Tanzania', phone: '255' },
  9: { iso: 'vn', name: 'Vietnam', phone: '84' },
  10: { iso: 'kg', name: 'Kyrgyzstan', phone: '996' },
  11: { iso: 'us', name: 'United States', phone: '1' },
  12: { iso: 'gb', name: 'United Kingdom', phone: '44' },
  13: { iso: 'pl', name: 'Poland', phone: '48' },
  14: { iso: 'il', name: 'Israel', phone: '972' },
  15: { iso: 'hk', name: 'Hong Kong', phone: '852' },
  16: { iso: 'in', name: 'India', phone: '91' },
  17: { iso: 'ie', name: 'Ireland', phone: '353' },
  18: { iso: 'gh', name: 'Ghana', phone: '233' },
  19: { iso: 'ng', name: 'Nigeria', phone: '234' },
  20: { iso: 'de', name: 'Germany', phone: '49' },
  21: { iso: 'nl', name: 'Netherlands', phone: '31' },
  22: { iso: 'be', name: 'Belgium', phone: '32' },
  23: { iso: 'fr', name: 'France', phone: '33' },
  24: { iso: 'es', name: 'Spain', phone: '34' },
  25: { iso: 'it', name: 'Italy', phone: '39' },
  26: { iso: 'se', name: 'Sweden', phone: '46' },
  27: { iso: 'fi', name: 'Finland', phone: '358' },
  28: { iso: 'no', name: 'Norway', phone: '47' },
  29: { iso: 'dk', name: 'Denmark', phone: '45' },
  30: { iso: 'at', name: 'Austria', phone: '43' },
  31: { iso: 'ch', name: 'Switzerland', phone: '41' },
  32: { iso: 'pt', name: 'Portugal', phone: '351' },
  33: { iso: 'gr', name: 'Greece', phone: '30' },
  34: { iso: 'cz', name: 'Czech Republic', phone: '420' },
  35: { iso: 'ro', name: 'Romania', phone: '40' },
  36: { iso: 'hu', name: 'Hungary', phone: '36' },
  37: { iso: 'ee', name: 'Estonia', phone: '372' },
  38: { iso: 'lv', name: 'Latvia', phone: '371' },
  39: { iso: 'lt', name: 'Lithuania', phone: '370' },
  40: { iso: 'bg', name: 'Bulgaria', phone: '359' },
  41: { iso: 'hr', name: 'Croatia', phone: '385' },
  42: { iso: 'sk', name: 'Slovakia', phone: '421' },
  43: { iso: 'si', name: 'Slovenia', phone: '386' },
  44: { iso: 'rs', name: 'Serbia', phone: '381' },
  45: { iso: 'ba', name: 'Bosnia', phone: '387' },
  46: { iso: 'me', name: 'Montenegro', phone: '382' },
  47: { iso: 'mk', name: 'North Macedonia', phone: '389' },
  48: { iso: 'al', name: 'Albania', phone: '355' },
  49: { iso: 'tr', name: 'Turkey', phone: '90' },
  50: { iso: 'cy', name: 'Cyprus', phone: '357' },
  51: { iso: 'ca', name: 'Canada', phone: '1' },
  52: { iso: 'mx', name: 'Mexico', phone: '52' },
  53: { iso: 'br', name: 'Brazil', phone: '55' },
  54: { iso: 'ar', name: 'Argentina', phone: '54' },
  55: { iso: 'cl', name: 'Chile', phone: '56' },
  56: { iso: 'co', name: 'Colombia', phone: '57' },
  57: { iso: 'pe', name: 'Peru', phone: '51' },
  58: { iso: 've', name: 'Venezuela', phone: '58' },
  59: { iso: 'ec', name: 'Ecuador', phone: '593' },
  60: { iso: 'cr', name: 'Costa Rica', phone: '506' },
  61: { iso: 'pa', name: 'Panama', phone: '507' },
  62: { iso: 'do', name: 'Dominican Republic', phone: '1' },
  63: { iso: 'gt', name: 'Guatemala', phone: '502' },
  64: { iso: 'hn', name: 'Honduras', phone: '504' },
  65: { iso: 'sv', name: 'El Salvador', phone: '503' },
  66: { iso: 'py', name: 'Paraguay', phone: '595' },
  67: { iso: 'uy', name: 'Uruguay', phone: '598' },
  68: { iso: 'bo', name: 'Bolivia', phone: '591' },
  69: { iso: 'cu', name: 'Cuba', phone: '53' },
  70: { iso: 'pr', name: 'Puerto Rico', phone: '1' },
  71: { iso: 'eg', name: 'Egypt', phone: '20' },
  72: { iso: 'ma', name: 'Morocco', phone: '212' },
  73: { iso: 'tn', name: 'Tunisia', phone: '216' },
  74: { iso: 'dz', name: 'Algeria', phone: '213' },
  75: { iso: 'za', name: 'South Africa', phone: '27' },
  76: { iso: 'cm', name: 'Cameroon', phone: '237' },
  77: { iso: 'ci', name: 'Ivory Coast', phone: '225' },
  78: { iso: 'sn', name: 'Senegal', phone: '221' },
  79: { iso: 'ug', name: 'Uganda', phone: '256' },
  80: { iso: 'mg', name: 'Madagascar', phone: '261' },
  81: { iso: 'et', name: 'Ethiopia', phone: '251' },
  82: { iso: 'rw', name: 'Rwanda', phone: '250' },
  83: { iso: 'mm', name: 'Myanmar', phone: '95' },
  84: { iso: 'th', name: 'Thailand', phone: '66' },
  85: { iso: 'kh', name: 'Cambodia', phone: '855' },
  86: { iso: 'la', name: 'Laos', phone: '856' },
  87: { iso: 'jp', name: 'Japan', phone: '81' },
  88: { iso: 'kr', name: 'South Korea', phone: '82' },
  89: { iso: 'cn', name: 'China', phone: '86' },
  90: { iso: 'tw', name: 'Taiwan', phone: '886' },
  91: { iso: 'pk', name: 'Pakistan', phone: '92' },
  92: { iso: 'bd', name: 'Bangladesh', phone: '880' },
  93: { iso: 'lk', name: 'Sri Lanka', phone: '94' },
  94: { iso: 'np', name: 'Nepal', phone: '977' },
  95: { iso: 'mo', name: 'Macao', phone: '853' },
  96: { iso: 'sg', name: 'Singapore', phone: '65' },
  97: { iso: 'au', name: 'Australia', phone: '61' },
  98: { iso: 'nz', name: 'New Zealand', phone: '64' },
  99: { iso: 'ae', name: 'UAE', phone: '971' },
  100: { iso: 'sa', name: 'Saudi Arabia', phone: '966' },
  101: { iso: 'qa', name: 'Qatar', phone: '974' },
  102: { iso: 'kw', name: 'Kuwait', phone: '965' },
  103: { iso: 'bh', name: 'Bahrain', phone: '973' },
  104: { iso: 'om', name: 'Oman', phone: '968' },
  105: { iso: 'jo', name: 'Jordan', phone: '962' },
  106: { iso: 'iq', name: 'Iraq', phone: '964' },
  107: { iso: 'lb', name: 'Lebanon', phone: '961' },
  108: { iso: 'ye', name: 'Yemen', phone: '967' },
  109: { iso: 'ps', name: 'Palestine', phone: '970' },
  110: { iso: 'ge', name: 'Georgia', phone: '995' },
  111: { iso: 'am', name: 'Armenia', phone: '374' },
  112: { iso: 'az', name: 'Azerbaijan', phone: '994' },
  113: { iso: 'uz', name: 'Uzbekistan', phone: '998' },
  114: { iso: 'tm', name: 'Turkmenistan', phone: '993' },
  115: { iso: 'tj', name: 'Tajikistan', phone: '992' },
  116: { iso: 'mn', name: 'Mongolia', phone: '976' },
  117: { iso: 'by', name: 'Belarus', phone: '375' },
  118: { iso: 'md', name: 'Moldova', phone: '373' },
  119: { iso: 'je', name: 'Jersey', phone: '44' },
  120: { iso: 'gg', name: 'Guernsey', phone: '44' },
  121: { iso: 'im', name: 'Isle of Man', phone: '44' },
  122: { iso: 'is', name: 'Iceland', phone: '354' },
  123: { iso: 'lu', name: 'Luxembourg', phone: '352' },
  124: { iso: 'mt', name: 'Malta', phone: '356' },
  125: { iso: 'mc', name: 'Monaco', phone: '377' },
  126: { iso: 'li', name: 'Liechtenstein', phone: '423' },
  127: { iso: 'sm', name: 'San Marino', phone: '378' },
  128: { iso: 'va', name: 'Vatican', phone: '379' },
  129: { iso: 'cd', name: 'DR Congo', phone: '243' },
  130: { iso: 'cg', name: 'Congo', phone: '242' },
  131: { iso: 'ga', name: 'Gabon', phone: '241' },
  132: { iso: 'gq', name: 'Equatorial Guinea', phone: '240' },
  133: { iso: 'ao', name: 'Angola', phone: '244' },
  134: { iso: 'mz', name: 'Mozambique', phone: '258' },
  135: { iso: 'zw', name: 'Zimbabwe', phone: '263' },
  136: { iso: 'zm', name: 'Zambia', phone: '260' },
  137: { iso: 'mw', name: 'Malawi', phone: '265' },
  138: { iso: 'bw', name: 'Botswana', phone: '267' },
  139: { iso: 'na', name: 'Namibia', phone: '264' },
  140: { iso: 'lr', name: 'Liberia', phone: '231' },
  141: { iso: 'sl', name: 'Sierra Leone', phone: '232' },
  142: { iso: 'gm', name: 'Gambia', phone: '220' },
  143: { iso: 'gn', name: 'Guinea', phone: '224' },
  144: { iso: 'ml', name: 'Mali', phone: '223' },
  145: { iso: 'bf', name: 'Burkina Faso', phone: '226' },
  146: { iso: 'ne', name: 'Niger', phone: '227' },
  147: { iso: 'tg', name: 'Togo', phone: '228' },
  148: { iso: 'bj', name: 'Benin', phone: '229' },
  149: { iso: 'td', name: 'Chad', phone: '235' },
  150: { iso: 'cf', name: 'Central African Republic', phone: '236' },
  151: { iso: 'sd', name: 'Sudan', phone: '249' },
  152: { iso: 'ss', name: 'South Sudan', phone: '211' },
  153: { iso: 'er', name: 'Eritrea', phone: '291' },
  154: { iso: 'dj', name: 'Djibouti', phone: '253' },
  155: { iso: 'so', name: 'Somalia', phone: '252' },
  156: { iso: 'km', name: 'Comoros', phone: '269' },
  157: { iso: 'st', name: 'Sao Tome and Principe', phone: '239' },
  158: { iso: 'cv', name: 'Cape Verde', phone: '238' },
  159: { iso: 'mu', name: 'Mauritius', phone: '230' },
  160: { iso: 'sc', name: 'Seychelles', phone: '248' },
  161: { iso: 'fj', name: 'Fiji', phone: '679' },
  162: { iso: 'pg', name: 'Papua New Guinea', phone: '675' },
  163: { iso: 'ws', name: 'Samoa', phone: '685' },
  164: { iso: 'to', name: 'Tonga', phone: '676' },
  165: { iso: 'vu', name: 'Vanuatu', phone: '678' },
  166: { iso: 'sb', name: 'Solomon Islands', phone: '677' },
  167: { iso: 'ki', name: 'Kiribati', phone: '686' },
  168: { iso: 'fm', name: 'Micronesia', phone: '691' },
  169: { iso: 'mh', name: 'Marshall Islands', phone: '692' },
  170: { iso: 'pw', name: 'Palau', phone: '680' },
  171: { iso: 'tv', name: 'Tuvalu', phone: '688' },
  172: { iso: 'nr', name: 'Nauru', phone: '674' },
  173: { iso: 'ck', name: 'Cook Islands', phone: '682' },
  174: { iso: 'nu', name: 'Niue', phone: '683' },
  175: { iso: 'nc', name: 'New Caledonia', phone: '687' },
  176: { iso: 'pf', name: 'French Polynesia', phone: '689' },
  177: { iso: 'ws', name: 'Samoa', phone: '685' },
  178: { iso: 'xk', name: 'Kosovo', phone: '383' },
  179: { iso: 're', name: 'Reunion', phone: '262' },
  180: { iso: 'gf', name: 'French Guiana', phone: '594' },
  181: { iso: 'gp', name: 'Guadeloupe', phone: '590' },
  182: { iso: 'mq', name: 'Martinique', phone: '596' },
  183: { iso: 'aw', name: 'Aruba', phone: '297' },
  184: { iso: 'cw', name: 'Curacao', phone: '599' },
  185: { iso: 'sx', name: 'Sint Maarten', phone: '1' },
  186: { iso: 'bq', name: 'Bonaire', phone: '599' },
  187: { iso: 'ky', name: 'Cayman Islands', phone: '1' },
  188: { iso: 'bm', name: 'Bermuda', phone: '1' },
  189: { iso: 'ag', name: 'Antigua and Barbuda', phone: '1' },
  190: { iso: 'bb', name: 'Barbados', phone: '1' },
  191: { iso: 'dm', name: 'Dominica', phone: '1' },
  192: { iso: 'gd', name: 'Grenada', phone: '1' },
  193: { iso: 'kn', name: 'Saint Kitts and Nevis', phone: '1' },
  194: { iso: 'lc', name: 'Saint Lucia', phone: '1' },
  195: { iso: 'vc', name: 'Saint Vincent', phone: '1' },
  196: { iso: 'tt', name: 'Trinidad and Tobago', phone: '1' },
  197: { iso: 'bs', name: 'Bahamas', phone: '1' },
  198: { iso: 'jm', name: 'Jamaica', phone: '1' },
  199: { iso: 'ht', name: 'Haiti', phone: '509' },
  200: { iso: 'ai', name: 'Anguilla', phone: '1' },
  201: { iso: 'ms', name: 'Montserrat', phone: '1' },
  202: { iso: 'vg', name: 'British Virgin Islands', phone: '1' },
  203: { iso: 'tc', name: 'Turks and Caicos', phone: '1' },
  204: { iso: 'sr', name: 'Suriname', phone: '597' },
  205: { iso: 'gy', name: 'Guyana', phone: '592' },
}

// Reverse lookup: ISO code → SMS-Man numeric ID
const ISO_TO_SMSMAN_ID: Record<string, number> = {}
for (const [idStr, info] of Object.entries(SMSMAN_COUNTRY_MAP)) {
  ISO_TO_SMSMAN_ID[info.iso] = parseInt(idStr, 10)
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

interface SmsManResponse {
  success: boolean
  balance?: number
  currency?: string
  request_id?: number | string
  phone_number?: string
  country_id?: number
  sms_list?: Array<{ sms_code: string; sender: string; received_at: string }>
  error_code?: string
  error_msg?: string | Record<string, string>
  // For limits response
  count?: number
  price?: number
  // For get-all-requests
  requests_info?: Array<{
    request_id: number | string
    phone: string
    country_id: number
    status: string
    current_sms?: string
    created_at: string
  }>
}

async function apiRequest(
  apiUrl: string,
  apiKey: string,
  endpoint: string,
  params: Record<string, string> = {}
): Promise<SmsManResponse> {
  const allParams = new URLSearchParams({
    token: apiKey,
    ...params,
  })

  const url = `${apiUrl}/rent-api/${endpoint}?${allParams.toString()}`
  console.log(`[SMS-Man] ${endpoint}: ${url.substring(0, 200)}...`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`SMS-Man API HTTP ${response.status}: ${body.substring(0, 200)}`)
    }

    const data: SmsManResponse = await response.json()

    if (data.success === false) {
      const errMsg = data.error_msg
      const msgStr = typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg || data.error_code)
      throw new Error(`SMS-Man API error: ${data.error_code || 'Unknown'} - ${msgStr}`)
    }

    return data
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('SMS-Man API request timed out (30s)')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

// ==================== SmsManProvider ====================

export class SmsManProvider implements SMSProvider {
  readonly name: string
  readonly apiUrl: string
  private apiKey: string

  constructor(config: ProviderConfig) {
    this.name = config.name || 'SMS-Man'
    this.apiUrl = (config.apiUrl || 'https://api.sms-man.com').replace(/\/+$/, '')
    this.apiKey = config.apiKey
  }

  // ---- Balance ----
  async getBalance(): Promise<ProviderBalance> {
    const data = await apiRequest(this.apiUrl, this.apiKey, 'get-balance')

    return {
      balance: parseFloat(String(data.balance || '0')),
      currency: data.currency || 'RUB',
    }
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
      // Resolve country to SMS-Man numeric ID
      const smsmanCountryId = ISO_TO_SMSMAN_ID[country.toLowerCase()] ?? parseInt(country, 10)
      console.log(`[SMS-Man] buyNumber: service=${externalServiceId}, country=${country} -> smsmanId=${smsmanCountryId}`)

      // SMS-Man rent-api uses "type" for service, default rent period = 1 hour
      const data = await apiRequest(this.apiUrl, this.apiKey, 'get-number', {
        country_id: String(smsmanCountryId),
        type: externalServiceId,
        time: '1', // 1 hour default rent
      })

      if (data.request_id && data.phone_number) {
        return {
          success: true,
          phoneNumber: String(data.phone_number),
          externalOrderId: String(data.request_id),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour rent
        }
      }

      return { success: false, error: `Unexpected response from SMS-Man: ${JSON.stringify(data)}` }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to buy number' }
    }
  }

  // ---- Check SMS ----
  async checkSms(externalOrderId: string): Promise<CheckSmsResult> {
    try {
      const data = await apiRequest(this.apiUrl, this.apiKey, 'get-all-sms', {
        request_id: externalOrderId,
      })

      // Check if we have SMS messages
      if (data.sms_list && Array.isArray(data.sms_list) && data.sms_list.length > 0) {
        // Get the latest SMS
        const latestSms = data.sms_list[data.sms_list.length - 1]
        const code = latestSms.sms_code

        if (code) {
          // Try to extract numeric code from the SMS text
          const codeMatch = code.match(/(\d{4,8})/)
          return {
            status: 'received',
            smsCode: codeMatch ? codeMatch[1] : code,
            smsText: `${latestSms.sender || ''}: ${code}`.trim(),
          }
        }
      }

      // Also check get-all-requests for status
      // Status values: "pending", "received", "expired", "canceled"
      const requestsData = await apiRequest(this.apiUrl, this.apiKey, 'get-all-requests')
      const requestInfo = requestsData.requests_info?.find(
        (r) => String(r.request_id) === externalOrderId
      )

      if (requestInfo) {
        const status = (requestInfo.status || '').toLowerCase()
        if (status === 'received' || status === 'completed' || status === 'success') {
          const code = requestInfo.current_sms
          if (code) {
            const codeMatch = code.match(/(\d{4,8})/)
            return {
              status: 'received',
              smsCode: codeMatch ? codeMatch[1] : code,
              smsText: code,
            }
          }
          return { status: 'received' }
        }
        if (status === 'expired' || status === 'timeout') {
          return { status: 'expired', error: 'Order has expired' }
        }
        if (status === 'canceled' || status === 'cancelled' || status === 'reject') {
          return { status: 'cancelled', error: 'Order was cancelled' }
        }
      }

      // Default: still waiting
      return { status: 'waiting' }
    } catch (err) {
      return { status: 'error', error: err instanceof Error ? err.message : 'Failed to check SMS' }
    }
  }

  // ---- Cancel Order ----
  async cancelOrder(externalOrderId: string): Promise<CancelOrderResult> {
    try {
      const data = await apiRequest(this.apiUrl, this.apiKey, 'set-status', {
        request_id: externalOrderId,
        status: 'reject', // reject = cancel order
      })

      return {
        success: true,
        refunded: data.success === true,
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to cancel order' }
    }
  }

  // ---- Get Services (Limits) ----
  // SMS-Man uses "limits" endpoint to check availability per country/type
  // We fetch limits for popular countries and build the service catalog
  async getServices(): Promise<ServiceWithCountries[]> {
    try {
      console.log('[SMS-Man] getServices: fetching limits for all countries...')

      const servicesMap = new Map<string, ServiceWithCountries>()

      // Fetch limits for each country with known service types
      // We query popular countries to build a comprehensive catalog
      const popularCountries = [1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 20, 23, 24, 25, 49, 51, 53, 84, 87, 88, 89, 90, 96, 97, 99, 100]

      // Known popular service types for SMS-Man
      const serviceTypes = [
        'whatsapp', 'facebook', 'google', 'telegram', 'twitter', 'instagram',
        'tiktok', 'amazon', 'microsoft', 'apple', 'netflix', 'uber',
        'discord', 'linkedin', 'snapchat', 'viber', 'line', 'wechat',
        'openai', 'paypal', 'ebay', 'spotify', 'steam', 'blizzard',
        'mail_ru', 'yandex', 'vk', 'ok', 'protonmail', 'yahoo',
        'badoo', 'tinder', 'olx', 'fiverr', 'upwork', 'airbnb',
      ]

      // Fetch limits for each country (SMS-Man allows parallel requests)
      const batchResults = await Promise.allSettled(
        popularCountries.map(async (countryId) => {
          try {
            const data = await apiRequest(this.apiUrl, this.apiKey, 'limits', {
              country_id: String(countryId),
              type: 'any', // Get all services at once if supported
              time: '1',
            })

            const countryInfo = SMSMAN_COUNTRY_MAP[countryId]
            if (!countryInfo) return null

            // Process limits data - format may vary
            // Some responses return arrays of services, others return counts
            if (Array.isArray((data as any).limits)) {
              return { countryId, countryInfo, limits: (data as any).limits }
            }
            if (Array.isArray((data as any).countries)) {
              return { countryId, countryInfo, countries: (data as any).countries }
            }
            // Single country limit response
            if (data.count !== undefined) {
              return { countryId, countryInfo, count: data.count, price: data.price, type: (data as any).type }
            }

            return null
          } catch {
            return null
          }
        })
      )

      // Process results
      for (const result of batchResults) {
        if (result.status !== 'fulfilled' || !result.value) continue
        const { countryId, countryInfo } = result.value

        // If we got specific service limits
        if (result.value.limits && Array.isArray(result.value.limits)) {
          for (const limit of result.value.limits) {
            const serviceId = String(limit.type || limit.service || limit.service_id || '')
            const price = parseFloat(String(limit.price || limit.cost || '0')) || 0
            const count = parseInt(String(limit.count || limit.available || limit.numbers_count || '0')) || 0

            if (!serviceId) continue

            const isoCode = countryInfo.iso
            const countryEntry = {
              code: isoCode,
              name: countryInfo.name,
              phoneCode: countryInfo.phone,
              flag: countryCodeToFlag(isoCode),
              price,
              available: count > 0,
            }

            const existingService = servicesMap.get(serviceId)
            if (existingService) {
              existingService.countries.push(countryEntry)
            } else {
              servicesMap.set(serviceId, {
                externalId: serviceId,
                name: serviceId.charAt(0).toUpperCase() + serviceId.slice(1).replace(/_/g, ' ').replace(/-/g, ' '),
                category: 'General',
                countries: [countryEntry],
              })
            }
          }
        }

        // If we got a simple count (single service limit)
        if (result.value.count !== undefined && result.value.type) {
          const serviceId = String(result.value.type)
          const price = parseFloat(String(result.value.price || '0')) || 0

          const isoCode = countryInfo.iso
          const countryEntry = {
            code: isoCode,
            name: countryInfo.name,
            phoneCode: countryInfo.phone,
            flag: countryCodeToFlag(isoCode),
            price,
            available: result.value.count > 0,
          }

          const existingService = servicesMap.get(serviceId)
          if (existingService) {
            existingService.countries.push(countryEntry)
          } else {
            servicesMap.set(serviceId, {
              externalId: serviceId,
              name: serviceId.charAt(0).toUpperCase() + serviceId.slice(1).replace(/_/g, ' ').replace(/-/g, ' '),
              category: 'General',
              countries: [countryEntry],
            })
          }
        }
      }

      // If the batch approach didn't return structured data, try individual service queries
      if (servicesMap.size === 0) {
        console.log('[SMS-Man] Batch limits returned no structured data, trying individual queries...')

        // Try querying specific popular services for top countries
        for (const serviceType of serviceTypes.slice(0, 10)) {
          for (const countryId of popularCountries.slice(0, 8)) {
            try {
              const data = await apiRequest(this.apiUrl, this.apiKey, 'limits', {
                country_id: String(countryId),
                type: serviceType,
                time: '1',
              })

              const countryInfo = SMSMAN_COUNTRY_MAP[countryId]
              if (!countryInfo) continue

              // Check if the response indicates availability
              const count = parseInt(String(data.count || data.numbers_count || 0)) || 0
              const price = parseFloat(String(data.price || data.cost || 0)) || 0

              if (count > 0 || price > 0) {
                const isoCode = countryInfo.iso
                const countryEntry = {
                  code: isoCode,
                  name: countryInfo.name,
                  phoneCode: countryInfo.phone,
                  flag: countryCodeToFlag(isoCode),
                  price,
                  available: count > 0,
                }

                const existingService = servicesMap.get(serviceType)
                if (existingService) {
                  existingService.countries.push(countryEntry)
                } else {
                  servicesMap.set(serviceType, {
                    externalId: serviceType,
                    name: serviceType.charAt(0).toUpperCase() + serviceType.slice(1).replace(/_/g, ' ').replace(/-/g, ' '),
                    category: 'General',
                    countries: [countryEntry],
                  })
                }
              }

              // Small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100))
            } catch {
              continue
            }
          }
        }
      }

      const services = Array.from(servicesMap.values())
      console.log(`[SMS-Man] getServices: found ${services.length} services across all countries`)

      return services
    } catch (err) {
      console.error('[SMS-Man] getServices error:', err)
      throw new Error(`Failed to fetch services from SMS-Man: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }
}

// ==================== SETUP GUIDE ====================
export const SMSMAN_SETUP_GUIDE = {
  providerName: 'SMS-Man',
  apiUrl: 'https://api.sms-man.com',
  steps: [
    {
      title: 'Create Account',
      description: 'Go to https://sms-man.com and register for an account.',
    },
    {
      title: 'Add Funds',
      description: 'Deposit funds into your SMS-Man account using available payment methods (crypto, card, etc.).',
    },
    {
      title: 'Get API Token',
      description: 'Go to Profile → API Settings. Copy your API token.',
    },
    {
      title: 'Add Provider in VerifyHub',
      description: 'In Admin → Providers → click "Add Provider". Fill in:\n• Name: SMS-Man\n• API URL: https://api.sms-man.com\n• API Key: paste your SMS-Man API token\n• Priority: 5 (lower = fallback)',
    },
    {
      title: 'Sync Services',
      description: 'After adding the provider, click "Sync Services" to import available countries and prices from SMS-Man.',
    },
    {
      title: 'Set Prices & Enable',
      description: 'Review synced services, set your markup percentage, and enable the ones you want to offer.',
    },
  ],
  apiDocs: 'https://sms-man.com/api-docs',
  currency: 'RUB',
}
