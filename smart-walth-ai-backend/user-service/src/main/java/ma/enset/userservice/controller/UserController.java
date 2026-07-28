package ma.enset.userservice.controller;

import ma.enset.userservice.entity.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/l1/users")
public class UserController {

    /**
     * Get the current logged-in user's profile.
     *
     * @AuthenticationPrincipal = Spring injects the User object
     *   that was authenticated by JwtAuthenticationFilter.
     *   No need to parse the token yourself — Spring does it for you.
     *
     * FLOW:
     *   1. Client sends request with "Authorization: Bearer eyJ..."
     *   2. JwtAuthenticationFilter validates the token
     *   3. Loads the User from the database
     *   4. Puts it in SecurityContext
     *   5. @AuthenticationPrincipal extracts it for you
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(
            @AuthenticationPrincipal User user) {

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "firstName", user.getFirstName(),
                "lastName", user.getLastName(),
                "role", user.getRole(),
                "kycStatus", user.getKycStatus(),
                "createdAt", user.getCreatedAt()
        ));
    }
}