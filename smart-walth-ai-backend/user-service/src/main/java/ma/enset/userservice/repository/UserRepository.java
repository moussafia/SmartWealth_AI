package ma.enset.userservice.repository;

import ma.enset.userservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    /**
     * Check if a user with this email already exists.
     * Used during registration to prevent duplicate accounts.
     *
     * Generated SQL: SELECT COUNT(*) > 0 FROM users WHERE email = ?
     */
    Boolean existsByEmail(String email);

}
