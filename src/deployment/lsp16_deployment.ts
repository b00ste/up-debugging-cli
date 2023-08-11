import {
    keccak256,
    solidityPacked,
    getCreate2Address,
    Contract,
    ContractTransactionReceipt,
    parseUnits,
    Signer,
} from 'ethers';
import { LSP16UniversalFactoryAddress } from '../constants';
import lsp_artifacts from '../lsp_artifacts';
import { getProxyBytecode, isNumeric } from '../utils';
import {
    askForBaseContractAddress,
    askForConstructorParams,
    askForContractName,
    registerSalt,
} from './deploymentUtils';
import {
    ComputeAddressWithInitialization,
    ComputeAddressWithoutInitialization,
    DeployWithInitialization,
    DeployWithoutInitialization,
    InitializableValue,
} from './deploymentTypes';
import inquirer from 'inquirer';
import { getSalt } from '../get_salt';

const UniversalFactory = new Contract(
    LSP16UniversalFactoryAddress,
    lsp_artifacts.LSP16UniversalFactory.abi,
);

export async function askForDeploymentValue(
    initializable: true,
): Promise<InitializableValue>;
export async function askForDeploymentValue(
    initializable: false,
): Promise<bigint>;
export async function askForDeploymentValue(
    initializable: boolean,
): Promise<InitializableValue | bigint>;
export async function askForDeploymentValue(
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

        const baseContractAddress = await askForBaseContractAddress();

        return {
            initializable: true,
            initializeCalldata,
            baseContractAddress,
        };
    } else if (needsInitialization === 'no') {
        return {
            initializable: false,
            initializeCalldata: '0x',
            baseContractAddress: '',
        };
    }
    return {
        initializable: false,
        initializeCalldata: '0x',
        baseContractAddress: '',
    };
};

/// ------ Address Computing ------

export const computeAddressWithInitialization: ComputeAddressWithInitialization =
    async (salt, initializeCalldata, baseContractAddress) => {
        const generatedSalt = keccak256(
            solidityPacked(
                ['bool', 'bytes', 'bytes32'],
                [true, initializeCalldata, salt],
            ),
        );

        const contractBytecodeHash = keccak256(
            getProxyBytecode(baseContractAddress),
        );

        const computedAddress = getCreate2Address(
            LSP16UniversalFactoryAddress,
            generatedSalt,
            contractBytecodeHash,
        );

        return computedAddress;
    };

export const computeAddressWithoutInitialization: ComputeAddressWithoutInitialization =
    async (salt, contractName, constructorParams) => {
        const generatedSalt = keccak256(
            solidityPacked(['bool', 'bytes32'], [false, salt]),
        );

        const contractBytecodeHash = keccak256(
            lsp_artifacts[contractName].bytecode +
                constructorParams.substring(2),
        );

        const computedAddress = getCreate2Address(
            LSP16UniversalFactoryAddress,
            generatedSalt,
            contractBytecodeHash,
        );

        return computedAddress;
    };

export const LSP16ComputeAddress = async () => {
    const salt = await getSalt();

    const { initializable, initializeCalldata, baseContractAddress } =
        await askForInitializeCalldata();

    if (initializable) {
        const computedAddress = await computeAddressWithInitialization(
            salt,
            initializeCalldata,
            baseContractAddress,
        );

        return computedAddress;
    } else {
        const contractName = await askForContractName();
        const constructorParams = await askForConstructorParams();
        const computedAddress = await computeAddressWithoutInitialization(
            salt,
            contractName,
            constructorParams,
        );

        return computedAddress;
    }
};

/// ------ Contracts Deployment ------

export const deployWithInitialization: DeployWithInitialization = async (
    account,
    chainId,
    salt,
    initializeCalldata,
    baseContractAddress,
) => {
    const computedAddress = await computeAddressWithInitialization(
        salt,
        initializeCalldata,
        baseContractAddress,
    );

    const { constructorMsgValue, initializeCalldataMsgValue } =
        await askForDeploymentValue(true);

    const tx: ContractTransactionReceipt = await UniversalFactory.connect(
        account,
    )['deployCreate2AndInitialize'](
        getProxyBytecode(baseContractAddress),
        salt,
        initializeCalldata,
        constructorMsgValue,
        initializeCalldataMsgValue,
    );

    registerSalt(
        chainId,
        'lsp16',
        lsp_artifacts.LSP0ERC725Account.contractName,
        initializeCalldata,
        salt,
        computedAddress,
    );

    return { txHash: tx.hash, deployedContractAddress: computedAddress };
};

export const deployWithoutInitialization: DeployWithoutInitialization = async (
    account,
    chainId,
    salt,
    contractName,
    constructorParams,
) => {
    const computedAddress = await computeAddressWithoutInitialization(
        salt,
        contractName,
        constructorParams,
    );

    const ContractBytecode =
        lsp_artifacts[contractName].bytecode + constructorParams.substring(2);

    const value = await askForDeploymentValue(false);

    const tx: ContractTransactionReceipt = await UniversalFactory.connect(
        account,
    )['deployCreate2'](ContractBytecode, salt, { value });

    registerSalt(
        chainId,
        'lsp16',
        lsp_artifacts.LSP0ERC725Account.contractName,
        constructorParams,
        salt,
        computedAddress,
    );

    return { txHash: tx.hash, deployedContractAddress: computedAddress };
};

export const LSP16DeployContract = async (account: Signer, chainId: string) => {
    const salt = await getSalt();

    const { initializable, initializeCalldata, baseContractAddress } =
        await askForInitializeCalldata();

    if (initializable) {
        return await deployWithInitialization(
            account,
            chainId,
            salt,
            initializeCalldata,
            baseContractAddress,
        );
    } else {
        const contractName = await askForContractName();
        const constructorParams = await askForConstructorParams();
        return await deployWithoutInitialization(
            account,
            chainId,
            salt,
            contractName,
            constructorParams,
        );
    }
};
