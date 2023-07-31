import inquirer from 'inquirer';

export const setRPC = async () => {
    const { networkName } = await inquirer.prompt({
        type: 'list',
        name: 'networkName',
        message: 'Choose network:',
        choices: ['LUKSO Mainnet', 'LUKSO Testnet', 'Goerli'],
        default: 'LUKSO Testnet',
    });
    if (networkName === 'LUKSO Mainnet') {
        const RPC = 'https://rpc.lukso.gateway.fm';
        const explorerBaseLink =
            'https://explorer.execution.mainnet.lukso.network/';

        global.RPC = RPC;

        return {
            networkName,
            explorerBaseLink,
            RPC,
        };
    } else if (networkName === 'LUKSO Testnet') {
        const RPC = 'https://rpc.testnet.lukso.gateway.fm';
        const explorerBaseLink =
            'https://explorer.execution.testnet.lukso.network/';

        global.RPC = RPC;

        return {
            networkName,
            explorerBaseLink,
            RPC,
        };
    } else if (networkName === 'Goerli') {
        const RPC = 'https://rpc.goerli.eth.gateway.fm';
        const explorerBaseLink = 'https://goerli.etherscan.io/';

        global.RPC = RPC;

        return { networkName, explorerBaseLink, RPC };
    } else throw new Error('Unexpected Error: No RPC was slected.');
};
