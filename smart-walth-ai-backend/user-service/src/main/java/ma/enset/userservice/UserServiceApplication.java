package ma.enset.userservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * User Service — Entry Point.
 *
 * @SpringBootApplication combines 3 annotations:
 *   @Configuration      → this class can define beans
 *   @EnableAutoConfiguration → Spring auto-configures based on dependencies
 *   @ComponentScan      → scans this package + sub-packages for @Component,
 *                         @Service, @Repository, @Controller, @Configuration
 *
 * Spring Boot auto-detects:
 *   - PostgreSQL driver → configures DataSource
 *   - Spring Security → activates security filter chain
 *   - Spring Data JPA → creates repository implementations
 *   - Eureka Client → registers with Eureka Server
 */
@SpringBootApplication
public class UserServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }

}
