package ma.enset.userservice.controller;


import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserTestController {

    @GetMapping("/public/hello")
    public String publicHello() {
        return "Anyone can see this — no token needed";
    }

    @GetMapping("/me")
    public String me(@AuthenticationPrincipal Jwt jwt) {
        return "Hello " + jwt.getClaimAsString("preferred_username")
                + " — you are authenticated with roles from your token";
    }

    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public String adminOnly() {
        return "Only ADMIN can see this";
    }
}