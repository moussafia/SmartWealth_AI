package ma.enset.transactionservice.dto;

import lombok.Builder;
import lombok.Data;
import ma.enset.transactionservice.enums.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class TransactionDto {
    private UUID id;
    private UUID walletId;
    private TransactionType type;
    private BigDecimal amount;
    private LocalDateTime createdAt;
}