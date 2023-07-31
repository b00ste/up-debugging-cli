import UsedSalts from '../storage/UsedSalts.json' assert { type: 'json' };

export const getDeployedUPs = async (
    publicAddress: string,
    chainId: string,
) => {
    const UPs = [];
    for (const salt in UsedSalts[chainId][publicAddress]) {
        UPs.push(UsedSalts[chainId][publicAddress][salt]);
    }

    return UPs;
};
