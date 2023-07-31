import inquirer from 'inquirer';
import {
    askForInitializeCalldata,
    computeAddress,
    deploy,
} from './src/deploy_up';
import { getAccount } from './src/get_account';
import { getSalt } from './src/get_salt';
import { generate } from './src/generate_salts';
import { setRPC } from './src/select_rpc';
import { getDeployedUPs } from './src/get_deployed_ups';
import { interactWithUP } from './src/interact_with_up';
import { formatEther } from 'ethers';

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
                '5. get up deployment address',
                '6. deploy basic up',
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
                const { publicAddress } = await getAccount();
                const salt_and_address = await generate(publicAddress);

                console.log(`Salt found:\n${salt_and_address}`);
            } else if (main === '4. check your salt') {
                const salt = await getSalt();

                console.log(salt);
            } else if (main === '5. get up deployment address') {
                await setRPC();
                const { publicAddress } = await getAccount();
                const salt = await getSalt();

                const { initializable, initializeCalldata } =
                    await askForInitializeCalldata();

                const address = await computeAddress(
                    publicAddress,
                    salt,
                    initializable,
                    initializeCalldata,
                );

                console.log(address);
            } else if (main === '6. deploy basic up') {
                const { explorerBaseLink } = await setRPC();
                const { account, publicAddress, chainId } = await getAccount();
                const salt = await getSalt();

                const { txHash, deployedContractAddress } = await deploy(
                    account,
                    chainId,
                    publicAddress,
                    salt,
                );

                console.log(
                    `Universal Profile address: ${deployedContractAddress}`,
                );
                console.log(`${explorerBaseLink}tx/${txHash}`);
                console.log(
                    `${explorerBaseLink}address/${deployedContractAddress}`,
                );
            } else if (main === '7. get your up addresses') {
                await setRPC();
                const { publicAddress, chainId } = await getAccount();

                const UPs = await getDeployedUPs(publicAddress, chainId);

                console.log(UPs);
            } else if (main === '8. interact with up') {
                const { explorerBaseLink } = await setRPC();
                const { account, publicAddress, chainId } = await getAccount();
                const UPs = await getDeployedUPs(publicAddress, chainId);

                const txHash = await interactWithUP(account, UPs);

                console.log(`${explorerBaseLink}tx/${txHash}`);
            } else
                throw new Error(
                    'Unexpected Error: None of the main menu options were selected.',
                );
        });
};

main();
