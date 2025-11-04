import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

export class ProjectNotFoundException extends NotFoundException {
  constructor(projectId: string) {
    super(`Project with ID "${projectId}" not found.`);
  }
}

export class MemberNotFoundException extends NotFoundException {
  constructor(profileId?: string) {
    super(profileId
      ? `Member with profile ID "${profileId}" not found in this project.`
      : 'Member not found in this project.'
    );
  }
}

export class UnauthorisedProjectAccessException extends ForbiddenException {
  constructor(action: string) {
    super(`You are not authorised to ${action} this project.`);
  }
}

export class CannotRemoveOwnerException extends ForbiddenException {
  constructor() {
    super('You cannot remove the project owner.');
  }
}

export class InvalidOwnershipTransferException extends BadRequestException {
  constructor() {
    super('New owner must already be a member of the project.');
  }
}