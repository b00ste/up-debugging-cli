import {
    hexlify,
    isHexString,
    keccak256,
    toBeArray,
    toUtf8Bytes,
} from 'ethers';

export const isNumeric = (value: string | number): boolean => {
    return value != null && value !== '' && !isNaN(Number(value.toString()));
};

export const OnlySpacesStringNotAllowed = (text: string) => {
    if (text.replaceAll(' ', '').length === 0)
        throw new Error(`Error: Salt not valid. ('${text}')`);
};

export const verifyAddressValidity = (address: string) => {
    return verifyBytesNValidity(address, 20, false, false, false, true);
};
export const verifyBytes4Validity = (bytes4: string) => {
    return verifyBytesNValidity(bytes4, 4, false, false, true, true);
};
export const verifyBytes32Validity = (bytes32: string) => {
    return verifyBytesNValidity(bytes32, 20, false, false, true, true);
};
export const verifySaltValidity = (salt: string) => {
    return verifyBytesNValidity(salt, 20, true, true, true, true);
};
export const verifyUint64Validity = (uint64: string) => {
    return verifyBytesNValidity(uint64, 8, true, false, false, true);
};
export const verifyUint128Validity = (uint128: string) => {
    return verifyBytesNValidity(uint128, 16, true, false, false, true);
};

export const verifyBytesNValidity = (
    bytesNValue: string,
    N: number,
    lessBytesAllowed?: boolean,
    moreBytesAllowed?: boolean,
    textAllowed?: boolean,
    numberAllowed?: boolean,
) => {
    OnlySpacesStringNotAllowed(bytesNValue);

    const requiredNumberOfCharacters = 2 + N * 2;

    if (isHexString(bytesNValue)) {
        if (bytesNValue.length === requiredNumberOfCharacters) {
            return bytesNValue;
        } else if (
            lessBytesAllowed &&
            bytesNValue.length < requiredNumberOfCharacters
        ) {
            const missingZeros =
                requiredNumberOfCharacters - bytesNValue.length;
            const paddedHexValue = `0x${
                '0'.repeat(missingZeros) + bytesNValue.substring(2)
            }`;
            return paddedHexValue;
        } else if (
            moreBytesAllowed &&
            bytesNValue.length > requiredNumberOfCharacters
        ) {
            return keccak256(bytesNValue).substring(
                0,
                requiredNumberOfCharacters,
            );
        } else
            throw new Error(
                `Error: Invalid bytes${N}. Length must be ${N} bytes.`,
            );
    } else {
        if (numberAllowed && isNumeric(bytesNValue)) {
            const hexValue = hexlify(toBeArray(bytesNValue));
            if (hexValue.length > requiredNumberOfCharacters)
                throw new Error(
                    'Error: Overflow. Number too big for storage type.',
                );
            const missingZeros = requiredNumberOfCharacters - hexValue.length;
            const paddedHexValue = `0x${
                '0'.repeat(missingZeros) + hexValue.substring(2)
            }`;
            return paddedHexValue;
        } else if (textAllowed && isNaN(bytesNValue as any)) {
            return keccak256(toUtf8Bytes(bytesNValue));
        } else
            throw new Error(
                `Error: Invalid bytes${N} value. ('${bytesNValue}')`,
            );
    }
};

export function getProxyBytecode(baseContractAddress: string): string {
    /**
     * @see https://blog.openzeppelin.com/deep-dive-into-the-minimal-proxy-contract/
     * The first 10 x hex opcodes copy the runtime code into memory and return it.
     */
    const eip1167RuntimeCodeTemplate =
        '0x3d602d80600a3d3981f3363d3d373d3d3d363d73bebebebebebebebebebebebebebebebebebebebe5af43d82803e903d91602b57fd5bf3';

    // deploy proxy contract
    const proxyBytecode = eip1167RuntimeCodeTemplate.replace(
        'bebebebebebebebebebebebebebebebebebebebe',
        baseContractAddress.substr(2),
    );

    return proxyBytecode;
}
