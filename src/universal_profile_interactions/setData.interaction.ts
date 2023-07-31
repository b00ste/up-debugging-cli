import inquirer from 'inquirer';
import { Contract, hexlify, isHexString, toBeArray, toUtf8Bytes } from 'ethers';

import ERC725YDataKeys from '../../storage/ERC725YDataKeys.json' assert { type: 'json' };
import {
    OnlySpacesStringNotAllowed,
    isNumeric,
    verifyAddressValidity,
    verifyBytes32Validity,
    verifyBytes4Validity,
    verifyUint128Validity,
    verifyUint64Validity,
} from '../utils';

const askForDataValue = async () => {
    const { dataValue }: { dataValue: string } = await inquirer.prompt([
        {
            type: 'input',
            name: 'dataValue',
            message:
                'Please type the value that you want to set for the previously selected Data Key:\n',
        },
    ]);

    OnlySpacesStringNotAllowed(dataValue);

    if (!isHexString(dataValue)) {
        if (isNumeric(dataValue)) {
            return hexlify(toBeArray(dataValue));
        } else if (isNaN(dataValue as any)) {
            return toUtf8Bytes(dataValue);
        } else throw new Error(`Error: Invalid Data Value. ('${dataValue}')`);
    }

    return dataValue;
};

const dataValueValidityCheck = (
    standard: string,
    dataKeyName: string,
    rawDataValue: string,
) => {
    let dataValue: string;
    if (ERC725YDataKeys[standard][dataKeyName].dataValueType === 'address') {
        dataValue = verifyAddressValidity(rawDataValue);
    } else if (
        ERC725YDataKeys[standard][dataKeyName].dataValueType === 'bytes32'
    ) {
        dataValue = verifyBytes32Validity(rawDataValue);
    } else if (
        ERC725YDataKeys[standard][dataKeyName].dataValueType ===
        'bytes[CompactBytesArray]'
    ) {
    } else if (
        ERC725YDataKeys[standard][dataKeyName].dataValueType ===
        '(bytes4,address,bytes4,bytes4)[CompactBytesArray]'
    ) {
    } else if (
        ERC725YDataKeys[standard][dataKeyName].dataValueType ===
        '(bytes4,bytes8)'
    ) {
        const [bytes4, uint64] = rawDataValue.split(',');

        dataValue =
            verifyBytes4Validity(bytes4) +
            verifyUint64Validity(uint64).substring(2);
    }
    return dataValue;
};

const askForStandardRelatedDataKeyAndValue = async () => {
    // ---- Retrieve Data Key ----

    const LSPs = [];
    for (const LSP in ERC725YDataKeys) {
        LSPs.push(LSP);
    }

    const { standard }: { standard: string } = await inquirer.prompt({
        type: 'list',
        name: 'standard',
        message:
            'Please select a standard for which you want to change a Data Key:',
        choices: LSPs,
    });

    const dataKeys = [];
    for (const dataKey in ERC725YDataKeys[standard]) {
        dataKeys.push(dataKey);
    }

    const { dataKeyName }: { dataKeyName: string } = await inquirer.prompt({
        type: 'list',
        name: 'dataKeyName',
        message: 'Please select a Data Key that you want to change:',
        choices: dataKeys,
    });

    if (dataKeyName.endsWith('[]')) {
        const { lengthOrIndex }: { lengthOrIndex: string } =
            await inquirer.prompt({
                type: 'list',
                name: 'lengthOrIndex',
                message:
                    'Do you want to modify the length of the array or an element at a specific index?',
                choices: ['length', 'index'],
            });

        if (lengthOrIndex === 'length') {
            const dataKey = ERC725YDataKeys[standard][dataKeyName].length;
            const { rawDataValue }: { rawDataValue: string } =
                await inquirer.prompt({
                    type: 'input',
                    name: 'rawDataValue',
                    message:
                        'Please provide a new uint128 length for the array.\n',
                });

            const dataValue = verifyUint128Validity(rawDataValue);

            return { dataKey, dataValue };
        } else if (lengthOrIndex === 'index') {
            const { dataKeySuffix }: { dataKeySuffix: string } =
                await inquirer.prompt({
                    type: 'input',
                    name: 'dataKeySuffix',
                    message:
                        'Please provide a uint128 index for the array element.\n',
                });

            const dataKey =
                ERC725YDataKeys[standard][dataKeyName].index +
                verifyUint128Validity(dataKeySuffix);

            const { rawDataValue }: { rawDataValue: string } =
                await inquirer.prompt({
                    type: 'input',
                    name: 'rawDataValue',
                    message: 'Please provide an address for the element.\n',
                });

            const dataValue = verifyAddressValidity(rawDataValue);

            return { dataKey, dataValue };
        }
    } else if (ERC725YDataKeys[standard][dataKeyName].dataKey.length === 66) {
        const dataKey = ERC725YDataKeys[standard][dataKeyName].dataKey;

        /// ----- RAW DATA VALUE RETRIEVAL ----- ///

        const { rawDataValue }: { rawDataValue: string } =
            await inquirer.prompt({
                type: 'input',
                name: 'rawDataValue',
                message:
                    ERC725YDataKeys[standard][dataKeyName].dataValueMessage,
            });

        /// ----- DATA VALUE VALIDITY CHECK ----- ///

        const dataValue = dataValueValidityCheck(
            standard,
            dataKeyName,
            rawDataValue,
        );

        return { dataKey, dataValue };
    } else if (ERC725YDataKeys[standard][dataKeyName].dataKey.length < 66) {
        /// ----- DATA KEY SUFIX RETRIEVAL ----- ///

        const dataKeyPrefix = ERC725YDataKeys[standard][dataKeyName].dataKey;
        const { dataKeySufix }: { dataKeySufix: string } =
            await inquirer.prompt({
                type: 'input',
                name: 'dataKeySufix',
                message: ERC725YDataKeys[standard][dataKeyName].dataKeyMessage,
            });

        /// ----- DATA KEY SUFIX VALIDITY CHECK ----- ///

        let dataKey: string;
        if (ERC725YDataKeys[standard][dataKeyName].dataKeyType === 'address') {
            verifyAddressValidity(dataKeySufix);
            dataKey = dataKeyPrefix + dataKeySufix.substring(2);
        } else if (
            ERC725YDataKeys[standard][dataKeyName].dataKeyType === 'bytes4'
        ) {
            verifyBytes4Validity(dataKeySufix);
            dataKey =
                dataKeyPrefix + dataKeySufix.substring(2) + '0'.repeat(32);
        } else if (
            ERC725YDataKeys[standard][dataKeyName].dataKeyType === 'bytes32'
        ) {
            verifyBytes32Validity(dataKeySufix);
            dataKey = dataKeyPrefix + dataKeySufix.substring(2, 42);
        }

        /// ----- RAW DATA VALUE RETRIEVAL ----- ///

        const { rawDataValue }: { rawDataValue: string } =
            await inquirer.prompt({
                type: 'input',
                name: 'rawDataValue',
                message:
                    ERC725YDataKeys[standard][dataKeyName].dataValueMessage,
            });

        /// ----- DATA VALUE VALIDITY CHECK ----- ///

        const dataValue = dataValueValidityCheck(
            standard,
            dataKeyName,
            rawDataValue,
        );

        return { dataKey, dataValue };
    } else throw new Error('Error: Invalid standardized data key');
};

const askForArbitraryRelatedDataKeyAndValue = async () => {
    // ---- Retrieve Data Key ----

    const { dataKey }: { dataKey: string } = await inquirer.prompt([
        {
            type: 'input',
            name: 'dataKey',
            message:
                'Please type a Data Key that you want to update the value for:\n',
        },
    ]);

    verifyBytes32Validity(dataKey);

    // ---- Retrieve Data Value ----

    const dataValue = await askForDataValue();

    return { dataKey, dataValue };
};

export const setData = async (UniversalProfile: Contract) => {
    const { updateLSPSpecificDataKey } = await inquirer.prompt({
        type: 'list',
        name: 'updateLSPSpecificDataKey',
        message: 'Do you want to update Data Key related to the LSPs?',
        choices: ['yes', 'no'],
        default: 'yes',
    });

    if (updateLSPSpecificDataKey === 'yes') {
        const { dataKey, dataValue } =
            await askForStandardRelatedDataKeyAndValue();

        return await UniversalProfile.setData(dataKey, dataValue);
    } else if (updateLSPSpecificDataKey === 'no') {
        const { dataKey, dataValue } =
            await askForArbitraryRelatedDataKeyAndValue();

        return await UniversalProfile.setData(dataKey, dataValue);
    } else throw new Error("Unexpected Error: Answer must be 'yes' or 'no'.");
};

export const setDataBatch = async (UniversalProfile: Contract) => {
    const { numberOfDataKeys }: { numberOfDataKeys: string } =
        await inquirer.prompt({
            type: 'input',
            name: 'numberOfDataKeys',
            message: '',
        });

    if (!isNumeric(numberOfDataKeys)) throw new Error('Error: Not a number.');

    const dataKeys = [];
    const dataValues = [];
    for (let i = 0; i < Number.parseInt(numberOfDataKeys); i++) {
        const { updateLSPSpecificDataKey } = await inquirer.prompt({
            type: 'list',
            name: 'updateLSPSpecificDataKey',
            message: 'Do you want to update Data Key related to the LSPs?',
            choices: ['yes', 'no'],
            default: 'yes',
        });

        if (updateLSPSpecificDataKey === 'yes') {
            const { dataKey, dataValue } =
                await askForStandardRelatedDataKeyAndValue();

            dataKeys.push(dataKey);
            dataValues.push(dataValue);
        } else if (updateLSPSpecificDataKey === 'no') {
            const { dataKey, dataValue } =
                await askForArbitraryRelatedDataKeyAndValue();

            dataKeys.push(dataKey);
            dataValues.push(dataValue);
        } else
            throw new Error("Unexpected Error: Answer must be 'yes' or 'no'.");
    }
    return await UniversalProfile.setDataBatch(dataKeys, dataValues);
};
