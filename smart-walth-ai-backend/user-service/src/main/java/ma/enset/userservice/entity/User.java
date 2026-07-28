package ma.enset.userservice.entity;

import jakarta.persistence.*;
import lombok.*;
import ma.enset.userservice.enums.KycStatus;
import ma.enset.userservice.enums.Role;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User{

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private KycStatus kycStatus;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;



    @PrePersist
    // @PrePersist runs automatically BEFORE the first INSERT into the database.
    // This is where we set default values.
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.role == null) this.role = Role.USER;
        if (this.kycStatus == null) this.kycStatus = KycStatus.PENDING;
    }

    @PreUpdate
    // @PreUpdate runs automatically BEFORE every UPDATE.
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
