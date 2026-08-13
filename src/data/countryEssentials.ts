// Practical facts the country API does not carry: sockets, the number you dial
// in an emergency, and what tipping actually looks like on the ground.
//
// Deliberately partial. An entry is here only where the fact is unambiguous —
// the briefing hides any card it has no confident answer for, which is better
// than showing a traveller a plug type that turns out to be wrong.

export type Essentials = {
  currency: string
  currencyCode: string
  currencySymbol: string
  dial: string
  drives: 'left' | 'right'
  plugs: string
  voltage: string
  emergency: string
  tipping: string
}

export const COUNTRY_ESSENTIALS: Record<string, Essentials> = {
  gb: { currency: 'Pound sterling', currencyCode: 'GBP', currencySymbol: '£', dial: '+44', drives: 'left', plugs: 'Type G', voltage: '230V · 50Hz', emergency: '999 or 112', tipping: '10–12.5% in restaurants, often already added as a service charge. No tipping at pubs.' },
  ie: { currency: 'Euro', currencyCode: 'EUR', currencySymbol: '€', dial: '+353', drives: 'left', plugs: 'Type G', voltage: '230V · 50Hz', emergency: '112 or 999', tipping: '10% for table service. Not expected in pubs.' },
  fr: { currency: 'Euro', currencyCode: 'EUR', currencySymbol: '€', dial: '+33', drives: 'right', plugs: 'Types C and E', voltage: '230V · 50Hz', emergency: '112', tipping: 'Service is included by law. Rounding up is a compliment, not an obligation.' },
  de: { currency: 'Euro', currencyCode: 'EUR', currencySymbol: '€', dial: '+49', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: 'Round up or add ~5–10%, handed to the server rather than left on the table.' },
  nl: { currency: 'Euro', currencyCode: 'EUR', currencySymbol: '€', dial: '+31', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: 'Rounding up is normal; 5–10% for good service.' },
  be: { currency: 'Euro', currencyCode: 'EUR', currencySymbol: '€', dial: '+32', drives: 'right', plugs: 'Types C and E', voltage: '230V · 50Hz', emergency: '112', tipping: 'Service included. Rounding up is plenty.' },
  es: { currency: 'Euro', currencyCode: 'EUR', currencySymbol: '€', dial: '+34', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: 'Small change or ~5%. Never expected.' },
  pt: { currency: 'Euro', currencyCode: 'EUR', currencySymbol: '€', dial: '+351', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: '5–10% for a sit-down meal.' },
  it: { currency: 'Euro', currencyCode: 'EUR', currencySymbol: '€', dial: '+39', drives: 'right', plugs: 'Types C, F and L', voltage: '230V · 50Hz', emergency: '112', tipping: 'Coperto is a cover charge, not a tip. Extra tipping is optional.' },
  ch: { currency: 'Swiss franc', currencyCode: 'CHF', currencySymbol: 'Fr', dial: '+41', drives: 'right', plugs: 'Types C and J', voltage: '230V · 50Hz', emergency: '112', tipping: 'Service is included. Round up to the nearest franc.' },
  at: { currency: 'Euro', currencyCode: 'EUR', currencySymbol: '€', dial: '+43', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: 'Round up ~5–10% when you pay, told to the server directly.' },
  dk: { currency: 'Danish krone', currencyCode: 'DKK', currencySymbol: 'kr', dial: '+45', drives: 'right', plugs: 'Types C, E, F and K', voltage: '230V · 50Hz', emergency: '112', tipping: 'Included in the price. Not expected.' },
  no: { currency: 'Norwegian krone', currencyCode: 'NOK', currencySymbol: 'kr', dial: '+47', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: 'Not expected; round up if you liked it.' },
  se: { currency: 'Swedish krona', currencyCode: 'SEK', currencySymbol: 'kr', dial: '+46', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: 'Not expected. Card terminals may suggest 5–10%.' },
  fi: { currency: 'Euro', currencyCode: 'EUR', currencySymbol: '€', dial: '+358', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: 'Not part of the culture.' },
  is: { currency: 'Icelandic króna', currencyCode: 'ISK', currencySymbol: 'kr', dial: '+354', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: 'Not expected — service is in the price.' },
  pl: { currency: 'Polish złoty', currencyCode: 'PLN', currencySymbol: 'zł', dial: '+48', drives: 'right', plugs: 'Types C and E', voltage: '230V · 50Hz', emergency: '112', tipping: '10% in restaurants.' },
  cz: { currency: 'Czech koruna', currencyCode: 'CZK', currencySymbol: 'Kč', dial: '+420', drives: 'right', plugs: 'Types C and E', voltage: '230V · 50Hz', emergency: '112', tipping: '10%, usually by telling the server the rounded total.' },
  gr: { currency: 'Euro', currencyCode: 'EUR', currencySymbol: '€', dial: '+30', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: '5–10% for table service.' },
  hr: { currency: 'Euro', currencyCode: 'EUR', currencySymbol: '€', dial: '+385', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: '10% for a good meal.' },
  hu: { currency: 'Hungarian forint', currencyCode: 'HUF', currencySymbol: 'Ft', dial: '+36', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: '10%, often added to the bill — check before adding more.' },
  ro: { currency: 'Romanian leu', currencyCode: 'RON', currencySymbol: 'lei', dial: '+40', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: '10% is normal in restaurants.' },
  tr: { currency: 'Turkish lira', currencyCode: 'TRY', currencySymbol: '₺', dial: '+90', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: '5–10% in restaurants; round up for taxis.' },
  us: { currency: 'US dollar', currencyCode: 'USD', currencySymbol: '$', dial: '+1', drives: 'right', plugs: 'Types A and B', voltage: '120V · 60Hz', emergency: '911', tipping: '18–22% is the working norm in restaurants and for rideshares — staff wages assume it.' },
  ca: { currency: 'Canadian dollar', currencyCode: 'CAD', currencySymbol: '$', dial: '+1', drives: 'right', plugs: 'Types A and B', voltage: '120V · 60Hz', emergency: '911', tipping: '15–20% in restaurants and taxis.' },
  mx: { currency: 'Mexican peso', currencyCode: 'MXN', currencySymbol: '$', dial: '+52', drives: 'right', plugs: 'Types A and B', voltage: '127V · 60Hz', emergency: '911', tipping: '10–15% in restaurants; small change for baggers and attendants.' },
  br: { currency: 'Brazilian real', currencyCode: 'BRL', currencySymbol: 'R$', dial: '+55', drives: 'right', plugs: 'Types N and C', voltage: '127V/220V · 60Hz', emergency: '190 (police) · 192 (ambulance)', tipping: '10% is usually printed on the bill.' },
  ar: { currency: 'Argentine peso', currencyCode: 'ARS', currencySymbol: '$', dial: '+54', drives: 'right', plugs: 'Types C and I', voltage: '220V · 50Hz', emergency: '911', tipping: '10% in cash, since it often cannot go on the card.' },
  cl: { currency: 'Chilean peso', currencyCode: 'CLP', currencySymbol: '$', dial: '+56', drives: 'right', plugs: 'Types C and L', voltage: '220V · 50Hz', emergency: '133 (police) · 131 (ambulance)', tipping: '10%, normally suggested on the bill.' },
  co: { currency: 'Colombian peso', currencyCode: 'COP', currencySymbol: '$', dial: '+57', drives: 'right', plugs: 'Types A and B', voltage: '110V · 60Hz', emergency: '123', tipping: '10% voluntary service charge — you will be asked if you want it.' },
  pe: { currency: 'Peruvian sol', currencyCode: 'PEN', currencySymbol: 'S/', dial: '+51', drives: 'right', plugs: 'Types A and C', voltage: '220V · 60Hz', emergency: '105 (police) · 116 (fire)', tipping: '10% in restaurants.' },
  za: { currency: 'South African rand', currencyCode: 'ZAR', currencySymbol: 'R', dial: '+27', drives: 'left', plugs: 'Types M, N and C', voltage: '230V · 50Hz', emergency: '10111 (police) · 112 (mobile)', tipping: '10–15%; car guards get small change.' },
  eg: { currency: 'Egyptian pound', currencyCode: 'EGP', currencySymbol: 'E£', dial: '+20', drives: 'right', plugs: 'Types C and F', voltage: '220V · 50Hz', emergency: '122 (police) · 123 (ambulance)', tipping: 'Baksheesh is woven into daily life — keep small notes handy.' },
  ma: { currency: 'Moroccan dirham', currencyCode: 'MAD', currencySymbol: 'DH', dial: '+212', drives: 'right', plugs: 'Types C and E', voltage: '220V · 50Hz', emergency: '19 (police) · 15 (ambulance)', tipping: '5–10%, plus small change for guides and attendants.' },
  ke: { currency: 'Kenyan shilling', currencyCode: 'KES', currencySymbol: 'Sh', dial: '+254', drives: 'left', plugs: 'Type G', voltage: '240V · 50Hz', emergency: '999 or 112', tipping: '5–10% in restaurants that do not add service.' },
  ng: { currency: 'Nigerian naira', currencyCode: 'NGN', currencySymbol: '₦', dial: '+234', drives: 'right', plugs: 'Types D and G', voltage: '230V · 50Hz', emergency: '112 or 199', tipping: '10% where service is not included.' },
  ae: { currency: 'UAE dirham', currencyCode: 'AED', currencySymbol: 'Dh', dial: '+971', drives: 'right', plugs: 'Types G, C and D', voltage: '230V · 50Hz', emergency: '999 (police) · 998 (ambulance)', tipping: '10–15%; a 10% service charge is often already on the bill.' },
  sa: { currency: 'Saudi riyal', currencyCode: 'SAR', currencySymbol: 'SR', dial: '+966', drives: 'right', plugs: 'Types G, A and B', voltage: '230V · 50Hz', emergency: '999 (police) · 997 (ambulance)', tipping: '10% is appreciated, not required.' },
  qa: { currency: 'Qatari riyal', currencyCode: 'QAR', currencySymbol: 'QR', dial: '+974', drives: 'right', plugs: 'Types G and D', voltage: '240V · 50Hz', emergency: '999', tipping: '10% where no service charge applies.' },
  il: { currency: 'Israeli new shekel', currencyCode: 'ILS', currencySymbol: '₪', dial: '+972', drives: 'right', plugs: 'Types C and H', voltage: '230V · 50Hz', emergency: '100 (police) · 101 (ambulance)', tipping: '12–15% in restaurants, usually in cash.' },
  in: { currency: 'Indian rupee', currencyCode: 'INR', currencySymbol: '₹', dial: '+91', drives: 'left', plugs: 'Types C, D and M', voltage: '230V · 50Hz', emergency: '112', tipping: '5–10% in restaurants; round up for drivers.' },
  pk: { currency: 'Pakistani rupee', currencyCode: 'PKR', currencySymbol: '₨', dial: '+92', drives: 'left', plugs: 'Types C and D', voltage: '230V · 50Hz', emergency: '15 (police) · 1122 (rescue)', tipping: '10% where service is not included.' },
  th: { currency: 'Thai baht', currencyCode: 'THB', currencySymbol: '฿', dial: '+66', drives: 'left', plugs: 'Types A, B and C', voltage: '220V · 50Hz', emergency: '191 (police) · 1669 (ambulance)', tipping: 'Round up; 10% at nicer restaurants.' },
  vn: { currency: 'Vietnamese dong', currencyCode: 'VND', currencySymbol: '₫', dial: '+84', drives: 'right', plugs: 'Types A, C and F', voltage: '220V · 50Hz', emergency: '113 (police) · 115 (ambulance)', tipping: 'Not traditional but increasingly welcomed in tourist areas.' },
  sg: { currency: 'Singapore dollar', currencyCode: 'SGD', currencySymbol: '$', dial: '+65', drives: 'left', plugs: 'Type G', voltage: '230V · 50Hz', emergency: '999 (police) · 995 (ambulance)', tipping: 'Not expected — a 10% service charge is standard.' },
  my: { currency: 'Malaysian ringgit', currencyCode: 'MYR', currencySymbol: 'RM', dial: '+60', drives: 'left', plugs: 'Type G', voltage: '240V · 50Hz', emergency: '999', tipping: 'Not expected; service charge is often included.' },
  id: { currency: 'Indonesian rupiah', currencyCode: 'IDR', currencySymbol: 'Rp', dial: '+62', drives: 'left', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: 'Round up; 5–10% where no service charge applies.' },
  ph: { currency: 'Philippine peso', currencyCode: 'PHP', currencySymbol: '₱', dial: '+63', drives: 'right', plugs: 'Types A, B and C', voltage: '220V · 60Hz', emergency: '911', tipping: '10% is common and appreciated.' },
  jp: { currency: 'Japanese yen', currencyCode: 'JPY', currencySymbol: '¥', dial: '+81', drives: 'left', plugs: 'Types A and B', voltage: '100V · 50/60Hz', emergency: '110 (police) · 119 (ambulance)', tipping: 'Do not tip. It can cause genuine discomfort.' },
  kr: { currency: 'South Korean won', currencyCode: 'KRW', currencySymbol: '₩', dial: '+82', drives: 'right', plugs: 'Types C and F', voltage: '220V · 60Hz', emergency: '112 (police) · 119 (ambulance)', tipping: 'Not practised. Service is included.' },
  cn: { currency: 'Chinese yuan', currencyCode: 'CNY', currencySymbol: '¥', dial: '+86', drives: 'right', plugs: 'Types A, C and I', voltage: '220V · 50Hz', emergency: '110 (police) · 120 (ambulance)', tipping: 'Not customary outside tourist-facing hotels.' },
  tw: { currency: 'New Taiwan dollar', currencyCode: 'TWD', currencySymbol: 'NT$', dial: '+886', drives: 'right', plugs: 'Types A and B', voltage: '110V · 60Hz', emergency: '110 (police) · 119 (ambulance)', tipping: 'Not expected; 10% service charge at hotels.' },
  au: { currency: 'Australian dollar', currencyCode: 'AUD', currencySymbol: '$', dial: '+61', drives: 'left', plugs: 'Type I', voltage: '230V · 50Hz', emergency: '000', tipping: 'Optional — wages are high. Round up for great service.' },
  nz: { currency: 'New Zealand dollar', currencyCode: 'NZD', currencySymbol: '$', dial: '+64', drives: 'left', plugs: 'Type I', voltage: '230V · 50Hz', emergency: '111', tipping: 'Not expected.' },
  ru: { currency: 'Russian ruble', currencyCode: 'RUB', currencySymbol: '₽', dial: '+7', drives: 'right', plugs: 'Types C and F', voltage: '220V · 50Hz', emergency: '112', tipping: '10% in restaurants.' },
  ua: { currency: 'Ukrainian hryvnia', currencyCode: 'UAH', currencySymbol: '₴', dial: '+380', drives: 'right', plugs: 'Types C and F', voltage: '230V · 50Hz', emergency: '112', tipping: '10% is standard.' },
}
