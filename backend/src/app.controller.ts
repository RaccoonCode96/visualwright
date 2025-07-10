import { Controller, Get, Param, Post, Res, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('playwright/tests')
  async getPlaywrightTestFiles(): Promise<string[]> {
    return this.appService.getPlaywrightTestFiles();
  }

  @Get('playwright/tests/:fileName')
  async getPlaywrightTestFileContent(
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const content =
        await this.appService.getPlaywrightTestFileContent(fileName);
      res.status(HttpStatus.OK).send(content);
    } catch (error) {
      res.status(HttpStatus.NOT_FOUND).send(error.message);
    }
  }

  @Post('playwright/run/:fileName')
  async runPlaywrightTest(@Param('fileName') fileName: string): Promise<any> {
    return this.appService.runPlaywrightTest(fileName);
  }
}
