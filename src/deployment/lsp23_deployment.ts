import {
    Signer,
    Contract,
    ContractTransactionReceipt,
    parseUnits,
    solidityPacked,
    getCreate2Address,
    keccak256,
} from 'ethers';
import { LSP23LinkedContractsFactoryAddress } from '../constants';
import lsp_artifacts from '../lsp_artifacts';
import {
    PrimaryContractDeployment,
    PrimaryContractDeploymentInit,
    SecondaryContractDeployment,
    SecondaryContractDeploymentInit,
} from './deploymentTypes';
import { isNumeric } from '../utils';
import inquirer from 'inquirer';
import { getSalt } from '../get_salt';
import {
    askForBaseContractAddress,
    askForConstructorParams,
    askForContractName,
} from './deploymentUtils';

const LinkedContractsFactory = new Contract(
    LSP23LinkedContractsFactoryAddress,
    lsp_artifacts.LSP23LinkedContractsFactory.abi,
);

export const askForPrimaryContractFundingAmount = async () => {
    const { primaryContractFundingAmount } = await inquirer.prompt({
        name: 'primaryContractFundingAmount',
        message:
            'Funding amount for the deployment of the primary contract: (in ether, e.g. 0.01)\n',
        default: '0',
    });

    if (!isNumeric(primaryContractFundingAmount))
        throw new Error(
            `Unexpected Error: Answer is not a number. ('${primaryContractFundingAmount}')`,
        );

    return parseUnits(primaryContractFundingAmount, 'ether');
};

export const askForSecondaryContractFundingAmount = async () => {
    const { secondaryContractfundingAmount } = await inquirer.prompt({
        name: 'secondaryContractfundingAmount',
        message:
            'Funding amount for the deployment of the secondary contract: (in ether, e.g. 0.01)\n',
        default: '0',
    });

    if (!isNumeric(secondaryContractfundingAmount))
        throw new Error(
            `Unexpected Error: Answer is not a number. ('${secondaryContractfundingAmount}')`,
        );

    return parseUnits(secondaryContractfundingAmount, 'ether');
};

export const askForPostDeployment = async () => {
    const { postDeploymentModule } = await inquirer.prompt({
        name: 'postDeploymentModule',
        type: 'input',
        message: 'Address of the post deployment module:\n',
        default: '0x' + '00'.repeat(20),
    });

    const { postDeploymentModuleCalldata } = await inquirer.prompt({
        name: 'postDeploymentModuleCalldata',
        type: 'input',
        message: 'Post deployment calldata:\n',
        default: '0x',
    });

    return { postDeploymentModule, postDeploymentModuleCalldata };
};

/// ------ Proxy Contracts ------

export const askForPrimaryContractInitializationCalldata = async () => {
    const { primaryContractInitializationCalldata } = await inquirer.prompt({
        name: 'primaryContractInitializationCalldata',
        type: 'input',
        message:
            'Initialization calldata for the primary contract: (abi encoded value)\n',
    });

    return primaryContractInitializationCalldata;
};

export const askForSecondaryContractInitializationCalldata = async () => {
    const { secondaryContractInitializationCalldata } = await inquirer.prompt({
        name: 'secondaryContractInitializationCalldata',
        type: 'input',
        message:
            'Initialization calldata for the primary contract: (abi encoded value)\n',
    });

    const { addPrimaryContractAddress } = await inquirer.prompt({
        name: 'addPrimaryContractAddress',
        type: 'list',
        message:
            'Do you want to add the address of the primary contract to constructor?',
        choices: ['yes', 'no'],
        default: 'yes',
    });

    if (addPrimaryContractAddress === 'yes') {
        const { extraParametersAfterPrimaryContractAddress } =
            await inquirer.prompt({
                name: 'extraParametersAfterPrimaryContractAddress',
                type: 'input',
                message:
                    'Extra parameters after the primary contract address: (abi encoded value)\n',
                default: '0x',
            });

        return {
            initializationCalldata: secondaryContractInitializationCalldata,
            addPrimaryContractAddress: true,
            extraInitializationParams:
                extraParametersAfterPrimaryContractAddress,
        };
    } else {
        return {
            initializationCalldata: secondaryContractInitializationCalldata,
            addPrimaryContractAddress: false,
            extraInitializationParams: '0x',
        };
    }
};

export const askForPrimaryContractDeploymentInit =
    async (): Promise<PrimaryContractDeploymentInit> => {
        const salt = await getSalt();
        const fundingAmount = await askForPrimaryContractFundingAmount();
        const implementationContract = await askForBaseContractAddress();
        const initializationCalldata =
            await askForPrimaryContractInitializationCalldata();

        return {
            salt,
            fundingAmount,
            implementationContract,
            initializationCalldata,
        };
    };

export const askForSecondaryContractDeploymentInit =
    async (): Promise<SecondaryContractDeploymentInit> => {
        const fundingAmount = await askForSecondaryContractFundingAmount();
        const implementationContract = await askForBaseContractAddress();
        const {
            initializationCalldata,
            addPrimaryContractAddress,
            extraInitializationParams,
        } = await askForSecondaryContractInitializationCalldata();

        return {
            fundingAmount,
            implementationContract,
            initializationCalldata,
            addPrimaryContractAddress,
            extraInitializationParams,
        };
    };

/// ------ Normal Contracts ------

export const askForPrimaryContractCreationBytecode = async () => {
    const contractName = await askForContractName();
    const constructorParams = await askForConstructorParams();

    return (
        lsp_artifacts[contractName].bytecode + constructorParams.substring(2)
    );
};

export const askForSecondaryContractCreationBytecode = async () => {
    const contractName = await askForContractName();

    const { addPrimaryContractAddress } = await inquirer.prompt({
        name: 'addPrimaryContractAddress',
        type: 'list',
        message:
            'Do you want to add the address of the primary contract to constructor?',
        choices: ['yes', 'no'],
        default: 'yes',
    });

    if (addPrimaryContractAddress === 'yes') {
        const { extraParametersBeforePrimaryContractAddress } =
            await inquirer.prompt({
                name: 'extraParametersBeforePrimaryContractAddress',
                type: 'input',
                message:
                    'Extra parameters before the primary contract address: (abi encoded value)\n',
                default: '0x',
            });

        const { extraParametersAfterPrimaryContractAddress } =
            await inquirer.prompt({
                name: 'extraParametersAfterPrimaryContractAddress',
                type: 'input',
                message:
                    'Extra parameters after the primary contract address: (abi encoded value)\n',
                default: '0x',
            });

        return {
            creationBytecode:
                lsp_artifacts[contractName].bytecode +
                extraParametersBeforePrimaryContractAddress.substring(2),
            addPrimaryContractAddress: true,
            extraConstructorParams: extraParametersAfterPrimaryContractAddress,
        };
    } else if (addPrimaryContractAddress === 'no') {
        const constructorParams = await askForConstructorParams();

        return {
            creationBytecode:
                lsp_artifacts[contractName].bytecode +
                constructorParams.substring(2),
            addPrimaryContractAddress: false,
            extraConstructorParams: '0x',
        };
    }
};

export const askForPrimaryContractDeployment =
    async (): Promise<PrimaryContractDeployment> => {
        const salt = await getSalt();
        const fundingAmount = await askForPrimaryContractFundingAmount();
        const creationBytecode = await askForPrimaryContractCreationBytecode();

        return {
            fundingAmount,
            salt,
            creationBytecode,
        };
    };

export const askForSecondaryContractDeployment =
    async (): Promise<SecondaryContractDeployment> => {
        const fundingAmount = await askForSecondaryContractFundingAmount();
        const {
            creationBytecode,
            addPrimaryContractAddress,
            extraConstructorParams,
        } = await askForSecondaryContractCreationBytecode();

        return {
            creationBytecode,
            fundingAmount,
            addPrimaryContractAddress,
            extraConstructorParams,
        };
    };

/// ------ Address Computing ------

export const computeERC1167Addresses = async (
    primaryContractDeploymentInit: PrimaryContractDeploymentInit,
    secondaryContractDeploymentInit: SecondaryContractDeploymentInit,
    postDeploymentModule: string,
    postDeploymentModuleCalldata: string,
) => {
    const generatedSalt = keccak256(
        solidityPacked(
            [
                'bytes32',
                'address',
                'bytes',
                'bool',
                'bytes',
                'address',
                'bytes',
            ],
            [
                primaryContractDeploymentInit.salt,
                secondaryContractDeploymentInit.implementationContract,
                secondaryContractDeploymentInit.initializationCalldata,
                secondaryContractDeploymentInit.addPrimaryContractAddress,
                secondaryContractDeploymentInit.extraInitializationParams,
                postDeploymentModule,
                postDeploymentModuleCalldata,
            ],
        ),
    );

    const primaryContractAddress = getCreate2Address(
        LSP23LinkedContractsFactoryAddress,
        generatedSalt,
        keccak256(
            '0x3d602d80600a3d3981f3363d3d373d3d3d363d73' +
                primaryContractDeploymentInit.implementationContract.substring(
                    2,
                ) +
                '5af43d82803e903d91602b57fd5bf3',
        ),
    );

    const secondaryContractAddress = getCreate2Address(
        LSP23LinkedContractsFactoryAddress,
        keccak256(primaryContractAddress),
        keccak256(
            '0x3d602d80600a3d3981f3363d3d373d3d3d363d73' +
                secondaryContractDeploymentInit.implementationContract.substring(
                    2,
                ) +
                '5af43d82803e903d91602b57fd5bf3',
        ),
    );

    return { primaryContractAddress, secondaryContractAddress };
};

export const computeAddresses = async (
    primaryContractDeployment: PrimaryContractDeployment,
    secondaryContractDeployment: SecondaryContractDeployment,
    postDeploymentModule: string,
    postDeploymentModuleCalldata: string,
) => {
    const generatedSalt = keccak256(
        solidityPacked(
            ['bytes32', 'bytes', 'bool', 'bytes', 'address', 'bytes'],
            [
                primaryContractDeployment.salt,
                secondaryContractDeployment.creationBytecode,
                secondaryContractDeployment.addPrimaryContractAddress,
                secondaryContractDeployment.extraConstructorParams,
                postDeploymentModule,
                postDeploymentModuleCalldata,
            ],
        ),
    );

    const primaryContractAddress = getCreate2Address(
        LSP23LinkedContractsFactoryAddress,
        generatedSalt,
        keccak256(primaryContractDeployment.creationBytecode),
    );

    let secondaryContractByteCodeWithAllParams: string;
    if (secondaryContractDeployment.addPrimaryContractAddress) {
        secondaryContractByteCodeWithAllParams = solidityPacked(
            ['bytes', 'address', 'bytes'],
            [
                secondaryContractDeployment.creationBytecode,
                primaryContractAddress,
                secondaryContractDeployment.extraConstructorParams,
            ],
        );
    } else {
        secondaryContractByteCodeWithAllParams =
            secondaryContractDeployment.creationBytecode;
    }

    const secondaryContractAddress = getCreate2Address(
        LSP23LinkedContractsFactoryAddress,
        keccak256(primaryContractAddress),
        keccak256(secondaryContractByteCodeWithAllParams),
    );

    return { primaryContractAddress, secondaryContractAddress };
};

export const LSP23ComputeAddresses = async () => {
    const { contractDeploymentType } = await inquirer.prompt({
        name: 'contractDeploymentType',
        type: 'list',
        message: 'What type of contracts do you want to deploy?',
        choices: ['normal contracts', 'proxy contracts'],
    });

    if (contractDeploymentType === 'normal contracts') {
        const primaryContractDeployment =
            await askForPrimaryContractDeployment();
        const secondaryContractDeployment =
            await askForSecondaryContractDeployment();

        const { postDeploymentModule, postDeploymentModuleCalldata } =
            await askForPostDeployment();

        return await computeAddresses(
            primaryContractDeployment,
            secondaryContractDeployment,
            postDeploymentModule,
            postDeploymentModuleCalldata,
        );
    } else if (contractDeploymentType === 'proxy contracts') {
        const primaryContractDeploymentInit =
            await askForPrimaryContractDeploymentInit();
        const secondaryContractDeploymentInit =
            await askForSecondaryContractDeploymentInit();

        const { postDeploymentModule, postDeploymentModuleCalldata } =
            await askForPostDeployment();

        return await computeERC1167Addresses(
            primaryContractDeploymentInit,
            secondaryContractDeploymentInit,
            postDeploymentModule,
            postDeploymentModuleCalldata,
        );
    }
};

/// ------ Contracts Deployment ------

export const deployERC1167Proxies = async (
    account: Signer,
    chainId: string,
) => {
    const primaryContractDeploymentInit =
        await askForPrimaryContractDeploymentInit();
    const secondaryContractDeploymentInit =
        await askForSecondaryContractDeploymentInit();

    const { postDeploymentModule, postDeploymentModuleCalldata } =
        await askForPostDeployment();

    const { primaryContractAddress, secondaryContractAddress } =
        await computeERC1167Addresses(
            primaryContractDeploymentInit,
            secondaryContractDeploymentInit,
            postDeploymentModule,
            postDeploymentModuleCalldata,
        );

    const tx: ContractTransactionReceipt = await LinkedContractsFactory.connect(
        account,
    )['deployERC1167Proxies'](
        primaryContractDeploymentInit,
        secondaryContractDeploymentInit,
        postDeploymentModule,
        postDeploymentModuleCalldata,
    );
    return {
        txHash: tx.hash,
        primaryContractAddress,
        secondaryContractAddress,
    };
};

export const deployContracts = async (account: Signer, chainId: string) => {
    const primaryContractDeployment = await askForPrimaryContractDeployment();
    const secondaryContractDeployment =
        await askForSecondaryContractDeployment();

    const { postDeploymentModule, postDeploymentModuleCalldata } =
        await askForPostDeployment();

    const { primaryContractAddress, secondaryContractAddress } =
        await computeAddresses(
            primaryContractDeployment,
            secondaryContractDeployment,
            postDeploymentModule,
            postDeploymentModuleCalldata,
        );

    const tx: ContractTransactionReceipt = await LinkedContractsFactory.connect(
        account,
    )['deployContracts'](
        primaryContractDeployment,
        secondaryContractDeployment,
        postDeploymentModule,
        postDeploymentModuleCalldata,
    );
    return {
        txHash: tx.hash,
        primaryContractAddress,
        secondaryContractAddress,
    };
};

export const LSP23DeployContracts = async (
    account: Signer,
    chainId: string,
) => {
    const { contractDeploymentType } = await inquirer.prompt({
        name: 'contractDeploymentType',
        type: 'list',
        message: 'What type of contracts do you want to deploy?',
        choices: ['normal contracts', 'proxy contracts'],
    });

    if (contractDeploymentType === 'normal contracts') {
        return await deployContracts(account, chainId);
    } else if (contractDeploymentType === 'proxy contracts') {
        return await deployERC1167Proxies(account, chainId);
    }
};
