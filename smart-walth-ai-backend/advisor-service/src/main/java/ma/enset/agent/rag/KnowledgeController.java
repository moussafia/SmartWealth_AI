package ma.enset.advisorservice.agent.rag;

import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.enset.advisorservice.simple.dto.ChatRequest;
import ma.enset.advisorservice.simple.dto.ChatResponse;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/advisor/knowledge")
@RequiredArgsConstructor
public class KnowledgeController {

    private final KnowledgeAssistant knowledgeAssistant;

    @PostMapping
    public ChatResponse ask(@Valid @RequestBody ChatRequest request) {
        return new ChatResponse(knowledgeAssistant.ask(request.getMessage()));
    }
}