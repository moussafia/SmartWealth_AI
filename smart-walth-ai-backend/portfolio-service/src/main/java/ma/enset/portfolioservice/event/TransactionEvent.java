package ma.enset.portfolioservice.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionEvent {
    private UUID transactionId;
    private UUID userId;
    private UUID walletId;
    private String type;        // "DEPOSIT" or "WITHDRAW"
    private BigDecimal amount;
}