import fs from 'fs';
import inquirer from 'inquirer';
import lsp_artifacts from '../lsp_artifacts';

export const registerSalt = async (
    chainId: string,
    deployer: 'lsp16' | 'lsp23',
    contractName: string,
    constructorParams: string,
    deployedAddress: string,
    salt: string,
) => {
    const UsedSalts = JSON.parse(
        fs.readFileSync('./storage/UsedSalts.json', 'utf8').toString(),
    );

    if (!UsedSalts[chainId]) {
        UsedSalts[chainId] = {};
    }
    if (!UsedSalts[chainId][deployer]) {
        UsedSalts[chainId][deployer] = {};
    }
    if (!UsedSalts[chainId][deployer][contractName]) {
        UsedSalts[chainId][deployer][contractName] = {};
    }
    if (!UsedSalts[chainId][deployer][contractName][constructorParams]) {
        UsedSalts[chainId][deployer][contractName][constructorParams] = {};
    }
    UsedSalts[chainId][deployer][contractName][constructorParams][salt] =
        deployedAddress;

    fs.writeFileSync('./storage/UsedSalts.json', JSON.stringify(UsedSalts));
};

export const askForDeployer = async () => {
    const { deployerName }: { deployerName: string } = await inquirer.prompt({
        type: 'list',
        name: 'deployerName',
        message: 'What deployer do you want to use?',
        choices: ['LSP16', 'LSP23'],
        default: 'LSP23',
    });

    if (deployerName === 'LSP16' || deployerName === 'LSP23') {
        return deployerName;
    } else throw new Error('Error: unexpected deployer selected');
};

export const askForBaseContractAddress = async () => {
    const { baseContractAddress }: { baseContractAddress: string } =
        await inquirer.prompt({
            type: 'input',
            name: 'baseContractAddress',
            message: 'What is the base contract address?\n',
        });

    return baseContractAddress;
};

export const askForContractName = async () => {
    const contractNames = [];
    for (const contractAbi in lsp_artifacts) {
        contractNames.push(contractAbi);
    }

    const { contractName }: { contractName: string } = await inquirer.prompt({
        type: 'list',
        name: 'contractName',
        message: 'What contract do you want to deploy?',
        choices: contractNames,
        default: 'LSP0ERC725Account',
    });

    return contractName;
};

export const askForConstructorParams = async () => {
    const { constructorParams }: { constructorParams: string } =
        await inquirer.prompt({
            type: 'input',
            name: 'constructorParams',
            message: 'Constructor parameters: (abi encoded value)\n',
        });

    return constructorParams;
};
