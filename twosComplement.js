/**
 * @param {Number} value
 * @param {Number} [bitCount = 0]
 * 
 * @returns {String} binary representation of the two's complement of `value`.
 */
function twosComplement(value, bitCount) {
    let binaryStr;
    value = (value | 0);

    if (value >= 0) {
        let twosComp = value.toString(2);
        binaryStr = padAndChop(twosComp, '0', (bitCount || twosComp.length));
    } else {
        binaryStr = (Math.pow(2, bitCount) + value).toString(2);

        if (Number(binaryStr) < 0) {
            return undefined
        }
    }

    return binaryStr;
}


/**
 * @param {String} str
 * @param {String} padChar
 * @param {Number} length
 */
function padAndChop(str, padChar, length) {
    return (Array(length).fill(padChar).join('') + str).slice(length * -1);
}

