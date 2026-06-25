import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  getBranches(@Req() req) {
    // If it's a worker, get the parent's branches
    const ownerId = req.user.parentId || req.user.id;
    return this.branchesService.getBranches(ownerId);
  }

  @Post()
  createBranch(@Req() req, @Body() body: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.branchesService.createBranch(ownerId, body);
  }

  @Patch(':id')
  updateBranch(@Req() req, @Param('id') id: string, @Body() body: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.branchesService.updateBranch(ownerId, id, body);
  }

  @Delete(':id')
  deleteBranch(@Req() req, @Param('id') id: string) {
    const ownerId = req.user.parentId || req.user.id;
    return this.branchesService.deleteBranch(ownerId, id);
  }

  @Get('stocks')
  getBranchStocks(@Req() req) {
    const ownerId = req.user.parentId || req.user.id;
    return this.branchesService.getBranchStocks(ownerId);
  }

  @Post('transfer')
  transferStock(@Req() req, @Body() body: any) {
    const ownerId = req.user.parentId || req.user.id;
    return this.branchesService.transferStock(ownerId, body);
  }
}
