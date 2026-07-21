import { ForbiddenException } from '@nestjs/common';

/**
 * Validates that the resource owner matches the authenticated user ID.
 * 
 * SECURITY BEST PRACTICE:
 * Never trust user ID values received from client-side request body, 
 * query parameters, or route parameters to check or establish ownership.
 * Instead, fetch the target resource from the database, retrieve its actual
 * owner ID, and compare it with the authenticated user ID (from context).
 *
 * @param resourceOwnerId - The user ID associated with the resource from the database
 * @param currentUserId - The verified user ID of the currently logged-in user (e.g. from @CurrentUser())
 * @throws ForbiddenException if they mismatch
 * 
 * @example
 * // In a service or controller method:
 * const post = await this.postsService.findOne(id);
 * checkOwnership(post.userId, user.id);
 */
export function checkOwnership(resourceOwnerId: string, currentUserId: string): void {
  if (resourceOwnerId !== currentUserId) {
    throw new ForbiddenException('Access denied. You are not the owner of this resource.');
  }
}
