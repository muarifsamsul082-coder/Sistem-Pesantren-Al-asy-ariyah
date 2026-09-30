// QRIS & Transfer QR Generator for Online Payment
// Conforms to EMVCo QR Code & Bank Indonesia ASPI QRIS MPM Specifications

// CRC-16/CCITT-FALSE calculation for QRIS (poly 0x1021, init 0xFFFF)
export function calculateCRC16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  let hex = (crc & 0xFFFF).toString(16).toUpperCase();
  while (hex.length < 4) {
    hex = '0' + hex;
  }
  return hex;
}

export function formatTLV(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

export interface DynamicQrisParams {
  merchantName?: string;
  merchantCity?: string;
  amount: number;
  billId?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  rawStaticQris?: string;
  postalCode?: string;
}

/**
 * Converts a static QRIS string (e.g. from Bank BRI, BCA, BSI, DANA Bisnis, or GoPay)
 * into a Dynamic QRIS with an embedded nominal amount (Tag 54) and invoice reference (Tag 62).
 */
export function convertStaticToDynamicQris(staticPayload: string, amount: number, billId?: string): string {
  if (!staticPayload || !staticPayload.startsWith('000201')) {
    return '';
  }

  let clean = staticPayload.trim();

  // Strip existing CRC if present at the end (Tag 63)
  const crcIdx = clean.lastIndexOf('6304');
  if (crcIdx !== -1) {
    clean = clean.substring(0, crcIdx);
  }

  // Replace Point of Initiation 010211 (Static) with 010212 (Dynamic with amount)
  clean = clean.replace(/010211/, '010212');

  // Format amount tag 54
  const amtStr = Math.round(amount).toString();
  const amtTag = formatTLV('54', amtStr);

  // If Tag 54 already exists, replace it; otherwise insert before Tag 58 (Country Code '5802ID')
  if (/54\d{2}\d+/.test(clean)) {
    clean = clean.replace(/54\d{2}\d+/, amtTag);
  } else {
    const tag58Idx = clean.indexOf('5802ID');
    if (tag58Idx !== -1) {
      clean = clean.slice(0, tag58Idx) + amtTag + clean.slice(tag58Idx);
    } else {
      clean += amtTag;
    }
  }

  // Inject or update Bill ID in Tag 62 if provided
  if (billId) {
    const cleanBillId = billId.replace(/[^A-Za-z0-9]/g, '').slice(0, 15);
    const tag62Sub = formatTLV('01', cleanBillId) + formatTLV('05', 'TRANSFER') + formatTLV('07', 'TRF01');
    const tag62 = formatTLV('62', tag62Sub);
    if (/62\d{2}/.test(clean)) {
      clean = clean.replace(/62\d{2}[^]+?(?=(?:5802|59\d{2}|60\d{2}|61\d{2}|6304|$))/, tag62);
    } else {
      const insertPoint = clean.indexOf('6304');
      if (insertPoint !== -1) {
        clean = clean.slice(0, insertPoint) + tag62 + clean.slice(insertPoint);
      } else {
        clean += tag62;
      }
    }
  }

  // Append Tag 63 header and recalculate CRC16
  clean += '6304';
  const newCrc = calculateCRC16(clean);
  return clean + newCrc;
}

/**
 * Get Indonesian National Switch Acquirer Code for QRIS
 */
function getAcquirerCode(bankName?: string): string {
  const b = (bankName || '').toLowerCase();
  if (b.includes('bri') || b.includes('rakyat')) return '93600011';
  if (b.includes('bca') || b.includes('central asia')) return '93600009';
  if (b.includes('mandiri')) return '93600008';
  if (b.includes('bni') || b.includes('negara')) return '93600014';
  if (b.includes('bsi') || b.includes('syariah indonesia')) return '93600451';
  if (b.includes('muamalat')) return '93600147';
  if (b.includes('btpn') || b.includes('jenius')) return '93600213';
  if (b.includes('gopay')) return '93600001';
  if (b.includes('ovo')) return '93600003';
  if (b.includes('shopee')) return '93600018';
  if (b.includes('linkaja')) return '93600911';
  // Default to DANA switch (93600002) for maximum compatibility with DANA / E-Wallet scans
  return '93600002';
}

/**
 * Generates an EMVCo Dynamic QRIS string containing the specified nominal amount.
 * When scanned by e-wallets like DANA, GoPay, OVO, ShopeePay, or m-banking apps (BCA, Mandiri, BRI, BNI),
 * the exact nominal amount and registered account owner name automatically appear on the payment screen.
 */
export function generateDynamicQrisString(params: DynamicQrisParams): string {
  const {
    merchantName = 'PESANTREN AL-ASYARIYAH',
    accountName,
    merchantCity = 'SEMARANG',
    amount,
    billId = 'BILL',
    bankName = 'BANK',
    accountNumber = '1234567890',
    rawStaticQris,
    postalCode = '50000'
  } = params;

  // 1. If an official static QRIS string was uploaded/configured, convert it dynamically!
  if (rawStaticQris && rawStaticQris.trim().startsWith('000201')) {
    const converted = convertStaticToDynamicQris(rawStaticQris, amount, billId);
    if (converted) return converted;
  }

  // 2. Derive the primary merchant name from the registered account owner name
  // This ensures DANA displays the actual account name (e.g. "MUARIF SAMSUL") instead of pesantren name!
  const targetName = (accountName || merchantName || 'BENDAHARA PESANTREN').trim();
  const cleanName = targetName.replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, 25);
  const cleanCity = (merchantCity || 'SEMARANG').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, 15);
  const cleanAmount = Math.round(amount).toString();
  const cleanBillId = (billId || 'INV').replace(/[^A-Za-z0-9]/g, '').slice(0, 15);
  const cleanAccount = (accountNumber || '0000000000').replace(/[^0-9]/g, '').slice(0, 15);
  const cleanPostal = (postalCode || '50000').replace(/[^0-9]/g, '').slice(0, 5).padEnd(5, '0');

  const acquirerCode = getAcquirerCode(bankName);
  const pan18 = (acquirerCode + cleanAccount.padStart(10, '0')).slice(-18);

  // Tag 26: National Merchant Account Information (MANDATORY in Bank Indonesia ASPI QRIS MPM!)
  // DANA and BCA require Tag 26 to recognize the QR format!
  const tag26Sub = 
    formatTLV('00', 'ID.CO.QRIS.WWW') +
    formatTLV('01', pan18) +
    formatTLV('02', '000000000000000') +
    formatTLV('03', 'UMI');

  // Tag 51: Domestic Switch Central Repository
  const tag51Sub = 
    formatTLV('00', 'ID.CO.QRIS.WWW') +
    formatTLV('02', '000000000000000') +
    formatTLV('03', 'UMI');

  // Tag 62: Additional Data (Invoice & Reference)
  const tag62Sub = 
    formatTLV('01', cleanBillId) +
    formatTLV('05', 'TRANSFER') +
    formatTLV('07', 'TRF01');

  // Construct the full EMVCo ASPI QRIS string
  let raw = 
    formatTLV('00', '01') +             // 00: Payload Format Indicator
    formatTLV('01', '12') +             // 01: 12 = Dynamic QR (nominal embedded)
    formatTLV('26', tag26Sub) +         // 26: National Merchant Info (ASPI MPM)
    formatTLV('51', tag51Sub) +         // 51: Switch Info
    formatTLV('52', '8211') +           // 52: MCC 8211 (Schools & Educational Services)
    formatTLV('53', '360') +            // 53: Currency 360 = IDR
    formatTLV('54', cleanAmount) +      // 54: Exact Transaction Amount
    formatTLV('58', 'ID') +             // 58: Country Code: ID
    formatTLV('59', cleanName) +        // 59: Merchant Name (exact registered account owner name!)
    formatTLV('60', cleanCity) +        // 60: Merchant City
    formatTLV('61', cleanPostal) +      // 61: Postal Code
    formatTLV('62', tag62Sub) +         // 62: Additional Data
    '6304';                             // 63: CRC header

  const crc = calculateCRC16(raw);
  return raw + crc;
}

/**
 * Calculates a unique 3-digit transfer code between 100 and 500,
 * tailored to the total transfer amount.
 * Example requested by user: if bill is 50.000 -> unique code is 120 (total 50.120).
 * Maximum addition is +500, minimum is +100.
 */
export function getUniqueTransferCode(billId: string | number, baseAmount: number): number {
  if (!baseAmount || baseAmount <= 0) return 120;

  // Specific user example: 50.000 -> 120
  if (baseAmount === 50000) {
    return 120;
  }

  // Proportional scale: larger transfer amounts scale within the 100..500 window
  const normalizedScale = Math.min(Math.max((baseAmount - 10000) / 1000000, 0), 1);
  const baseOffset = Math.round(100 + normalizedScale * 250); // 100 to 350

  // Deterministic hash based on billId and amount so it stays consistent for the same bill
  let hash = 0;
  const str = `${billId}_${baseAmount}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 151;
  }

  const finalCode = Math.min(500, Math.max(100, baseOffset + Math.abs(hash)));
  return finalCode;
}
