/**
 * Склейка классов.
 *
 * Зачем отдельная функция: классы приходят из пропсов, из условий
 * и из значений по умолчанию, и половина из них — пустые строки
 * или false. Без чистки в разметку уезжает «btn  false  undefined».
 */
export function cn(...parts) {
  return parts.flat(Infinity).filter(Boolean).join(' ');
}
export default cn;
