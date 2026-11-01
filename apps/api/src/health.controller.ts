import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOkResponse({
    description:
      'Process is ready to accept HTTP requests; upstream providers are not probed.',
  })
  check() {
    return { status: 'ok' };
  }

  @Get('api/health')
  @ApiExcludeEndpoint()
  publicCheck() {
    return this.check();
  }
}
