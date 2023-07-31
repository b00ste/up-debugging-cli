import inquirer from 'inquirer';
import { Contract, Signer } from 'ethers';

import LSP0ERC725Account from '@lukso/lsp-smart-contracts/artifacts/LSP0ERC725Account.json' assert { type: 'json' };
import {
    setData,
    setDataBatch,
} from './universal_profile_interactions/setData.interaction';

const selectUP = async (UPs: string[]) => {
    const { selectedUP } = await inquirer.prompt({
        type: 'list',
        name: 'selectedUP',
        message: 'Please select an UP.',
        choices: UPs,
    });

    return selectedUP;
};

const askForInteraction = async () => {
    const { selectedInteraction } = await inquirer.prompt({
        type: 'list',
        name: 'selectedInteraction',
        message: 'What do you want to do with your UP?',
        choices: [
            'setData',
            'setDataBatch',
            'execute',
            'executeBatch',
            'batchCalls',
            'transferOwnership',
            'acceptOwnership',
            'renounceOwnership',
        ],
    });

    return selectedInteraction;
};

const universalProfileFunctions = {
    setData,
    setDataBatch,
    execute: async (UniversalProfile: Contract) => {
        console.log('execute typescript function');
    },
    executeBatch: async (UniversalProfile: Contract) => {
        console.log('executeBatch typescript function');
    },
    batchCalls: async (UniversalProfile: Contract) => {
        console.log('batchCalls typescript function');
    },
    transferOwnership: async (UniversalProfile: Contract) => {
        console.log('transferOwnership typescript function');
    },
    acceptOwnership: async (UniversalProfile: Contract) => {
        console.log('acceptOwnership typescript function');
    },
    renounceOwnership: async (UniversalProfile: Contract) => {
        console.log('renounceOwnership typescript function');
    },
};

export const interactWithUP = async (account: Signer, UPs: string[]) => {
    // ---- Universal Profile initialisation ----

    const selectedUniversalProfileAddress = await selectUP(UPs);

    const UniversalProfile = new Contract(
        selectedUniversalProfileAddress,
        LSP0ERC725Account.abi,
        account,
    );

    // ---- Setting up the desired UP interaction ----

    const selectedInteraction = await askForInteraction();

    const tx = await universalProfileFunctions[selectedInteraction](
        UniversalProfile,
    );

    return tx.hash;
};
