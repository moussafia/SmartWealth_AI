package ma.enset.portfolioservice.dto;

import lombok.Builder;
import lombok.Data;
import ma.enset.portfolioservice.enums.AssetType;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
public class AssetDto {
    private UUID id;
    private String symbol;
    private String name;
    private AssetType assetType;
    private BigDecimal quantity;
    private BigDecimal avgBuyPrice;
    private BigDecimal currentPrice;
    private BigDecimal totalValue;
    private BigDecimal profitLoss;
    private BigDecimal profitLossPercentage;
}