// ---------------------------------------------------------------------------
// Everything the team may want to change lives in this file.
// ---------------------------------------------------------------------------

export const VILLAGES = [
  ['Ambali', 'આંબલી'],
  ['Bavliyari', 'બાવળીયારી'],
  ['Bhadiyad', 'ભડિયાદ'],
  ['Bhangadh', 'ભાણગઢ'],
  ['Bhimtalav', 'ભીમતળાવ'],
  ['Cher', 'ચેર'],
  ['Dholera', 'ધોલેરા'],
  ['Gogla', 'ગોગલા'],
  ['Gorasu', 'ગોરાસુ'],
  ['Hebatpur', 'હેબતપુર'],
  ['Kadipur', 'કડિપુર'],
  ['Khun', 'ખૂણ'],
  ['Mahadevpura', 'મહાદેવપુરા'],
  ['Mingalpur', 'મીંગળપુર'],
  ['Mundi', 'મુંડી'],
  ['Otariya', 'ઓતારીયા'],
  ['Panchi', 'પાંચી'],
  ['Rahtalav', 'રાહતળાવ'],
  ['Sandhida', 'સાંઢીડા'],
  ['Sangasar', 'સાંગાસર'],
  ['Sodhi', 'સોઢી'],
  ['Zankhi', 'ઝાંખી'],
];

export const TP_NOS = [
  '1A',
  '1A 1',
  '1A 2',
  '1A 3',
  '1A 4',
  '1A 5',
  '2A',
  '2B1',
  '2B2',
  '2B3',
  '2B4A',
  '2B4B',
  '2B5A',
  '2B5B',
  '3A',
  '3B',
  '3C1',
  '3C2',
  '4A',
  '4B1',
  '4B2',
  '5A',
  '5B',
  '5C1',
  '5C2',
  '6A',
  '6B',
];

export const ZONES = [
  'City Centre',
  'Knowledge & IT',
  'High Access Corridor',
  'Residential',
  'Village Buffer',
  'Industrial',
  'Logistic',
  'Public Facility',
  'Sports & Recreation',
  'Tourism & Resorts',
  'Agriculture',
  'Green',
];

export const TP_TYPES = ['Linear', 'Activation', 'Outside Linear', 'Draft'];
export const NA_STATUS = ['Complete', 'On Request', 'In Process', 'Agriculture'];
export const ROADS = ['12', '18', '25', '30', '36', '48', '55', '70'];
export const FEATURES = [
  'Nearest to Activation Zone',
  'Next to Linear',
  'Main Road Touch',
  'Corner Plot',
  'Nearest to Expressway',
  'Nearest to Airport',
];

// The logo, header image, photos, WhatsApp button and QR code in the PDF all open this chat.
export const WHATSAPP = 'https://wa.me/message/3MOWSFZV7KP6K1';
export const CONTACT = { phone: '+91 9010870000', web: 'www.dholerasir.com', email: 'hello@dholerasir.com' };

export const SQM_TO_SQYD = 1.19599;

// Character limits for free-text boxes (keeps every value inside its box on the PDF).
export const LIMITS = {
  villageOther: 40,
  zoneOther: 40,
  newSurvey: 30,
  oldSurvey: 30,
  tpTypeOther: 30,
  tpNoOther: 20,
  fpNo: 30,
  sqm: 12,
  sqyd: 12,
  vigha: 10,
  road: 6,
  fsi: 6,
  naOther: 30,
  featExtra: 150,
  map: 500,
};
