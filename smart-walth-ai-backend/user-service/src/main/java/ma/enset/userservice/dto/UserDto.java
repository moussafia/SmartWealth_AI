package ma.enset.userservice.dto;

import lombok.Builder;
import lombok.Value;
import ma.enset.userservice.enums.Role;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class UserDto {
    UUID id;
    String firstName;
    String lastName;
    String email;
    Role role;
    LocalDateTime createdAt;
}