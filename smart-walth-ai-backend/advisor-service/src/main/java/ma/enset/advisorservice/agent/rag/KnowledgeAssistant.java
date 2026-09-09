package ma.enset.advisorservice.agent.rag;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.spring.AiService;

@AiService
public interface KnowledgeAssistant {

    @SystemMessage("""
        Tu es un expert en finance. Réponds à la question de l'utilisateur en
        t'appuyant UNIQUEMENT sur les extraits de la base de connaissances fournis.
        Si l'information n'y figure pas, dis-le honnêtement.
        """)
    String ask(String question);
}