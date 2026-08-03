package ma.enset.userservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.enset.userservice.dto.LoginRequest;
import ma.enset.userservice.dto.RefreshRequest;
import ma.enset.userservice.dto.TokenResponse;
import ma.enset.userservice.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request.getUsername(), request.getPassword()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request.getRefreshToken()));
    }
}