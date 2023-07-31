import inquirer from 'inquirer';
import {
    JsonRpcProvider,
    Signer,
    Wallet,
    keccak256,
    toUtf8Bytes,
} from 'ethers';

export const getAccount = async (): Promise<{
    account: Signer;
    provider: JsonRpcProvider;
    publicAddress: string;
    chainId: string;
}> => {
    const { secret } = await inquirer.prompt({
        type: 'password',
        name: 'secret',
        message: 'Please provide the secret for your account.',
    });

    const secretHash = keccak256(toUtf8Bytes(secret));
    const provider = new JsonRpcProvider(global.RPC);
    const account = new Wallet(secretHash).connect(provider);

    const publicAddress = await account.getAddress();
    const chainId = (await account.provider.getNetwork()).chainId.toString();

    return { account, provider, publicAddress, chainId };
};
