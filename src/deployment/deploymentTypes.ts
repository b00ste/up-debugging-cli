import { Signer } from 'ethers';

export type ComputeAddressWithInitialization = (
    salt: string,
    initializeCalldata: string,
    baseContractAddress: string,
) => Promise<string>;

export type ComputeAddressWithoutInitialization = (
    salt: string,
    contractName: string,
    constructorParams: string,
) => Promise<string>;

export type DeployWithInitialization = (
    account: Signer,
    chainId: string,
    salt: string,
    initializeCalldata: string,
    baseContractAddress: string,
) => Promise<{ txHash: string; deployedContractAddress: string }>;

export type DeployWithoutInitialization = (
    account: Signer,
    chainId: string,
    salt: string,
    contractName: string,
    constructorParams: string,
) => Promise<{ txHash: string; deployedContractAddress: string }>;

export type InitializableValue = {
    constructorMsgValue: bigint;
    initializeCalldataMsgValue: bigint;
};

// -------- LSP23 --------

export type PrimaryContractDeploymentInit = {
    salt: string;
    fundingAmount: bigint;
    implementationContract: string;
    initializationCalldata: string;
};

export type SecondaryContractDeploymentInit = {
    fundingAmount: bigint;
    implementationContract: string;
    initializationCalldata: string;
    addPrimaryContractAddress: boolean;
    extraInitializationParams: string;
};

export type PrimaryContractDeployment = {
    fundingAmount: bigint;
    salt: string;
    creationBytecode: string;
};

export type SecondaryContractDeployment = {
    creationBytecode: string;
    fundingAmount: bigint;
    addPrimaryContractAddress: boolean;
    extraConstructorParams: string;
};
