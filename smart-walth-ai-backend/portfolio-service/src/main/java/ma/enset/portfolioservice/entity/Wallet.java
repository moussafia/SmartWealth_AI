package ma.enset.portfolioservice.entity;

import jakarta.persistence.*;
import lombok.*;
import ma.enset.portfolioservice.enums.WalletType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "wallets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Keycloak user ID — from jwt.getSubject()
    // NOT a foreign key (different database)
    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WalletType type;

    @Column(precision = 19, scale = 4)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private String currency = "MAD";

    @OneToMany(mappedBy = "wallet", cascade = CascadeType.ALL,
            orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Asset> assets = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public BigDecimal getTotalValue() {
        if (type == WalletType.SAVINGS) {
            return balance;
        }
        return assets.stream()
                .map(a -> a.getCurrentPrice().multiply(a.getQuantity()))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .add(balance == null ? BigDecimal.ZERO : balance);
    }
}