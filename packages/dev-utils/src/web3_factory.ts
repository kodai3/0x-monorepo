import {
    EmptyWalletSubprovider,
    FakeGasEstimateSubprovider,
    GanacheSubprovider,
    RPCSubprovider,
    Web3ProviderEngine,
} from '@0x/subproviders';
import { providerUtils } from '@0x/utils';
import * as fs from 'fs';
import * as _ from 'lodash';

import { constants } from './constants';
import { env, EnvVars } from './env';

export interface Web3Config {
    total_accounts?: number; // default: 10
    hasAddresses?: boolean; // default: true
    shouldUseInProcessGanache?: boolean; // default: false
    shouldThrowErrorsOnGanacheRPCResponse?: boolean; // default: true
    rpcUrl?: string; // default: localhost:8545
    shouldUseFakeGasEstimate?: boolean; // default: true
    ganacheDatabasePath?: string; // default: undefined, creates a tmp dir
    shouldAllowUnlimitedContractSize?: boolean;
    fork?: string;
    blockTime?: number;
    unlocked_accounts?: string[];
}

export const web3Factory = {
    getRpcProvider(config: Web3Config = {}): Web3ProviderEngine {
        const provider = new Web3ProviderEngine();

        const hasAddresses = config.hasAddresses === undefined || config.hasAddresses;
        const shouldUseFakeGasEstimate =
            config.shouldUseFakeGasEstimate === undefined || config.shouldUseFakeGasEstimate;

        if (!hasAddresses) {
            provider.addProvider(new EmptyWalletSubprovider());
        }
        if (shouldUseFakeGasEstimate) {
            provider.addProvider(new FakeGasEstimateSubprovider(constants.GAS_LIMIT));
        }

        const logger = {
            log: (arg: any) => {
                fs.appendFileSync('ganache.log', `${arg}\n`);
            },
        };
        const shouldUseInProcessGanache = !!config.shouldUseInProcessGanache;
        if (shouldUseInProcessGanache) {
            if (config.rpcUrl !== undefined) {
                throw new Error('Cannot use both GanacheSubprovider and RPCSubprovider');
            }

            if (config.ganacheDatabasePath !== undefined) {
                const doesDatabaseAlreadyExist = fs.existsSync(config.ganacheDatabasePath);
                if (!doesDatabaseAlreadyExist) {
                    // Working with local DB snapshot. Ganache requires this directory to exist
                    fs.mkdirSync(config.ganacheDatabasePath);
                }
            }

            const shouldThrowErrorsOnGanacheRPCResponse =
                config.shouldThrowErrorsOnGanacheRPCResponse === undefined ||
                config.shouldThrowErrorsOnGanacheRPCResponse;

            provider.addProvider(
                new GanacheSubprovider({
                    total_accounts: config.total_accounts,
                    vmErrorsOnRPCResponse: shouldThrowErrorsOnGanacheRPCResponse,
                    db_path: config.ganacheDatabasePath,
                    allowUnlimitedContractSize: config.shouldAllowUnlimitedContractSize,
                    gasLimit: constants.GAS_LIMIT,
                    logger,
                    verbose: env.parseBoolean(EnvVars.VerboseGanache),
                    port: 8545,
                    network_id: 50,
                    mnemonic: 'concert load couple harbor equip island argue ramp clarify fence smart topic',
                    fork: config.fork,
                    blockTime: config.blockTime,
                    unlocked_accounts: config.unlocked_accounts,
                } as any), // TODO remove any once types are merged in DefinitelyTyped
            );
        } else {
            provider.addProvider(new RPCSubprovider(config.rpcUrl || constants.RPC_URL));
        }
        providerUtils.startProviderEngine(provider);
        return provider;
    },
};
