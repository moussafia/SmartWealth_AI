package ma.enset.portfolioservice.dto;

import lombok.Builder;
import lombok.Data;
import ma.enset.portfolioservice.enums.WalletType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class WalletDto {
    private UUID id;
    private String name;
    private WalletType type;
    private String currency;
    private BigDecimal balance;
    private BigDecimal totalValue;
    private int assetCount;
    private List<AssetDto> assets;
    private LocalDateTime createdAt;
}