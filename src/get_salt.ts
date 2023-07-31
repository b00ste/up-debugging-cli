import {
    hexlify,
    isHexString,
    keccak256,
    toBeArray,
    toUtf8Bytes,
} from 'ethers';
import inquirer from 'inquirer';
import { OnlySpacesStringNotAllowed, isNumeric } from './utils';

export const getSalt = async () => {
    const { salt } = await inquirer.prompt({
        type: 'input',
        name: 'salt',
        message: 'Please provide a custom salt you want to use.',
    });

    OnlySpacesStringNotAllowed(salt);

    if (isHexString(salt)) {
        if (salt.length === 66) {
            return salt;
        } else if (salt.length < 66) {
            const missingZeros = 66 - salt.length;
            const paddedHexSalt = `0x${
                '0'.repeat(missingZeros) + salt.substring(2)
            }`;
            return paddedHexSalt;
        } else if (salt.length > 66) {
            return keccak256(salt);
        }
    } else {
        if (isNumeric(salt)) {
            const hexSalt = hexlify(toBeArray(salt));
            const missingZeros = 66 - hexSalt.length;
            const paddedHexSalt = `0x${
                '0'.repeat(missingZeros) + hexSalt.substring(2)
            }`;
            return paddedHexSalt;
        } else if (isNaN(salt)) {
            return keccak256(toUtf8Bytes(salt));
        } else throw new Error(`Unexpected Error: Salt not valid. ('${salt}')`);
    }
};
