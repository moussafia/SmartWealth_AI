package ma.enset.portfolioservice.repository;


import ma.enset.portfolioservice.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AssetRepository extends JpaRepository<Asset, UUID> {
    List<Asset> findByWalletId(UUID walletId);
}
