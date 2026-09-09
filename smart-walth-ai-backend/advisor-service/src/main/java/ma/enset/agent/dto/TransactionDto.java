package ma.enset.advisorservice.agent.dto;

import java.math.BigDecimal;

public record TransactionDto(
        String id,
        String walletId,
        String type,
        BigDecimal amount,
        String createdAt
) {}