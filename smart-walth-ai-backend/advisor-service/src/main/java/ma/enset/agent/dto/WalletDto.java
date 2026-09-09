package ma.enset.advisorservice.agent.dto;

import java.math.BigDecimal;

public record WalletDto(
        String id,
        String name,
        String type,        // CRYPTO, STOCKS, SAVINGS
        BigDecimal totalValue,
        BigDecimal balance,
        int assetCount
) {}