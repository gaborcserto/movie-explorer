import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({
    description:
      'Process is ready to accept HTTP requests; upstream providers are not probed.',
  })
  check() {
    return { status: 'ok' };
  }
}
