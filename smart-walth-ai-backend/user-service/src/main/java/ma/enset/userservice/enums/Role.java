package ma.enset.userservice.enums;

/**
 * User roles for RBAC (Role-Based Access Control).
 *
 * RBAC means: instead of checking permissions one by one,
 * you assign a ROLE, and the role has a set of permissions.
 *
 * USER  → can view own portfolio, place orders, chat with AI
 * ADMIN → can do everything USER can + manage other users, see all data
 */
public enum Role {
    USER,
    ADMIN
}
