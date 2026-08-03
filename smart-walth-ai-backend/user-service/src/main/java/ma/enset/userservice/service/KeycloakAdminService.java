package ma.enset.userservice.service;


import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

@Service
public class KeycloakAdminService {

    @Value("${keycloak.admin.server-url}")
    private String serverUrl;

    @Value("${keycloak.admin.realm}")
    private String realm;

    @Value("${keycloak.admin.client-id}")
    private String clientId;

    @Value("${keycloak.admin.client-secret}")
    private String clientSecret;

    private Keycloak getAdminClient() {
        return KeycloakBuilder.builder()
                .serverUrl(serverUrl)
                .realm(realm)
                .clientId(clientId)
                .clientSecret(clientSecret)
                .grantType("client_credentials")   // machine-to-machine, no username/password
                .build();
    }

    /**
     * Creates a user in Keycloak with the USER role and a set password.
     * Returns the UUID Keycloak assigned — this becomes our local User.id too.
     */
    public UUID createKeycloakUser(String email, String firstName, String lastName, String rawPassword) {
        Keycloak kc = getAdminClient();
        RealmResource realmResource = kc.realm(realm);
        UsersResource usersResource = realmResource.users();

        // 1. Build the user representation
        UserRepresentation user = new UserRepresentation();
        user.setUsername(email);          // using email as the login username
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEnabled(true);
        user.setEmailVerified(true);      // skip Keycloak's email verification for now

        // 2. Create the user (this call returns an HTTP response, not the user object)
        Response response = usersResource.create(user);

        if (response.getStatus() != 201) {
            throw new RuntimeException("Failed to create user in Keycloak: " + response.getStatus());
        }

        // 3. Extract the new user's ID from the Location header
        String location = response.getLocation().getPath();
        String keycloakUserId = location.substring(location.lastIndexOf('/') + 1);

        // 4. Set the password (separate call — creation doesn't set it directly)
        CredentialRepresentation credential = new CredentialRepresentation();
        credential.setType(CredentialRepresentation.PASSWORD);
        credential.setValue(rawPassword);
        credential.setTemporary(false);   // don't force a password reset on first login
        usersResource.get(keycloakUserId).resetPassword(credential);

        // 5. Assign the realm role "USER"
        RoleRepresentation userRole = realmResource.roles().get("USER").toRepresentation();
        usersResource.get(keycloakUserId).roles().realmLevel().add(List.of(userRole));

        return UUID.fromString(keycloakUserId);
    }

    public void deleteKeycloakUser(UUID userId) {
        Keycloak kc = getAdminClient();
        kc.realm(realm).users().get(userId.toString()).remove();
    }


    public void assignUserRole(UUID userId, String roleName) {
        Keycloak kc = getAdminClient();
        RealmResource realmResource = kc.realm(realm);
        RoleRepresentation role = realmResource.roles().get(roleName).toRepresentation();
        realmResource.users().get(userId.toString()).roles().realmLevel().add(List.of(role));
    }
}
