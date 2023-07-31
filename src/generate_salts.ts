import crypto from 'crypto';
import { computeAddress, askForInitializeCalldata } from './deploy_up';
import inquirer from 'inquirer';

export const generate = async (newOwner: string) => {
    const { addressStart } = await inquirer.prompt({
        type: 'input',
        name: 'addressStart',
        message: 'How do you want the address to start? (1-64 characters)\n',
    });

    const { initializable, initializeCalldata } =
        await askForInitializeCalldata();

    const salt_and_address = {
        salt: '',
        address: '',
    };

    while (salt_and_address.salt === '' && salt_and_address.address === '') {
        const salt = `0x${crypto.randomBytes(32).toString('hex')}`;
        const address = await computeAddress(
            newOwner,
            salt,
            initializable,
            initializeCalldata,
        );

        if (address.startsWith(`0x${addressStart}`)) {
            salt_and_address.salt = salt;
            salt_and_address.address = address;
        }
    }

    return salt_and_address;
};
