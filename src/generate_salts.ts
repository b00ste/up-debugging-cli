import crypto from 'crypto';
import {
    askForConstructorParams,
    askForContractName,
} from './deployment/deploymentUtils';
import inquirer from 'inquirer';
import {
    askForInitializeCalldata,
    computeAddressWithInitialization,
    computeAddressWithoutInitialization,
} from './deployment/lsp16_deployment';
import { isNumeric } from './utils';

export const generate = async () => {
    const { numberOfSalts }: { numberOfSalts: string } = await inquirer.prompt({
        type: 'input',
        name: 'numberOfSalts',
        message: 'How many salts do you want to find?\n',
    });

    if (!isNumeric(numberOfSalts))
        throw new Error(
            `Unexpected Error: Answer is not a number. ('${numberOfSalts}')`,
        );

    const { addressStart }: { addressStart: string } = await inquirer.prompt({
        type: 'input',
        name: 'addressStart',
        message: 'How do you want the address to start? (1-64 characters)\n',
    });

    const { initializable, initializeCalldata, baseContractAddress } =
        await askForInitializeCalldata();

    const salt_and_addresses: {
        salt: string;
        address: string;
    }[] = [];
    let found = 0;

    if (initializable) {
        while (found < Number.parseInt(numberOfSalts)) {
            const salt = `0x${crypto.randomBytes(32).toString('hex')}`;
            const address = await computeAddressWithInitialization(
                salt,
                initializeCalldata,
                baseContractAddress,
            );

            if (address.startsWith(`0x${addressStart}`)) {
                salt_and_addresses.push({ salt, address });

                console.log({ salt, address });
            }
        }
    } else {
        const contractName = await askForContractName();
        const constructorParams = await askForConstructorParams();

        while (found < Number.parseInt(numberOfSalts)) {
            const salt = `0x${crypto.randomBytes(32).toString('hex')}`;
            const address = await computeAddressWithoutInitialization(
                salt,
                contractName,
                constructorParams,
            );

            if (address.startsWith(`0x${addressStart}`)) {
                salt_and_addresses.push({ salt, address });

                console.log({ salt, address });
            }
        }
    }

    return salt_and_addresses;
};
