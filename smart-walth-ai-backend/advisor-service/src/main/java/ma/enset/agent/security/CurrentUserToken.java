package ma.enset.advisorservice.agent.security;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/** Récupère le JWT brut de l'utilisateur courant pour le propager aux appels sortants. */
@Component
public class CurrentUserToken {

    public String bearerToken() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();
            return jwt.getTokenValue();   // le token brut tel que reçu
        }
        throw new IllegalStateException("Aucun token JWT dans le contexte de sécurité");
    }
}