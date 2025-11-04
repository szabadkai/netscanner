import { CommandRunner } from './CommandRunner.js';

function getLookupCommand() {
  if (process.platform === 'win32') {
    return { binary: 'where', args: [] };
  }

  return { binary: 'which', args: [] };
}

async function checkTool(commandName) {
  if (!commandName) {
    return { command: null, available: false, error: null };
  }

  try {
    const lookup = getLookupCommand();
    const result = await CommandRunner.run(lookup.binary, [...lookup.args, commandName], {
      rejectOnError: false
    });
    const available = result.code === 0 && result.stdout.trim().length > 0;
    return { command: commandName, available, error: null };
  } catch (error) {
    return { command: commandName, available: false, error };
  }
}

export async function verifyTools(toolConfig = {}) {
  const entries = Object.entries(toolConfig);
  const results = {};

  await Promise.all(
    entries.map(async ([key, commandName]) => {
      const outcome = await checkTool(commandName);
      results[key] = outcome;
    })
  );

  return results;
}
