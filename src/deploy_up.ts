import fs from 'fs';
import inquirer from 'inquirer';
import {
    Signer,
    keccak256,
    Contract,
    solidityPacked,
    getCreate2Address,
    parseUnits,
    ContractTransactionReceipt,
} from 'ethers';
import { LSP16UniversalFactoryAddress } from './constants';
import { isNumeric } from './utils';

import LSP0ERC725Account from '@lukso/lsp-smart-contracts/artifacts/LSP0ERC725Account.json' assert { type: 'json' };
import LSP16UniversalFactory from '@lukso/lsp-smart-contracts/artifacts/LSP16UniversalFactory.json' assert { type: 'json' };

const UniversalFactory = new Contract(
    LSP16UniversalFactoryAddress,
    LSP16UniversalFactory.abi,
);

type InitializableValue = {
    constructorMsgValue: bigint;
    initializeCalldataMsgValue: bigint;
};

const registerSalt = async (
    chainId: string,
    ownerAddress: string,
    salt: string,
    deployedAddress: string,
) => {
    const UsedSalts = JSON.parse(
        fs.readFileSync('./storage/UsedSalts.json', 'utf8').toString(),
    );

    if (!UsedSalts[chainId]) {
        UsedSalts[chainId] = {};
    }
    if (!UsedSalts[chainId][ownerAddress]) {
        UsedSalts[chainId][ownerAddress] = {};
    }
    UsedSalts[chainId][ownerAddress][salt] = deployedAddress;

    fs.writeFileSync('./storage/UsedSalts.json', JSON.stringify(UsedSalts));
};

async function askForDeploymentValue(
    initializable: true,
): Promise<InitializableValue>;
async function askForDeploymentValue(initializable: false): Promise<bigint>;
async function askForDeploymentValue(
    initializable: boolean,
): Promise<InitializableValue | bigint>;
async function askForDeploymentValue(
    initializable: boolean,
): Promise<InitializableValue | bigint> {
    if (initializable) {
        const { constructorMsgValue } = await inquirer.prompt({
            name: 'constructorMsgValue',
            message:
                'How much value do you want to send when deploying the contract? (in ether, e.g. 0.01)',
            default: '0',
        });
        if (!isNumeric(constructorMsgValue))
            throw new Error(
                `Unexpected Error: Answer is not a number. ('${constructorMsgValue}')`,
            );

        const { initializeCalldataMsgValue } = await inquirer.prompt({
            name: 'initializeCalldataMsgValue',
            message:
                'How much value do you want to send when initialising the contract? (in ether, e.g. 0.01)',
            default: '0',
        });
        if (!isNumeric(initializeCalldataMsgValue))
            throw new Error(
                `Unexpected Error: Answer is not a number. ('${initializeCalldataMsgValue}')`,
            );

        return {
            constructorMsgValue: parseUnits(constructorMsgValue, 'wei'),
            initializeCalldataMsgValue: parseUnits(
                initializeCalldataMsgValue,
                'wei',
            ),
        };
    } else {
        const { value } = await inquirer.prompt({
            name: 'value',
            message:
                'How much value do you want to send when deploying the contract? (in ether, e.g. 0.01)',
            default: '0',
        });
        if (!isNumeric(value))
            throw new Error(
                `Unexpected Error: Answer is not a number. ('${value}')`,
            );

        return parseUnits(value, 'ether');
    }
}

export const askForInitializeCalldata = async () => {
    const { needsInitialization } = await inquirer.prompt({
        type: 'list',
        name: 'needsInitialization',
        message: 'Do you need to initialize your UP?',
        choices: ['yes', 'no'],
        default: 'no',
    });

    if (needsInitialization === 'yes') {
        const { initializeCalldata } = await inquirer.prompt({
            type: 'input',
            name: 'initializeCalldata',
            message: 'Pass initialize calldata please.\n',
        });
        return {
            initializable: false,
            initializeCalldata,
        };
    } else if (needsInitialization === 'no') {
        return {
            initializable: false,
            initializeCalldata: '0x',
        };
    }
    return {
        initializable: false,
        initializeCalldata: '0x',
    };
};

export const computeAddress = async (
    newOwner: string,
    salt: string,
    initializable: boolean,
    initializeCalldata: string,
) => {
    const LSP0ERC725AccountBytecodeHash = keccak256(
        LSP0ERC725Account.bytecode + '0'.repeat(24) + newOwner.substring(2),
    );

    const generatedSalt = keccak256(
        solidityPacked(
            ['bool', 'bytes', 'bytes32'],
            [initializable, initializeCalldata, salt],
        ),
    );

    const computedAddress = getCreate2Address(
        LSP16UniversalFactoryAddress,
        generatedSalt,
        LSP0ERC725AccountBytecodeHash,
    );

    return computedAddress;
};

export const deploy = async (
    account: Signer,
    chainId: string,
    newOwner: string,
    salt: string,
) => {
    const LSP0ERC725AccountBytecode =
        LSP0ERC725Account.bytecode + '0'.repeat(24) + newOwner.substring(2);

    const { initializable, initializeCalldata } =
        await askForInitializeCalldata();

    const computedAddress = await computeAddress(
        newOwner,
        salt,
        initializable,
        initializeCalldata,
    );

    let tx: ContractTransactionReceipt;
    if (initializable) {
        const { constructorMsgValue, initializeCalldataMsgValue } =
            await askForDeploymentValue(initializable);

        tx = await UniversalFactory.connect(account)[
            'deployCreate2AndInitialize'
        ](
            LSP0ERC725AccountBytecode,
            salt,
            initializeCalldata,
            constructorMsgValue,
            initializeCalldataMsgValue,
        );
    } else {
        const value = await askForDeploymentValue(initializable);

        tx = await UniversalFactory.connect(account)['deployCreate2'](
            LSP0ERC725AccountBytecode,
            salt,
            { value },
        );
    }

    registerSalt(chainId, newOwner, salt, computedAddress);

    return { txHash: tx.hash, deployedContractAddress: computedAddress };
};
