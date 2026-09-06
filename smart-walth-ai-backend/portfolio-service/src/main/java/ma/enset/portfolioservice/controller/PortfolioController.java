package ma.enset.portfolioservice.controller;

import lombok.RequiredArgsConstructor;
import ma.enset.portfolioservice.dto.PortfolioSummaryDto;
import ma.enset.portfolioservice.service.WalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/portfolios")
@RequiredArgsConstructor
public class PortfolioController {

    private final WalletService walletService;

    @GetMapping("/summary")
    public ResponseEntity<PortfolioSummaryDto> getSummary(
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(walletService.getPortfolioSummary(userId));
    }
}