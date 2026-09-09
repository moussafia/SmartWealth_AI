package ma.enset.advisorservice.agent.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    /** Appelle les autres services À TRAVERS le gateway (port 8080). */
    @Bean
    public RestClient gatewayRestClient() {
        return RestClient.builder()
                .baseUrl("http://localhost:8080")
                .build();
    }
}