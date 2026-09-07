package ma.enset.advisorservice.agent.tools;

import dev.langchain4j.agent.tool.Tool;
import org.springframework.stereotype.Component;

@Component
public class PortfolioTools {

    @Tool("Récupère la valeur totale du portefeuille de l'utilisateur en USD")
    public double getPortfolioValue() {
        // TODO: appeler le portfolio-service. Simulé pour l'instant.
        return 39936.00;
    }

    @Tool("Récupère le nombre de transactions récentes de l'utilisateur")
    public int getRecentTransactionCount() {
        // TODO: appeler le transaction-service. Simulé pour l'instant.
        return 3;
    }

    @Tool("Calcule un score de risque du portefeuille de 0 (sûr) à 100 (risqué)")
    public int calculateRiskScore() {
        // TODO: vraie logique. Simulé pour l'instant.
        return 72;
    }
}