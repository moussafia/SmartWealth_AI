package ma.enset.transactionservice.mapper;

import ma.enset.transactionservice.dto.TransactionDto;
import ma.enset.transactionservice.entity.Transaction;
import org.springframework.stereotype.Component;

@Component
public class TransactionMapper {
    public TransactionDto toDto(Transaction t) {
        return TransactionDto.builder()
                .id(t.getId())
                .walletId(t.getWalletId())
                .type(t.getType())
                .amount(t.getAmount())
                .createdAt(t.getCreatedAt())
                .build();
    }
}