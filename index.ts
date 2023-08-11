import inquirer from 'inquirer';
import {
    askForDeployer,
    askForContractName,
    askForConstructorParams,
} from './src/deployment/deploymentUtils';
import { getAccount } from './src/get_account';
import { getSalt } from './src/get_salt';
import { generate } from './src/generate_salts';
import { setRPC } from './src/select_rpc';
import { getDeployedContractAddresses } from './src/get_deployed_ups';
import { interactWithUP } from './src/interact_with_up';
import { formatEther } from 'ethers';
import {
    LSP16ComputeAddress,
    LSP16DeployContract,
    askForInitializeCalldata,
} from './src/deployment/lsp16_deployment';
import {
    LSP23ComputeAddresses,
    LSP23DeployContracts,
} from './src/deployment/lsp23_deployment';

const main = async () => {
    console.clear();

    inquirer
        .prompt({
            type: 'list',
            name: 'main',
            message: 'Select action from the list:',
            choices: [
                '1. get secret public address',
                '2. get secret balance',
                '3. generate salts',
                '4. check your salt',
                '5. get contract deployment address',
                '6. deploy contract',
                '7. get your up addresses',
                '8. interact with up',
            ],
        })
        .then(async ({ main }) => {
            if (main === '1. get secret public address') {
                await setRPC();
                const { publicAddress } = await getAccount();

                console.log(publicAddress);
            } else if (main === '2. get secret balance') {
                await setRPC();
                const { provider, publicAddress } = await getAccount();
                const balance = await provider.getBalance(publicAddress);

                console.log(`${formatEther(balance)} LYX`);
            } else if (main === '3. generate salts') {
                await setRPC();
                await generate();
            } else if (main === '4. check your salt') {
                const salt = await getSalt();

                console.log(salt);
            } else if (main === '5. get deployment address') {
                await setRPC();
                const deployerName = await askForDeployer();

                if (deployerName === 'LSP16') {
                    const computedAddress = LSP16ComputeAddress();

                    console.log(computedAddress);
                } else if (deployerName === 'LSP23') {
                    const computedAddress = LSP23ComputeAddresses();

                    console.log(computedAddress);
                }
            } else if (main === '6. deploy contract') {
                const { explorerBaseLink } = await setRPC();
                const { account, chainId } = await getAccount();

                const deployerName = await askForDeployer();

                if (deployerName === 'LSP16') {
                    const { txHash, deployedContractAddress } =
                        await LSP16DeployContract(account, chainId);

                    console.log(`Contract address: ${deployedContractAddress}`);
                    console.log(`${explorerBaseLink}tx/${txHash}`);
                    console.log(
                        `${explorerBaseLink}address/${deployedContractAddress}`,
                    );
                } else if (deployerName === 'LSP23') {
                    const {
                        txHash,
                        primaryContractAddress,
                        secondaryContractAddress,
                    } = await LSP23DeployContracts(account, chainId);

                    console.log(
                        `Primary Contract Address: ${primaryContractAddress}`,
                    );
                    console.log(
                        `Priamry Contract: ${explorerBaseLink}address/${primaryContractAddress}`,
                    );
                    console.log(
                        `Secondary Contract Address: ${secondaryContractAddress}`,
                    );
                    console.log(
                        `Secondary Contract: ${explorerBaseLink}address/${secondaryContractAddress}`,
                    );
                    console.log(`${explorerBaseLink}tx/${txHash}`);
                }
            } else if (main === '7. get your contract addresses') {
                await setRPC();
                const { publicAddress, chainId } = await getAccount();
                const deployerName = await askForDeployer();
                const contractName = await askForContractName();

                const contractAddresses = await getDeployedContractAddresses(
                    publicAddress,
                    chainId,
                    deployerName,
                    contractName,
                );

                console.log(contractAddresses);
            } else if (main === '8. interact with up') {
                const { explorerBaseLink } = await setRPC();
                const { account, publicAddress, chainId } = await getAccount();
                const deployerName = await askForDeployer();
                const contractName = await askForContractName();

                if (contractName !== 'LSP0ERC725Account')
                    throw new Error(
                        "Error: Only 'LSP0ERC725Account' is supported now",
                    );

                const contractAddresses = await getDeployedContractAddresses(
                    publicAddress,
                    chainId,
                    deployerName,
                    contractName,
                );

                const txHash = await interactWithUP(account, contractAddresses);

                console.log(`${explorerBaseLink}tx/${txHash}`);
            } else
                throw new Error(
                    'Unexpected Error: None of the main menu options were selected.',
                );
        });
};

main();
