package ma.enset.advisorservice.agent;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.spring.AiService;
import ma.enset.advisorservice.agent.tools.PortfolioTools;

@AiService(tools = "portfolioTools")
public interface FinancialAgent {

    @SystemMessage("""
        Tu es un agent financier expert. Pour répondre aux questions sur le
        patrimoine, le risque ou les transactions de l'utilisateur, utilise les
        outils disponibles pour récupérer les vraies données AVANT de répondre.
        Explique ton raisonnement étape par étape, puis donne une conclusion claire.
        """)
    String ask(String userMessage);
}