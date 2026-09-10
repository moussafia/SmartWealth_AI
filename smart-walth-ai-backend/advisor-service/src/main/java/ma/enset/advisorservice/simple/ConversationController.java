package ma.enset.advisorservice.simple;

import lombok.RequiredArgsConstructor;
import ma.enset.advisorservice.simple.dto.ChatRequest;
import ma.enset.advisorservice.simple.dto.ChatResponse;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/advisor/chat")
@RequiredArgsConstructor
public class ConversationController {

    private final ChatClient conversationChatClient;
    private final ChatMemory chatMemory;

    @PostMapping
    public ChatResponse chat(@Valid @RequestBody ChatRequest request,
                             @AuthenticationPrincipal Jwt jwt) {
        String conversationId = jwt.getSubject(); // une mémoire par utilisateur

        String reply = conversationChatClient.prompt()
                .user(request.getMessage())
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId))
                .call()
                .content();

        return new ChatResponse(reply);
    }

    /** Vider la mémoire (le bouton "Vider la mémoire" du screenshot). */
    @DeleteMapping("/memory")
    public void clearMemory(@AuthenticationPrincipal Jwt jwt) {
        chatMemory.clear(jwt.getSubject());
    }
}