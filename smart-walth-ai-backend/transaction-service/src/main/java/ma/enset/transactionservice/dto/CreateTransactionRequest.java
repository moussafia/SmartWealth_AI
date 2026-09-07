package ma.enset.transactionservice.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import ma.enset.transactionservice.enums.TransactionType;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CreateTransactionRequest {

    @NotNull(message = "Wallet id is required")
    private UUID walletId;

    @NotNull(message = "Type is required")
    private TransactionType type;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Amount must be positive")
    private BigDecimal amount;
}