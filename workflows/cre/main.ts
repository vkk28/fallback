import { cre, Runner } from '@chainlink/cre-sdk';
import { scheduled, type Config } from './handler';

const init = (config: Config) => [cre.handler(new cre.capabilities.CronCapability().trigger({ schedule: config.schedule }), scheduled)];
export async function main() { const runner = await Runner.newRunner<Config>(); await runner.run(init); }
