package ma.enset.userservice.controller;

import lombok.RequiredArgsConstructor;
import ma.enset.userservice.dto.RegisterRequest;
import ma.enset.userservice.dto.UserDto;
import ma.enset.userservice.entity.User;
import ma.enset.userservice.mapper.UserMapper;
import ma.enset.userservice.service.RegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationService registrationService;
    private final UserMapper userMapper;

    @PostMapping("/register")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest request) {
        User user = registrationService.register(request);
        return ResponseEntity.ok(userMapper.toDto(user));
    }
}