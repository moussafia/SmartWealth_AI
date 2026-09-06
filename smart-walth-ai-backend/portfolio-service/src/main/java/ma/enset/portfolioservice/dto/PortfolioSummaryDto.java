package ma.enset.portfolioservice.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class PortfolioSummaryDto {
    private UUID userId;
    private int totalWallets;
    private int totalAssets;
    private BigDecimal totalPortfolioValue;
    private BigDecimal totalProfitLoss;
    private List<WalletDto> wallets;
}
