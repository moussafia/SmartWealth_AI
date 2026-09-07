package ma.enset.portfolioservice.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.enset.portfolioservice.entity.Wallet;
import ma.enset.portfolioservice.event.TransactionEvent;
import ma.enset.portfolioservice.repository.WalletRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class TransactionConsumer {

    private final WalletRepository walletRepository;

    // This method runs automatically every time a message lands on the topic.
    // No REST call, no polling code — Spring wires the subscription for us.
    @KafkaListener(topics = "transaction-events", groupId = "portfolio-service")
    @Transactional
    public void onTransaction(TransactionEvent event) {
        log.info("Received TransactionEvent: {}", event);

        UUID walletId = event.getWalletId();
        Optional<Wallet> maybeWallet = walletRepository.findById(walletId);

        if (maybeWallet.isEmpty()) {
            // The wallet doesn't exist here. In real systems you'd send this to a
            // dead-letter topic; for the demo we log and drop.
            log.warn("Wallet {} not found — ignoring event", walletId);
            return;
        }

        Wallet wallet = maybeWallet.get();
        BigDecimal balance = wallet.getBalance() == null ? BigDecimal.ZERO : wallet.getBalance();

        switch (event.getType()) {
            case "DEPOSIT" -> wallet.setBalance(balance.add(event.getAmount()));
            case "WITHDRAW" -> wallet.setBalance(balance.subtract(event.getAmount()));
            default -> log.warn("Unknown transaction type: {}", event.getType());
        }

        walletRepository.save(wallet);
        log.info("Updated wallet {} balance to {}", walletId, wallet.getBalance());
    }
}