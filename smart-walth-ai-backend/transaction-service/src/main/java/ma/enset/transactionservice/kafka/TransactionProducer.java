package ma.enset.transactionservice.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.enset.transactionservice.event.TransactionEvent;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class TransactionProducer {

    // KafkaTemplate is Spring's tool for SENDING messages. Spring auto-creates it.
    private final KafkaTemplate<String, TransactionEvent> kafkaTemplate;

    // The topic name — the "channel" we publish to. The consumer listens on the same name.
    public static final String TOPIC = "transaction-events";

    public void publish(TransactionEvent event) {
        // We send the event to the topic, keyed by walletId.
        // The KEY matters: Kafka guarantees all messages with the same key go to the
        // same partition, so events for one wallet stay in ORDER. (Interview point!)
        kafkaTemplate.send(TOPIC, event.getWalletId().toString(), event);
        log.info("Published TransactionEvent to '{}': {}", TOPIC, event);
    }
}