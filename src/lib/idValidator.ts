/**
 * Validates Israeli National ID number (תעודת זהות)
 * Supports 7 to 9 digits with standard checksum algorithm
 */
export function validateIsraeliId(idStr: string): boolean {
  const trimmed = idStr.trim();
  if (!/^\d{7,9}$/.test(trimmed)) {
    return false;
  }

  // Pad to 9 digits with leading zeroes if needed
  const padded = trimmed.padStart(9, '0');
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    const digit = parseInt(padded[i], 10);
    const step = digit * ((i % 2) + 1);
    sum += step > 9 ? step - 9 : step;
  }

  return sum % 10 === 0;
}
