import UsedSalts from '../storage/UsedSalts.json' assert { type: 'json' };

export const getDeployedContractAddresses = async (
    publicAddress: string,
    chainId: string,
    deployerName: string,
    contractName: string,
) => {
    const contractAddresses = [];
    for (const salt in UsedSalts[chainId][deployerName][contractName][
        publicAddress
    ]) {
        contractAddresses.push(
            UsedSalts[chainId][deployerName][contractName][publicAddress][salt],
        );
    }

    return contractAddresses;
};
