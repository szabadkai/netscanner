import { spawn } from 'child_process';

export class CommandRunner {
  /**
   * Execute a system command and capture stdout/stderr.
   * @param {string} command
   * @param {string[]} args
   * @param {object} options
   * @returns {Promise<{code: number, stdout: string, stderr: string}>}
   */
  static run(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
        if (options.onStdout) {
          options.onStdout(chunk.toString());
        }
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        if (options.onStderr) {
          options.onStderr(chunk.toString());
        }
      });

      child.on('error', (err) => {
        reject(err);
      });

      child.on('close', (code) => {
        if (code !== 0 && options.rejectOnError !== false) {
          const error = new Error(`Command "${command}" exited with code ${code}`);
          error.code = code;
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
          return;
        }

        resolve({ code, stdout, stderr });
      });
    });
  }
}

export default CommandRunner;
