package ma.enset.advisorservice.agent.tools;

import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.enset.advisorservice.agent.dto.PortfolioSummaryDto;
import ma.enset.advisorservice.agent.dto.TransactionDto;
import ma.enset.advisorservice.agent.dto.WalletDto;
import ma.enset.advisorservice.agent.security.CurrentUserToken;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PortfolioTools {

    private final RestClient gatewayRestClient;
    private final CurrentUserToken currentUserToken;

    @Tool("Récupère la valeur totale du portefeuille de l'utilisateur en USD")
    public double getPortfolioValue() {
        PortfolioSummaryDto summary = fetchSummary();
        double value = summary.totalPortfolioValue() == null
                ? 0.0
                : summary.totalPortfolioValue().doubleValue();
        log.info("[TOOL] getPortfolioValue -> {}", value);
        return value;
    }

    @Tool("Récupère le nombre de transactions de l'utilisateur")
    public int getRecentTransactionCount() {
        List<TransactionDto> txs = gatewayRestClient.get()
                .uri("/api/transactions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + currentUserToken.bearerToken())
                .retrieve()
                .body(new org.springframework.core.ParameterizedTypeReference<>() {});
        int count = txs == null ? 0 : txs.size();
        log.info("[TOOL] getRecentTransactionCount -> {}", count);
        return count;
    }

    @Tool("Calcule un score de risque du portefeuille de 0 (sûr) à 100 (risqué), basé sur la part de crypto")
    public int calculateRiskScore() {
        PortfolioSummaryDto summary = fetchSummary();
        List<WalletDto> wallets = summary.wallets();
        if (wallets == null || wallets.isEmpty()) {
            log.info("[TOOL] calculateRiskScore -> 0 (aucun wallet)");
            return 0;
        }

        // Formule simple : plus la part de CRYPTO est élevée, plus le risque est élevé.
        BigDecimal total = BigDecimal.ZERO;
        BigDecimal crypto = BigDecimal.ZERO;
        for (WalletDto w : wallets) {
            BigDecimal v = w.totalValue() == null ? BigDecimal.ZERO : w.totalValue();
            total = total.add(v);
            if ("CRYPTO".equalsIgnoreCase(w.type())) {
                crypto = crypto.add(v);
            }
        }
        if (total.compareTo(BigDecimal.ZERO) == 0) {
            return 0;
        }
        int score = crypto.multiply(BigDecimal.valueOf(100))
                .divide(total, 0, java.math.RoundingMode.HALF_UP)
                .intValue();
        log.info("[TOOL] calculateRiskScore -> {} (crypto {}/{})", score, crypto, total);
        return score;
    }

    /** Appel partagé : GET /api/portfolios/summary avec le token de l'utilisateur. */
    private PortfolioSummaryDto fetchSummary() {
        return gatewayRestClient.get()
                .uri("/api/portfolios/summary")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + currentUserToken.bearerToken())
                .retrieve()
                .body(PortfolioSummaryDto.class);
    }
}