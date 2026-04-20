import { Injectable, ForbiddenException, NotFoundException ,BadRequestException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async createGroup(creatorId: number, dto: CreateGroupDto) {
  // 1. Combine all IDs to check (Creator + Invited Members)
  const allIds = [creatorId, ...dto.memberIds];

  // 2. Count how many of these IDs actually exist in the DB
  const existingUsersCount = await this.prisma.user.count({
    where: { id: { in: allIds } },
  });

  // 3. If the count doesn't match, someone is missing
  if (existingUsersCount !== allIds.length) {
    throw new BadRequestException('One or more user IDs are invalid or do not exist');
  }

  // 4. Now it's safe to create the group
  return this.prisma.group.create({
    data: {
      name: dto.name,
      description: dto.description,
      members: {
        create: [
          { userId: creatorId, isAdmin: true },
          ...dto.memberIds.map((id) => ({ userId: id, isAdmin: false })),
        ],
      },
    },
    include: { members: true },
  });
}


  async getMyGroups(userId: number) {
    return this.prisma.group.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        _count: { select: { members: true } },
      },
    });
  }

  async addMember(groupId: number, userId: number, adminId: number) {
    // 1. Verify the Group exists
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');

    // 2. Verify the User to add exists
    const userToAdd = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userToAdd) {
      throw new BadRequestException(`User with ID ${userId} does not exist`);
    }

    // 3. Verify the Admin has permission
    const admin = await this.prisma.groupMember.findFirst({
      where: { groupId, userId: adminId, isAdmin: true },
    });
    if (!admin) throw new ForbiddenException('Only admins can add members');

    // 4. NEW: Verify they aren't ALREADY a member (Prevents P2002 error)
    const existingMembership = await this.prisma.groupMember.findUnique({
      where: {
        userId_groupId: { // This uses the composite unique key Prisma creates
          userId,
          groupId,
        },
      },
    });

    if (existingMembership) {
      throw new BadRequestException('User is already a member of this group');
    }

    // 5. Finally, create the membership
    return this.prisma.groupMember.create({
      data: {
        groupId,
        userId,
        isAdmin: false,
      },
    });
  }
 }