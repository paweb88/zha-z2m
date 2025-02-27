// src/utils.ts

/**
 * Konwertuje łańcuch hex oddzielony dwukropkami do tablicy liczb.
 * Np. "04:08:15:16:23:42:13:37" → [4, 8, 21, 22, 35, 66, 19, 55].
 * Jeśli reverse = true, wynikowa tablica jest odwracana.
 */
export function convertColonHexStringToByteArray(hexStr: string, reverse: boolean = false): number[] {
    const parts = hexStr.split(":").map(part => parseInt(part, 16));
    if (reverse) {
      parts.reverse();
    }
    return parts;
  }