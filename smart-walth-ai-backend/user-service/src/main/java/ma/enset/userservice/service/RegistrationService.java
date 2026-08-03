package ma.enset.userservice.service;

import lombok.RequiredArgsConstructor;
import ma.enset.userservice.dto.RegisterRequest;
import ma.enset.userservice.entity.User;
import ma.enset.userservice.enums.Role;
import ma.enset.userservice.repository.UserRepository;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;


import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RegistrationService {

    private final KeycloakAdminService keycloakAdminService;
    private final UserRepository userRepository;

    public User register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalStateException("Email already registered");
        }

        // 1. Create the user in Keycloak, get back Keycloak's user ID
        UUID keycloakUserId = keycloakAdminService.createKeycloakUser(
                request.getEmail(),
                request.getFirstName(),
                request.getLastName(),
                request.getPassword()
        );

        try {
            // Step 2: assign role (can fail)
            keycloakAdminService.assignUserRole(keycloakUserId, "USER");

            // Step 3: save locally (can fail)
            User user = User.builder()
                    .id(keycloakUserId)
                    .firstName(request.getFirstName())
                    .lastName(request.getLastName())
                    .email(request.getEmail())
                    .role(Role.USER)
                    .build();
            return userRepository.save(user);

        } catch (Exception e) {
            // COMPENSATION: undo step 1 since a later step failed
            log.error("Registration failed after Keycloak user creation, rolling back", e);
            try {
                keycloakAdminService.deleteKeycloakUser(keycloakUserId);
            } catch (Exception rollbackEx) {
                // This is the hard part of Sagas: what if the rollback ITSELF fails?
                log.error("CRITICAL: Failed to roll back Keycloak user {} — manual cleanup needed",
                        keycloakUserId, rollbackEx);
            }
            throw new RuntimeException("Registration failed and was rolled back", e);
        }
    }
}
