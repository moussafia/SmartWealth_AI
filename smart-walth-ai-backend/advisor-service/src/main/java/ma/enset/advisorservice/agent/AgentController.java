package ma.enset.advisorservice.agent;

import lombok.RequiredArgsConstructor;
import ma.enset.advisorservice.simple.dto.ChatRequest;
import ma.enset.advisorservice.simple.dto.ChatResponse;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

@RestController
@RequestMapping("/api/advisor/agent")
@RequiredArgsConstructor
public class AgentController {

    private final FinancialAgent agent;

    @PostMapping
    public ChatResponse ask(@Valid @RequestBody ChatRequest request) {
        return new ChatResponse(agent.ask(request.getMessage()));
    }
}