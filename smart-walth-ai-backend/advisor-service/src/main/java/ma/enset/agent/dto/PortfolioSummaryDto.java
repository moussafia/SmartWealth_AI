package ma.enset.advisorservice.agent.dto;

import java.math.BigDecimal;
import java.util.List;

public record PortfolioSummaryDto(
        String userId,
        int totalWallets,
        int totalAssets,
        BigDecimal totalPortfolioValue,
        BigDecimal totalProfitLoss,
        List<WalletDto> wallets
) {}