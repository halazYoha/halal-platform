// smsParser.js - Automated Telebirr and Commercial Bank of Ethiopia (CBE) parser

/**
 * Parses raw SMS text pasted by the user.
 * Extracts: provider, transactionId, amount, sender, recipient, timestamp
 */
function parseTransactionSMS(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { success: false, error: 'Empty message text' };
  }

  const text = rawText.trim();
  let provider = 'UNKNOWN';
  let transactionId = null;
  let amount = null;
  let phone = null;

  // 1. Detect Telebirr
  const isTelebirr = /telebirr|transaction id|transferred etb|debited with etb/i.test(text);

  // 2. Detect Commercial Bank of Ethiopia (CBE / CBE Birr)
  const isCbe = /cbe|commercial bank|cbebirr|txn ref|ft\d{8,}/i.test(text);

  if (isTelebirr) {
    provider = 'TELEBIRR';
  } else if (isCbe) {
    provider = 'CBE';
  }

  // Extract Amount (e.g. "ETB 1,500.00", "ETB 800", "1500.00 ETB", "1,500 ETB")
  const amtRegex1 = /(?:ETB|Birr)\s*([\d,]+(?:\.\d{1,2})?)/i;
  const amtRegex2 = /([\d,]+(?:\.\d{1,2})?)\s*(?:ETB|Birr)/i;
  const m1 = text.match(amtRegex1);
  const m2 = text.match(amtRegex2);
  const matchedStr = (m1 && m1[1]) || (m2 && m2[1]);
  if (matchedStr) {
    const rawAmt = matchedStr.replace(/,/g, '');
    amount = parseFloat(rawAmt);
  }

  // Extract Transaction Reference ID
  const txPatterns = [
    /(?:transaction\s*id|txn\s*id|trans\s*id|txn\s*ref|ref\s*no|reference\s*id|ref)\s*[:#\s]*([A-Za-z0-9]{6,25})/i,
    /\b(FT\d{8,}[A-Za-z0-9]*)\b/i, // CBE Financial Transaction format
    /\b(CR[A-Za-z0-9]{8,14})\b/i,  // Common Telebirr format
    /\b(CC[A-Za-z0-9]{8,14})\b/i
  ];

  for (const regex of txPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      transactionId = match[1].toUpperCase().trim();
      break;
    }
  }

  // Extract Phone Number if mentioned
  const phoneMatch = text.match(/(?:2519\d{8}|09\d{8}|07\d{8})/);
  if (phoneMatch) {
    phone = phoneMatch[0];
  }

  // Validation
  if (!transactionId) {
    return {
      success: false,
      error: 'Could not detect a valid Transaction ID or Reference Number in the pasted message. Please check the SMS and try again.',
      rawText
    };
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return {
      success: false,
      error: 'Could not find a valid transfer amount in the SMS. Please ensure the message contains an ETB amount.',
      transactionId,
      rawText
    };
  }

  return {
    success: true,
    provider: provider === 'UNKNOWN' ? 'TELEBIRR' : provider,
    transactionId,
    amount,
    phone,
    rawText
  };
}

module.exports = {
  parseTransactionSMS
};
