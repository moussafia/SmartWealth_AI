package ma.enset.advisorservice.simple;


import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SpringAiConfig {

    @Bean
    public ChatMemory chatMemory() {
        // Garde les 20 derniers messages, en RAM (vidée au redémarrage).
        return MessageWindowChatMemory.builder().maxMessages(20).build();
    }

    @Bean
    public ChatClient conversationChatClient(ChatClient.Builder builder, ChatMemory chatMemory) {
        return builder
                .defaultSystem("""
                    Tu es SmartWealth, un assistant conseiller financier amical.
                    Réponds clairement et de façon concise. Si tu n'as pas encore
                    de données réelles sur le patrimoine de l'utilisateur, dis-le honnêtement.
                    """)
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .build();
    }
}
