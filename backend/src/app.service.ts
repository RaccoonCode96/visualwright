import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { spawn } from 'child_process'; // Change from exec to spawn
import { EventsGateway } from './events/events.gateway'; // Import EventsGateway

@Injectable()
export class AppService {
  private readonly playwrightTestsDir = path.join(
    process.cwd(),
    'playwright-tests',
  );

  constructor(private readonly eventsGateway: EventsGateway) {} // Inject EventsGateway

  getHello(): string {
    return 'Hello World!';
  }

  async getPlaywrightTestFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.playwrightTestsDir);
      return files.filter(
        (file) => file.endsWith('.spec.ts') || file.endsWith('.test.ts'),
      );
    } catch (error) {
      console.error('Error reading Playwright test files:', error);
      return [];
    }
  }

  async getPlaywrightTestFileContent(fileName: string): Promise<string> {
    const filePath = path.join(this.playwrightTestsDir, fileName);
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      throw new Error(`Could not read file: ${fileName}`);
    }
  }

  async runPlaywrightTest(fileName: string): Promise<any> {
    const filePath = path.join(this.playwrightTestsDir, fileName);

    return new Promise((resolve, reject) => {
      // Use 'npx' to ensure playwright is found in node_modules
      const command = 'npx';
      const args = [
        'playwright',
        'test',
        path.relative(process.cwd(), filePath),
        '--reporter=list',
      ];

      // Spawn the child process
      const child = spawn(command, args, {
        cwd: process.cwd(),
      });

      let stdoutBuffer = '';
      let stderrBuffer = '';

      // Stream stdout
      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdoutBuffer += chunk;
        this.eventsGateway.sendMessage('testLog', {
          type: 'stdout',
          log: chunk,
        });
      });

      // Stream stderr
      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderrBuffer += chunk;
        this.eventsGateway.sendMessage('testLog', {
          type: 'stderr',
          log: chunk,
        });
      });

      child.on('close', (code) => {
        if (code !== 0) {
          console.error(`Playwright test process exited with code ${code}`);
          this.eventsGateway.sendMessage('testLog', {
            type: 'error',
            log: `Test process exited with code ${code}`,
          });
          // Attempt to parse JSON even on error, as Playwright might still output JSON
          try {
            const jsonOutput = JSON.parse(stdoutBuffer);
            this.eventsGateway.sendMessage('testResult', jsonOutput);
            resolve(jsonOutput);
          } catch (parseError: any) {
            console.error(
              `Failed to parse JSON output on error: ${parseError.message}`,
            );
            this.eventsGateway.sendMessage('testResult', {
              error: `Test execution failed: ${stderrBuffer || 'No stderr output'}`,
            });
            reject(
              new Error(
                `Test execution failed: ${stderrBuffer || 'No stderr output'}`,
              ),
            );
          }
        } else {
          try {
            const jsonOutput = JSON.parse(stdoutBuffer);
            this.eventsGateway.sendMessage('testResult', jsonOutput);
            resolve(jsonOutput);
          } catch (parseError: any) {
            console.error(`Failed to parse JSON output: ${parseError.message}`);
            this.eventsGateway.sendMessage('testResult', {
              error: `Failed to parse JSON output: ${parseError.message}`,
            });
            reject(
              new Error(`Failed to parse JSON output: ${parseError.message}`),
            );
          }
        }
      });

      child.on('error', (err) => {
        console.error('Failed to start Playwright test process:', err);
        this.eventsGateway.sendMessage('testLog', {
          type: 'error',
          log: `Failed to start test process: ${err.message}`,
        });
        reject(new Error(`Failed to start test process: ${err.message}`));
      });
    });
  }
}
