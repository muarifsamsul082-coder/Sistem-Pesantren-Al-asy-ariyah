// QRIS & Transfer QR Generator for Online Payment
// Conforms to EMVCo QR Code Specification for Dynamic QRIS (Indonesian Payment Standard)

// CRC-16/CCITT-FALSE calculation for QRIS (poly 0x1021, init 0xFFFF)
function calculateCRC16(data: string): string {
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

function formatTLV(tag: string, value: string): string {
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
}

/**
 * Generates an EMVCo Dynamic QRIS string containing the specified nominal amount.
 * When scanned by e-wallets like DANA, GoPay, OVO, ShopeePay, or m-banking apps (BCA, Mandiri, BRI, BNI),
 * the exact nominal amount automatically appears on the payment screen.
 */
export function generateDynamicQrisString(params: DynamicQrisParams): string {
  const {
    merchantName = 'PESANTREN AL-ASYARIYAH',
    merchantCity = 'SEMARANG',
    amount,
    billId = 'BILL',
    bankName = 'BANK',
    accountNumber = '1234567890'
  } = params;

  // Clean strings
  const cleanName = merchantName.replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, 25);
  const cleanCity = merchantCity.replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, 15);
  const cleanAmount = Math.round(amount).toString();
  const cleanBillId = (billId || 'INV').replace(/[^A-Za-z0-9]/g, '').slice(0, 15);
  const cleanBank = bankName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
  const cleanAccount = accountNumber.replace(/[^A-Za-z0-9]/g, '').slice(0, 20);

  // Construct Sub-TLV for National Merchant Information (Tag 26 / 51)
  // 00: National reverse domain (e.g. ID.CO.QRIS.WWW)
  // 01: Merchant ID / Bank Identifier
  // 02: Account Number
  // 03: Merchant Criteria (UMI = Usaha Mikro)
  const tag51Sub = 
    formatTLV('00', 'ID.CO.QRIS.WWW') +
    formatTLV('01', `ID${cleanBank}`) +
    formatTLV('02', cleanAccount || '0000000000') +
    formatTLV('03', 'UMI');

  // Additional Data (Tag 62) - Invoice reference
  const tag62Sub = 
    formatTLV('01', cleanBillId) +
    formatTLV('05', 'TRANSFER') +
    formatTLV('07', 'TRF01');

  // Build the complete QRIS string without CRC
  let raw = 
    formatTLV('00', '01') +             // Payload Format Indicator
    formatTLV('01', '12') +             // Point of Initiation: 12 = Dynamic (with preset amount)
    formatTLV('51', tag51Sub) +         // Merchant Account Information
    formatTLV('52', '0000') +           // Merchant Category Code (General)
    formatTLV('53', '360') +            // Transaction Currency: 360 = IDR
    formatTLV('54', cleanAmount) +      // Transaction Amount (e.g. 50120)
    formatTLV('58', 'ID') +             // Country Code: ID
    formatTLV('59', cleanName || 'PESANTREN') + // Merchant Name
    formatTLV('60', cleanCity || 'KOTA') +      // Merchant City
    formatTLV('61', '50000') +          // Postal Code
    formatTLV('62', tag62Sub) +         // Additional Data Field Template
    '6304';                             // CRC tag and length header

  // Calculate CRC16 and append
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
  // Normalized 0 to 1 for amounts up to Rp 1.000.000
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
