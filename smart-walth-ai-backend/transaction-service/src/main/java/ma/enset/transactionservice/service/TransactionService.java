package ma.enset.transactionservice.service;

import lombok.RequiredArgsConstructor;
import ma.enset.transactionservice.dto.CreateTransactionRequest;
import ma.enset.transactionservice.dto.TransactionDto;
import ma.enset.transactionservice.entity.Transaction;
import ma.enset.transactionservice.enums.TransactionType;
import ma.enset.transactionservice.event.TransactionEvent;
import ma.enset.transactionservice.kafka.TransactionProducer;
import ma.enset.transactionservice.mapper.TransactionMapper;
import ma.enset.transactionservice.repository.TransactionRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository repository;
    private final TransactionMapper mapper;
    private final TransactionProducer producer;
    private final RestClient gatewayRestClient;   // ← ajouté


    @Transactional
    public TransactionDto create(CreateTransactionRequest request, UUID userId, String bearerToken) {

        if (request.getType() == TransactionType.WITHDRAW) {
            BigDecimal balance = fetchWalletBalance(request.getWalletId(), bearerToken);
            if (balance.compareTo(request.getAmount()) < 0) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Solde insuffisant : disponible " + balance + ", demandé " + request.getAmount());
            }
        }
        // 1. Save the transaction in OUR database.
        Transaction saved = repository.save(Transaction.builder()
                .userId(userId)
                .walletId(request.getWalletId())
                .type(request.getType())
                .amount(request.getAmount())
                .build());

        // 2. Announce it to Kafka. We don't know or care who listens.
        producer.publish(TransactionEvent.builder()
                .transactionId(saved.getId())
                .userId(saved.getUserId())
                .walletId(saved.getWalletId())
                .type(saved.getType().name())
                .amount(saved.getAmount())
                .build());

        return mapper.toDto(saved);
    }

    public List<TransactionDto> getMyTransactions(UUID userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(mapper::toDto).toList();
    }
    private BigDecimal fetchWalletBalance(UUID walletId, String bearerToken) {
        BigDecimal balance = gatewayRestClient.get()
                .uri("/api/wallets/{id}/balance", walletId)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + bearerToken)
                .retrieve()
                .body(BigDecimal.class);
        return balance == null ? BigDecimal.ZERO : balance;
    }
}