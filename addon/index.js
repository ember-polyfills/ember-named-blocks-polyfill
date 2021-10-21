/**
 * @type {WeakMap<object, string>}
 */
const INVOCATIONS = new WeakMap();

/**
 * Constructs a named block invocation for the block named _block_.
 *
 * @param {string} block
 * @returns {unknown}
 */
export function namedBlockInvocation(block) {
  let invocation = Object.create(null);

  Object.defineProperty(invocation, 'toString', {
    configurable: true,
    enumerable: false,
    writable: false,
    value: () => `{{yield to=${JSON.stringify(block)}}}`,
  });

  INVOCATIONS.set(invocation, block);

  return invocation;
}

/**
 * Check if _value_ is a named block invocation for the block named _block_.
 *
 * @param {unknown} value
 * @param {string} block
 * @returns {boolean}
 */
export function isNamedBlockInvocation(value, block) {
  if (typeof value === 'object' && value !== null && INVOCATIONS.has(value)) {
    return block === INVOCATIONS.get(value);
  } else {
    return block === 'default';
  }
}

/**
 * @typedef {{ [key: string]: number }} BlocksInfo
 *
 * @param {unknown} value
 * @returns {value is BlocksInfo}
 */
export function isBlocksInfo(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.getPrototypeOf(value) === null &&
    Object.values(value).every((v) => typeof v === 'number')
  );
}
